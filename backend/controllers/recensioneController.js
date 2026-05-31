const Recensione = require('../models/Recensione');
const Prenotazione = require('../models/Prenotazione');
const PostoPrivato = require('../models/PostoPrivato');
const Utente = require('../models/Utente');

// Crea una recensione per una prenotazione scaduta e pagata
async function createRecensione(req, res, next) {
  try {
    const { prenotazioneId, stelle, testo } = req.body;

    if (!prenotazioneId) {
      return res.status(400).json({ error: 'prenotazioneId è obbligatorio' });
    }

    const stelleNum = Number(stelle);
    if (!Number.isInteger(stelleNum) || stelleNum < 1 || stelleNum > 5) {
      return res.status(400).json({ error: 'stelle deve essere un intero tra 1 e 5' });
    }

    const prenotazione = await Prenotazione.findById(prenotazioneId);

    if (!prenotazione) {
      return res.status(404).json({ error: 'Prenotazione non trovata' });
    }

    if (prenotazione.utenteId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    if (prenotazione.stato !== 'PAGATA') {
      return res.status(400).json({ error: 'Puoi recensire solo prenotazioni pagate' });
    }

    if (prenotazione.recensioneId) {
      return res.status(409).json({ error: 'Hai già lasciato una recensione per questa prenotazione' });
    }

    const posto = await PostoPrivato.findById(prenotazione.postoPrivatoId).lean();
    if (!posto) {
      return res.status(404).json({ error: 'Posto non trovato' });
    }

    const recensione = await Recensione.create({
      prenotazioneId,
      utenteId: req.user.userId,
      postoPrivatoId: prenotazione.postoPrivatoId,
      hostId: posto.hostId,
      stelle: stelleNum,
      testo: typeof testo === 'string' ? testo.trim().slice(0, 500) : '',
    });

    prenotazione.recensioneId = recensione._id;
    await prenotazione.save();

    const recensionePopulata = await Recensione.findById(recensione._id)
      .populate('utenteId', 'nome cognome nomeUtente')
      .lean();

    return res.status(201).json(recensionePopulata);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Hai già lasciato una recensione per questa prenotazione' });
    }
    return next(err);
  }
}

// Ritorna tutte le recensioni per i posti di un host, raggruppate per posto
async function getRecensioniHost(req, res, next) {
  try {
    const host = await Utente.findById(req.params.hostId)
      .select('nome cognome nomeUtente')
      .lean();

    if (!host) {
      return res.status(404).json({ error: 'Host non trovato' });
    }

    const posti = await PostoPrivato.find({
      hostId: req.params.hostId,
      eliminato: { $ne: true },
    })
      .select('nome posizione')
      .lean();

    const postiIds = posti.map(p => p._id);

    const recensioni = await Recensione.find({ postoPrivatoId: { $in: postiIds } })
      .populate('utenteId', 'nome cognome nomeUtente')
      .sort({ createdAt: -1 })
      .lean();

    const recensioniPerPosto = {};
    for (const r of recensioni) {
      const key = r.postoPrivatoId.toString();
      if (!recensioniPerPosto[key]) recensioniPerPosto[key] = [];
      recensioniPerPosto[key].push(r);
    }

    const postiConRecensioni = posti
      .filter(p => recensioniPerPosto[p._id.toString()]?.length > 0)
      .map(p => {
        const lista = recensioniPerPosto[p._id.toString()] || [];
        const media = lista.length
          ? Math.round((lista.reduce((s, r) => s + r.stelle, 0) / lista.length) * 10) / 10
          : null;
        return { posto: p, mediaStelle: media, totale: lista.length, recensioni: lista };
      });

    return res.json({ host, posti: postiConRecensioni });
  } catch (err) {
    return next(err);
  }
}

// Ritorna le recensioni per un singolo posto
async function getRecensioniPosto(req, res, next) {
  try {
    const recensioni = await Recensione.find({ postoPrivatoId: req.params.postoId })
      .populate('utenteId', 'nome cognome nomeUtente')
      .sort({ createdAt: -1 })
      .lean();

    return res.json(recensioni);
  } catch (err) {
    return next(err);
  }
}

module.exports = { createRecensione, getRecensioniHost, getRecensioniPosto };
