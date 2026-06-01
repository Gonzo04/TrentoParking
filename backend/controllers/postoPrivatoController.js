const PostoPrivato = require('../models/PostoPrivato');
const Prenotazione = require('../models/Prenotazione');
const Utente = require('../models/Utente');

function isValidNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateDisponibilita(disponibilita) {
  if (disponibilita === undefined) {
    return [];
  }

  if (!Array.isArray(disponibilita)) {
    return null;
  }

  for (const fascia of disponibilita) {
    const giorno = normalizeString(fascia.giorno).toUpperCase();

    if (!giorno) {
      return null;
    }

    if (!isValidNumber(fascia.oraInizio) || !isValidNumber(fascia.oraFine)) {
      return null;
    }

    if (fascia.oraInizio < 0 || fascia.oraInizio > 23) {
      return null;
    }

    if (fascia.oraFine < 1 || fascia.oraFine > 24) {
      return null;
    }

    if (fascia.oraFine <= fascia.oraInizio) {
      return null;
    }
  }

  return disponibilita.map((fascia) => ({
    giorno: normalizeString(fascia.giorno).toUpperCase(),
    oraInizio: fascia.oraInizio,
    oraFine: fascia.oraFine
  }));
}

function userOwnsPosto(posto, userId) {
  return posto.hostId && posto.hostId.toString() === userId;
}

// GET /api/posti-privati
// Restituisce i posti attivi mostrabili sulla mappa
// I posti eliminati logicamente non vengono più mostrati agli utenti
async function listPostiPrivati(req, res, next) {
  try {
    const posti = await PostoPrivato.find({
      attivo: true,
      eliminato: { $ne: true }
    })
        .populate('hostId', 'nome cognome nomeUtente')
        .sort({ createdAt: -1 })
        .lean();

    return res.json(posti);
  } catch (err) {
    return next(err);
  }
}

// GET /api/posti-privati/miei
// Restituisce solo i posti pubblicati dall'utente autenticato
// Popoliamo hostId per mostrare anche chi ha pubblicato il posto
async function listMieiPostiPrivati(req, res, next) {
  try {
    const posti = await PostoPrivato.find({
      hostId: req.user.userId,
      eliminato: { $ne: true }
    })
        .populate('hostId', 'nome cognome nomeUtente email')
        .sort({ createdAt: -1 })
        .lean();

    return res.json(posti);
  } catch (err) {
    return next(err);
  }
}

// GET /api/posti-privati/:id
// Restituisce il dettaglio di un singolo posto privato attivo
// Se il posto è stato eliminato logicamente viene trattato come non trovato
async function getPostoPrivatoById(req, res, next) {
  try {
    const posto = await PostoPrivato.findOne({
      _id: req.params.id,
      attivo: true,
      eliminato: { $ne: true }
    })
        .populate('hostId', 'nome cognome nomeUtente')
        .lean();

    if (!posto) {
      return res.status(404).json({ error: 'Posto privato non trovato' });
    }

    return res.json(posto);
  } catch (err) {
    return next(err);
  }
}

// GET /api/posti-privati/:id/prenotazioni
// Restituisce il posto e le prenotazioni future necessarie al calendario
// Questa rotta viene usata dal frontend per costruire il flusso di prenotazione
async function getPostoConPrenotazioni(req, res, next) {
  try {
    const posto = await PostoPrivato.findOne({
      _id: req.params.id,
      attivo: true,
      eliminato: { $ne: true }
    })
        .populate('hostId', 'nome cognome nomeUtente')
        .lean();

    if (!posto) {
      return res.status(404).json({ error: 'Posto privato non trovato' });
    }

    const now = new Date();
    const limit = new Date();
    limit.setMonth(limit.getMonth() + 2);

    const prenotazioni = await Prenotazione.find({
      postoPrivatoId: req.params.id,
      stato: { $ne: 'ANNULLATA' },
      dataOraFine: { $gte: now },
      dataOraInizio: { $lte: limit }
    })
        .select('dataOraInizio dataOraFine')
        .lean();

    return res.json({ posto, prenotazioni });
  } catch (err) {
    return next(err);
  }
}

