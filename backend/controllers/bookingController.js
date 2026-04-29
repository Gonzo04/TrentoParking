const Prenotazione = require('../models/Prenotazione');
const Utente = require('../models/Utente');
const PostoPrivato = require('../models/PostoPrivato');

// GET /api/bookings
async function listMyBookings(req, res, next) {
  // TODO: Prenotazione.find({ utenteId: req.user.userId }).populate('postoPrivatoId')
  res.status(501).json({ error: 'Not implemented' });
}

// POST /api/bookings
async function createBooking(req, res, next) {
  // TODO: load Utente by req.user.userId
  // TODO: 400 if !user.emailVerificata or !user.targa
  // TODO: validate postoPrivatoId exists and is attivo
  // TODO: create Prenotazione with stato='IN_ATTESA_PAGAMENTO'
  res.status(501).json({ error: 'Not implemented' });
}

// POST /api/bookings/:id/pay
async function payBooking(req, res, next) {
  // TODO: load Prenotazione, verify ownership
  // TODO: 400 if stato !== 'IN_ATTESA_PAGAMENTO'
  // TODO: mock payment success → set stato='PAGATA', save
  res.status(501).json({ error: 'Not implemented' });
}

// DELETE /api/bookings/:id
async function cancelBooking(req, res, next) {
  // TODO: load Prenotazione, verify ownership
  // TODO: set stato='ANNULLATA', save
  res.status(501).json({ error: 'Not implemented' });
}

module.exports = { listMyBookings, createBooking, payBooking, cancelBooking };
