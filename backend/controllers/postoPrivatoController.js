const PostoPrivato = require('../models/PostoPrivato');
const Prenotazione = require('../models/Prenotazione');
const Utente = require('../models/Utente');

function isValidNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateDisponibilita(disponibilita) {
  if (disponibilita === undefined) {
    return [];
  }

  if (!Array.isArray(disponibilita)) {
    return null;
  }

  for (const fascia of disponibilita) {
    const giorno = normalizeString(fascia.giorno);

    if (!giorno) {
      return null;
    }

    if (!isValidNumber(fascia.oraInizio) || !isValidNumber(fascia.oraFine)) {
      return null;
    }

    if (fascia.oraInizio < 0 || fascia.oraInizio > 23) {
      return null;
    }

    if (fascia.oraFine < 1 || fascia.oraFine > 24) {
      return null;
    }

    if (fascia.oraFine <= fascia.oraInizio) {
      return null;
    }
  }

  return disponibilita.map((fascia) => ({
    giorno: normalizeString(fascia.giorno),
    oraInizio: fascia.oraInizio,
    oraFine: fascia.oraFine
  }));
}

// GET /api/posti-privati
// Restituisce i posti attivi mostrabili sulla mappa.
// La rotta è pensata per utenti autenticati, perché nella UI la mappa è visibile solo dopo login.
async function listPostiPrivati(req, res, next) {
  try {
    const posti = await PostoPrivato.find({ attivo: true })
      .populate('hostId', 'nome cognome nomeUtente')
      .sort({ createdAt: -1 })
      .lean();

    return res.json(posti);
  } catch (err) {
    return next(err);
  }
}

// GET /api/posti-privati/:id
// Restituisce il dettaglio di un singolo posto privato attivo.
async function getPostoPrivatoById(req, res, next) {
  try {
    const posto = await PostoPrivato.findOne({
      _id: req.params.id,
      attivo: true
    })
      .populate('hostId', 'nome cognome nomeUtente')
      .lean();

    if (!posto) {
      return res.status(404).json({ error: 'Posto privato non trovato' });
    }

    return res.json(posto);
  } catch (err) {
    return next(err);
  }
}

