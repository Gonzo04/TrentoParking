const mongoose = require('mongoose');

const prenotazioneSchema = new mongoose.Schema({
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

  dataOraInizio: {
    type: Date,
    required: true
  },

  dataOraFine: {
    type: Date,
    required: true
  },

  targa: {
    type: String,
    required: true,
    trim: true
  },

  stato: {
    type: String,
    enum: ['IN_ATTESA_PAGAMENTO', 'PAGATA', 'ANNULLATA', 'SCADUTA'],
    default: 'IN_ATTESA_PAGAMENTO'
  },
// Scadenza entro cui l'utente deve completare il pagamento mock
  // Se la data passa, la prenotazione non deve più bloccare lo slot

  scadenzaPagamento: {
    type: Date,
    default: null
  },

  prezzoTotale: {
    type: Number,
    required: true,
    min: 0
  },

  recensioneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recensione',
    default: null,
  },
}, {
  collection: 'prenotazioni',
  timestamps: true
});

module.exports = mongoose.model('Prenotazione', prenotazioneSchema);
