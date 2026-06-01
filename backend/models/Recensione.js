const mongoose = require('mongoose');

const recensioneSchema = new mongoose.Schema({
  prenotazioneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prenotazione',
    required: true,
    unique: true,
  },

  utenteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utente',
    required: true,
    index: true,
  },

  postoPrivatoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PostoPrivato',
    required: true,
    index: true,
  },

  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utente',
    required: true,
    index: true,
  },

  stelle: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },

  testo: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
}, {
  collection: 'recensioni',
  timestamps: true,
});

module.exports = mongoose.model('Recensione', recensioneSchema);
