# TrentoParking — Strategia di branching

## Contesto

Fino ad ora tutto il lavoro di implementazione MongoDB è stato fatto su un'unica branch
(`feature/mongodb-integration`). Per facilitare la collaborazione, il lavoro è stato
**suddiviso in branch separate, una per modulo**, seguendo la struttura dei componenti del D2.

Ogni branch contiene un singolo commit focalizzato e può essere revisionata per poi eseguire il merge
indipendentemente tramite pull request.

> **Nota:** la branch `feature/mongodb-integration` è una branch di riferimento storico
> che contiene tutto il lavoro in un unico commit. **Non va eseguito il merge** — esiste solo come
> archivio. Tutti i merge avvengono tramite le branch di modulo.

---

## Struttura delle branch

```
main
├── feature/base-setup          ← eseguire merge PER PRIMA (tutte le altre dipendono da questa)
│   ├── feature/estimate        ← eseguire merge dopo base-setup
│   ├── feature/mobility        ← eseguire merge dopo base-setup
│   └── feature/auth            ← eseguire merge dopo base-setup
│       ├── feature/feedback    ← eseguire merge dopo auth
│       └── feature/booking     ← eseguire merge dopo auth
└── feature/frontend            ← indipendente, eseguire merge quando si vuole
```

---

## Ordine di merge

| Step | Branch | Dipende da |
|------|--------|------------|
| 1 | `feature/base-setup` | `main` |
| 2 | `feature/estimate` | `feature/base-setup` |
| 2 | `feature/mobility` | `feature/base-setup` |
| 2 | `feature/auth` | `feature/base-setup` |
| 3 | `feature/feedback` | `feature/auth` |
| 3 | `feature/booking` | `feature/auth` |
| qualsiasi | `feature/frontend` | nessuna |

Per branch allo stesso step il merge puo essere eseguito in parallelo.

---

## Dettaglio delle branch

### `feature/base-setup`
**Base:** `main` · **Modulo D2:** infrastruttura condivisa

Prerequisiti comuni da cui dipendono tutte le altre branch backend.
**Deve essere mergiata per prima.**

