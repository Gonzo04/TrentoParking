// Idempotent seed script — runs automatically on first container start via
// /docker-entrypoint-initdb.d/. Safe to re-run manually with:
//   mongosh -u <appuser> -p <apppass> --authenticationDatabase trentoparking trentoparking scripts/mongo-init.js
//
// To regenerate hashes:
//   node -e "console.log(require('bcryptjs').hashSync('<password>', 10))"

db = db.getSiblingDB('trentoparking');

// Test users (passwords: admin123, host123, password123)
const users = [
  {
    email: "admin@trentoparking.it",
    nome: "Admin", cognome: "TrentoParking",
    passwordHash: "$2a$10$GWaLZBsfl/arSl5qRr3BTe97Z/kWxFzzDH.HYcBRyFqeLnqIvn9LG",
    emailVerificata: true, ruolo: "AMMINISTRATORE"
  },
  {
    email: "host@trentoparking.it",
    nome: "Host", cognome: "TrentoParking",
    passwordHash: "$2a$10$zZ.ERe8wSj8Mb33pzzUn3Oc.iFurd08uWtcS8m7IY1Kt8EdxHMs1.",
    emailVerificata: true, ruolo: "HOST"
  },
  {
    email: "mario.rossi@example.com",
    nome: "Mario", cognome: "Rossi",
    passwordHash: "$2b$10$mpFMxKrf9pBS1gthGytaguPoMcqx1/v6kIwbfnhiPHFNOWIoP2XkO",
    emailVerificata: true, ruolo: "UTENTE"
  }
];

users.forEach(u => db.utenti.updateOne({ email: u.email }, { $setOnInsert: u }, { upsert: true }));

print("Seed complete: users upserted.");
