const bcrypt = require('bcryptjs');
const Utente = require('../models/Utente');
const { signToken } = require('../utils/jwt');
// moduli per la verifica della email;
const TokenVerificaMail = require('../models/TokenVerifica');
const crypto = require('crypto');
const { verificaEmail } = require('../utils/verificaMail');
// moduli per il reset della password
const TokenResetPassword = require('../models/TokenResetPassword');
const { sendResetPasswordEmail } = require('../utils/resetPasswordMail')

// Espressioni regolari usate per validare i dati ricevuti dal client.
// La validazione viene fatta anche nel backend perché il frontend può essere aggirato
// facilmente usando strumenti come Postman, curl o richieste HTTP manuali.
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,30}$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const TARGA_REGEX = /^[A-Z0-9]{5,10}$/;

// Funzione per il reinvio della mail di conferma in caso l'utente prema sul pulsante di rinvio
async function resendVerificationEmail(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email obbligatoria'
      });
    }

    const user = await Utente.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user) {
      return res.status(404).json({
        message: 'Utente non trovato'
      });
    }

    if (user.emailVerificata) {
      return res.status(400).json({
        message: 'Email già verificata'
      });
    }

    await TokenVerificaMail.deleteMany({
      userId: user._id
    });

    const tokenMail = await TokenVerificaMail.create({
      userId: user._id,
      token: crypto.randomBytes(16).toString('hex')
    });

    const link = `http://localhost:8080/api/auth/conferma/${tokenMail.token}`;

    await verificaEmail(user.email, link);

    return res.json({
      message: 'Email reinviata con successo'
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: 'Errore reinvio email'
    });
  }
}

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
        // Se l'utente esiste ma non ha ancora verificato la mail,
        // potrebbe essere un "fantasma" rimasto da un tentativo precedente in cui
        // l'invio email era fallito prima che il rollback fosse implementato.
        // In questo caso lo eliminiamo (con il suo token) e permettiamo la nuova registrazione,
        // così l'utente non rimane bloccato per sempre.
        if (!existingUser.emailVerificata) {
          await Utente.findByIdAndDelete(existingUser._id);
          await TokenVerificaMail.deleteMany({ userId: existingUser._id });
          // la registrazione prosegue normalmente
        } else {
          return res.status(409).json({
            message: 'Email già registrata'
          });
        }
      } else if (existingUser.nomeUtente === normalizedUsername) {
        return res.status(409).json({
          message: 'Nome utente già in uso'
        });
      } else {
        return res.status(409).json({
          message: 'Utente già esistente'
        });
      }
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
    // Generiamo il token e tentiamo l’invio dell’email di verifica.
    // Se l’invio fallisce eseguiamo il rollback (eliminiamo utente e token)
    // così l’utente non si ritrova in uno stato inconsistente:
    // account creato in DB ma impossibile da verificare → "email già registrata" al prossimo tentativo.
    let tokenMail;
    try {
      tokenMail = await TokenVerificaMail.create({
        userId: user._id,
        token: crypto.randomBytes(16).toString('hex')
      });

      const link = `http://localhost:8080/api/auth/conferma/${tokenMail.token}`;
      await verificaEmail(user.email, link);
    } catch (emailError) {
      // Rollback: rimuoviamo utente e token per permettere un nuovo tentativo pulito
      await Utente.findByIdAndDelete(user._id);
      await TokenVerificaMail.deleteMany({ userId: user._id });
      console.error('Errore invio email di verifica — rollback eseguito:', emailError);
      return res.status(500).json({
        message: "Impossibile inviare l’email di verifica. Controlla la connessione e riprova."
      });
    }

    // Generiamo il token JWT con le informazioni minime utili.
    // Non inseriamo dati sensibili nel token.
    if (user.emailVerificata === true) {
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
    }

    // Utente registrato ma email non ancora verificata
    return res.status(201).json({
      message: "Registrazione completata. Controlla la tua email per confermare l’account.",
      emailVerificata: false
    })
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

    if (!user.emailVerificata) {
      return res.status(403).json({
      message: 'Verifica la tua email prima di accedere'
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

// Funzione per quando l'utente richiede il reset della password
async function richiediResetPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email obbligatoria'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await Utente.findOne({
      email: normalizedEmail
    });

    if (!user) {
      return res.status(404).json({
        message: 'Utente non trovato'
      });
    }

    // elimina vecchi token reset
    await TokenResetPassword.deleteMany({
      userId: user._id
    });

    const resetToken = crypto
      .randomBytes(32)
      .toString('hex');

    await TokenResetPassword.create({
      userId: user._id,
      token: resetToken
    });

    const resetLink =
      `http://localhost:5173/reset-password/${resetToken}`;

    await sendResetPasswordEmail(
      user.email,
      resetLink
    );

    return res.json({
      message:
        'Email reset password inviata'
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message:
        'Errore durante il recupero password'
    });
  }
}

// Funzione per il cambio password effettivo
async function resetPassword(req, res) {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: 'Password obbligatoria'
      });
    }

    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        message: 'Password non valida'
      });
    }

    const tokenDoc = await TokenResetPassword.findOne({ token });
    if (!tokenDoc) {
      return res.status(400).json({
        message: 'Token non valido o scaduto'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await Utente.findByIdAndUpdate(
      tokenDoc.userId,
      { passwordHash }
    );

    await TokenResetPassword.findByIdAndDelete(
      tokenDoc._id
    );

    return res.json({
      message: 'Password aggiornata'
    });
  } catch (error) {

    console.error(error);

    return res.status(500).json({
      message: 'Errore interno'
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

// Aggiorna i dati modificabili del profilo: nome, cognome, targa.
// Non tocca email, password o nomeUtente per sicurezza.
async function updateMe(req, res) {
  try {
    const user = await Utente.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'Utente non trovato' });

    const { nome, cognome, targa } = req.body;

    if (nome !== undefined) {
      const n = nome.trim();
      if (!n) return res.status(400).json({ message: 'Il nome è obbligatorio' });
      user.nome = n;
    }

    if (cognome !== undefined) {
      const c = cognome.trim();
      if (!c) return res.status(400).json({ message: 'Il cognome è obbligatorio' });
      user.cognome = c;
    }

    if (targa !== undefined) {
      const t = targa.trim().toUpperCase();
      if (!/^[A-Z0-9]{5,10}$/.test(t))
        return res.status(400).json({ message: 'Targa non valida (5-10 caratteri alfanumerici)' });
      user.targa = t;
    }

    await user.save();
    return res.json({ user: buildUserResponse(user) });
  } catch (err) {
    console.error('Errore updateMe:', err);
    return res.status(500).json({ message: 'Errore interno' });
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
  updateMe,
  logout,
  resendVerificationEmail,
  richiediResetPassword,
  resetPassword
};