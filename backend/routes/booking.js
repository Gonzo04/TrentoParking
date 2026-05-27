const express = require('express');
const requireAuth = require('../middleware/auth');
const {
  listPosti,
  getPostoConPrenotazioni,
  listMyBookings,
  listReceivedBookings,
  createBooking,
  payBooking,
  cancelBooking
} = require('../controllers/bookingController');

const router = express.Router();

// Tutte le rotte di booking richiedono un utente autenticato
// Il middleware legge il token JWT e aggiunge req.user alla richiesta
router.use(requireAuth);

// Rotte usate per mostrare i posti e caricare il calendario
// Queste servono al frontend quando l'utente vuole scegliere un posto da prenotare
router.get('/posti', listPosti);
router.get('/posti/:id', getPostoConPrenotazioni);

// Rotta per le prenotazioni ricevute dall'host
// Deve stare prima di router.get('/') perché è una rotta più specifica
router.get('/ricevute', listReceivedBookings);

// Rotte per gestire le prenotazioni fatte dall'utente autenticato
// GET /api/bookings restituisce le prenotazioni create dall'utente come driver
router.get('/', listMyBookings);

// POST /api/bookings crea una nuova prenotazione
router.post('/', createBooking);

// POST /api/bookings/:id/pay simula il pagamento di una prenotazione
router.post('/:id/pay', payBooking);

// DELETE /api/bookings/:id annulla una prenotazione dell'utente
router.delete('/:id', cancelBooking);

module.exports = router;  