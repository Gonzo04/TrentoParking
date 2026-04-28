# TrentoParking

TrentoParking è un marketplace per l'**affitto di posti auto privati** a Trento. Gli host possono pubblicare i propri posti auto, mentre gli utenti autenticati possono cercarli sulla mappa, prenotarli e gestire le proprie prenotazioni.

Il progetto nasce nel contesto del corso di **Ingegneria del Software**. Il nome definitivo potrebbe essere modificato in futuro, ad esempio in **ParkingShare Trento**, per riflettere meglio il nuovo focus sullo sharing di parcheggi privati.

---

## Indice

- [Funzionalità](#funzionalità)
- [Stack tecnologico](#stack-tecnologico)
- [Prerequisiti](#prerequisiti)
- [Avvio rapido](#avvio-rapido)
- [Database](#database)
- [Credenziali di test](#credenziali-di-test)
- [Struttura del progetto](#struttura-del-progetto)
- [API](#api)
- [Branching](#branching)
- [Autori](#autori)

---

## Funzionalità

### Autenticazione e ruoli

- Registrazione e login degli utenti
- Autenticazione tramite JWT
- Ruoli previsti:
  - `UTENTE`
  - `HOST`
  - `AMMINISTRATORE`

### Gestione posti privati

Gli host possono pubblicare e gestire posti auto privati, specificando informazioni come:

- nome del posto
- descrizione
- posizione geografica
- tariffa oraria
- disponibilità
- stato attivo/non attivo

### Ricerca su mappa

Gli utenti possono visualizzare sulla mappa:

- posti auto privati disponibili
- parcheggi pubblici principali come marker informativi

I parcheggi pubblici non sono più il centro del sistema, ma servono come riferimento geografico e informativo.

### Prenotazioni

Gli utenti autenticati possono:

- prenotare un posto privato
- indicare data e ora di inizio/fine
- inserire la targa del veicolo
- visualizzare le proprie prenotazioni

Stati previsti per una prenotazione:

- `IN_ATTESA_PAGAMENTO`
- `PAGATA`
- `ANNULLATA`

Il pagamento è previsto inizialmente come funzionalità mockata.

### Amministrazione

Il ruolo amministratore può essere usato per:

- visualizzare e gestire utenti
- supervisionare posti privati
- supervisionare prenotazioni

---

## Stack tecnologico

| Layer    | Tecnologia                                           |
|----------|------------------------------------------------------|
| Frontend | React, Vite, Leaflet / React Leaflet                 |
| Backend  | Node.js, Express, Mongoose                           |
| Database | MongoDB Atlas condiviso + MongoDB locale via Docker  |
| Auth     | JWT (`jsonwebtoken`) + bcryptjs                      |
| Infra    | Docker Compose per fallback MongoDB locale           |
| API      | REST JSON                                            |

---

## Prerequisiti

Per avviare il progetto in locale servono:

- **Node.js 20+**
- **npm**
- **Docker**
- **Docker Compose**

Verifica le versioni installate con:

```bash
node -v
npm -v
docker --version
docker compose version
```

---

## Avvio rapido

### 1. Clonare il repository

```bash
git clone https://github.com/Gonzo04/TrentoParking.git
cd TrentoParking
```

### 2. Configurare le variabili d'ambiente

Copiare il file di esempio:

```bash
cp .env.example .env
```

Il file `.env` contiene le variabili locali del progetto e **non deve mai essere committato**.

Per usare il database condiviso del gruppo, impostare `MONGODB_URI` con la connection string di MongoDB Atlas:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/trentoparking?retryWrites=true&w=majority
```

Se `MONGODB_URI` viene lasciata vuota, il backend usa automaticamente il fallback locale:

```text
mongodb://localhost:27017/trentoparking
```

Impostare anche un valore sicuro per `JWT_SECRET`:

```env
JWT_SECRET=change_this_to_a_long_random_string
```

---

## Database

### Database condiviso del gruppo

Il database ufficiale condiviso del gruppo è **MongoDB Atlas**.

Questo permette a tutti i membri del gruppo di lavorare sugli stessi dati, senza dipendere da database locali separati.

La connessione al database condiviso avviene tramite la variabile:

```env
MONGODB_URI
```

La vera connection string di Atlas non deve essere inserita nel codice sorgente e non deve essere committata.

---

### MongoDB locale tramite Docker

MongoDB locale serve solo come fallback per lo sviluppo personale.

Per avviare MongoDB locale:

```bash
docker compose up -d
```

Il container espone MongoDB su:

```text
localhost:27017
```

Il backend, se non trova `MONGODB_URI`, si collega automaticamente a:

```text
mongodb://localhost:27017/trentoparking
```

Per fermare MongoDB locale:

```bash
docker compose down
```

Per eliminare anche il volume dati e ricreare il database da zero:

```bash
docker compose down -v
docker compose up -d
```

---

## Backend

Per avviare il backend:

```bash
cd backend
npm install
npm run dev
```

Il server si avvia su:

```text
http://localhost:8080
```

Endpoint di health check:

```bash
curl http://localhost:8080/api/health
```

Risposta attesa:

```json
{"status":"ok"}
```

---

## Frontend

Per avviare il frontend:

```bash
cd frontend
npm install
npm run dev
```

Il frontend si avvia su:

```text
http://localhost:5173
```

---

## Credenziali di test

Le seguenti credenziali sono da considerare come utenti di test previsti per lo sviluppo.

Attenzione: dopo la semplificazione di Docker Compose, questi utenti **non vengono creati automaticamente** dal container MongoDB locale. Sono validi solo se vengono inseriti manualmente nel database o tramite uno script di seed dedicato.

| Email                         | Password      | Ruolo            |
|-------------------------------|---------------|------------------|
| `admin@trentoparking.it`      | `admin123`    | AMMINISTRATORE   |
| `host@trentoparking.it`       | `host123`     | HOST             |
| `mario.rossi@example.com`     | `password123` | UTENTE           |

---

## Struttura del progetto

```text
TrentoParking/
├── backend/
│   ├── server.js              # Entry point Express
│   ├── config/
│   │   └── db.js              # Connessione Mongoose tramite MONGODB_URI o fallback locale
│   ├── models/                # Schema Mongoose
│   ├── routes/                # Definizione endpoint REST
│   ├── controllers/           # Logica applicativa
│   ├── middleware/            # Middleware auth / ruoli
│   ├── utils/                 # Utility, ad esempio JWT
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   └── src/
│       ├── components/        # Componenti React
│       └── App.jsx            # Componente principale
│
├── scripts/
│   ├── mongo-init.sh          # Script legacy/opzionale per inizializzazione MongoDB
│   └── mongo-init.js          # Script legacy/opzionale per seed dati
│
├── docs/
│   ├── BRANCHING.md           # Strategia di branching
│   ├── D1/                    # Requisiti, casi d'uso, BPMN
│   └── D2/                    # Architettura, componenti, classi
│
├── docker-compose.yml         # MongoDB locale di fallback
├── .env.example               # Template per variabili d'ambiente
└── README.md
```

---

## API

Le API sono REST JSON.

Gli endpoint protetti richiederanno l'header:

```http
Authorization: Bearer <token>
```

### Health check

| Metodo | Path                | Descrizione                    |
|--------|---------------------|--------------------------------|
| GET    | `/api/health`       | Verifica che il backend risponda |

---

### Auth

Endpoint previsti per autenticazione e gestione sessione.

| Metodo | Path                  | Descrizione                              |
|--------|-----------------------|------------------------------------------|
| POST   | `/api/auth/register`  | Registra un nuovo utente                 |
| POST   | `/api/auth/login`     | Effettua il login e restituisce un token |
| POST   | `/api/auth/logout`    | Logout lato client/server                |

---

### Host

Endpoint previsti per la gestione dei posti privati da parte degli host.

| Metodo | Path                    | Descrizione                     |
|--------|-------------------------|---------------------------------|
| GET    | `/api/host/posti`       | Lista i posti del proprio host  |
| POST   | `/api/host/posti`       | Crea un nuovo posto privato     |
| PUT    | `/api/host/posti/:id`   | Modifica un proprio posto       |
| DELETE | `/api/host/posti/:id`   | Elimina un proprio posto        |

---

### Private parkings

Endpoint previsti per la ricerca e visualizzazione dei posti privati.

| Metodo | Path                            | Descrizione                              |
|--------|---------------------------------|------------------------------------------|
| GET    | `/api/private-parkings`         | Lista i posti privati disponibili        |
| POST   | `/api/private-parkings`         | Crea un nuovo posto privato              |
| GET    | `/api/private-parkings/nearby`  | Cerca posti vicini a una posizione       |

Esempio query per ricerca vicina:

```text
/api/private-parkings/nearby?lat=46.0667&lng=11.1211&radiusMeters=1000
```

---

### Public parkings

Endpoint previsto per mostrare sulla mappa i principali parcheggi pubblici di Trento come marker informativi.

| Metodo | Path                    | Descrizione                                  |
|--------|-------------------------|----------------------------------------------|
| GET    | `/api/public-parkings`  | Lista parcheggi pubblici principali          |

Esempi di parcheggi pubblici informativi:

- Parcheggio Sanseverino
- Parcheggio Monte Baldo
- Piazza Fiera
- Stazione
- Ex Italcementi

---

### Bookings

Endpoint previsti per la gestione delle prenotazioni.

| Metodo | Path                       | Descrizione                                |
|--------|----------------------------|--------------------------------------------|
| GET    | `/api/bookings`            | Lista le proprie prenotazioni              |
| POST   | `/api/bookings`            | Crea una nuova prenotazione                |
| POST   | `/api/bookings/:id/pay`    | Conferma pagamento mockato                 |
| DELETE | `/api/bookings/:id`        | Annulla una prenotazione                   |

---

### Admin

Endpoint previsti per funzionalità amministrative.

| Metodo | Path                          | Descrizione                          |
|--------|-------------------------------|--------------------------------------|
| GET    | `/api/admin/utenti`           | Lista tutti gli utenti               |
| PUT    | `/api/admin/utenti/:id`       | Modifica ruolo o stato utente        |
| GET    | `/api/admin/posti`            | Lista tutti i posti privati          |
| GET    | `/api/admin/prenotazioni`     | Lista tutte le prenotazioni          |

---

## Branching

Il lavoro è organizzato tramite branch dedicate.

Branch principali:

```text
main
└── feature/base-setup           # Modelli, middleware, utility condivise
    ├── feature/auth             # Registrazione, login, logout
    ├── feature/host             # CRUD posti privati
    ├── feature/booking          # Prenotazioni e pagamento mockato
    └── feature/admin            # Gestione utenti, posti e prenotazioni
└── feature/frontend             # Frontend React + Leaflet
```

Le modifiche devono essere sviluppate su branch dedicate e poi integrate in `main` tramite Pull Request.

Per dettagli sulla strategia di branching, vedere:

```text
docs/BRANCHING.md
```

---

## Note di configurazione

### Uso di MongoDB Atlas

Per lavorare sul database condiviso del gruppo:

1. creare o ricevere una connection string MongoDB Atlas;
2. inserirla nel file `.env` locale;
3. assicurarsi che `.env` non venga committato.

Esempio:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/trentoparking?retryWrites=true&w=majority
```

### Uso di MongoDB locale

Per lavorare senza Atlas:

1. lasciare vuota `MONGODB_URI`;
2. avviare MongoDB locale:

```bash
docker compose up -d
```

3. avviare il backend:

```bash
cd backend
npm run dev
```

---

## Autori

- David Dorobantu — 234467
- Riccardo Gonzato — 246476
- Matteo Sepa — 243283