**Cosa cambia rispetto a `main`:**
- `backend/build.gradle.kts` — aggiunta dipendenza `spring-security-crypto` (BCrypt per le password)
- `model/Feedback.kt` — aggiunto campo `tipoParcheggio` (richiesto dall'algoritmo di stima)
- `model/Utente.kt` — aggiunti campi `nome` e `cognome` (richiesti dalla registrazione)
- `repository/FeedbackRepository.kt` — aggiunte query `findByFasciaOraria` e `findByAreaAndFasciaOraria`
- `controller/GlobalExceptionHandler.kt` — nuovo: converte le eccezioni in risposte HTTP con status code corretto
- `config/DataInitializer.kt` — aggiornato: usa BCrypt, nuovi campi del modello, dati di seed più completi

---

### `feature/estimate`
**Base:** `feature/base-setup` · **Modulo D2:** Modulo Stima

Riscrittura del servizio di stima con un modello **Bayesiano Beta-Binomiale** al posto
della logica hardcoded precedente. Aggiunge anche l'endpoint di ricerca parcheggi per raggio.

**Cosa aggiunge rispetto a `feature/base-setup`:**
- `dto/EstimateRequest.kt` — ora accetta `lat`, `lon`, `raggioMetri`, `fasciaOraria` (prima era solo `areaName`)
- `dto/EstimateResponse.kt` — ora restituisce `probabilitaGratuito`, `probabilitaPagamento`, `affidabilita`, `disponibilitaBassa`
- `service/EstimateService.kt` — riscritto con algoritmo Bayesiano
- `controller/ParcheggioController.kt` — nuovo: ricerca parcheggi pubblici e privati per raggio

**Endpoint esposti:**
- `POST /api/estimate` — stima disponibilità per coordinate + fascia oraria
- `GET /api/parcheggi?lat=&lon=&raggio=` — parcheggi pubblici nell'area
- `GET /api/parcheggi/privati?lat=&lon=&raggio=` — posti privati attivi nell'area

**Come funziona l'algoritmo:**
1. Trova tutti i `Parcheggio` nel raggio (distanza haversine)
2. Prior Bayesiano: α₀ = numero posti gratuiti, β₀ = numero posti a pagamento
3. Aggrega i `Feedback` per la fascia oraria richiesta
4. Posteriore: `P = (α₀ + successi) / (α₀ + β₀ + totale_feedback) × 100`
5. `affidabilita = min(100, numero_feedback × 10)` — cresce con i dati
6. `disponibilitaBassa = true` se entrambe le probabilità < 30% (attiva i suggerimenti mobilità)

---

### `feature/auth`
**Base:** `feature/base-setup` · **Modulo D2:** Autenticazione e Ruoli

Registrazione, login e logout. Le password sono hashate con BCrypt.
L'autenticazione usa token UUID in memoria (niente JWT, sufficiente per la demo).

**Cosa aggiunge rispetto a `feature/base-setup`:**
- `dto/AuthDtos.kt` — `RegisterRequest`, `LoginRequest`, `LoginResponse`
- `service/AuthService.kt` — hashing BCrypt, gestione token UUID in memoria
- `controller/AuthController.kt`

**Endpoint esposti:**
- `POST /api/auth/register` — crea un nuovo `UtenteAutenticato`
- `POST /api/auth/login` — restituisce `{ token, userId, ruolo }`
- `POST /api/auth/logout` — invalida il token

**Convenzione header:** tutti gli endpoint autenticati si aspettano il token nell'header
`Authorization` (la stringa UUID restituita dal login).

---

### `feature/feedback`
**Base:** `feature/auth` · **Modulo D2:** Modulo Feedback (RewardService)

Invio feedback crowdsourced. Ogni feedback valido assegna +10 punti all'utente
(vincolo OCL 3.8). Solo gli utenti con `emailVerificata = true` possono inviare feedback
(vincolo OCL 3.7).

**Cosa aggiunge rispetto a `feature/auth`:**
- `dto/FeedbackDtos.kt` — `FeedbackRequest`
- `service/RewardService.kt` — invio/modifica/eliminazione + aggiornamento punti
- `controller/FeedbackController.kt`

**Endpoint esposti:** (tutti richiedono header `Authorization`)
- `POST /api/feedback` — invia feedback; incrementa `punti` utente di 10
- `PUT /api/feedback/{id}` — modifica un proprio feedback
- `DELETE /api/feedback/{id}` — elimina un proprio feedback
- `GET /api/feedback` — storico dei propri feedback

**Payload feedback:**
```json
{
  "area": "centro",
  "fasciaOraria": "mattina",
  "esitoTrovato": true,
  "tipoParcheggio": "GRATUITO"
}
```
`tipoParcheggio` è obbligatorio quando `esitoTrovato` è `true`, deve essere `null` altrimenti.

---

### `feature/booking`
**Base:** `feature/auth` · **Modulo D2:** Modulo Prenotazione (BookingService)

Prenotazione di posti privati. Il pagamento è mockato (ha sempre successo).
Le nuove prenotazioni partono sempre dallo stato `IN_ATTESA_PAGAMENTO` (vincolo OCL 3.12).
Solo utenti con `emailVerificata = true` e `targa` non vuota possono prenotare (vincolo OCL 3.11).

**Cosa aggiunge rispetto a `feature/auth`:**
- `dto/BookingDtos.kt` — `BookingRequest`
- `service/BookingService.kt`
- `controller/BookingController.kt`

**Endpoint esposti:** (tutti richiedono header `Authorization`)
- `POST /api/bookings` — crea prenotazione (stato: `IN_ATTESA_PAGAMENTO`)
- `POST /api/bookings/{id}/pay` — conferma pagamento → `PAGATA` (mock, ha sempre successo)
- `DELETE /api/bookings/{id}` — annulla → `ANNULLATA`
- `GET /api/bookings` — lista delle proprie prenotazioni

---

### `feature/mobility`
**Base:** `feature/base-setup` · **Modulo D2:** Modulo Mobilità (MobilityService)

Suggerimenti di mobilità alternativa mostrati quando `disponibilitaBassa = true`.
I dati dei bus sono mockati (nessuna API esterna reale).

**Cosa aggiunge rispetto a `feature/base-setup`:**
- `dto/MobilityDtos.kt` — `SuggerimentoMobilita`, `LineaBus`, `FermataBus`
- `service/MobilityService.kt` — restituisce suggerimenti hardcoded
- `controller/MobilityController.kt`

**Endpoint esposti:**
- `GET /api/mobility/suggestions?lat=&lon=` — restituisce linee bus e fermate suggerite

---

### `feature/frontend`
**Base:** `main` · **Scope:** integrazione React completa

Riscrittura del frontend per integrare tutte le API backend. Usa Leaflet per la mappa
(tile OpenStreetMap, nessuna API key necessaria). Lo stato di autenticazione è persistito
in `localStorage`.

**Cosa cambia rispetto a `main`:**
- `frontend/package.json` — aggiunta dipendenza `leaflet`
- `frontend/src/App.jsx` — riscritto: stato auth, navigazione tra viste, layout
- `frontend/src/App.css` — riscritto: layout responsive, stili card/modal
- `frontend/src/api.js` — nuovo: layer API centralizzato per tutte le chiamate al backend
- `frontend/src/components/MapPicker.jsx` — nuovo: mappa Leaflet, click per selezionare posizione
- `frontend/src/components/EstimatePanel.jsx` — nuovo: form raggio+fascia oraria, barre di probabilità
- `frontend/src/components/ParcheggioList.jsx` — nuovo: lista parcheggi + form prenotazione inline
- `frontend/src/components/MobilityPanel.jsx` — nuovo: suggerimenti bus (caricati on-demand)
- `frontend/src/components/AuthModal.jsx` — nuovo: modal login/registrazione
- `frontend/src/components/FeedbackModal.jsx` — nuovo: modal invio feedback
- `frontend/src/components/MyFeedback.jsx` — nuovo: storico feedback con eliminazione
- `frontend/src/components/MyBookings.jsx` — nuovo: lista prenotazioni con paga/annulla

---

## Come lavorare su una branch

```bash
# Scarica tutte le branch remote
git fetch origin

# Passa alla branch assegnata
git checkout feature/<tuo-modulo>

# Fai le tue modifiche, poi committa
git add <file>
git commit -m "<modulo>: descrizione di cosa è cambiato"

# Pubblica la branch sul remote
git push -u origin feature/<tuo-modulo>
```

Quando la PR è approvata, viene mergiata in `main` nell'ordine indicato sopra.
Se `feature/base-setup` non è ancora stata mergiata, **non mergiare** la tua branch —
avrà conflitti o dipendenze mancanti.

---

## Pulizia finale

Una volta mergiate tutte le branch in `main`:

```bash
git branch -d feature/base-setup feature/estimate feature/auth \
              feature/feedback feature/booking feature/mobility \
              feature/frontend feature/mongodb-integration
```
