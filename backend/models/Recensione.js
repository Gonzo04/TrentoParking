const mongoose = require('mongoose');

const recensioneSchema = new mongoose.Schema({
  utenteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utente',
    required: true,
    index: true
  },

  postoPrivatoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PostoPrivato',
    required: true,
    index: true
  },

  voto: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: { validator: Number.isInteger, message: 'Il voto deve essere un numero intero.' }
  },

  testo: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500
  }
}, {
  collection: 'recensioni',
  timestamps: true
});

// Un utente può lasciare al massimo una recensione per posto
recensioneSchema.index({ utenteId: 1, postoPrivatoId: 1 }, { unique: true });

module.exports = mongoose.model('Recensione', recensioneSchema);
