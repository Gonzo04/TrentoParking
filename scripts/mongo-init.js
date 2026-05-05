// Idempotent seed — safe to re-run.
// Run manually: mongosh trentoparking scripts/mongo-init.js

db = db.getSiblingDB('trentoparking');

// ── Users ──────────────────────────────────────────────────────────────────
// Passwords: admin123, host123, password123
const users = [
  {
    email: 'admin@trentoparking.it',
    nomeUtente: 'admin',
    nome: 'Admin', cognome: 'TrentoParking',
    passwordHash: '$2a$10$GWaLZBsfl/arSl5qRr3BTe97Z/kWxFzzDH.HYcBRyFqeLnqIvn9LG',
    targa: 'ADMIN001',
    emailVerificata: true, ruolo: 'AMMINISTRATORE',
  },
  {
    email: 'host@trentoparking.it',
    nomeUtente: 'host',
    nome: 'Host', cognome: 'TrentoParking',
    passwordHash: '$2a$10$zZ.ERe8wSj8Mb33pzzUn3Oc.iFurd08uWtcS8m7IY1Kt8EdxHMs1.',
    targa: 'HOST0001',
    emailVerificata: true, ruolo: 'HOST',
  },
  {
    email: 'mario.rossi@example.com',
    nomeUtente: 'mario.rossi',
    nome: 'Mario', cognome: 'Rossi',
    passwordHash: '$2b$10$mpFMxKrf9pBS1gthGytaguPoMcqx1/v6kIwbfnhiPHFNOWIoP2XkO',
    targa: 'AA123BB',
    emailVerificata: true, ruolo: 'UTENTE',
  },
];

users.forEach(u =>
  db.utenti.updateOne({ email: u.email }, { $setOnInsert: u }, { upsert: true })
);

// ── Test posti privati ─────────────────────────────────────────────────────
// Linked to the host seed user. Seeded only if the host exists.
const host = db.utenti.findOne({ email: 'host@trentoparking.it' });
if (host) {
  const posti = [
    {
      nome: 'Garage Via Roma',
      descrizione: 'Posto coperto in garage privato, centro di Trento.',
      posizione: { latitudine: 46.0679, longitudine: 11.1211, indirizzoTestuale: 'Via Roma 1, Trento' },
      tariffaOraria: 2.50,
      attivo: true,
      disponibilita: [
        { giorno: 'lunedì',    oraInizio: 8,  oraFine: 20 },
        { giorno: 'martedì',   oraInizio: 8,  oraFine: 20 },
        { giorno: 'mercoledì', oraInizio: 8,  oraFine: 20 },
        { giorno: 'giovedì',   oraInizio: 8,  oraFine: 20 },
        { giorno: 'venerdì',   oraInizio: 8,  oraFine: 20 },
        { giorno: 'sabato',    oraInizio: 9,  oraFine: 13 },
      ],
    },
    {
      nome: 'Posto auto Via Belenzani',
      descrizione: 'Posto scoperto con accesso da via laterale.',
      posizione: { latitudine: 46.0720, longitudine: 11.1240, indirizzoTestuale: 'Via Belenzani 22, Trento' },
      tariffaOraria: 1.50,
      attivo: true,
      disponibilita: [
        { giorno: 'lunedì',    oraInizio: 7,  oraFine: 22 },
        { giorno: 'martedì',   oraInizio: 7,  oraFine: 22 },
        { giorno: 'mercoledì', oraInizio: 7,  oraFine: 22 },
        { giorno: 'giovedì',   oraInizio: 7,  oraFine: 22 },
        { giorno: 'venerdì',   oraInizio: 7,  oraFine: 22 },
        { giorno: 'sabato',    oraInizio: 7,  oraFine: 22 },
        { giorno: 'domenica',  oraInizio: 9,  oraFine: 18 },
      ],
    },
  ];

  posti.forEach(p =>
    db.posti_privati.updateOne(
      { nome: p.nome },
      { $setOnInsert: { ...p, hostId: host._id } },
      { upsert: true }
    )
  );
}

print('Seed complete.');
