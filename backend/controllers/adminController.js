const Utente = require('../models/Utente');
const PostoPrivato = require('../models/PostoPrivato');
const Prenotazione = require('../models/Prenotazione');

/* ── Utenti ─────────────────────────────────────────────────────────── */

async function getUsers(req, res) {
  try {
    const users = await Utente.find()
      .select('-passwordHash')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Errore interno' });
  }
}

async function updateUser(req, res) {
  try {
    const { ruolo, emailVerificata } = req.body;
    const allowed = {};
    if (ruolo !== undefined) {
      if (!['UTENTE', 'HOST', 'AMMINISTRATORE'].includes(ruolo)) {
        return res.status(400).json({ error: 'Ruolo non valido' });
      }
      allowed.ruolo = ruolo;
    }
    if (emailVerificata !== undefined) allowed.emailVerificata = emailVerificata;

    const user = await Utente.findByIdAndUpdate(req.params.id, allowed, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Errore interno' });
  }
}

async function deleteUser(req, res) {
  try {
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: 'Non puoi eliminare il tuo account' });
    }
    const user = await Utente.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });
    res.json({ message: 'Utente eliminato' });
  } catch {
    res.status(500).json({ error: 'Errore interno' });
  }
}

/* ── Posti ──────────────────────────────────────────────────────────── */

async function getSpots(req, res) {
  try {
    const spots = await PostoPrivato.find()
      .populate('hostId', 'nome cognome email nomeUtente')
      .sort({ createdAt: -1 });
    res.json(spots);
  } catch {
    res.status(500).json({ error: 'Errore interno' });
  }
}

async function deleteSpot(req, res) {
  try {
    const spot = await PostoPrivato.findByIdAndDelete(req.params.id);
    if (!spot) return res.status(404).json({ error: 'Posto non trovato' });
    res.json({ message: 'Posto eliminato' });
  } catch {
    res.status(500).json({ error: 'Errore interno' });
  }
}

/* ── Prenotazioni ───────────────────────────────────────────────────── */

async function getBookings(req, res) {
  try {
    const bookings = await Prenotazione.find()
      .populate('utenteId', 'nome cognome email nomeUtente')
      .populate('postoPrivatoId', 'nome posizione hostId')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch {
    res.status(500).json({ error: 'Errore interno' });
  }
}

async function cancelBooking(req, res) {
  try {
    const booking = await Prenotazione.findByIdAndUpdate(
      req.params.id,
      { stato: 'ANNULLATA' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: 'Prenotazione non trovata' });
    res.json(booking);
  } catch {
    res.status(500).json({ error: 'Errore interno' });
  }
}

module.exports = { getUsers, updateUser, deleteUser, getSpots, deleteSpot, getBookings, cancelBooking };
