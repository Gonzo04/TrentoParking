# TrentoParking

TrentoParking è un'applicazione web che aiuta gli utenti a stimare la disponibilità di parcheggio nelle aree della città di Trento. Il sistema fornisce stime in tempo reale, suggerimenti di mobilità alternativa e, per gli utenti registrati, la possibilità di prenotare posti auto privati.

## Indice

- [Funzionalità](#funzionalità)
- [Architettura](#architettura)
- [Stack tecnologico](#stack-tecnologico)
- [Prerequisiti](#prerequisiti)
- [Avvio rapido](#avvio-rapido)
- [Struttura del progetto](#struttura-del-progetto)
- [API](#api)
- [Autori](#autori)

---

## Funzionalità

**Stima della disponibilità**
- Stima della probabilità di trovare parcheggio gratuito o a pagamento in base all'area e al raggio selezionati
- Indice di affidabilità della stima
- Integrazione con i dati pubblici sui parcheggi del Comune di Trento
- Supporto cartografico per geolocalizzazione e calcolo delle distanze

**Autenticazione e ruoli**
- Registrazione, login, logout e verifica email
- Quattro ruoli distinti: Utente anonimo, Utente autenticato, Host, Amministratore

**Feedback e premialità**
- Gli utenti autenticati (con email verificata) possono inviare, modificare e rimuovere feedback sull'esito della ricerca
- Sistema di punti: ogni feedback valido incrementa il punteggio dell'utente
- Pannello di amministrazione per il monitoraggio dei feedback e la gestione della premialità

**Mobilità alternativa**
- Quando la disponibilità di parcheggio è bassa, il sistema suggerisce linee bus e fermate utili per raggiungere la destinazione
- Integrazione con i dati del trasporto pubblico locale

**Prenotazione di posti privati**
- Gli Host possono pubblicare il proprio posto auto con fasce orarie e tariffa oraria
- Gli utenti autenticati possono prenotare un posto privato inserendo la targa del veicolo
- Gestione degli stati di prenotazione: in attesa di pagamento, pagata, annullata
- Integrazione con gateway di pagamento mock

---

## Architettura

```
Browser / Frontend (React)
    │
    │  REST JSON
    ▼
Backend (Spring Boot)
    ├── EstimateController  →  EstimateService
    ├── MobilityService     →  API Bus (trasporto pubblico)
    ├── RewardService       →  Persistenza (feedback, utenti)
    └── BookingService      →  Persistenza (prenotazioni, posti privati)
                                    │
                            Servizi esterni
                        (Comune, Mappe, Pagamento)
```

---

## Stack tecnologico

| Layer     | Tecnologia                        |
|-----------|-----------------------------------|
| Frontend  | React 18, Vite                    |
| Backend   | Kotlin, Spring Boot, Gradle       |
| Database  | MongoDB                           |
| Mappe     | Servizio cartografico esterno     |
| Pagamento | Gateway mock                      |

---

## Prerequisiti

- **JDK 17+**
- **Node.js 18+** e npm

---

## Avvio rapido

### Backend

```bash
cd backend
./gradlew bootRun
```

Il server si avvia su `http://localhost:8080`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Il frontend si avvia su `http://localhost:5173`.

---

## Struttura del progetto
```
TrentoParking/
├── backend/
│   └── src/main/kotlin/com/trentoparking/backend/
│       ├── config/         # Configurazioni Spring, inclusa CORS
│       ├── controller/     # Endpoint REST
│       ├── domain/         # Classi di dominio
│       ├── dto/            # Oggetti di trasferimento dati
│       └── service/        # Logica applicativa
├── frontend/
│   └── src/
│       ├── components/     # Componenti React
│       ├── services/       # Chiamate al backend
│       └── App.jsx         # Componente principale
└── docs/
    ├── D1/                 # Requisiti, casi d'uso e BPMN
    └── D2/                 # Architettura, componenti e classi
```
---

## API

### `POST /api/estimate`

Restituisce la stima della disponibilità di parcheggio per l'area indicata.

**Request**
```json
{
  "centerLat": 46.0679,
  "centerLng": 11.1211,
  "radiusMeters": 400
}
```

**Response**
```json
{
  "freeParkingAvailability": "bassa",
  "paidParkingAvailability": "alta",
  "suggestedArea": "Parcheggio Monte Baldo",
  "message": "Zona centrale: bassa disponibilità di parcheggi gratuiti, alta disponibilità di parcheggi a pagamento."
}
```



I valori di disponibilità possono essere `Bassa`, `Media` o `Alta`.

## Autori

- David Dorobantu — 234467
- Riccardo Gonzato — 246476
- Matteo Sepa — 243283



