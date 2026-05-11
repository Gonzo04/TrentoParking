const express = require('express');
const requireAuth = require('../middleware/auth');
const {
  listPostiPrivati,
  getPostoPrivatoById,
  getPostoConPrenotazioni,
  createPostoPrivato
} = require('../controllers/postoPrivatoController');

const router = express.Router();

// Tutte le rotte dei posti privati richiedono autenticazione.
// Questa scelta è coerente con la UI attuale: la mappa e i posti sono visibili solo dopo login.
router.use(requireAuth);

// GET /api/posti-privati
// Lista dei posti privati attivi da mostrare sulla mappa.
router.get('/', listPostiPrivati);

// POST /api/posti-privati
// Creazione di un nuovo posto privato da parte dell'utente autenticato.
router.post('/', createPostoPrivato);

// GET /api/posti-privati/:id/prenotazioni
// Dettaglio del posto con prenotazioni future, usato dal calendario.
router.get('/:id/prenotazioni', getPostoConPrenotazioni);

// GET /api/posti-privati/:id
// Dettaglio semplice di un posto privato.
router.get('/:id', getPostoPrivatoById);

module.exports = router;