const bcrypt = require('bcryptjs');
const Utente = require('../models/Utente');
const { signToken } = require('../utils/jwt');

function buildUserResponse(utente) {
  return {
    id: utente._id,
    email: utente.email,
    nome: utente.nome,
    cognome: utente.cognome,
    ruolo: utente.ruolo,
    emailVerificata: utente.emailVerificata,
    punti: utente.punti,
    livello: utente.livello
  };
}

async function register(req, res, next) {
  try {
    const { nome, cognome, email, password, ruolo } = req.body;

    if (!nome || !cognome || !email || !password) {
      return res.status(400).json({
        error: 'Nome, cognome, email e password sono obbligatori'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'La password deve contenere almeno 8 caratteri'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await Utente.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        error: 'Email già registrata'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const utente = await Utente.create({
      nome: nome.trim(),
      cognome: cognome.trim(),
      email: normalizedEmail,
      passwordHash,
      ruolo: ruolo || 'UTENTE'
    });

    const token = signToken({
      userId: utente._id,
      email: utente.email,
      ruolo: utente.ruolo
    });

    return res.status(201).json({
      token,
      user: buildUserResponse(utente)
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email e password sono obbligatorie'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const utente = await Utente.findOne({ email: normalizedEmail });
    if (!utente) {
      return res.status(401).json({
        error: 'Credenziali non valide'
      });
    }

    const passwordOk = await bcrypt.compare(password, utente.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({
        error: 'Credenziali non valide'
      });
    }

    const token = signToken({
      userId: utente._id,
      email: utente.email,
      ruolo: utente.ruolo
    });

    return res.json({
      token,
      user: buildUserResponse(utente)
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login
};
