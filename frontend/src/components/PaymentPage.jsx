import { useState } from 'react'
import { api } from '../services/api'

// TODO: replace fake card form with a real payment provider (e.g. Stripe Elements)
export default function PaymentPage({ booking, onDone, onCancel }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '' })
  const [paying,  setPaying]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')

  function set(field) {
    return (e) => setCard(c => ({ ...c, [field]: e.target.value }))
  }

  async function handlePay(e) {
    e.preventDefault()
    setPaying(true)
    setError('')
    // Simulate processing delay
    await new Promise(r => setTimeout(r, 1500))
    try {
      await api.payBooking(booking._id)
      setSuccess(true)
      setTimeout(onDone, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setPaying(false)
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 56, color: '#16a34a' }}>✓</div>
        <h2 style={{ marginTop: 12 }}>Pagamento completato!</h2>
        <p style={{ color: '#6b7280' }}>La tua prenotazione è confermata. Reindirizzamento...</p>
      </div>
    )
  }

  const spot = booking.postoPrivatoId

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 16px' }}>
      <button
        onClick={onCancel}
        style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 14, marginBottom: 16 }}
      >
        ← Torna alla mappa
      </button>

      <h2 style={{ marginBottom: 20 }}>Completa il pagamento</h2>

      {/* Booking summary */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 24, background: '#f9fafb' }}>
        <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{spot?.nome ?? 'Posto auto'}</p>
        <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>
          {new Date(booking.dataOraInizio).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })}
          {' → '}
          {new Date(booking.dataOraFine).toLocaleString('it-IT', { timeStyle: 'short' })}
        </p>
        <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>Targa: {booking.targa}</p>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 18, color: '#2563eb' }}>
          €{booking.prezzoTotale?.toFixed(2)}
        </p>
      </div>

      {/* Fake card form */}
      <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={S.label}>Numero carta</label>
          <input
            style={S.input}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            value={card.number}
            onChange={set('number')}
            required
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={S.label}>Scadenza</label>
            <input style={S.input} placeholder="MM/AA" maxLength={5} value={card.expiry} onChange={set('expiry')} required />
          </div>
          <div>
            <label style={S.label}>CVV</label>
            <input style={S.input} placeholder="123" maxLength={3} value={card.cvv} onChange={set('cvv')} required />
          </div>
        </div>

        {error && <p style={{ color: 'red', fontSize: 14, margin: 0 }}>{error}</p>}

        <button
          type="submit"
          disabled={paying}
          style={{ ...S.btnPrimary, padding: '12px 0', fontSize: 15, marginTop: 8 }}
        >
          {paying ? 'Pagamento in corso...' : `Paga €${booking.prezzoTotale?.toFixed(2)}`}
        </button>
      </form>
    </div>
  )
}

const S = {
  label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#374151' },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' },
  btnPrimary: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', width: '100%' },
}
