const express = require('express');
const requireAuth = require('../middleware/auth');
const {
  listPosti, getPostoConPrenotazioni,
  listMyBookings, createBooking, payBooking, cancelBooking,
} = require('../controllers/bookingController');

const router = express.Router();

router.use(requireAuth);

// Spot browsing (needed to populate the map and the calendar)
router.get('/posti', listPosti);
router.get('/posti/:id', getPostoConPrenotazioni);

// Booking CRUD
router.get('/', listMyBookings);
router.post('/', createBooking);
router.post('/:id/pay', payBooking);
router.delete('/:id', cancelBooking);

module.exports = router;
