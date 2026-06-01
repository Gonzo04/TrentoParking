const express = require('express');
const requireAuth = require('../middleware/auth');
const upload = require('../utils/upload');
const {
  listPostiPrivati,
  getPostoPrivatoById,
  getPostoConPrenotazioni,
  createPostoPrivato,
  uploadFoto,
  getMieiPosti,
  updatePostoPrivato,
  deletePostoPrivato,
} = require('../controllers/postoPrivatoController');

const router = express.Router();

// Tutte le rotte dei posti privati richiedono autenticazione.
router.use(requireAuth);

// GET /api/posti-privati
router.get('/', listPostiPrivati);

// GET /api/posti-privati/miei
// Lista dei posti pubblicati dall'utente autenticato
// Deve stare prima di /:id, altrimenti Express leggerebbe "miei" come id
router.get('/miei', getMieiPosti);

// POST /api/posti-privati
router.post('/', createPostoPrivato);

// GET /api/posti-privati/:id/prenotazioni
router.get('/:id/prenotazioni', getPostoConPrenotazioni);

// POST /api/posti-privati/:id/foto
// Caricamento foto per un posto privato (solo l'host proprietario).
router.post('/:id/foto', upload.array('foto', 10), uploadFoto);

// GET /api/posti-privati/:id
router.get('/:id', getPostoPrivatoById);

// PATCH /api/posti-privati/:id
router.patch('/:id', updatePostoPrivato);

// DELETE /api/posti-privati/:id
router.delete('/:id', deletePostoPrivato);

module.exports = router;