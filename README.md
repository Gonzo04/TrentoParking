# TrentoParking

TrentoParking è un marketplace per l'**affitto di posti auto privati** a Trento. Gli host possono pubblicare i propri posti auto con foto e disponibilità oraria, mentre gli utenti autenticati possono cercarli sulla mappa, prenotarli, pagarli e comunicare con l'host tramite chat.

Il progetto nasce nel contesto del corso di **Ingegneria del Software**.

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
- [Autori](#autori)

---

## Funzionalità

### Autenticazione e account

- Registrazione con verifica email tramite link
- Login e logout con JWT
- Reset password via email
- Modifica profilo (nome, cognome, targa)
- Ruoli: `UTENTE`, `HOST`, `AMMINISTRATORE`
- Sistema di gamification con livelli e punti

### Gestione posti privati (Host)

Gli host possono pubblicare e gestire i propri posti auto privati:

- nome, descrizione, tariffa oraria
- posizione geografica selezionabile sulla mappa
- disponibilità settimanale per fasce orarie
- caratteristiche/tag (coperto, sorvegliato, ecc.)
- caricamento di fino a 10 foto per posto
- attivazione/disattivazione e cancellazione logica

### Ricerca su mappa

- Visualizzazione di tutti i posti disponibili su mappa Leaflet
- Ricerca per indirizzo con selezione raggio (200 m – 2 km)
- Sidebar laterale con lista posti filtrati per distanza
- Anteprima foto nel popup del marker

### Prenotazioni

Gli utenti possono:

- aprire il calendario di prenotazione cliccando un posto sulla mappa
- selezionare giorno e fascia oraria (rispettando disponibilità e prenotazioni esistenti)
- visualizzare il riepilogo con prezzo calcolato automaticamente
- pagare la prenotazione (flusso mockato)
- annullare una prenotazione
- visualizzare tutte le proprie prenotazioni con stato aggiornato

Stati di una prenotazione: `IN_ATTESA_PAGAMENTO` · `PAGATA` · `ANNULLATA`

### Recensioni

- Gli utenti possono lasciare una recensione (1–5 stelle + testo) per ogni posto prenotato e pagato
- Le recensioni sono visibili nel calendario di prenotazione e nella pagina dell'host
- Un utente può recensire un posto una sola volta
- Gli host possono visualizzare la media voti dei propri posti

### Chat

- Chat diretta tra l'utente che ha prenotato e l'host del posto
- Accessibile dalla pagina "Le mie prenotazioni" (lato utente) e "Prenotazioni ricevute" (lato host)
- Aggiornamento in tempo reale tramite polling ogni 4 secondi

### Lato Host — Dashboard ricevute

Gli host possono:

- visualizzare tutte le prenotazioni ricevute sui propri posti
- vedere nome, targa e contatti dell'utente prenotante
- aprire la chat con il prenotante

---

## Stack tecnologico

| Layer    | Tecnologia                                          |
|----------|-----------------------------------------------------|
| Frontend | React 18, Vite, Leaflet / React Leaflet             |
| Backend  | Node.js, Express, Mongoose                          |
| Database | MongoDB Atlas (condiviso) + MongoDB locale (Docker) |
| Auth     | JWT (`jsonwebtoken`) + bcryptjs                     |
| Upload   | Multer (file locali in `backend/uploads/`)          |
| Email    | Nodemailer                                          |
| Infra    | Docker Compose per MongoDB locale                   |

---

## Prerequisiti

- **Node.js 20+**
- **npm**
- **Docker** e **Docker Compose** (solo per MongoDB locale)

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

```bash
cp .env.example .env
```

Variabili principali in `.env`:

```env
MONGODB_URI=mongodb+srv://...          # Atlas (se vuota usa MongoDB locale)
JWT_SECRET=una_stringa_lunga_e_sicura
EMAIL_USER=...                         # Account SMTP per email di verifica
EMAIL_PASS=...
```

### 3. Avviare il backend

```bash
cd backend
npm install
npm run dev
```

Il server si avvia su `http://localhost:8080`.

### 4. Avviare il frontend

```bash
cd frontend
npm install
npm run dev
```

Il frontend si avvia su `http://localhost:5173`.

---

## Database

### MongoDB Atlas (consigliato)

Inserire la connection string in `.env`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/trentoparking
```

### MongoDB locale tramite Docker

Se `MONGODB_URI` è vuota, il backend usa automaticamente `mongodb://localhost:27017/trentoparking`.

```bash
docker compose up -d    # avvia
docker compose down     # ferma
docker compose down -v  # ferma e cancella i dati
```

---

## Credenziali di test

Valide solo se inserite manualmente nel database o tramite seed.

| Email                     | Password      | Ruolo          |
|---------------------------|---------------|----------------|
| `admin@trentoparking.it`  | `admin123`    | AMMINISTRATORE |
| `host@trentoparking.it`   | `host123`     | HOST           |
| `mario.rossi@example.com` | `password123` | UTENTE         |

---

## Struttura del progetto

```text
TrentoParking/
├── backend/
│   ├── server.js
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   ├── Utente.js
│   │   ├── PostoPrivato.js
│   │   ├── Prenotazione.js
│   │   ├── Recensione.js
│   │   ├── Messaggio.js
│   │   ├── TokenVerifica.js
│   │   └── TokenResetPassword.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── postiPrivati.js
│   │   ├── booking.js
│   │   ├── recensioni.js
│   │   └── chat.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── postoPrivatoController.js
│   │   ├── bookingController.js
│   │   ├── recensioneController.js
│   │   └── chatController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── utils/
│   │   ├── jwt.js
│   │   ├── upload.js
│   │   └── pulisciUserNonVerificati.js
│   └── uploads/              # Foto caricate dagli host
│
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── services/
│       │   └── api.js
│       ├── utils/
│       │   └── SpotOptions.js
│       └── components/
│           ├── LandingPage.jsx
│           ├── AuthPage.jsx
│           ├── AuthPanel.jsx
│           ├── Dashboard.jsx
│           ├── SpotMap.jsx
│           ├── SpotSidebar.jsx
│           ├── SearchBar.jsx
│           ├── BookingCalendar.jsx
│           ├── PaymentPage.jsx
│           ├── MyBookings.jsx
│           ├── MyReceivedBookings.jsx
│           ├── MySpots.jsx
│           ├── ProfilePage.jsx
│           ├── ReviewModal.jsx
│           ├── HostReviewsPage.jsx
│           ├── ChatModal.jsx
│           ├── SpotFormControls.jsx
│           ├── MapPicker.jsx
│           ├── ResetPassword.jsx
│           └── VerificaMail.jsx
│
├── docs/
│   ├── D1/                   # Requisiti, casi d'uso, BPMN
│   └── D2/                   # Architettura, componenti, classi
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API

Tutti gli endpoint richiedono `Authorization: Bearer <token>` salvo dove indicato.

### Health

| Metodo | Path          | Auth | Descrizione              |
|--------|---------------|------|--------------------------|
| GET    | `/api/health` | No   | Verifica che il backend risponda |

### Auth

| Metodo | Path                              | Auth | Descrizione                        |
|--------|-----------------------------------|------|------------------------------------|
| POST   | `/api/auth/register`              | No   | Registra un nuovo utente           |
| POST   | `/api/auth/login`                 | No   | Login, restituisce JWT             |
| GET    | `/api/auth/me`                    | Sì   | Profilo utente corrente            |
| PATCH  | `/api/auth/me`                    | Sì   | Aggiorna nome, cognome, targa      |
| POST   | `/api/auth/logout`                | Sì   | Logout                             |
| GET    | `/api/auth/conferma/:token`       | No   | Conferma email via link            |
| POST   | `/api/auth/resend-verification`   | No   | Reinvia email di verifica          |
| POST   | `/api/auth/forgot-password`       | No   | Richiede reset password            |
| POST   | `/api/auth/reset-password/:token` | No   | Imposta nuova password             |

### Posti privati

| Metodo | Path                            | Descrizione                                      |
|--------|---------------------------------|--------------------------------------------------|
| GET    | `/api/posti-privati`            | Lista tutti i posti disponibili                  |
| POST   | `/api/posti-privati`            | Crea un nuovo posto (host)                       |
| GET    | `/api/posti-privati/miei`       | Posti pubblicati dall'host autenticato           |
| GET    | `/api/posti-privati/:id`        | Dettaglio di un posto                            |
| PATCH  | `/api/posti-privati/:id`        | Modifica un posto (solo proprietario)            |
| DELETE | `/api/posti-privati/:id`        | Elimina logicamente un posto (solo proprietario) |
| GET    | `/api/posti-privati/:id/prenotazioni` | Posto con prenotazioni attive            |
| POST   | `/api/posti-privati/:id/foto`   | Carica foto per un posto (multipart, max 10)     |

### Prenotazioni

| Metodo | Path                      | Descrizione                                    |
|--------|---------------------------|------------------------------------------------|
| GET    | `/api/bookings`           | Le proprie prenotazioni (utente)               |
| GET    | `/api/bookings/ricevute`  | Prenotazioni ricevute sui propri posti (host)  |
| POST   | `/api/bookings`           | Crea una nuova prenotazione                    |
| POST   | `/api/bookings/:id/pay`   | Conferma pagamento (mockato)                   |
| DELETE | `/api/bookings/:id`       | Annulla una prenotazione                       |

### Recensioni

| Metodo | Path                              | Descrizione                              |
|--------|-----------------------------------|------------------------------------------|
| POST   | `/api/recensioni`                 | Crea una recensione (prenotazione pagata)|
| GET    | `/api/recensioni/posto/:postoId`  | Recensioni di un posto                   |
| GET    | `/api/recensioni/host/:hostId`    | Recensioni di tutte le prenotazioni di un host |
| GET    | `/api/recensioni/medie-posti`     | Media voti per posto dell'host loggato   |

### Chat

| Metodo | Path              | Descrizione                                         |
|--------|-------------------|-----------------------------------------------------|
| GET    | `/api/chat/:id`   | Messaggi di una prenotazione (utente o host)        |
| POST   | `/api/chat/:id`   | Invia un messaggio in una prenotazione              |

---

## Autori

- David Dorobantu — 234467
- Riccardo Gonzato — 246476
- Matteo Sepa — 243283
