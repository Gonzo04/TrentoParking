import { useState } from 'react'
import { api } from '../services/api'

export default function ReviewModal({ booking, onClose, onSubmitted }) {
  const [stelle, setStelle] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [testo, setTesto] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const spot = booking.postoPrivatoId

  async function handleSubmit() {
    if (stelle === 0) { setError('Seleziona almeno una stella'); return }
    setLoading(true)
    setError('')
    try {
      const rec = await api.createRecensione({ prenotazioneId: booking._id, stelle, testo })
      onSubmitted(rec)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>

        <div style={S.header}>
          <h2 style={S.title}>Lascia una recensione</h2>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>

        <p style={S.spotName}>{spot?.nome ?? '—'}</p>
        {spot?.posizione?.indirizzoTestuale && (
          <p style={S.address}>{spot.posizione.indirizzoTestuale}</p>
        )}

        {/* Stelle */}
        <div style={S.starsRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              style={{ ...S.star, color: n <= (hovered || stelle) ? '#f59e0b' : '#e2e8f0' }}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setStelle(n)}
            >
              ★
            </button>
          ))}
          {stelle > 0 && (
            <span style={S.starLabel}>{LABELS[stelle]}</span>
          )}
        </div>

        {/* Testo */}
        <textarea
          style={S.textarea}
          placeholder="Descrivi la tua esperienza (facoltativo)"
          value={testo}
          onChange={e => setTesto(e.target.value)}
          maxLength={500}
          rows={4}
        />
        <p style={S.charCount}>{testo.length}/500</p>

        {error && <p style={S.error}>{error}</p>}

        <div style={S.footer}>
          <button onClick={onClose} style={S.btnSecondary}>Annulla</button>
          <button onClick={handleSubmit} disabled={loading || stelle === 0} style={S.btnPrimary}>
            {loading ? 'Invio…' : 'Pubblica recensione'}
          </button>
        </div>

      </div>
    </div>
  )
}

const LABELS = { 1: 'Pessimo', 2: 'Scarso', 3: 'Nella media', 4: 'Buono', 5: 'Eccellente' }

const S = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '1rem',
  },
  modal: {
    background: '#fff',
    borderRadius: 20,
    padding: '1.5rem',
    width: '100%',
    maxWidth: 440,
    fontFamily: "'Inter', system-ui, sans-serif",
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  title: {
    margin: 0,
    fontFamily: "'Sora', sans-serif",
    fontSize: '1.15rem',
    fontWeight: 800,
    color: '#003049',
    letterSpacing: '-0.03em',
  },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 18, color: '#8a95a3', padding: '4px 8px',
    borderRadius: 8, fontFamily: 'inherit',
  },
  spotName: {
    margin: '0 0 2px',
    fontWeight: 700, fontSize: 15, color: '#003049',
    fontFamily: "'Sora', sans-serif",
  },
  address: {
    margin: '0 0 1rem',
    fontSize: 13, color: '#4a5568',
  },
  starsRow: {
    display: 'flex', alignItems: 'center', gap: 4,
    marginBottom: '1rem',
  },
  star: {
    fontSize: 36,
    background: 'none', border: 'none',
    cursor: 'pointer', padding: 0, lineHeight: 1,
    transition: 'color 0.1s',
  },
  starLabel: {
    marginLeft: 8,
    fontSize: 13, fontWeight: 600, color: '#4a5568',
  },
  textarea: {
    width: '100%',
    border: '1.5px solid #e2e8f0',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 14,
    fontFamily: 'inherit',
    color: '#003049',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
  },
  charCount: {
    margin: '4px 0 0',
    fontSize: 12, color: '#8a95a3', textAlign: 'right',
  },
  error: {
    margin: '8px 0 0',
    background: '#fee2e2',
    color: '#7f1d1d',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
  },
  footer: {
    display: 'flex', gap: 8, justifyContent: 'flex-end',
    marginTop: '1rem',
  },
  btnSecondary: {
    padding: '9px 18px',
    background: 'white', color: '#374151',
    border: '1px solid #e2e8f0',
    borderRadius: 8, cursor: 'pointer',
    fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
  },
  btnPrimary: {
    padding: '9px 20px',
    background: '#2a9d8f', color: '#fff',
    border: 'none',
    borderRadius: 8, cursor: 'pointer',
    fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
    opacity: 1,
  },
}
