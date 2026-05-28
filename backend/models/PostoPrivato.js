const mongoose = require('mongoose');

// Usiamo valori costanti per evitare stringhe scritte in modo diverso nel codice
// Questo rende il modello più controllato e più facile da validare
const GIORNI_DISPONIBILITA = [
  'LUNEDI',
  'MARTEDI',
  'MERCOLEDI',
  'GIOVEDI',
  'VENERDI',
  'SABATO',
  'DOMENICA'
];

const STATI_VERIFICA_POSTO = [
  'NON_VERIFICATO',
  'IN_REVISIONE',
  'VERIFICATO',
  'RIFIUTATO',
  'SOSPESO'
];

const disponibilitaSchema = new mongoose.Schema({
  giorno: {
    type: String,
    required: [true, 'Il giorno di disponibilita e obbligatorio.'],
    trim: true,
    uppercase: true,
    enum: {
      values: GIORNI_DISPONIBILITA,
      message: 'Il giorno di disponibilita non e valido.'
    }
  },

  oraInizio: {
    type: Number,
    required: [true, 'L ora di inizio e obbligatoria.'],
    min: [0, 'L ora di inizio non puo essere minore di 0.'],
    max: [23, 'L ora di inizio non puo essere maggiore di 23.'],
    validate: {
      validator: Number.isInteger,
      message: 'L ora di inizio deve essere un numero intero.'
    }
  },

  oraFine: {
    type: Number,
    required: [true, 'L ora di fine e obbligatoria.'],
    min: [1, 'L ora di fine non puo essere minore di 1.'],
    max: [24, 'L ora di fine non puo essere maggiore di 24.'],
    validate: [
      {
        validator: Number.isInteger,
        message: 'L ora di fine deve essere un numero intero.'
      },
      {
        validator: function (value) {
          return value > this.oraInizio;
        },
        message: "L'ora di fine deve essere maggiore dell'ora di inizio."
      }
    ]
  }
}, {
  _id: false
});

const posizioneSchema = new mongoose.Schema({
  latitudine: {
    type: Number,
    required: [true, 'La latitudine e obbligatoria.'],
    min: [-90, 'La latitudine non puo essere minore di -90.'],
    max: [90, 'La latitudine non puo essere maggiore di 90.']
  },

  longitudine: {
    type: Number,
    required: [true, 'La longitudine e obbligatoria.'],
    min: [-180, 'La longitudine non puo essere minore di -180.'],
    max: [180, 'La longitudine non puo essere maggiore di 180.']
  },

  indirizzoTestuale: {
    type: String,
    default: '',
    trim: true,
    maxlength: [160, 'L indirizzo testuale non puo superare 160 caratteri.']
  }
}, {
  _id: false
});

const postoPrivatoSchema = new mongoose.Schema({
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utente',
    required: [true, 'L host del posto auto e obbligatorio.'],
    index: true
  },

  nome: {
    type: String,
    required: [true, 'Il nome del posto auto e obbligatorio.'],
    trim: true,
    minlength: [3, 'Il nome del posto auto deve contenere almeno 3 caratteri.'],
    maxlength: [80, 'Il nome del posto auto non puo superare 80 caratteri.']
  },

  descrizione: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'La descrizione non puo superare 500 caratteri.']
  },

  posizione: {
    type: posizioneSchema,
    required: [true, 'La posizione del posto auto e obbligatoria.']
  },

  tariffaOraria: {
    type: Number,
    required: [true, 'La tariffa oraria e obbligatoria.'],
    min: [0, 'La tariffa oraria non puo essere negativa.']
  },

  // Un posto disattivato rimane nel database, ma non viene mostrato agli utenti
  // Questo serve quando l'host vuole sospendere temporaneamente il posto
  attivo: {
    type: Boolean,
    default: true
  },

  // Indica se il posto è stato eliminato logicamente dall'host
  // Per l'utente il posto sparisce, ma il documento resta nel database
  eliminato: {
    type: Boolean,
    default: false
  },

  // Salva la data in cui il posto è stato eliminato logicamente
  // È utile per controlli futuri e per mantenere tracciabilità
  eliminatoIl: {
    type: Date,
    default: null
  },

  // Per l'MVP la disponibilità può anche essere vuota
  // In futuro potrà essere usata per impedire prenotazioni fuori fascia oraria
  disponibilita: {
    type: [disponibilitaSchema],
    default: []
  },

  // Tag descrittivi scelti dall'host: coperto, vicino_centro, sorvegliato, ecc.
  // Usati nel frontend per filtrare e mostrare caratteristiche rilevanti all'utente
  caratteristiche: {
    type: [String],
    default: []
  },

  // Un posto appena creato non viene considerato automaticamente verificato
  // La verifica potrà essere gestita in futuro da un amministratore
  statoVerifica: {
    type: String,
    enum: {
      values: STATI_VERIFICA_POSTO,
      message: 'Lo stato di verifica del posto non e valido.'
    },
    default: 'NON_VERIFICATO'
  },

  // L'host deve dichiarare esplicitamente di essere proprietario del posto
  // oppure di avere l'autorizzazione a pubblicarlo sulla piattaforma
  dichiarazioneProprietaAccettata: {
    type: Boolean,
    required: [true, 'La dichiarazione di proprieta o autorizzazione e obbligatoria.'],
    validate: {
      validator: function (value) {
        return value === true;
      },
      message: 'Per pubblicare un posto auto bisogna dichiarare di essere proprietari o autorizzati.'
    }
  },

  // Salviamo quando l'utente ha accettato la dichiarazione
  // Questo rende la responsabilità tracciabile nel database
  dataDichiarazioneProprieta: {
    type: Date,
    default: Date.now
  },

  // Campo pensato per eventuali controlli futuri da parte di un amministratore
  // Per ora resta vuoto, ma evita di dover cambiare modello appena introdurremo la moderazione
  noteVerifica: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Le note di verifica non possono superare 500 caratteri.']
  }
}, {
  collection: 'posti_privati',
  timestamps: true,
  versionKey: false
});

// Indici utili per le query più probabili della feature
// Esempio: lista dei posti attivi sulla mappa o posti pubblicati da un certo host
postoPrivatoSchema.index({ attivo: 1, eliminato: 1, statoVerifica: 1 });
postoPrivatoSchema.index({ hostId: 1, eliminato: 1, createdAt: -1 });
postoPrivatoSchema.index({ 'posizione.latitudine': 1, 'posizione.longitudine': 1 });

module.exports = mongoose.model('PostoPrivato', postoPrivatoSchema);