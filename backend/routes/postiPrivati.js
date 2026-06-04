const express = require('express');
const requireAuth = require('../middleware/auth');
const upload = require('../utils/upload');
const {
  listPostiPrivati,
  getPostoPrivatoById,
  getPostoConPrenotazioni,
  createPostoPrivato,
  checkUploadFotoPermission,
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
// Usiamo la forma esplicita con callback invece di passare upload.array direttamente
// come middleware: in multer v2 gli errori (tipo file size o MIME non valido)
// non raggiungono il global error handler se non gestiti esplicitamente qui.
router.post('/:id/foto', checkUploadFotoPermission, (req, res, next) => {
  upload.array('foto', 10)(req, res, (err) => {
    if (!err) return next();

    // Puliamo eventuali file già scritti su disco prima di rispondere
    (req.files ?? []).forEach(f => {
      if (f?.path) require('fs').unlink(f.path, () => {});
    });

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Un file supera la dimensione massima di 5 MB' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Puoi caricare al massimo 10 foto' });
    }
    return res.status(400).json({ error: err.message || 'Errore nel caricamento delle foto' });
  });
}, uploadFoto);
// GET /api/posti-privati/:id
router.get('/:id', getPostoPrivatoById);

// PATCH /api/posti-privati/:id
router.patch('/:id', updatePostoPrivato);

// DELETE /api/posti-privati/:id
router.delete('/:id', deletePostoPrivato);

module.exports = router;