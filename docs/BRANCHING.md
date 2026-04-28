# TrentoParking — Strategia di branching

## Contesto

Il backend è stato riscritto da Kotlin/Spring Boot a **Node.js + Express + Mongoose**.
Lo scope del progetto è stato ristretto a **affitto di posti privati** (focus startup-ready).

Sono stati eliminati:
- Stima della disponibilità di parcheggi pubblici (modulo Bayesiano)
- Suggerimenti di mobilità alternativa (bus)
- Feedback crowdsourced sui parcheggi pubblici
- Integrazione OSM con poligoni reali dei parcheggi pubblici

Sono stati mantenuti:
- Autenticazione e ruoli (UTENTE, HOST, AMMINISTRATORE)
- Gestione posti privati (HOST)
- Prenotazione e pagamento mockato
- Pannello amministratore (gestione utenti)
- Frontend React (mappa Leaflet, modali auth, lista prenotazioni)

---

## Stack tecnologico

| Layer | Tecnologia |
|-------|------------|
| Backend | Node.js + Express |
| ORM | Mongoose |
| Database | MongoDB 7 (con autenticazione) |
| Auth | JWT (`jsonwebtoken`) + bcryptjs |
| Frontend | React + Vite + Leaflet |
| Infra | Docker Compose per MongoDB |

---

## Struttura delle branch

```
main                             ← scaffolding minimo (server.js, db.js, docker-compose)
└── feature/base-setup           ← infra condivisa (modelli, middleware JWT/ruolo)
    ├── feature/auth             ← register/login/logout con JWT
    │   ├── feature/host         ← CRUD posti privati (scoped per host)
    │   ├── feature/booking      ← creazione/pagamento/annullamento prenotazione
    │   └── feature/admin        ← gestione utenti e supervisione
└── feature/frontend             ← già esistente, aggiornare API client se serve
```

---

## Ordine di merge

| Step | Branch | Dipende da |
|------|--------|------------|
| 1 | `feature/base-setup` | `main` |
| 2 | `feature/auth` | `feature/base-setup` |
| 3 | `feature/host` | `feature/auth` |
| 3 | `feature/admin` | `feature/auth` |
| 4 | `feature/booking` | `feature/host` |
| qualsiasi | `feature/frontend` | nessuna |

Branch allo stesso step possono essere mergiate in parallelo.

---

## Dettaglio delle branch

### `feature/base-setup`
**Base:** `main` · **Scope:** infrastruttura condivisa

Da implementare:
- `backend/models/Utente.js` — schema mongoose (email, nome, cognome, passwordHash, ruolo, emailVerificata, punti, livello, targa)
- `backend/models/PostoPrivato.js` — schema (hostId, posizione, tariffaOraria, attivo, disponibilita)
- `backend/models/Prenotazione.js` — schema (utenteId, postoPrivatoId, targa, stato, timestamps)
- `backend/middleware/auth.js` — verifica JWT, popola `req.user`
- `backend/middleware/role.js` — controllo ruolo (factory `requireRole('AMMINISTRATORE')`)
- `backend/utils/jwt.js` — sign/verify helper

---

### `feature/auth`
**Base:** `feature/base-setup` · **Scope:** registrazione e login

Da implementare:
- `backend/routes/auth.js` — `POST /api/auth/register`, `/login`, `/logout`
- `backend/controllers/authController.js`:
  - `register`: hash bcrypt + create user + return JWT
  - `login`: verify password + return JWT (con `userId`, `ruolo`)
  - `logout`: in JWT puro è no-op lato server (il client butta via il token)

**Convenzione header:** `Authorization: Bearer <token>` su tutti gli endpoint protetti.

---

### `feature/host`
**Base:** `feature/auth` · **Scope:** gestione posti privati

Da implementare:
- `backend/routes/host.js` — `GET/POST/PUT/DELETE /api/host/posti`
- `backend/controllers/hostController.js`:
  - Tutte le query scopate su `hostId = req.user.userId`
  - `PUT/DELETE` deve verificare ownership (403 se appartiene ad altro host)

Middleware: `requireRole('HOST')` su tutto il router.

---

### `feature/booking`
**Base:** `feature/host` · **Scope:** prenotazioni e pagamento

Da implementare:
- `backend/routes/booking.js` — `GET /api/bookings`, `POST /api/bookings`, `POST /api/bookings/:id/pay`, `DELETE /api/bookings/:id`
- `backend/controllers/bookingController.js`:
  - Solo utenti con `emailVerificata = true` e `targa` non vuota possono prenotare
  - Stato iniziale: `IN_ATTESA_PAGAMENTO`
  - Pagamento mockato → `PAGATA`
  - DELETE → `ANNULLATA`

---

### `feature/admin`
**Base:** `feature/auth` · **Scope:** pannello amministratore

Da implementare:
- `backend/routes/admin.js` — `GET /api/admin/utenti`, `PUT /api/admin/utenti/:id`, `GET /api/admin/posti` (visualizza tutti i posti di tutti gli host)
- `backend/controllers/adminController.js`:
  - Modifica ruolo e `emailVerificata` di un utente
  - Visualizzazione globale di posti e prenotazioni

Middleware: `requireRole('AMMINISTRATORE')` su tutto il router.

---

### `feature/frontend`
**Base:** `main` · **Scope:** integrazione React

Già implementata. Da aggiornare:
- `frontend/src/api.js` — cambiare header `Authorization` per usare `Bearer <token>` invece dell'UUID nudo
- Rimuovere componenti per stima/feedback/mobilità se ancora presenti

---

## Come lavorare su una branch

```bash
git fetch origin
git checkout feature/<tuo-modulo>
cd backend && npm install
cp ../.env.example ../.env  # solo la prima volta
docker-compose up -d         # avvia MongoDB
npm run dev                  # backend con auto-reload
```

Quando finisci, committa e pubblica:
```bash
git add <file>
git commit -m "<modulo>: descrizione di cosa è cambiato"
git push -u origin feature/<tuo-modulo>
```

---

## Credenziali di test (seed in `scripts/mongo-init.js`)

| Email | Password | Ruolo |
|-------|----------|-------|
| `admin@trentoparking.it` | `admin123` | AMMINISTRATORE |
| `host@trentoparking.it` | `host123` | HOST |
| `mario.rossi@example.com` | `password123` | UTENTE |
