const mongoose = require('mongoose');

const utenteSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  nomeUtente: {
    type: String,
    required: true,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9._-]+$/
  },

  nome: {
    type: String,
    required: true,
    trim: true
  },

  cognome: {
    type: String,
    required: true,
    trim: true
  },

  passwordHash: {
    type: String,
    required: true
  },

  // Il ruolo viene gestito dal backend.
  // Un nuovo utente viene creato come UTENTE e non può scegliere il proprio ruolo dal frontend.
  ruolo: {
    type: String,
    enum: ['UTENTE', 'HOST', 'AMMINISTRATORE'],
    default: 'UTENTE',
    required: true
  },

  emailVerificata: {
    type: Boolean,
    default: false
  },

  punti: {
    type: Number,
    default: 0,
    min: 0
  },

  livello: {
    type: String,
    default: 'Base',
    trim: true
  },

  // La targa è obbligatoria perché verrà usata nelle prenotazioni dei posti privati.
  // Per il prototipo accettiamo solo lettere e numeri, senza spazi o simboli.
  targa: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    match: /^[A-Z0-9]{5,10}$/
  }
}, {
  collection: 'utenti',
  timestamps: true
});

module.exports = mongoose.model('Utente', utenteSchema);