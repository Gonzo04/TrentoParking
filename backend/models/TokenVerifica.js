const mongoose = require('mongoose');
const TokenVerificaMailSchema = new mongoose.Schema({
    userId:{
        type: String,
        ref: "user",
        required: true,
    },
    token:{
        type: String,
        required: true,
    },
    createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // 24 ore in secondi
  }
})
module.exports = mongoose.model('TokenVerifica', TokenVerificaMailSchema)
