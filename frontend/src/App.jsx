import { useState } from 'react'
import './App.css'

function App() {
  const [areaName, setAreaName] = useState('')
  const [radiusMeters, setRadiusMeters] = useState(500)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
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
          areaName: areaName,
          radiusMeters: Number(radiusMeters),
        }),
      })

      if (!response.ok) {
        throw new Error('Errore nella chiamata al backend')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem' }}>
      <h1>TrentoParking</h1>
      <p>Stima disponibilità parcheggi a Trento</p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '2rem' }}>
        <div>
          <label>Nome area</label>
          <br />
          <input
            type="text"
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            placeholder="Es. Centro, Stazione, Ospedale"
            style={{ width: '100%', padding: '0.6rem' }}
            required
          />
        </div>

        <div>
          <label>Raggio di ricerca (metri)</label>
          <br />
          <input
            type="number"
            value={radiusMeters}
            onChange={(e) => setRadiusMeters(e.target.value)}
            min="100"
            step="50"
            style={{ width: '100%', padding: '0.6rem' }}
            required
          />
        </div>

        <button type="submit" disabled={loading} style={{ padding: '0.8rem' }}>
          {loading ? 'Caricamento...' : 'Calcola stima'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: '2rem', color: 'red' }}>
          <strong>Errore:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '2rem', textAlign: 'left' }}>
          <h2>Risultato</h2>
          <p><strong>Messaggio:</strong> {result.message}</p>
          <p><strong>Disponibilità gratuiti:</strong> {result.freeParkingAvailability}</p>
          <p><strong>Disponibilità a pagamento:</strong> {result.paidParkingAvailability}</p>
          <p><strong>Area suggerita:</strong> {result.suggestedArea || 'Nessuna'}</p>
        </div>
      )}
    </div>
  )
}

export default App