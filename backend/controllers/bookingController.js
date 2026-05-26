const Prenotazione = require('../models/Prenotazione');
const Utente = require('../models/Utente');
const PostoPrivato = require('../models/PostoPrivato');

const GIORNI_PRENOTAZIONE = [
  'DOMENICA',
  'LUNEDI',
  'MARTEDI',
  'MERCOLEDI',
  'GIOVEDI',
  'VENERDI',
  'SABATO'
];

function isBookingInsideDisponibilita(posto, inizio, fine) {
  // Per ora gestiamo prenotazioni nello stesso giorno
  // Se in futuro serviranno prenotazioni su più giorni, questa funzione sarà il punto da estendere
  if (inizio.toDateString() !== fine.toDateString()) {
    return false;
  }

  if (!Array.isArray(posto.disponibilita) || posto.disponibilita.length === 0) {
    return false;
  }

  const giorno = GIORNI_PRENOTAZIONE[inizio.getDay()];
  const oraInizio = inizio.getHours();
  const oraFine = fine.getHours();

  const minutiValidi = inizio.getMinutes() === 0 && fine.getMinutes() === 0;

  if (!minutiValidi) {
    return false;
  }

  if (oraFine <= oraInizio) {
    return false;
  }

  return posto.disponibilita.some((fascia) => (
      fascia.giorno === giorno &&
      oraInizio >= fascia.oraInizio &&
      oraFine <= fascia.oraFine
  ));
}

// GET /api/bookings/posti
// Restituisce i posti attivi e non eliminati da mostrare sulla mappa utente
async function listPosti(req, res, next) {
  try {
    const posti = await PostoPrivato.find({
      attivo: true,
      eliminato: { $ne: true }
    })
        .populate('hostId', 'nome cognome')
        .lean();

    return res.json(posti);
  } catch (err) {
    return next(err);
  }
}

// GET /api/bookings/posti/:id
// Restituisce il dettaglio del posto e le prenotazioni future per il calendario
async function getPostoConPrenotazioni(req, res, next) {
  try {
    const posto = await PostoPrivato.findOne({
      _id: req.params.id,
      attivo: true,
      eliminato: { $ne: true }
    })
        .populate('hostId', 'nome cognome')
        .lean();

    if (!posto) {
      return res.status(404).json({ error: 'Posto non trovato' });
    }

    const now = new Date();
    const limit = new Date();
    limit.setMonth(limit.getMonth() + 2);

    const prenotazioni = await Prenotazione.find({
      postoPrivatoId: req.params.id,
      stato: { $ne: 'ANNULLATA' },
      dataOraFine: { $gte: now },
      dataOraInizio: { $lte: limit }
    })
        .select('dataOraInizio dataOraFine')
        .lean();

    return res.json({ posto, prenotazioni });
  } catch (err) {
    return next(err);
  }
}

// GET /api/bookings
// Restituisce le prenotazioni create dall'utente autenticato
async function listMyBookings(req, res, next) {
  try {
    const prenotazioni = await Prenotazione.find({ utenteId: req.user.userId })
        .populate('postoPrivatoId', 'nome posizione tariffaOraria')
        .sort({ dataOraInizio: -1 })
        .lean();

    return res.json(prenotazioni);
  } catch (err) {
    return next(err);
  }
}

// POST /api/bookings
// Crea una nuova prenotazione per l'utente autenticato
async function createBooking(req, res, next) {
  try {
    const utente = await Utente.findById(req.user.userId);

    if (!utente) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    if (!utente.emailVerificata) {
      return res.status(400).json({ error: 'Email non verificata' });
    }

    if (!utente.targa) {
      return res.status(400).json({ error: 'Targa veicolo non impostata nel profilo' });
    }

    const { postoPrivatoId, dataOraInizio, dataOraFine } = req.body;

    if (!postoPrivatoId || !dataOraInizio || !dataOraFine) {
      return res.status(400).json({
        error: 'postoPrivatoId, dataOraInizio e dataOraFine sono obbligatori'
      });
    }

    const inizio = new Date(dataOraInizio);
    const fine = new Date(dataOraFine);

    if (Number.isNaN(inizio.getTime()) || Number.isNaN(fine.getTime())) {
      return res.status(400).json({ error: 'Date non valide' });
    }

    if (fine <= inizio) {
      return res.status(400).json({ error: 'dataOraFine deve essere dopo dataOraInizio' });
    }

    if (inizio < new Date()) {
      return res.status(400).json({ error: 'Non è possibile prenotare nel passato' });
    }

    const posto = await PostoPrivato.findOne({
      _id: postoPrivatoId,
      attivo: true,
      eliminato: { $ne: true }
    });

    if (!posto) {
      return res.status(404).json({ error: 'Posto non trovato o non disponibile' });
    }

    // Un host può usare la piattaforma come utente, ma non può prenotare un posto pubblicato da lui
    if (posto.hostId && posto.hostId.toString() === req.user.userId) {
      return res.status(403).json({ error: 'Non puoi prenotare un posto pubblicato da te' });
    }

    // La prenotazione deve rispettare la disponibilità impostata dall'host
    if (!isBookingInsideDisponibilita(posto, inizio, fine)) {
      return res.status(400).json({
        error: 'Il posto non è disponibile nella fascia oraria selezionata'
      });
    }

    // Controlla se esiste già una prenotazione che si sovrappone allo stesso intervallo
    const overlap = await Prenotazione.findOne({
      postoPrivatoId,
      stato: { $ne: 'ANNULLATA' },
      dataOraInizio: { $lt: fine },
      dataOraFine: { $gt: inizio }
    });

    if (overlap) {
      return res.status(409).json({ error: 'Il posto è già prenotato in questo intervallo' });
    }

    const ore = (fine - inizio) / 3600000;
    const prezzoTotale = Math.round(ore * posto.tariffaOraria * 100) / 100;

    const prenotazione = await Prenotazione.create({
      utenteId: req.user.userId,
      postoPrivatoId,
      targa: utente.targa,
      dataOraInizio: inizio,
      dataOraFine: fine,
      stato: 'IN_ATTESA_PAGAMENTO',
      prezzoTotale
    });

    return res.status(201).json(prenotazione);
  } catch (err) {
    return next(err);
  }
}

// POST /api/bookings/:id/pay
// Simula il pagamento di una prenotazione dell'utente autenticato
async function payBooking(req, res, next) {
  try {
    const prenotazione = await Prenotazione.findById(req.params.id);

    if (!prenotazione) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    if (prenotazione.utenteId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    if (prenotazione.stato !== 'IN_ATTESA_PAGAMENTO') {
      return res.status(400).json({ error: 'Prenotazione non in attesa di pagamento' });
    }

    prenotazione.stato = 'PAGATA';
    await prenotazione.save();

    return res.json(prenotazione);
  } catch (err) {
    return next(err);
  }
}

// DELETE /api/bookings/:id
// Annulla una prenotazione dell'utente autenticato
async function cancelBooking(req, res, next) {
  try {
    const prenotazione = await Prenotazione.findById(req.params.id);

    if (!prenotazione) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    if (prenotazione.utenteId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    if (prenotazione.stato === 'ANNULLATA') {
      return res.status(400).json({ error: 'Prenotazione già annullata' });
    }

    prenotazione.stato = 'ANNULLATA';
    await prenotazione.save();

    return res.json(prenotazione);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listPosti,
  getPostoConPrenotazioni,
  listMyBookings,
  createBooking,
  payBooking,
  cancelBooking
};