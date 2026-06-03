const mongoose = require('mongoose');

const messaggioSchema = new mongoose.Schema({
  prenotazioneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prenotazione',
    required: true,
    index: true,
  },
  mittente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utente',
    required: true,
  },
  testo: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
}, { collection: 'messaggi', timestamps: true });

module.exports = mongoose.model('Messaggio', messaggioSchema);
