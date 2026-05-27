import { useState, useEffect } from 'react'
import { api } from '../services/api'

const STATO_LABEL = {
  IN_ATTESA_PAGAMENTO: { label: 'In attesa di pagamento', color: '#d97706' },
  PAGATA:              { label: 'Confermata',              color: '#16a34a' },
  ANNULLATA:           { label: 'Annullata',               color: '#dc2626' },
}

function StarPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: n <= value ? '#f59e0b' : '#d1d5db', padding: 0 }}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function MyBookings({ onBack, onPay }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewedSpotIds, setReviewedSpotIds] = useState(new Set())

  // Which booking card has the review form open
  const [reviewingId, setReviewingId] = useState(null)
  const [reviewForm, setReviewForm] = useState({ voto: 0, testo: '' })
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState('')

  useEffect(() => {
    Promise.all([api.listMyBookings(), api.getMyRecensioni()])
      .then(([bs, rs]) => {
        setBookings(bs)
        setReviewedSpotIds(new Set(rs.map(r => r.postoPrivatoId?.toString() ?? r.postoPrivatoId)))
      })
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

  function openReview(bookingId) {
    setReviewingId(bookingId)
    setReviewForm({ voto: 0, testo: '' })
    setReviewError('')
  }

  async function handleReviewSubmit(booking) {
    if (reviewForm.voto === 0) {
      setReviewError('Seleziona un voto da 1 a 5')
      return
    }
    setReviewLoading(true)
    setReviewError('')
    try {
      const postoId = booking.postoPrivatoId?._id ?? booking.postoPrivatoId
      await api.createRecensione({ postoPrivatoId: postoId, voto: reviewForm.voto, testo: reviewForm.testo })
      setReviewedSpotIds(prev => new Set([...prev, postoId?.toString()]))
      setReviewingId(null)
    } catch (e) {
      setReviewError(e.message)
    } finally {
      setReviewLoading(false)
    }
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
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && bookings.length === 0 && (
        <p style={{ color: '#6b7280' }}>Nessuna prenotazione trovata.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {bookings.map(b => {
          const spot = b.postoPrivatoId
          const stato = STATO_LABEL[b.stato] ?? { label: b.stato, color: '#374151' }
          const postoId = spot?._id?.toString() ?? spot?.toString()
          const alreadyReviewed = reviewedSpotIds.has(postoId)
          const canReview = b.stato === 'PAGATA' && !alreadyReviewed

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
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {b.stato === 'IN_ATTESA_PAGAMENTO' && (
                    <button onClick={() => onPay(b)} style={S.btnPrimary}>
                      Paga ora
                    </button>
                  )}
                  {canReview && reviewingId !== b._id && (
                    <button onClick={() => openReview(b._id)} style={S.btnSecondary}>
                      Lascia recensione
                    </button>
                  )}
                  {b.stato === 'PAGATA' && alreadyReviewed && (
                    <span style={{ fontSize: 12, color: '#16a34a', alignSelf: 'center' }}>✓ Recensito</span>
                  )}
                  <button onClick={() => handleCancel(b._id)} style={S.btnDanger}>
                    Annulla
                  </button>
                </div>
              )}

              {/* Inline review form */}
              {reviewingId === b._id && (
                <div style={{ marginTop: 14, padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 14 }}>La tua recensione</p>
                  <StarPicker value={reviewForm.voto} onChange={v => setReviewForm(f => ({ ...f, voto: v }))} />
                  <textarea
                    value={reviewForm.testo}
                    onChange={e => setReviewForm(f => ({ ...f, testo: e.target.value }))}
                    placeholder="Scrivi un commento (opzionale)"
                    rows={3}
                    maxLength={500}
                    style={{ width: '100%', marginTop: 10, padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                  {reviewError && <p style={{ color: '#dc2626', fontSize: 13, margin: '4px 0 0' }}>{reviewError}</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={() => handleReviewSubmit(b)} disabled={reviewLoading} style={S.btnPrimary}>
                      {reviewLoading ? 'Invio...' : 'Invia recensione'}
                    </button>
                    <button onClick={() => setReviewingId(null)} style={S.btnSecondary}>
                      Annulla
                    </button>
                  </div>
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
  btnSecondary: {
    padding: '6px 14px', background: '#f1f5f9', color: '#12324a',
    border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontSize: 13,
  },
  btnDanger: {
    padding: '6px 14px', background: '#fff', color: '#dc2626',
    border: '1px solid #dc2626', borderRadius: 6, cursor: 'pointer', fontSize: 13,
  },
}