// POST /api/posti-privati
// Crea un posto privato associandolo all'utente autenticato
// L'hostId non arriva dal frontend perché viene preso dal token verificato
async function createPostoPrivato(req, res, next) {
  try {
    const utente = await Utente.findById(req.user.userId);

    if (!utente) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    const {
      nome,
      descrizione,
      posizione,
      tariffaOraria,
      disponibilita,
      caratteristiche,
      dichiarazioneProprietaAccettata
    } = req.body;

    const nomePulito = normalizeString(nome);
    const descrizionePulita = normalizeString(descrizione);

    if (!nomePulito) {
      return res.status(400).json({ error: 'Il nome del posto è obbligatorio' });
    }

    if (!posizione || typeof posizione !== 'object') {
      return res.status(400).json({ error: 'La posizione del posto è obbligatoria' });
    }

    const latitudine = Number(posizione.latitudine);
    const longitudine = Number(posizione.longitudine);

    if (!Number.isFinite(latitudine) || latitudine < -90 || latitudine > 90) {
      return res.status(400).json({ error: 'Latitudine non valida' });
    }

    if (!Number.isFinite(longitudine) || longitudine < -180 || longitudine > 180) {
      return res.status(400).json({ error: 'Longitudine non valida' });
    }

    const tariffa = Number(tariffaOraria);

    if (!Number.isFinite(tariffa) || tariffa < 0) {
      return res.status(400).json({ error: 'Tariffa oraria non valida' });
    }

    if (dichiarazioneProprietaAccettata !== true) {
      return res.status(400).json({
        error: 'Devi dichiarare di essere proprietario del posto o di avere l’autorizzazione a pubblicarlo'
      });
    }

    const disponibilitaValidata = validateDisponibilita(disponibilita);

    if (disponibilitaValidata === null) {
      return res.status(400).json({ error: 'Disponibilità non valida' });
    }

    // Accettiamo solo stringhe non vuote; valori non conformi vengono ignorati silenziosamente
    const caratteristicheValidate = Array.isArray(caratteristiche)
      ? caratteristiche.filter(c => typeof c === 'string' && c.trim().length > 0)
      : [];

    const posto = await PostoPrivato.create({
      hostId: req.user.userId,
      nome: nomePulito,
      descrizione: descrizionePulita,
      posizione: {
        latitudine,
        longitudine,
        indirizzoTestuale: normalizeString(posizione.indirizzoTestuale)
      },
      tariffaOraria: tariffa,
      disponibilita: disponibilitaValidata,
      caratteristiche: caratteristicheValidate,
      attivo: true,
      eliminato: false,
      eliminatoIl: null,
      statoVerifica: 'NON_VERIFICATO',
      dichiarazioneProprietaAccettata: true,
      dataDichiarazioneProprieta: new Date()
    });

    // Al primo posto pubblicato l'utente diventa HOST
    // Questa scelta evita un flusso separato per diventare host
    if (utente.ruolo === 'UTENTE') {
      utente.ruolo = 'HOST';
      await utente.save();
    }

    const postoCreato = await PostoPrivato.findById(posto._id)
        .populate('hostId', 'nome cognome nomeUtente')
        .lean();

    return res.status(201).json(postoCreato);
  } catch (err) {
    return next(err);
  }
}

// POST /api/posti-privati/:id/foto
// Aggiunge foto a un posto esistente. Solo l'host proprietario può farlo.
async function uploadFoto(req, res, next) {
  try {
    const posto = await PostoPrivato.findOne({
      _id: req.params.id,
      hostId: req.user.userId,
    });

    if (!posto) return res.status(404).json({ error: 'Posto non trovato' });

    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: 'Nessuna immagine caricata' });

    const nuoveFoto = req.files.map(f => `/uploads/${f.filename}`);
    posto.foto = [...posto.foto, ...nuoveFoto].slice(0, 10);
    await posto.save();

    res.json({ foto: posto.foto });
  } catch (err) {
    next(err);
// Restituisce tutti i posti non eliminati pubblicati dall'utente loggato
// Includiamo anche quelli non attivi, così l'host può riattivarli dal profilo
async function getMieiPosti(req, res, next) {
  try {
    const posti = await PostoPrivato.find({
      hostId: req.user.userId,
      eliminato: { $ne: true }
    })
        .sort({ createdAt: -1 })
        .lean();

    return res.json(posti);
  } catch (err) {
    return next(err);
  }
}

// Aggiorna nome, descrizione, tariffaOraria, disponibilita e/o caratteristiche
// Solo l'host proprietario può modificare il proprio posto
    async function updatePostoPrivato(req, res, next) {
      try {
        const posto = await PostoPrivato.findById(req.params.id);

        if (!posto || posto.eliminato) {
          return res.status(404).json({ error: 'Posto non trovato' });
        }

        if (posto.hostId.toString() !== req.user.userId) {
          return res.status(403).json({ error: 'Non autorizzato' });
        }
    const { nome, descrizione, tariffaOraria, disponibilita, caratteristiche, attivo } = req.body;

    if (nome !== undefined) {
      const nomePulito = normalizeString(nome);
      if (!nomePulito)
        return res.status(400).json({ error: 'Il nome del posto è obbligatorio' });
      posto.nome = nomePulito;
    }

    if (descrizione !== undefined) {
      posto.descrizione = normalizeString(descrizione);
    }

    if (tariffaOraria !== undefined) {
      const tariffa = Number(tariffaOraria);
      if (!Number.isFinite(tariffa) || tariffa < 0)
        return res.status(400).json({ error: 'Tariffa oraria non valida' });
      posto.tariffaOraria = tariffa;
    }

    if (disponibilita !== undefined) {
      const dispValidata = validateDisponibilita(disponibilita);
      if (dispValidata === null)
        return res.status(400).json({ error: 'Disponibilità non valida' });
      posto.disponibilita = dispValidata;
    }

    if (caratteristiche !== undefined) {
      posto.caratteristiche = Array.isArray(caratteristiche)
        ? caratteristiche.filter(c => typeof c === 'string' && c.trim().length > 0)
        : [];
    }

    if (attivo !== undefined) {
      posto.attivo = Boolean(attivo);
    }

    await posto.save();
    const updated = await PostoPrivato.findById(posto._id).lean();
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
}

// Elimina logicamente il posto dal punto di vista dell'utente
// Non cancelliamo il documento dal database perché può servire per storico e controlli futuri
async function deletePostoPrivato(req, res, next) {
  try {
    const posto = await PostoPrivato.findById(req.params.id);

    if (!posto || posto.eliminato) {
      return res.status(404).json({ error: 'Posto non trovato' });
    }

    if (posto.hostId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    posto.attivo = false;
    posto.eliminato = true;
    posto.eliminatoIl = new Date();

    await posto.save();

    return res.json({
      message: 'Posto eliminato correttamente',
      posto
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listPostiPrivati,
  listMieiPostiPrivati,
  getPostoPrivatoById,
  getPostoConPrenotazioni,
  createPostoPrivato,
  uploadFoto,
  getMieiPosti,
  updatePostoPrivato,
  deletePostoPrivato,
};