const express = require('express');
const requireAuth = require('../middleware/auth');
const {
  listPostiPrivati,
  listMieiPostiPrivati,
  getPostoPrivatoById,
  getPostoConPrenotazioni,
  createPostoPrivato,
  updateMioPostoPrivato,
  eliminaMioPostoPrivato
} = require('../controllers/postoPrivatoController');

const router = express.Router();

router.use(requireAuth);

// GET /api/posti-privati
// Lista dei posti privati attivi da mostrare sulla mappa
router.get('/', listPostiPrivati);

// GET /api/posti-privati/miei
// Lista dei posti pubblicati dall'utente autenticato
// Deve stare prima di /:id, altrimenti Express leggerebbe "miei" come id
router.get('/miei', listMieiPostiPrivati);

// POST /api/posti-privati
// Crea un nuovo posto privato associato all'utente autenticato
router.post('/', createPostoPrivato);

// PATCH /api/posti-privati/:id/elimina
// Elimina logicamente un posto pubblicato dall'utente autenticato
router.patch('/:id/elimina', eliminaMioPostoPrivato);

// PATCH /api/posti-privati/:id
// Modifica i dati gestibili dall'host proprietario del posto
router.patch('/:id', updateMioPostoPrivato);

// GET /api/posti-privati/:id/prenotazioni
// Dettaglio del posto con prenotazioni future, usato dal calendario
router.get('/:id/prenotazioni', getPostoConPrenotazioni);

// GET /api/posti-privati/:id
// Dettaglio semplice di un posto privato
router.get('/:id', getPostoPrivatoById);

module.exports = router;