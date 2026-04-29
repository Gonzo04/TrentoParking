const express = require('express');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');
const {
  listUtenti, updateUtente, listAllPosti, listAllPrenotazioni
} = require('../controllers/adminController');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('AMMINISTRATORE'));

router.get('/utenti', listUtenti);
router.put('/utenti/:id', updateUtente);
router.get('/posti', listAllPosti);
router.get('/prenotazioni', listAllPrenotazioni);

module.exports = router;
