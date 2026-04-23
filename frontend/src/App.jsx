import { useState } from 'react'
import './App.css'
import MapPicker from './components/MapPicker'
import { estimateParking } from './services/estimateService'

function App() {
  // Punto selezionato sulla mappa
  const [selectedPosition, setSelectedPosition] = useState(null)

  // Raggio di ricerca in metri
  const [radiusMeters, setRadiusMeters] = useState(500)

  // Messaggio mostrato all'utente
  const [message, setMessage] = useState('')

  // Risultato ricevuto dal backend
  const [result, setResult] = useState(null)

  // Stato di caricamento
  const [loading, setLoading] = useState(false)

  // Quando l'utente clicca sulla mappa, salviamo le coordinate
  const handleSelectPosition = ({ lat, lng }) => {
    setSelectedPosition({ lat, lng })
    setResult(null)
    setMessage(`Punto selezionato: lat ${lat.toFixed(5)}, lng ${lng.toFixed(5)}`)
  }

  // Funzione di supporto per tradurre LOW/MEDIUM/HIGH in italiano
  const translateAvailability = (value) => {
    switch (value) {
      case 'LOW':
        return 'Bassa'
      case 'MEDIUM':
        return 'Media'
      case 'HIGH':
        return 'Alta'
      default:
        return value
    }
  }

  // Questa funzione adesso chiama DAVVERO il backend
  const handleEstimate = async () => {
    if (!selectedPosition) {
      setMessage('Seleziona prima un punto sulla mappa.')
      return
    }

    setLoading(true)
    setResult(null)
    setMessage('Calcolo della stima in corso...')

    try {
      const data = await estimateParking({
        centerLat: selectedPosition.lat,
        centerLng: selectedPosition.lng,
        radiusMeters,
      })

      setResult(data)
      setMessage('Stima calcolata con successo.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>TrentoParking</h1>
      <p>Seleziona un punto sulla mappa e imposta il raggio di ricerca.</p>

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="radiusMeters">
          Raggio di ricerca: <strong>{radiusMeters} metri</strong>
        </label>

        <input
          id="radiusMeters"
          type="range"
          min="100"
          max="1500"
          step="50"
          value={radiusMeters}
          onChange={(e) => setRadiusMeters(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <MapPicker
        selectedPosition={selectedPosition}
        radiusMeters={radiusMeters}
        onSelectPosition={handleSelectPosition}
      />

      <div style={{ marginTop: '16px' }}>
        <button onClick={handleEstimate} disabled={loading}>
          {loading ? 'Calcolo in corso...' : 'Calcola stima'}
        </button>
      </div>

      {message && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            background: '#f3f4f6',
            borderRadius: '8px',
          }}
        >
          {message}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: '16px',
            padding: '16px',
            background: '#eef6ff',
            borderRadius: '12px',
          }}
        >
          <h2>Risultato della stima</h2>

          <p>
            <strong>Disponibilità parcheggi gratuiti:</strong>{' '}
            {translateAvailability(result.freeParkingAvailability)}
          </p>

          <p>
            <strong>Disponibilità parcheggi a pagamento:</strong>{' '}
            {translateAvailability(result.paidParkingAvailability)}
          </p>

          <p>
            <strong>Area suggerita:</strong>{' '}
            {result.suggestedArea || 'Nessuna'}
          </p>

          <p>
            <strong>Messaggio:</strong> {result.message}
          </p>
        </div>
      )}
    </div>
  )
}

export default App