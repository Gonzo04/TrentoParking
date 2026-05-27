const Recensione = require('../models/Recensione');
const Prenotazione = require('../models/Prenotazione');

// POST /api/recensioni
// Crea una recensione. L'utente deve avere almeno una prenotazione PAGATA per quel posto.
async function createRecensione(req, res, next) {
  try {
    const { postoPrivatoId, voto, testo } = req.body;

    if (!postoPrivatoId || voto === undefined)
      return res.status(400).json({ error: 'postoPrivatoId e voto sono obbligatori' });

    const votoNum = Number(voto);
    if (!Number.isInteger(votoNum) || votoNum < 1 || votoNum > 5)
      return res.status(400).json({ error: 'Il voto deve essere un numero intero tra 1 e 5' });

    const booking = await Prenotazione.findOne({
      utenteId: req.user.userId,
      postoPrivatoId,
      stato: 'PAGATA',
    });

    if (!booking)
      return res.status(403).json({ error: 'Puoi recensire solo posti che hai prenotato e pagato' });

    const recensione = await Recensione.create({
      utenteId: req.user.userId,
      postoPrivatoId,
      voto: votoNum,
      testo: (testo || '').trim(),
    });

    res.status(201).json(recensione);
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ error: 'Hai già lasciato una recensione per questo posto' });
    next(err);
  }
}

// GET /api/recensioni/posto/:id
// Restituisce le recensioni di un posto con media e totale.
async function getRecensioniByPosto(req, res, next) {
  try {
    const recensioni = await Recensione.find({ postoPrivatoId: req.params.id })
      .populate('utenteId', 'nomeUtente')
      .sort({ createdAt: -1 })
      .lean();

    const media = recensioni.length
      ? Math.round((recensioni.reduce((sum, r) => sum + r.voto, 0) / recensioni.length) * 10) / 10
      : null;

    res.json({ recensioni, media, totale: recensioni.length });
  } catch (err) {
    next(err);
  }
}

// GET /api/recensioni/mie
// Restituisce le recensioni dell'utente loggato (per sapere quali posti ha già recensito).
async function getMyRecensioni(req, res, next) {
  try {
    const recensioni = await Recensione.find({ utenteId: req.user.userId })
      .select('postoPrivatoId')
      .lean();
    res.json(recensioni);
  } catch (err) {
    next(err);
  }
}

module.exports = { createRecensione, getRecensioniByPosto, getMyRecensioni };
