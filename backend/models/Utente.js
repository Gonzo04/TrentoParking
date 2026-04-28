const mongoose = require('mongoose');

const utenteSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
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

  ruolo: {
    type: String,
    enum: ['UTENTE', 'HOST', 'AMMINISTRATORE'],
    default: 'UTENTE'
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
    default: 'base'
  },

  targa: {
    type: String,
    default: '',
    trim: true
  }
}, {
  collection: 'utenti',
  timestamps: true
});

module.exports = mongoose.model('Utente', utenteSchema);