// GET /api/posti-privati/:id/prenotazioni
// Restituisce il posto e le prenotazioni future necessarie al calendario.
// Questa rotta sostituisce gradualmente /api/bookings/posti/:id, che mescolava posti e prenotazioni.
async function getPostoConPrenotazioni(req, res, next) {
  try {
    const posto = await PostoPrivato.findOne({
      _id: req.params.id,
      attivo: true
    })
      .populate('hostId', 'nome cognome nomeUtente')
      .lean();

    if (!posto) {
      return res.status(404).json({ error: 'Posto privato non trovato' });
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

// POST /api/posti-privati
// Crea un posto privato associandolo all'utente autenticato.
// L'hostId non arriva dal frontend: viene preso dal token verificato dal middleware requireAuth.
async function createPostoPrivato(req, res, next) {
  try {
    const utente = await Utente.findById(req.user.userId);

    if (!utente) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    const {
      nome,
      descrizione,
      posizione,
      tariffaOraria,
      disponibilita,
      caratteristiche,
      dichiarazioneProprietaAccettata
    } = req.body;

    const nomePulito = normalizeString(nome);
    const descrizionePulita = normalizeString(descrizione);

    if (!nomePulito) {
      return res.status(400).json({ error: 'Il nome del posto è obbligatorio' });
    }

    if (!posizione || typeof posizione !== 'object') {
      return res.status(400).json({ error: 'La posizione del posto è obbligatoria' });
    }

    const latitudine = Number(posizione.latitudine);
    const longitudine = Number(posizione.longitudine);

    if (!Number.isFinite(latitudine) || latitudine < -90 || latitudine > 90) {
      return res.status(400).json({ error: 'Latitudine non valida' });
    }

    if (!Number.isFinite(longitudine) || longitudine < -180 || longitudine > 180) {
      return res.status(400).json({ error: 'Longitudine non valida' });
    }

    const tariffa = Number(tariffaOraria);

    if (!Number.isFinite(tariffa) || tariffa < 0) {
      return res.status(400).json({ error: 'Tariffa oraria non valida' });
    }

    if (dichiarazioneProprietaAccettata !== true) {
      return res.status(400).json({
        error: 'Devi dichiarare di essere proprietario del posto o di avere l’autorizzazione a pubblicarlo'
      });
    }

    const disponibilitaValidata = validateDisponibilita(disponibilita);

    if (disponibilitaValidata === null) {
      return res.status(400).json({ error: 'Disponibilità non valida' });
    }

    // Accettiamo solo stringhe non vuote; valori non conformi vengono ignorati silenziosamente
    const caratteristicheValidate = Array.isArray(caratteristiche)
      ? caratteristiche.filter(c => typeof c === 'string' && c.trim().length > 0)
      : [];

    const posto = await PostoPrivato.create({
      hostId: req.user.userId,
      nome: nomePulito,
      descrizione: descrizionePulita,
      posizione: {
        latitudine,
        longitudine,
        indirizzoTestuale: normalizeString(posizione.indirizzoTestuale)
      },
      tariffaOraria: tariffa,
      disponibilita: disponibilitaValidata,
      caratteristiche: caratteristicheValidate,
      attivo: true,
      statoVerifica: 'NON_VERIFICATO',
      dichiarazioneProprietaAccettata: true,
      dataDichiarazioneProprieta: new Date()
    });

    // Al primo posto pubblicato l'utente diventa HOST.
    // Questa scelta evita un flusso separato "diventa host", ma mantiene il ruolo utile nel dominio.
    if (utente.ruolo === 'UTENTE') {
      utente.ruolo = 'HOST';
      await utente.save();
    }

    const postoCreato = await PostoPrivato.findById(posto._id)
      .populate('hostId', 'nome cognome nomeUtente')
      .lean();

    return res.status(201).json(postoCreato);
  } catch (err) {
    return next(err);
  }
}

// Restituisce tutti i posti (anche non attivi) pubblicati dall'utente loggato.
async function getMieiPosti(req, res, next) {
  try {
    const posti = await PostoPrivato.find({ hostId: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();
    return res.json(posti);
  } catch (err) {
    return next(err);
  }
}

// Aggiorna nome, descrizione, tariffaOraria, disponibilita e/o caratteristiche.
// Solo l'host proprietario può modificare il proprio posto.
async function updatePostoPrivato(req, res, next) {
  try {
    const posto = await PostoPrivato.findById(req.params.id);
    if (!posto) return res.status(404).json({ error: 'Posto non trovato' });
    if (posto.hostId.toString() !== req.user.userId)
      return res.status(403).json({ error: 'Non autorizzato' });

    const { nome, descrizione, tariffaOraria, disponibilita, caratteristiche, attivo } = req.body;

    if (nome !== undefined) {
      const nomePulito = normalizeString(nome);
      if (!nomePulito)
        return res.status(400).json({ error: 'Il nome del posto è obbligatorio' });
      posto.nome = nomePulito;
    }

    if (descrizione !== undefined) {
      posto.descrizione = normalizeString(descrizione);
    }

    if (tariffaOraria !== undefined) {
      const tariffa = Number(tariffaOraria);
      if (!Number.isFinite(tariffa) || tariffa < 0)
        return res.status(400).json({ error: 'Tariffa oraria non valida' });
      posto.tariffaOraria = tariffa;
    }

    if (disponibilita !== undefined) {
      const dispValidata = validateDisponibilita(disponibilita);
      if (dispValidata === null)
        return res.status(400).json({ error: 'Disponibilità non valida' });
      posto.disponibilita = dispValidata;
    }

    if (caratteristiche !== undefined) {
      posto.caratteristiche = Array.isArray(caratteristiche)
        ? caratteristiche.filter(c => typeof c === 'string' && c.trim().length > 0)
        : [];
    }

    if (attivo !== undefined) {
      posto.attivo = Boolean(attivo);
    }

    await posto.save();
    const updated = await PostoPrivato.findById(posto._id).lean();
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
}

// Elimina definitivamente il posto dal database.
// Il posto deve essere già disattivato (attivo: false) prima di poter essere eliminato.
async function deletePostoPrivato(req, res, next) {
  try {
    const posto = await PostoPrivato.findById(req.params.id);
    if (!posto) return res.status(404).json({ error: 'Posto non trovato' });
    if (posto.hostId.toString() !== req.user.userId)
      return res.status(403).json({ error: 'Non autorizzato' });
    if (posto.attivo)
      return res.status(400).json({ error: 'Disattiva il posto prima di eliminarlo definitivamente' });

    await PostoPrivato.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Posto eliminato correttamente' });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listPostiPrivati,
  getPostoPrivatoById,
  getPostoConPrenotazioni,
  createPostoPrivato,
  getMieiPosti,
  updatePostoPrivato,
  deletePostoPrivato,
};