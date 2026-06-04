const Utente = require('../models/Utente');

async function requireAdmin(req, res, next) {
  try {
    const user = await Utente.findById(req.user.userId).select('ruolo');
    if (!user || user.ruolo !== 'AMMINISTRATORE') {
      return res.status(403).json({ error: 'Accesso riservato agli amministratori' });
    }
    next();
  } catch {
    res.status(500).json({ error: 'Errore interno' });
  }
}

module.exports = requireAdmin;
