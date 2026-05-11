const mongoose = require('mongoose');

const tokenResetPasswordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utente',
    required: true
  },

  token: {
    type: String,
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // 1 ora in secondi
  }
});

module.exports = mongoose.model('TokenResetPassword', tokenResetPasswordSchema);