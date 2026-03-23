import { useState } from 'react'
import './App.css'
import TrentoMap from './components/TrentoMap'

function App() {
  const [areaName, setAreaName] = useState('')
  const [radiusMeters, setRadiusMeters] = useState(500)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Funzione centralizzata per ottenere la stima dal backend
  const getEstimate = async (nameOfArea) => {
    setError('')
    setResult(null)
    setLoading(true)

    try {
      const response = await fetch('http://localhost:8080/api/estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          areaName: nameOfArea,
          radiusMeters: Number(radiusMeters),
        }),
      })

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Errore dal backend: ${errorData}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Gestisce l'invio del form
  const handleSubmit = async (event) => {
    event.preventDefault()
    getEstimate(areaName)
  }

  // Gestisce il click su una zona della mappa
  const handleZoneClick = (zoneName) => {
    // Aggiorna il campo di input del form con il nome della zona cliccata
    setAreaName(zoneName)
    // Avvia la stima per quella zona
    getEstimate(zoneName)
  }

  return (
    <div className="container">
      <h1>TrentoParking</h1>
      <p>Stima della disponibilità di parcheggio a Trento</p>

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

      {error && (
        <div className="error-box">
          <strong>Errore:</strong> {error}
        </div>
      )}

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
        <TrentoMap onZoneClick={handleZoneClick} />
      </div>
    </div>
  )
}

export default App