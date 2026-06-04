const express = require('express');
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const { getUsers, updateUser, deleteUser, getSpots, deleteSpot, getBookings, cancelBooking } = require('../controllers/adminController');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/users', getUsers);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

router.get('/spots', getSpots);
router.delete('/spots/:id', deleteSpot);

router.get('/bookings', getBookings);
router.patch('/bookings/:id/cancel', cancelBooking);

module.exports = router;
