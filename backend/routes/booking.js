const express = require('express');
const requireAuth = require('../middleware/auth');
const { listMyBookings, createBooking, payBooking, cancelBooking } = require('../controllers/bookingController');

const router = express.Router();

router.use(requireAuth);

router.get('/', listMyBookings);
router.post('/', createBooking);
router.post('/:id/pay', payBooking);
router.delete('/:id', cancelBooking);

module.exports = router;
