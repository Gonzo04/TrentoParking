import { useState, useEffect } from 'react'
import { api } from '../services/api'

const STATO_LABEL = {
  IN_ATTESA_PAGAMENTO: { label: 'In attesa di pagamento', color: '#d97706' },
  PAGATA:              { label: 'Confermata',              color: '#16a34a' },
  ANNULLATA:           { label: 'Annullata',               color: '#dc2626' },
}

export default function MyBookings({ onBack }) {
  const [bookings, setBookings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    api.listMyBookings()
      .then(setBookings)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleCancel(id) {
    if (!confirm('Vuoi davvero annullare questa prenotazione?')) return
    try {
      const updated = await api.cancelBooking(id)
      setBookings(bs => bs.map(b => b._id === id ? { ...b, stato: updated.stato } : b))
    } catch (e) {
      alert(e.message)
    }
  }

  // TODO: handle "pay now" flow (redirect to PaymentPage) for IN_ATTESA_PAGAMENTO bookings
  async function handlePay(id) {
    alert('TODO: reindirizza alla pagina di pagamento per la prenotazione ' + id)
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 14, marginBottom: 16 }}
      >
        ← Torna alla mappa
      </button>

      <h2 style={{ marginBottom: 20 }}>Le mie prenotazioni</h2>

      {loading && <p>Caricamento...</p>}
      {error   && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && bookings.length === 0 && (
        <p style={{ color: '#6b7280' }}>Nessuna prenotazione trovata.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {bookings.map(b => {
          const spot  = b.postoPrivatoId
          const stato = STATO_LABEL[b.stato] ?? { label: b.stato, color: '#374151' }

          return (
            <div key={b._id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{spot?.nome ?? '—'}</p>
                  <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>
                    {spot?.posizione?.indirizzoTestuale}
                  </p>
                  <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>
                    {new Date(b.dataOraInizio).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })}
                    {' → '}
                    {new Date(b.dataOraFine).toLocaleString('it-IT', { timeStyle: 'short' })}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Targa: {b.targa}</p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 16, color: '#2563eb' }}>
                    €{b.prezzoTotale?.toFixed(2)}
                  </p>
                  <span style={{ fontSize: 12, fontWeight: 600, color: stato.color }}>
                    {stato.label}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {b.stato !== 'ANNULLATA' && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  {b.stato === 'IN_ATTESA_PAGAMENTO' && (
                    <button onClick={() => handlePay(b._id)} style={S.btnPrimary}>
                      Paga ora
                    </button>
                  )}
                  <button onClick={() => handleCancel(b._id)} style={S.btnDanger}>
                    Annulla
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const S = {
  btnPrimary: {
    padding: '6px 14px', background: '#2563eb', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  btnDanger: {
    padding: '6px 14px', background: '#fff', color: '#dc2626',
    border: '1px solid #dc2626', borderRadius: 6, cursor: 'pointer', fontSize: 13,
  },
}
