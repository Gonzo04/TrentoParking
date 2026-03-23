import { useState } from 'react'
import './App.css'
import TrentoMap from './components/TrentoMap'

function App() {
  // Questo stato salva il nome della zona inserita dall'utente.
  // useState('') significa: all'inizio il campo è una stringa vuota.
  const [areaName, setAreaName] = useState('')

  // Questo stato salva il raggio di ricerca in metri.
  // Lo inizializziamo a 500 per avere un valore di default.
  const [radiusMeters, setRadiusMeters] = useState(500)

  // Questo stato conterrà la risposta del backend.
  // All'inizio non abbiamo ancora ricevuto nessun risultato, quindi usiamo null.
  const [result, setResult] = useState(null)

  // Questo stato serve per mostrare eventuali errori all'utente.
  const [error, setError] = useState('')

  // Questo stato ci dice se la richiesta è in corso.
  // È utile per disabilitare il bottone e mostrare "Caricamento...".
  const [loading, setLoading] = useState(false)

  // Questa funzione viene eseguita quando l'utente invia il form.
  // È async perché dentro facciamo una chiamata HTTP con await.
  const handleSubmit = async (event) => {
    // event.preventDefault() impedisce al browser di ricaricare la pagina
    // quando si invia il form. In React quasi sempre vogliamo evitarlo.
    event.preventDefault()

    // Prima di fare una nuova richiesta, puliamo eventuali dati vecchi.
    setError('')
    setResult(null)
    setLoading(true)

    try {
      // fetch invia una richiesta HTTP al backend.
      const response = await fetch('http://localhost:8080/api/estimate', {
        method: 'POST',
        headers: {
          // Stiamo dicendo al backend che il body è in formato JSON.
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Convertiamo i dati JavaScript in JSON da inviare al server.
          areaName: areaName,
          radiusMeters: Number(radiusMeters),
        }),
      })

      // Se la risposta HTTP non è "ok" (es. 400, 500, ecc.),
      // lanciamo un errore che verrà catturato nel catch.
      if (!response.ok) {
        throw new Error('Errore nella chiamata al backend')
      }

      // Convertiamo la risposta JSON del backend in un oggetto JavaScript.
      const data = await response.json()

      // Salviamo il risultato nello stato.
      // Quando lo stato cambia, React aggiorna automaticamente l'interfaccia.
      setResult(data)
    } catch (err) {
      // Se succede un errore di rete o un errore lanciato da noi,
      // salviamo il messaggio nello stato error.
      setError(err.message)
    } finally {
      // finally viene eseguito sia in caso di successo sia in caso di errore.
      // Qui rimettiamo loading a false perché la richiesta è finita.
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>TrentoParking</h1>
      <p>Stima della disponibilità di parcheggio a Trento</p>

      {/* 
        Questo è un form HTML normale, ma in React colleghiamo l'evento onSubmit
        alla funzione handleSubmit.
      */}
      <form onSubmit={handleSubmit} className="form">
        <div>
          <label htmlFor="areaName">Nome area</label>
          <input
            id="areaName"
            type="text"
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            placeholder="Es. Centro, Stazione, Ospedale"
            required
          />
        </div>

        <div>
          <label htmlFor="radiusMeters">Raggio di ricerca (metri)</label>
          <input
            id="radiusMeters"
            type="number"
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(e.target.value)}
            min="100"
            step="50"
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Caricamento...' : 'Calcola stima'}
        </button>
      </form>

      {/* 
        Rendering condizionale:
        questo blocco viene mostrato solo se error contiene qualcosa.
      */}
      {error && (
        <div className="error-box">
          <strong>Errore:</strong> {error}
        </div>
      )}

      {/* 
        Anche questo è rendering condizionale:
        viene mostrato solo se result non è null.
      */}
      {result && (
        <div className="result-box">
          <h2>Risultato della stima</h2>
          <p>
            <strong>Messaggio:</strong> {result.message}
          </p>
          <p>
            <strong>Disponibilità parcheggi gratuiti:</strong>{' '}
            {result.freeParkingAvailability}
          </p>
          <p>
            <strong>Disponibilità parcheggi a pagamento:</strong>{' '}
            {result.paidParkingAvailability}
          </p>
          <p>
            <strong>Area suggerita:</strong>{' '}
            {result.suggestedArea || 'Nessuna'}
          </p>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <h2>Mappa di Trento</h2>
        <TrentoMap />
      </div>
    </div>
  )
}

export default App