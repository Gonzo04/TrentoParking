const express = require('express');
const requireAuth = require('../middleware/auth');
const {
    listPostiPrivati,
    createPostoPrivato
} = require('../controllers/postoPrivatoController');

const router = express.Router();

// La lista dei posti privati richiede login perché nella nostra app
// la mappa è visibile solo agli utenti autenticati.
router.get('/', requireAuth, listPostiPrivati);

// Anche la creazione richiede login: il backend userà req.user.userId
// per associare il posto all'utente che lo pubblica.
router.post('/', requireAuth, createPostoPrivato);

module.exports = router;