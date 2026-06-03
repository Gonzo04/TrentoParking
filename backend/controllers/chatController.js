const Messaggio = require('../models/Messaggio');
const Prenotazione = require('../models/Prenotazione');

async function checkAccess(req, res) {
  const prenotazione = await Prenotazione.findById(req.params.id)
    .populate('postoPrivatoId', 'hostId');
  if (!prenotazione) {
    res.status(404).json({ error: 'Prenotazione non trovata' });
    return null;
  }
  const userId = req.user.userId;
  const isBooker = prenotazione.utenteId.toString() === userId;
  const isHost   = prenotazione.postoPrivatoId?.hostId?.toString() === userId;
  if (!isBooker && !isHost) {
    res.status(403).json({ error: 'Non autorizzato' });
    return null;
  }
  return prenotazione;
}

async function getMessages(req, res, next) {
  try {
    const prenotazione = await checkAccess(req, res);
    if (!prenotazione) return;
    const messaggi = await Messaggio.find({ prenotazioneId: req.params.id })
      .sort({ createdAt: 1 })
      .populate('mittente', 'nome cognome nomeUtente');
    res.json(messaggi);
  } catch (err) { next(err); }
}

async function sendMessage(req, res, next) {
  try {
    const prenotazione = await checkAccess(req, res);
    if (!prenotazione) return;
    const { testo } = req.body;
    if (!testo?.trim()) return res.status(400).json({ error: 'Il testo è obbligatorio' });
    const msg = await Messaggio.create({
      prenotazioneId: req.params.id,
      mittente: req.user.userId,
      testo: testo.trim(),
    });
    const populated = await msg.populate('mittente', 'nome cognome nomeUtente');
    res.status(201).json(populated);
  } catch (err) { next(err); }
}

module.exports = { getMessages, sendMessage };
