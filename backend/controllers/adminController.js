const Utente = require('../models/Utente');
const PostoPrivato = require('../models/PostoPrivato');
const Prenotazione = require('../models/Prenotazione');

// GET /api/admin/utenti
async function listUtenti(req, res, next) {
  // TODO: Utente.find({}, '-passwordHash')
  res.status(501).json({ error: 'Not implemented' });
}

// PUT /api/admin/utenti/:id
async function updateUtente(req, res, next) {
  // TODO: validate body { ruolo, emailVerificata }
  // TODO: Utente.findByIdAndUpdate, return without passwordHash
  res.status(501).json({ error: 'Not implemented' });
}

// GET /api/admin/posti
async function listAllPosti(req, res, next) {
  // TODO: PostoPrivato.find({}).populate('hostId', 'email nome cognome')
  res.status(501).json({ error: 'Not implemented' });
}

// GET /api/admin/prenotazioni
async function listAllPrenotazioni(req, res, next) {
  // TODO: Prenotazione.find({}).populate('utenteId postoPrivatoId')
  res.status(501).json({ error: 'Not implemented' });
}

module.exports = { listUtenti, updateUtente, listAllPosti, listAllPrenotazioni };
