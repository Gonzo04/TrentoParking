import { useState, useEffect } from 'react'
import { api } from '../services/api'

const STATO_LABEL = {
  IN_ATTESA_PAGAMENTO: { label: 'In attesa di pagamento', color: '#d97706' },
  PAGATA: { label: 'Confermata', color: '#16a34a' },
  ANNULLATA: { label: 'Annullata', color: '#dc2626' },
}

function getHostName(host) {
  if (!host || typeof host === 'string') {
    return 'Host non disponibile'
  }

  const nomeCompleto = [host.nome, host.cognome]
    .filter(Boolean)
    .join(' ')

  return nomeCompleto || host.nomeUtente || 'Host non disponibile'
}

function getHostContact(host) {
  if (!host || typeof host === 'string') {
    return ''
  }

  return host.email || host.nomeUtente || ''
}

export default function MyBookings({ onBack, onPay }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

      setBookings(bs => (
        bs.map(b => (
          b._id === id
            ? { ...b, stato: updated.stato }
            : b
        ))
      ))
    } catch (e) {
      alert(e.message)
    }
  }

  function handlePay(booking) {
    onPay(booking)
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: '#2563eb',
          cursor: 'pointer',
          fontSize: 14,
          marginBottom: 16
        }}
      >
        ← Torna alla mappa
      </button>

      <h2 style={{ marginBottom: 20 }}>Le mie prenotazioni</h2>

      {loading && <p>Caricamento...</p>}

      {error && (
        <p style={{ color: 'red' }}>
          {error}
        </p>
      )}

      {!loading && !error && bookings.length === 0 && (
        <p style={{ color: '#6b7280' }}>
          Nessuna prenotazione trovata.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {bookings.map((booking) => {
          const spot = booking.postoPrivatoId
          const host = spot?.hostId
          const stato = STATO_LABEL[booking.stato] ?? {
            label: booking.stato,
            color: '#374151'
          }

          const hostName = getHostName(host)
          const hostContact = getHostContact(host)

          return (
            <div
              key={booking._id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: 16,
                background: '#fff'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 8
                }}
              >
                <div>
                  <p style={{ margin: '0 0 4px', fontWeight: 600 }}>
                    {spot?.nome ?? '—'}
                  </p>

                  <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>
                    {spot?.posizione?.indirizzoTestuale || 'Indirizzo non disponibile'}
                  </p>

                  <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>
                    {new Date(booking.dataOraInizio).toLocaleString('it-IT', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                    {' → '}
                    {new Date(booking.dataOraFine).toLocaleString('it-IT', {
                      timeStyle: 'short'
                    })}
                  </p>

                  <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>
                    Targa: {booking.targa}
                  </p>

                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 8,
                      background: '#f8fafc',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700 }}>
                      Contatto host
                    </p>

                    <p style={{ margin: '0 0 4px', fontSize: 13, color: '#374151' }}>
                      {hostName}
                    </p>

                    {hostContact ? (
                      <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                        {hostContact}
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                        Contatto non disponibile
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 16, color: '#2563eb' }}>
                    €{booking.prezzoTotale?.toFixed(2)}
                  </p>

                  <span style={{ fontSize: 12, fontWeight: 600, color: stato.color }}>
                    {stato.label}
                  </span>
                </div>
              </div>

              {booking.stato !== 'ANNULLATA' && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  {booking.stato === 'IN_ATTESA_PAGAMENTO' && (
                    <button
                      onClick={() => handlePay(booking)}
                      style={S.btnPrimary}
                    >
                      Paga ora
                    </button>
                  )}

                  <button
                    onClick={() => handleCancel(booking._id)}
                    style={S.btnDanger}
                  >
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
    padding: '6px 14px',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  btnDanger: {
    padding: '6px 14px',
    background: '#fff',
    color: '#dc2626',
    border: '1px solid #dc2626',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
  },
}