# TrentoParking

TrentoParking è una web app per l'**affitto e la prenotazione di posti auto privati a Trento**.

Gli utenti autenticati possono cercare posti disponibili sulla mappa, visualizzarne dettagli e foto, prenotarli, effettuare un pagamento simulato e comunicare con l'host tramite chat. Gli host possono pubblicare e gestire i propri posti auto privati, impostando posizione, tariffa, disponibilità oraria, caratteristiche e foto.

Il progetto è stato sviluppato per il corso di **Ingegneria del Software** dell'Università di Trento.

---

## Indice

* [Funzionalità](#funzionalità)
* [Stack tecnologico](#stack-tecnologico)
* [Prerequisiti](#prerequisiti)
* [Configurazione](#configurazione)
* [Avvio rapido](#avvio-rapido)
* [Database](#database)
* [Upload foto](#upload-foto)
* [Struttura del progetto](#struttura-del-progetto)
* [API principali](#api-principali)
* [Testing e controlli](#testing-e-controlli)
* [Note progettuali](#note-progettuali)
* [Autori](#autori)

---

## Funzionalità

### Autenticazione e account

* Registrazione nuovo utente
* Verifica email tramite link
* Login con JWT
* Logout
* Recupero password via email
* Modifica profilo personale
* Gestione targa dell'utente
* Ruoli utente:

  * `UTENTE`
  * `HOST`
  * `AMMINISTRATORE`

> Nota: il ruolo `AMMINISTRATORE` è predisposto nel modello dati, ma nella versione attuale non è presente un pannello amministratore completo.

---

### Gestione posti privati

Un utente autenticato può pubblicare un posto auto privato. Alla pubblicazione del primo posto, l'utente diventa automaticamente `HOST`.

Per ogni posto privato l'host può gestire:

* nome del posto
* descrizione
* tariffa oraria
* posizione geografica
* indirizzo testuale
* disponibilità settimanale per fasce orarie
* caratteristiche/tag del posto
* caricamento foto
* attivazione e disattivazione
* cancellazione logica

La cancellazione del posto è una **soft delete**: il posto viene nascosto all'utente e non è più visibile sulla mappa, ma rimane salvato nel database per conservare lo storico.

Regola importante:

* la disattivazione è consentita anche se esistono prenotazioni future
* la disattivazione impedisce nuove prenotazioni, ma mantiene valide quelle già esistenti
* l'eliminazione viene bloccata se il posto ha prenotazioni future attive

Sono considerate prenotazioni future attive:

* prenotazioni `PAGATA` con data futura
* prenotazioni `IN_ATTESA_PAGAMENTO` non ancora scadute

Non bloccano l'eliminazione:

* prenotazioni `ANNULLATA`
* prenotazioni `SCADUTA`
* prenotazioni passate
* prenotazioni in attesa pagamento già scadute

---

### Ricerca su mappa

Gli utenti autenticati possono:

* visualizzare i posti disponibili su mappa Leaflet
* cercare per indirizzo
* selezionare un raggio di ricerca
* visualizzare una lista laterale dei posti filtrati
* selezionare un posto dalla mappa o dalla lista
* visualizzare dettagli, prezzo, disponibilità e foto del posto

La mappa mostra solo posti:

* attivi
* non eliminati logicamente
* disponibili alla visualizzazione

---

### Prenotazioni

Gli utenti possono:

* aprire il calendario di prenotazione da un posto sulla mappa
* selezionare giorno e fascia oraria
* prenotare solo negli orari disponibili
* evitare sovrapposizioni con prenotazioni già presenti
* visualizzare il prezzo calcolato automaticamente
* accedere alla pagina di pagamento
* completare un pagamento simulato
* annullare una prenotazione
* visualizzare le proprie prenotazioni

Stati di una prenotazione:

* `IN_ATTESA_PAGAMENTO`
* `PAGATA`
* `ANNULLATA`
* `SCADUTA`

Quando una prenotazione viene creata, rimane in stato `IN_ATTESA_PAGAMENTO` per un tempo limitato. Se il pagamento non viene completato entro la scadenza, la prenotazione viene marcata come `SCADUTA` e non blocca più lo slot.

---

### Pagamento simulato

Il pagamento è mockato e serve a simulare il completamento del flusso di prenotazione.

Flusso:

1. l'utente crea una prenotazione
2. la prenotazione entra in stato `IN_ATTESA_PAGAMENTO`
3. parte un timer per completare il pagamento
4. se l'utente paga in tempo, lo stato diventa `PAGATA`
5. se il timer scade, lo stato diventa `SCADUTA`

---

### Recensioni

Gli utenti possono lasciare una recensione per un posto solo quando:

* la prenotazione è stata pagata
* la prenotazione è conclusa
* l'utente non ha già recensito quella prenotazione

Ogni recensione contiene:

* voto da 1 a 5 stelle
* testo descrittivo
* riferimento alla prenotazione
* riferimento al posto
* riferimento all'host

Gli host possono visualizzare le recensioni ricevute e la media dei voti dei propri posti.

---

### Chat

La chat permette la comunicazione tra:

* utente che ha effettuato la prenotazione
* host proprietario del posto prenotato

La chat è associata alla prenotazione.

È accessibile:

* lato utente, dalla sezione delle proprie prenotazioni
* lato host, dalla sezione delle prenotazioni ricevute

I messaggi vengono aggiornati tramite polling periodico.

---

### Foto dei posti

Gli host possono caricare fino a 10 foto per ogni posto.

Le immagini vengono gestite così:

* il file immagine viene salvato nel filesystem del backend, nella cartella `backend/uploads/`
* nel database MongoDB viene salvato solo il percorso della foto
* il backend espone staticamente la cartella `/uploads`
* il frontend usa il percorso salvato nel database per mostrare l'immagine

Esempio:

```js
foto: [
  "/uploads/nome-file.jpg"
]
```

Il file reale si trova in:

```text
backend/uploads/nome-file.jpg
```

Il browser può visualizzarlo tramite:

```text
http://localhost:8080/uploads/nome-file.jpg
```

Se un posto non ha foto, il frontend evita di mostrare immagini rotte.

---

## Stack tecnologico

| Layer           | Tecnologia                          |
| --------------- | ----------------------------------- |
| Frontend        | React, Vite, Leaflet, React Leaflet |
| Backend         | Node.js, Express                    |
| Database        | MongoDB, Mongoose                   |
| Autenticazione  | JWT, bcryptjs                       |
| Email           | Nodemailer                          |
| Upload file     | Multer                              |
| Mappa           | Leaflet, OpenStreetMap              |
| Ambiente locale | Docker Compose per MongoDB locale   |

---

## Prerequisiti

Sono necessari:

* Node.js 20+
* npm
* Docker
* Docker Compose

Verifica installazione:

```bash
node -v
npm -v
docker --version
docker compose version
```

---

## Configurazione

### File `.env`

Copiare il file di esempio:

```bash
cp .env.example .env
```

Variabili principali:

```env
PORT=8080
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/trentoparking
JWT_SECRET=una_stringa_lunga_e_sicura
EMAIL_USER=account_email
EMAIL_PASS=password_o_app_password
```

Se si vuole usare MongoDB locale:

```env
MONGODB_URI=mongodb://localhost:27017/trentoparking
```

---

### Configurazione frontend

In sviluppo locale il frontend comunica normalmente con:

```text
http://localhost:8080
```

Per una demo su rete locale, ad esempio da altri dispositivi collegati alla stessa Wi-Fi, è necessario usare l'indirizzo IP del computer che esegue il backend.

Esempio:

```text
http://192.168.1.50:8080
```

Nota: `localhost` funziona solo sul computer che esegue il servizio. Da un altro dispositivo bisogna usare l'IP del computer server.

---

## Avvio rapido

### 1. Clonare il repository

```bash
git clone https://github.com/Gonzo04/TrentoParking.git
cd TrentoParking
```

---

### 2. Installare le dipendenze backend

```bash
cd backend
npm install
```

---

### 3. Installare le dipendenze frontend

```bash
cd ../frontend
npm install
```

---

### 4. Avviare MongoDB locale

Dalla root del progetto:

```bash
docker compose up -d
```

Per fermarlo:

```bash
docker compose down
```

Per fermarlo eliminando anche i dati locali:

```bash
docker compose down -v
```

---

### 5. Avviare il backend

Dalla root del progetto:

```bash
npm --prefix backend run dev
```

Backend disponibile su:

```text
http://localhost:8080
```

---

### 6. Avviare il frontend

Dalla root del progetto:

```bash
npm --prefix frontend run dev
```

Frontend disponibile su:

```text
http://localhost:5173
```

---

## Avvio in rete locale

Per permettere ad altri dispositivi nella stessa rete di aprire l'app dal browser, usare l'IP del computer che esegue frontend e backend.

### 1. Trovare l'IP locale

```bash
hostname -I
```

Esempio:

```text
192.168.1.50
```

---

### 2. Avviare il backend

```bash
npm --prefix backend run dev
```

Il backend deve essere raggiungibile da:

```text
http://192.168.1.50:8080
```

---

### 3. Avviare il frontend esposto sulla rete

```bash
npm --prefix frontend run dev -- --host 0.0.0.0
```

Gli altri dispositivi potranno aprire:

```text
http://192.168.1.50:5173
```

---

## Database

Il progetto supporta sia MongoDB Atlas sia MongoDB locale.

### MongoDB Atlas

Configurare la connection string nel file `.env`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/trentoparking
```

---

### MongoDB locale con Docker

Il file `docker-compose.yml` permette di avviare MongoDB in locale:

```bash
docker compose up -d
```

Connection string locale:

```env
MONGODB_URI=mongodb://localhost:27017/trentoparking
```

---

## Upload foto

Le foto non vengono salvate direttamente nel database come file binari.

Il flusso è:

```text
Host seleziona una foto dal proprio PC
↓
Frontend invia il file al backend con FormData
↓
Multer salva il file in backend/uploads/
↓
Il backend salva nel database il percorso della foto
↓
Il frontend usa quel percorso per mostrare l'immagine
```

Esempio documento MongoDB:

```js
{
  nome: "Posto coperto vicino al centro",
  foto: [
    "/uploads/1717420000-posto.jpg"
  ]
}
```

Il backend serve staticamente le immagini tramite:

```text
/uploads
```

Quindi l'immagine è visibile da browser come:

```text
http://localhost:8080/uploads/1717420000-posto.jpg
```

In produzione sarebbe consigliato usare uno storage esterno, ad esempio Cloudinary, Amazon S3 o Firebase Storage. Per la demo locale del progetto è sufficiente la cartella `backend/uploads/`.

---

## Credenziali di test

Le seguenti credenziali sono valide solo se inserite manualmente nel database o create tramite seed.

| Email                     | Password      | Ruolo            |
| ------------------------- | ------------- | ---------------- |
| `admin@trentoparking.it`  | `admin123`    | `AMMINISTRATORE` |
| `host@trentoparking.it`   | `host123`     | `HOST`           |
| `mario.rossi@example.com` | `password123` | `UTENTE`         |

> Nota: il ruolo amministratore è predisposto nel modello, ma nella versione attuale non è presente una dashboard amministratore completa.

---

## Struttura del progetto

```text
TrentoParking/
├── backend/
│   ├── server.js
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── bookingController.js
│   │   ├── chatController.js
│   │   ├── postoPrivatoController.js
│   │   └── recensioneController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── Messaggio.js
│   │   ├── PostoPrivato.js
│   │   ├── Prenotazione.js
│   │   ├── Recensione.js
│   │   ├── TokenResetPassword.js
│   │   ├── TokenVerifica.js
│   │   └── Utente.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── booking.js
│   │   ├── chat.js
│   │   ├── postiPrivati.js
│   │   └── recensioni.js
│   ├── uploads/
│   │   └── immagini caricate dagli host
│   └── utils/
│       ├── jwt.js
│       ├── pulisciUserNonVerificati.js
│       └── upload.js
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── assets/
│       ├── components/
│       │   └── common/
│       │       └── SearchBar.jsx
│       ├── features/
│       │   ├── auth/
│       │   │   ├── AuthPanel.jsx
│       │   │   ├── ResetPassword.jsx
│       │   │   └── VerificaMail.jsx
│       │   ├── bookings/
│       │   │   ├── BookingCalendar.jsx
│       │   │   ├── MyBookings.jsx
│       │   │   ├── MyReceivedBookings.jsx
│       │   │   └── PaymentPage.jsx
│       │   ├── chat/
│       │   │   └── ChatModal.jsx
│       │   ├── reviews/
│       │   │   ├── HostReviewsPage.jsx
│       │   │   └── ReviewModal.jsx
│       │   └── spots/
│       │       ├── SpotFormControls.jsx
│       │       └── SpotMap.jsx
│       ├── pages/
│       │   ├── AuthPage.jsx
│       │   ├── Dashboard.jsx
│       │   ├── LandingPage.jsx
│       │   └── ProfilePage.jsx
│       ├── services/
│       │   ├── api.js
│       │   └── authService.js
│       └── utils/
│           └── SpotOptions.js
│
├── docs/
│   ├── D1/
│   ├── D2/
│   └── D3/
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## API principali

Tutti gli endpoint protetti richiedono:

```http
Authorization: Bearer <token>
```

---

### Health

| Metodo | Path          | Auth | Descrizione                        |
| ------ | ------------- | ---: | ---------------------------------- |
| GET    | `/api/health` |   No | Verifica che il backend sia attivo |

---

### Auth

| Metodo | Path                              | Auth | Descrizione                                    |
| ------ | --------------------------------- | ---: | ---------------------------------------------- |
| POST   | `/api/auth/register`              |   No | Registra un nuovo utente                       |
| POST   | `/api/auth/login`                 |   No | Effettua il login e restituisce un JWT         |
| POST   | `/api/auth/logout`                |   Sì | Effettua il logout lato client                 |
| GET    | `/api/auth/me`                    |   Sì | Restituisce il profilo dell'utente autenticato |
| PATCH  | `/api/auth/me`                    |   Sì | Aggiorna nome, cognome e targa                 |
| GET    | `/api/auth/conferma/:token`       |   No | Conferma l'email tramite token                 |
| POST   | `/api/auth/resend-verification`   |   No | Reinvia l'email di verifica                    |
| POST   | `/api/auth/forgot-password`       |   No | Richiede il reset della password               |
| POST   | `/api/auth/reset-password/:token` |   No | Imposta una nuova password                     |

---

### Posti privati

| Metodo | Path                                  | Auth | Descrizione                                          |
| ------ | ------------------------------------- | ---: | ---------------------------------------------------- |
| GET    | `/api/posti-privati`                  |   Sì | Lista dei posti attivi e visibili                    |
| POST   | `/api/posti-privati`                  |   Sì | Crea un nuovo posto privato                          |
| GET    | `/api/posti-privati/miei`             |   Sì | Lista dei posti pubblicati dall'host autenticato     |
| GET    | `/api/posti-privati/:id`              |   Sì | Dettaglio di un posto                                |
| GET    | `/api/posti-privati/:id/prenotazioni` |   Sì | Dettaglio posto con prenotazioni utili al calendario |
| PATCH  | `/api/posti-privati/:id`              |   Sì | Modifica un posto, solo se proprietario              |
| DELETE | `/api/posti-privati/:id`              |   Sì | Elimina logicamente un posto, solo se proprietario   |
| POST   | `/api/posti-privati/:id/foto`         |   Sì | Carica foto per un posto, massimo 10                 |

---

### Prenotazioni

| Metodo | Path                     | Auth | Descrizione                                      |
| ------ | ------------------------ | ---: | ------------------------------------------------ |
| GET    | `/api/bookings`          |   Sì | Lista delle prenotazioni dell'utente autenticato |
| GET    | `/api/bookings/ricevute` |   Sì | Lista delle prenotazioni ricevute dall'host      |
| POST   | `/api/bookings`          |   Sì | Crea una nuova prenotazione                      |
| POST   | `/api/bookings/:id/pay`  |   Sì | Conferma il pagamento mockato                    |
| DELETE | `/api/bookings/:id`      |   Sì | Annulla una prenotazione                         |

---

### Recensioni

| Metodo | Path                             | Auth | Descrizione                                               |
| ------ | -------------------------------- | ---: | --------------------------------------------------------- |
| POST   | `/api/recensioni`                |   Sì | Crea una recensione                                       |
| GET    | `/api/recensioni/posto/:postoId` |   Sì | Restituisce le recensioni di un posto                     |
| GET    | `/api/recensioni/host/:hostId`   |   Sì | Restituisce le recensioni ricevute da un host             |
| GET    | `/api/recensioni/medie-posti`    |   Sì | Restituisce la media voti dei posti dell'host autenticato |

---

### Chat

| Metodo | Path            | Auth | Descrizione                                |
| ------ | --------------- | ---: | ------------------------------------------ |
| GET    | `/api/chat/:id` |   Sì | Restituisce i messaggi di una prenotazione |
| POST   | `/api/chat/:id` |   Sì | Invia un messaggio in una prenotazione     |

---

## Testing e controlli

Durante lo sviluppo sono stati usati controlli statici, build frontend e test manuali sui flussi principali.

### Controlli backend

```bash
node --check backend/server.js
node --check backend/routes/postiPrivati.js
node --check backend/controllers/postoPrivatoController.js
node --check backend/controllers/bookingController.js
node --check backend/controllers/authController.js
node --check backend/controllers/chatController.js
node --check backend/controllers/recensioneController.js
```

---

### Controlli frontend

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

---

### Flussi testati manualmente

* registrazione utente
* verifica email
* login
* reset password
* modifica profilo
* pubblicazione posto privato
* caricamento foto
* visualizzazione posto su mappa
* ricerca per raggio
* prenotazione posto
* blocco sovrapposizione prenotazioni
* pagamento entro scadenza
* scadenza pagamento
* annullamento prenotazione
* chat tra utente e host
* recensione dopo prenotazione conclusa
* disattivazione posto
* eliminazione posto senza prenotazioni future attive
* blocco eliminazione posto con prenotazioni future attive
* visualizzazione corretta di posti senza foto

---

## Note progettuali

### Ruoli

Il sistema usa tre ruoli:

* `UTENTE`: utente registrato che può cercare e prenotare posti
* `HOST`: utente che ha pubblicato almeno un posto privato
* `AMMINISTRATORE`: ruolo predisposto nel modello per possibili estensioni future

Nella versione attuale l'amministratore non ha una dashboard dedicata.

---

### Gamification

Nel modello utente sono presenti i campi `punti` e `livello`.

Questi campi rappresentano una predisposizione per possibili funzionalità future di gamification, ma nella versione attuale non è implementato un sistema completo di assegnazione automatica dei punti.

---

### Admin e verifica posti

Il modello `PostoPrivato` contiene uno stato di verifica del posto.

Questo consente una futura estensione in cui un amministratore o ente verificatore possa approvare o rifiutare i posti pubblicati dagli host.

Nella versione attuale, la pubblicazione e la gestione dei posti sono affidate all'host autenticato, con dichiarazione di proprietà/autorizzazione al momento della creazione del posto.

---

### Storage immagini

Per semplicità progettuale le immagini sono salvate nel filesystem locale del backend.

Questa soluzione è adeguata per demo locale e sviluppo universitario.

In una versione production sarebbe preferibile usare uno storage esterno, ad esempio:

* Cloudinary
* Amazon S3
* Firebase Storage
* Supabase Storage

---

### Evoluzione del progetto

Durante lo sviluppo il progetto è stato raffinato iterativamente.

La versione finale si concentra sul caso d'uso principale:

```text
utente cerca un posto privato
↓
utente prenota
↓
utente paga
↓
utente comunica con l'host
↓
utente recensisce il posto
```

Rispetto alle prime ipotesi progettuali, alcune funzionalità più ampie, come stima dei parcheggi pubblici, integrazione con trasporto pubblico o pannello amministratore completo, sono state considerate estensioni future per mantenere il prodotto finale più concreto, stabile e dimostrabile.

---

## Autori

* David Dorobantu — 234467
* Riccardo Gonzato — 246476
* Matteo Sepa — 243283
