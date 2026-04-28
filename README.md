# TrentoParking

TrentoParking è un marketplace per l'**affitto di posti auto privati** a Trento. Gli Host pubblicano i propri posti, gli utenti autenticati possono prenotarli e pagarli online.

## Indice

- [Funzionalità](#funzionalità)
- [Stack tecnologico](#stack-tecnologico)
- [Prerequisiti](#prerequisiti)
- [Avvio rapido](#avvio-rapido)
- [Struttura del progetto](#struttura-del-progetto)
- [API](#api)
- [Branching](#branching)
- [Autori](#autori)

---

## Funzionalità

**Autenticazione e ruoli**
- Registrazione, login, logout con JWT
- Tre ruoli: `UTENTE`, `HOST`, `AMMINISTRATORE`

**Gestione posti privati (Host)**
- Pubblicazione posti con posizione, tariffa oraria, fasce orarie di disponibilità
- Modifica e rimozione dei propri posti (scoping per `hostId`)

**Prenotazione (Utente)**
- Ricerca dei posti privati disponibili sulla mappa
- Prenotazione con targa veicolo
- Stati: `IN_ATTESA_PAGAMENTO`, `PAGATA`, `ANNULLATA`
- Pagamento mockato

**Amministrazione**
- Gestione utenti (modifica ruolo, verifica email)
- Visualizzazione globale di posti e prenotazioni

---

## Stack tecnologico

| Layer    | Tecnologia                          |
|----------|-------------------------------------|
| Frontend | React 18, Vite, Leaflet             |
| Backend  | Node.js, Express, Mongoose          |
| Database | MongoDB 7 (con autenticazione)      |
| Auth     | JWT (`jsonwebtoken`) + bcryptjs     |
| Infra    | Docker Compose per MongoDB          |

---

## Prerequisiti

- **Node.js 20+** e npm
- **Docker** e **Docker Compose**

---

## Avvio rapido

### 1. Variabili d'ambiente

```bash
cp .env.example .env
```

Modifica `.env` con valori reali (password forti per `MONGO_ROOT_PASS` e `MONGO_APP_PASS`, una stringa lunga e random per `JWT_SECRET`).

### 2. MongoDB

```bash
docker-compose up -d
```

Al primo avvio gli script in `scripts/` creano l'utente applicativo e seedano gli utenti di test. Per ricreare il database da zero:

```bash
docker-compose down -v
docker-compose up -d
```

### 3. Backend

```bash
cd backend
npm install
npm run dev
```

Il server si avvia su `http://localhost:8080`. Endpoint di health check:

```bash
curl http://localhost:8080/api/health
# → {"status":"ok"}
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Il frontend si avvia su `http://localhost:5173`.

---

## Credenziali di test

| Email                         | Password      | Ruolo            |
|-------------------------------|---------------|------------------|
| `admin@trentoparking.it`      | `admin123`    | AMMINISTRATORE   |
| `host@trentoparking.it`       | `host123`     | HOST             |
| `mario.rossi@example.com`     | `password123` | UTENTE           |

---

## Struttura del progetto

```
TrentoParking/
├── backend/
│   ├── server.js              # Entry point Express
│   ├── config/db.js           # Connessione Mongoose
│   ├── models/                # Schema Mongoose (Utente, PostoPrivato, Prenotazione)
│   ├── routes/                # Definizione endpoint
│   ├── controllers/           # Logica applicativa
│   ├── middleware/            # auth (JWT), role (RBAC)
│   └── utils/jwt.js           # sign/verify token
├── frontend/
│   └── src/
│       ├── components/        # Componenti React
│       └── App.jsx            # Componente principale
├── scripts/
│   ├── mongo-init.sh          # Crea l'utente applicativo MongoDB
│   └── mongo-init.js          # Seed idempotente degli utenti di test
├── docs/
│   ├── BRANCHING.md           # Strategia di branching
│   ├── D1/                    # Requisiti, casi d'uso, BPMN
│   └── D2/                    # Architettura, componenti, classi
├── docker-compose.yml         # MongoDB con auth
└── .env.example               # Template per .env
```

---

## API

Tutti gli endpoint protetti richiedono l'header `Authorization: Bearer <token>`.

### Auth (pubblico)

| Metodo | Path                | Descrizione                              |
|--------|---------------------|------------------------------------------|
| POST   | `/api/auth/register`| Registra un nuovo utente, ritorna JWT    |
| POST   | `/api/auth/login`   | Login, ritorna `{ token, userId, ruolo }`|
| POST   | `/api/auth/logout`  | No-op lato server (client butta token)   |

### Host (ruolo `HOST`)

| Metodo | Path                  | Descrizione                          |
|--------|-----------------------|--------------------------------------|
| GET    | `/api/host/posti`     | Lista i propri posti privati         |
| POST   | `/api/host/posti`     | Crea un nuovo posto                  |
| PUT    | `/api/host/posti/:id` | Modifica un proprio posto            |
| DELETE | `/api/host/posti/:id` | Elimina un proprio posto             |

### Bookings (qualsiasi utente autenticato)

| Metodo | Path                       | Descrizione                          |
|--------|----------------------------|--------------------------------------|
| GET    | `/api/bookings`            | Lista le proprie prenotazioni        |
| POST   | `/api/bookings`            | Crea prenotazione (`IN_ATTESA_PAGAMENTO`) |
| POST   | `/api/bookings/:id/pay`    | Conferma pagamento → `PAGATA`        |
| DELETE | `/api/bookings/:id`        | Annulla → `ANNULLATA`                |

### Admin (ruolo `AMMINISTRATORE`)

| Metodo | Path                          | Descrizione                          |
|--------|-------------------------------|--------------------------------------|
| GET    | `/api/admin/utenti`           | Lista tutti gli utenti               |
| PUT    | `/api/admin/utenti/:id`       | Modifica ruolo / `emailVerificata`   |
| GET    | `/api/admin/posti`            | Tutti i posti di tutti gli host      |
| GET    | `/api/admin/prenotazioni`     | Tutte le prenotazioni                |

---

## Branching

Il lavoro è suddiviso in branch per modulo. Vedi [`docs/BRANCHING.md`](docs/BRANCHING.md) per il dettaglio.

```
main
└── feature/base-setup           ← infra condivisa (modelli, middleware)
    ├── feature/auth             ← register/login/logout con JWT
    │   ├── feature/host         ← CRUD posti privati
    │   ├── feature/booking      ← prenotazione + pagamento
    │   └── feature/admin        ← gestione utenti
└── feature/frontend             ← React + Leaflet
```

---

## Autori

- David Dorobantu — 234467
- Riccardo Gonzato — 246476
- Matteo Sepa — 243283
