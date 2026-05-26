const express = require('express');
const requireAuth = require('../middleware/auth');
const {
  listPosti,
  getPostoConPrenotazioni,
  listMyBookings,
  createBooking,
  payBooking,
  cancelBooking
} = require('../controllers/bookingController');

const router = express.Router();

router.use(requireAuth);

// Rotte usate per mostrare i posti e caricare il calendario
router.get('/posti', listPosti);
router.get('/posti/:id', getPostoConPrenotazioni);

// Rotte per gestire le prenotazioni dell'utente autenticato
router.get('/', listMyBookings);
router.post('/', createBooking);
router.post('/:id/pay', payBooking);
router.delete('/:id', cancelBooking);

module.exports = router;