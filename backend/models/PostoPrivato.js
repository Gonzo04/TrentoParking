const mongoose = require('mongoose');

const disponibilitaSchema = new mongoose.Schema({
  giorno: {
    type: String,
    required: true
  },

  oraInizio: {
    type: Number,
    required: true,
    min: 0,
    max: 23
  },

  oraFine: {
    type: Number,
    required: true,
    min: 1,
    max: 24
  }
}, {
  _id: false
});

const posizioneSchema = new mongoose.Schema({
  latitudine: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },

  longitudine: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },

  indirizzoTestuale: {
    type: String,
    default: '',
    trim: true
  }
}, {
  _id: false
});

const postoPrivatoSchema = new mongoose.Schema({
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utente',
    required: true,
    index: true
  },

  nome: {
    type: String,
    required: true,
    trim: true
  },

  descrizione: {
    type: String,
    default: '',
    trim: true
  },

  posizione: {
    type: posizioneSchema,
    required: true
  },

  tariffaOraria: {
    type: Number,
    required: true,
    min: 0
  },

  attivo: {
    type: Boolean,
    default: true
  },

  disponibilita: {
    type: [disponibilitaSchema],
    default: []
  }
}, {
  collection: 'posti_privati',
  timestamps: true
});

module.exports = mongoose.model('PostoPrivato', postoPrivatoSchema);
