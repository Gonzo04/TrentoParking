import { useState } from 'react'
import { api } from '../services/api'

export default function PaymentPage({ booking, onBack, onPaid }) {
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Se la pagina viene aperta senza una prenotazione valida
  // mostriamo un messaggio chiaro invece di rompere il componente
  if (!booking) {
    return (
      <div style={S.page}>
        <div style={S.wrapper}>
          <div style={S.card}>
            <h2 style={S.titleCentered}>Prenotazione non trovata</h2>
            <p style={S.textCenter}>
              Non ci sono dati disponibili per completare il pagamento
            </p>

            <div style={S.actionsCenter}>
              <button onClick={onBack} style={S.secondaryButton}>
                Torna indietro
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const spot = booking.postoPrivatoId

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    // Controllo semplice lato frontend
    // Serve solo per evitare submit vuoti
    if (!cardNumber.trim() || !expiry.trim() || !cvv.trim()) {
      setError('Compila tutti i campi del pagamento')
      return
    }

    setLoading(true)

    try {
      const updatedBooking = await api.payBooking(booking._id)

      // Avvisiamo il componente padre che il pagamento è andato a buon fine
      if (onPaid) {
        onPaid(updatedBooking)
      }
    } catch (err) {
      setError(err.message || 'Errore durante il pagamento')
    } finally {
      setLoading(false)
    }
  }

  function formatDateRange() {
    const inizio = new Date(booking.dataOraInizio)
    const fine = new Date(booking.dataOraFine)

    const data = inizio.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })

    const oraInizio = inizio.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    })

    const oraFine = fine.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    })

    return `${data} · ${oraInizio} - ${oraFine}`
  }

  return (
    <div style={S.page}>
      <div style={S.wrapper}>
        <div style={S.topBar}>
          <button onClick={onBack} style={S.backButton}>
            ← Torna alla mappa
          </button>
        </div>

        <div style={S.card}>
          <div style={S.header}>
            <h1 style={S.titleCentered}>Completa il pagamento</h1>
            <p style={S.subtitleCentered}>
              Conferma la prenotazione inserendo i dati della carta
            </p>
          </div>

          <div style={S.summaryBox}>
            <h2 style={S.summaryTitle}>
              {spot?.nome || 'Posto auto privato'}
            </h2>

            <p style={S.summaryText}>
              {spot?.posizione?.indirizzoTestuale || 'Indirizzo non disponibile'}
            </p>

            <div style={S.summaryInfo}>
              <div style={S.summaryRow}>
                <span style={S.label}>Data e orario</span>
                <span style={S.value}>{formatDateRange()}</span>
              </div>

              <div style={S.summaryRow}>
                <span style={S.label}>Targa</span>
                <span style={S.value}>{booking.targa || 'Non disponibile'}</span>
              </div>

              <div style={S.summaryRow}>
                <span style={S.label}>Totale</span>
                <span style={S.total}>€{Number(booking.prezzoTotale || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={S.form}>
            <div>
              <label style={S.inputLabel}>Numero carta</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(event) => setCardNumber(event.target.value)}
                placeholder="1234 5678 9012 3456"
                style={S.input}
              />
            </div>

            <div style={S.row}>
              <div style={{ flex: 1 }}>
                <label style={S.inputLabel}>Scadenza</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(event) => setExpiry(event.target.value)}
                  placeholder="MM/AA"
                  style={S.input}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={S.inputLabel}>CVV</label>
                <input
                  type="text"
                  value={cvv}
                  onChange={(event) => setCvv(event.target.value)}
                  placeholder="123"
                  style={S.input}
                />
              </div>
            </div>

            {error && (
              <div style={S.errorBox}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...S.primaryButton,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading
                ? 'Pagamento in corso...'
                : `Paga €${Number(booking.prezzoTotale || 0).toFixed(2)}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

const S = {
  page: {
    minHeight: '100vh',
    padding: '40px 20px 60px',
    display: 'flex',
    justifyContent: 'center'
  },

  wrapper: {
    width: '100%',
    maxWidth: '760px'
  },

  topBar: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '18px'
  },

  backButton: {
    background: '#ffffff',
    color: '#1e3a8a',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 20px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(0,0,0,0.12)'
  },

  card: {
    background: '#ffffff',
    borderRadius: '20px',
    padding: '32px',
    boxShadow: '0 18px 40px rgba(0,0,0,0.18)'
  },

  header: {
    marginBottom: '24px',
    textAlign: 'center'
  },

  titleCentered: {
    margin: '0 0 10px 0',
    fontSize: '34px',
    fontWeight: '800',
    color: '#0f172a'
  },

  subtitleCentered: {
    margin: 0,
    fontSize: '16px',
    color: '#475569',
    lineHeight: 1.5
  },

  textCenter: {
    textAlign: 'center',
    fontSize: '16px',
    color: '#475569'
  },

  actionsCenter: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '20px'
  },

  summaryBox: {
    background: '#f8fafc',
    border: '1px solid #dbeafe',
    borderRadius: '16px',
    padding: '22px',
    marginBottom: '26px'
  },

  summaryTitle: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: '800',
    color: '#0f172a'
  },

  summaryText: {
    margin: '0 0 20px 0',
    fontSize: '15px',
    color: '#475569'
  },

  summaryInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },

  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },

  label: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#334155'
  },

  value: {
    fontSize: '15px',
    color: '#0f172a',
    fontWeight: '600'
  },

  total: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#2563eb'
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },

  row: {
    display: 'flex',
    gap: '14px'
  },

  inputLabel: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '15px',
    fontWeight: '700',
    color: '#1e293b'
  },

  input: {
    width: '100%',
    height: '52px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    padding: '0 14px',
    fontSize: '16px',
    color: '#0f172a',
    background: '#ffffff',
    boxSizing: 'border-box'
  },

  errorBox: {
    background: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '12px 14px',
    fontSize: '14px',
    fontWeight: '600'
  },

  primaryButton: {
    width: '100%',
    height: '54px',
    border: 'none',
    borderRadius: '12px',
    background: '#2563eb',
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '800',
    marginTop: '8px'
  },

  secondaryButton: {
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 20px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer'
  }
}