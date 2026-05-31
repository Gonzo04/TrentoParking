const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { createRecensione, getRecensioniHost, getRecensioniPosto } = require('../controllers/recensioneController');

router.post('/', requireAuth, createRecensione);
router.get('/host/:hostId', getRecensioniHost);
router.get('/posto/:postoId', getRecensioniPosto);

module.exports = router;
