const Prenotazione = require('../models/Prenotazione');
const Utente = require('../models/Utente');
const PostoPrivato = require('../models/PostoPrivato');

// GET /api/bookings/posti — lista posti attivi per la mappa utente
async function listPosti(req, res, next) {
  try {
    const posti = await PostoPrivato.find({ attivo: true })
      .populate('hostId', 'nome cognome')
      .lean();
    res.json(posti);
  } catch (err) { next(err); }
}

// GET /api/bookings/posti/:id — dettaglio posto + prenotazioni attive (per il calendario)
async function getPostoConPrenotazioni(req, res, next) {
  try {
    const posto = await PostoPrivato.findById(req.params.id)
      .populate('hostId', 'nome cognome')
      .lean();
    if (!posto) return res.status(404).json({ error: 'Posto non trovato' });

    const now = new Date();
    const limit = new Date(); limit.setMonth(limit.getMonth() + 2);

    const prenotazioni = await Prenotazione.find({
      postoPrivatoId: req.params.id,
      stato: { $ne: 'ANNULLATA' },
      dataOraFine: { $gte: now },
      dataOraInizio: { $lte: limit },
    }).select('dataOraInizio dataOraFine').lean();

    res.json({ posto, prenotazioni });
  } catch (err) { next(err); }
}

// GET /api/bookings — prenotazioni dell'utente loggato
async function listMyBookings(req, res, next) {
  try {
    const prenotazioni = await Prenotazione.find({ utenteId: req.user.userId })
      .populate('postoPrivatoId', 'nome posizione tariffaOraria')
      .sort({ dataOraInizio: -1 })
      .lean();
    res.json(prenotazioni);
  } catch (err) { next(err); }
}

// POST /api/bookings — crea prenotazione
async function createBooking(req, res, next) {
  try {
    const utente = await Utente.findById(req.user.userId);
    if (!utente) return res.status(404).json({ error: 'Utente non trovato' });
    if (!utente.emailVerificata)
      return res.status(400).json({ error: 'Email non verificata' });
    if (!utente.targa)
      return res.status(400).json({ error: 'Targa veicolo non impostata nel profilo' });

    const { postoPrivatoId, dataOraInizio, dataOraFine } = req.body;
    if (!postoPrivatoId || !dataOraInizio || !dataOraFine)
      return res.status(400).json({ error: 'postoPrivatoId, dataOraInizio e dataOraFine sono obbligatori' });

    const inizio = new Date(dataOraInizio);
    const fine = new Date(dataOraFine);
    if (isNaN(inizio) || isNaN(fine)) return res.status(400).json({ error: 'Date non valide' });
    if (fine <= inizio) return res.status(400).json({ error: 'dataOraFine deve essere dopo dataOraInizio' });
    if (inizio < new Date()) return res.status(400).json({ error: 'Non è possibile prenotare nel passato' });

    const posto = await PostoPrivato.findById(postoPrivatoId);
    if (!posto) return res.status(404).json({ error: 'Posto non trovato' });
    if (!posto.attivo) return res.status(400).json({ error: 'Posto non disponibile' });

    // Controlla sovrapposizioni con prenotazioni esistenti
    const overlap = await Prenotazione.findOne({
      postoPrivatoId,
      stato: { $ne: 'ANNULLATA' },
      dataOraInizio: { $lt: fine },
      dataOraFine: { $gt: inizio },
    });
    if (overlap) return res.status(409).json({ error: 'Il posto è già prenotato in questo intervallo' });

    const ore = (fine - inizio) / 3600000;
    const prezzoTotale = Math.round(ore * posto.tariffaOraria * 100) / 100;

    const prenotazione = await Prenotazione.create({
      utenteId: req.user.userId,
      postoPrivatoId,
      targa: utente.targa,
      dataOraInizio: inizio,
      dataOraFine: fine,
      stato: 'IN_ATTESA_PAGAMENTO',
      prezzoTotale,
    });

    res.status(201).json(prenotazione);
  } catch (err) { next(err); }
}

// POST /api/bookings/:id/pay — pagamento mockato
async function payBooking(req, res, next) {
  try {
    const p = await Prenotazione.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Prenotazione non trovata' });
    if (p.utenteId.toString() !== req.user.userId)
      return res.status(403).json({ error: 'Non autorizzato' });
    if (p.stato !== 'IN_ATTESA_PAGAMENTO')
      return res.status(400).json({ error: 'Prenotazione non in attesa di pagamento' });

    p.stato = 'PAGATA';
    await p.save();
    res.json(p);
  } catch (err) { next(err); }
}

// DELETE /api/bookings/:id — annulla prenotazione
async function cancelBooking(req, res, next) {
  try {
    const p = await Prenotazione.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Prenotazione non trovata' });
    if (p.utenteId.toString() !== req.user.userId)
      return res.status(403).json({ error: 'Non autorizzato' });
    if (p.stato === 'ANNULLATA')
      return res.status(400).json({ error: 'Prenotazione già annullata' });

    p.stato = 'ANNULLATA';
    await p.save();
    res.json(p);
  } catch (err) { next(err); }
}

module.exports = {
  listPosti, getPostoConPrenotazioni,
  listMyBookings, createBooking, payBooking, cancelBooking,
};
