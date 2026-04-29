const bcrypt = require('bcryptjs');
const Utente = require('../models/Utente');
const { signToken } = require('../utils/jwt');

// Espressioni regolari usate per validare i dati ricevuti dal client.
// La validazione viene fatta anche nel backend perché il frontend può essere aggirato
// facilmente usando strumenti come Postman, curl o richieste HTTP manuali.
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,30}$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const TARGA_REGEX = /^[A-Z0-9]{5,10}$/;

// Costruisce l'oggetto utente da restituire al frontend.
// Non restituiamo mai passwordHash, perché è un dato interno e sensibile.
function buildUserResponse(user) {
  return {
    id: user._id,
    email: user.email,
    nomeUtente: user.nomeUtente,
    nome: user.nome,
    cognome: user.cognome,
    ruolo: user.ruolo,
    emailVerificata: user.emailVerificata,
    punti: user.punti,
    livello: user.livello,
    targa: user.targa
  };
}

// Registra un nuovo utente nel sistema.
//
// Scelte importanti:
// il ruolo non viene mai letto dal body della richiesta;
// ogni nuovo account viene creato sempre con ruolo UTENTE;
// username, password e targa vengono validati lato server;
// la password viene salvata solo come hash, mai in chiaro.
async function register(req, res) {
  try {
    const { nome, cognome, nomeUtente, email, password, targa } = req.body;

    // Controlliamo che tutti i campi necessari alla registrazione siano presenti.
    // Se manca anche un solo campo, la richiesta viene rifiutata.
    if (!nome || !cognome || !nomeUtente || !email || !password || !targa) {
      return res.status(400).json({
        message: 'Nome, cognome, nome utente, email, password e targa sono obbligatori'
      });
    }

    // Normalizziamo i dati prima di validarli e salvarli.
    // Questo evita duplicati causati da maiuscole/minuscole o spazi accidentali.
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = nomeUtente.trim().toLowerCase();
    const normalizedTarga = targa.trim().toUpperCase();

    // Validazione del nome utente.
    // Accettiamo solo caratteri semplici per avere username leggibili e facili da usare.
    if (!USERNAME_REGEX.test(normalizedUsername)) {
      return res.status(400).json({
        message: 'Il nome utente deve avere 3-30 caratteri e può contenere solo lettere, numeri, punto, trattino e underscore'
      });
    }

    // Validazione minima della password.
    // Non è una regola perfetta, ma evita password troppo deboli per il prototipo.
    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        message: 'La password deve avere almeno 8 caratteri, una lettera maiuscola e un numero'
      });
    }

    // Validazione semplice della targa.
    // Per questa versione accettiamo solo lettere e numeri, senza spazi o simboli.
    if (!TARGA_REGEX.test(normalizedTarga)) {
      return res.status(400).json({
        message: 'La targa deve contenere solo lettere e numeri, da 5 a 10 caratteri'
      });
    }

    // Controlliamo se esiste già un utente con la stessa email o lo stesso nome utente.
    // Entrambi devono essere univoci.
    const existingUser = await Utente.findOne({
      $or: [
        { email: normalizedEmail },
        { nomeUtente: normalizedUsername }
      ]
    });

    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        return res.status(409).json({
          message: 'Email già registrata'
        });
      }

      if (existingUser.nomeUtente === normalizedUsername) {
        return res.status(409).json({
          message: 'Nome utente già in uso'
        });
      }

      return res.status(409).json({
        message: 'Utente già esistente'
      });
    }

    // Calcoliamo l'hash della password.
    // Nel database non deve mai essere salvata la password originale.
    const passwordHash = await bcrypt.hash(password, 10);

    // Creiamo il nuovo utente.
    // Il ruolo viene imposto dal backend per evitare escalation di privilegi.
    const user = await Utente.create({
      nome: nome.trim(),
      cognome: cognome.trim(),
      nomeUtente: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      targa: normalizedTarga,
      ruolo: 'UTENTE'
    });

    // Generiamo il token JWT con le informazioni minime utili.
    // Non inseriamo dati sensibili nel token.
    const token = signToken({
      userId: user._id,
      email: user.email,
      nomeUtente: user.nomeUtente,
      ruolo: user.ruolo
    });

    return res.status(201).json({
      message: 'Registrazione effettuata con successo',
      token,
      user: buildUserResponse(user)
    });
  } catch (error) {
    console.error('Errore register:', error);

    // Gestione dei duplicati intercettati direttamente da MongoDB.
    // Può succedere se due richieste simili arrivano quasi nello stesso momento.
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Email o nome utente già registrato'
      });
    }

    return res.status(500).json({
      message: 'Errore interno durante la registrazione'
    });
  }
}

// Effettua il login dell'utente.
//
// L'utente può accedere usando email + password oppure nomeUtente + password.
// Per questo motivo usiamo il campo generico identifier.
async function login(req, res) {
  try {
    const { identifier, email, password } = req.body;

    // Manteniamo anche il campo email per compatibilità con eventuali vecchi test
    // o vecchie versioni del frontend.
    const loginIdentifier = identifier || email;

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        message: 'Email/nome utente e password sono obbligatori'
      });
    }

    const normalizedIdentifier = loginIdentifier.trim().toLowerCase();

    // Cerchiamo l'utente sia per email sia per nome utente.
    // In questo modo il frontend può usare un unico campo di login.
    const user = await Utente.findOne({
      $or: [
        { email: normalizedIdentifier },
        { nomeUtente: normalizedIdentifier }
      ]
    });

    // Messaggio volutamente generico.
    // Non diciamo se è sbagliato l'identificatore o la password,
    // così non aiutiamo un possibile attaccante a capire quali account esistono.
    if (!user) {
      return res.status(401).json({
        message: 'Credenziali non valide'
      });
    }

    // Confrontiamo la password ricevuta con l'hash salvato nel database.
    const passwordOk = await bcrypt.compare(password, user.passwordHash);

    if (!passwordOk) {
      return res.status(401).json({
        message: 'Credenziali non valide'
      });
    }

    const token = signToken({
      userId: user._id,
      email: user.email,
      nomeUtente: user.nomeUtente,
      ruolo: user.ruolo
    });

    return res.json({
      message: 'Login effettuato con successo',
      token,
      user: buildUserResponse(user)
    });
  } catch (error) {
    console.error('Errore login:', error);

    return res.status(500).json({
      message: 'Errore interno durante il login'
    });
  }
}

// Restituisce i dati dell'utente autenticato.
// L'id dell'utente viene inserito in req.user dal middleware requireAuth.
async function me(req, res) {
  try {
    const user = await Utente.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: 'Utente non trovato'
      });
    }

    return res.json({
      user: buildUserResponse(user)
    });
  } catch (error) {
    console.error('Errore me:', error);

    return res.status(500).json({
      message: 'Errore interno durante il recupero utente'
    });
  }
}

// Logout dell'utente.
//
// In questa versione il JWT è stateless.
// Questo significa che il backend non conserva una sessione da eliminare.
// Il logout reale avviene nel frontend, rimuovendo il token dal localStorage.
//
// In una versione futura si potrebbe aggiungere una blacklist dei token
// oppure un sistema con refresh token.
async function logout(req, res) {
  return res.json({
    message: 'Logout effettuato lato client'
  });
}

module.exports = {
  register,
  login,
  me,
  logout
};