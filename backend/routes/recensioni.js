const express = require('express');
const requireAuth = require('../middleware/auth');
const { createRecensione, getRecensioniByPosto, getMyRecensioni } = require('../controllers/recensioneController');

const router = express.Router();
router.use(requireAuth);

router.get('/mie', getMyRecensioni);
router.get('/posto/:id', getRecensioniByPosto);
router.post('/', createRecensione);

module.exports = router;
