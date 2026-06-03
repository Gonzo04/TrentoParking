import { useState, useEffect } from 'react'
import { api } from '../services/api'
import ReviewModal from './ReviewModal'
import ChatModal from './ChatModal'

/* ── Costanti ─────────────────────────────────────────────────────── */
const STATO = {
  IN_ATTESA_PAGAMENTO: { label: 'In attesa di pagamento', bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  PAGATA:              { label: 'Confermata',              bg: '#dcfce7', color: '#14532d', dot: '#16a34a' },
  ANNULLATA:           { label: 'Annullata',               bg: '#fee2e2', color: '#7f1d1d', dot: '#dc2626' },
}

function fmt(iso, opts) {
  return new Date(iso).toLocaleString('it-IT', opts)
}

function durataOre(inizio, fine) {
  return Math.round((new Date(fine) - new Date(inizio)) / 3600000)
}

/* ── Componente ───────────────────────────────────────────────────── */
export default function MyBookings({ onBack, onPay, onViewHostReviews, currentUserId }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewBooking, setReviewBooking] = useState(null)
  const [chatBookingId, setChatBookingId] = useState(null)

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

  function handleReviewSubmitted(rec) {
    setBookings(bs => bs.map(b =>
      b._id === reviewBooking._id ? { ...b, recensioneId: rec._id } : b
    ))
    setReviewBooking(null)
  }

  const now = new Date()
  const attive   = bookings.filter(b => b.stato !== 'ANNULLATA')
  const passate  = bookings.filter(b => b.stato === 'ANNULLATA')

  return (
    <div style={S.page}>

      {reviewBooking && (
        <ReviewModal
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
          onSubmitted={handleReviewSubmitted}
        />
      )}

      {chatBookingId && (
        <ChatModal
          bookingId={chatBookingId}
          currentUserId={currentUserId}
          onClose={() => setChatBookingId(null)}
        />
      )}

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav style={S.nav}>
        <span style={S.navLogo} onClick={onBack}>
          <span style={{ color: '#fff' }}>Trento</span>
          <span style={{ color: '#2a9d8f' }}>Parking</span>
        </span>
        <button onClick={onBack} style={S.navBack}>
          ← Dashboard
        </button>
      </nav>

      {/* ── Contenuto ──────────────────────────────────────────────── */}
      <div style={S.content}>

        {/* Intestazione */}
        <div style={S.pageHeader}>
          <h1 style={S.pageTitle}>Le mie prenotazioni</h1>
          {!loading && !error && (
            <span style={S.countBadge}>
              {attive.length} {attive.length === 1 ? 'attiva' : 'attive'}
            </span>
          )}
        </div>

        {/* Stati di caricamento / errore */}
        {loading && (
          <div style={S.centeredMsg}>
            <span style={S.spinner} />
            <p style={{ margin: 0, color: '#4a5568' }}>Caricamento prenotazioni…</p>
          </div>
        )}

        {!loading && error && (
          <div style={S.errorBox}>
            <p style={{ margin: 0 }}>⚠️ {error}</p>
          </div>
        )}

        {!loading && !error && bookings.length === 0 && (
          <div style={S.emptyBox}>
            <p style={{ fontSize: 40, margin: '0 0 12px' }}>🅿️</p>
            <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#003049', fontSize: 16 }}>
              Nessuna prenotazione
            </p>
            <p style={{ margin: 0, color: '#4a5568', fontSize: 14 }}>
              Torna alla mappa per trovare e prenotare un posto auto.
            </p>
          </div>
        )}

        {/* Lista prenotazioni attive */}
        {attive.length > 0 && (
          <section style={S.section}>
            <p style={S.sectionLabel}>Attive</p>
            <div style={S.list}>
              {attive.map(b => (
                <BookingCard
                  key={b._id}
                  booking={b}
                  now={now}
                  onPay={onPay}
                  onCancel={handleCancel}
                  onReview={setReviewBooking}
                  onViewHostReviews={onViewHostReviews}
                  onChat={id => setChatBookingId(id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Lista prenotazioni annullate */}
        {passate.length > 0 && (
          <section style={S.section}>
            <p style={S.sectionLabel}>Annullate</p>
            <div style={S.list}>
              {passate.map(b => (
                <BookingCard
                  key={b._id}
                  booking={b}
                  now={now}
                  onPay={onPay}
                  onCancel={handleCancel}
                  onReview={setReviewBooking}
                  onViewHostReviews={onViewHostReviews}
                  onChat={id => setChatBookingId(id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

/* ── BookingCard ──────────────────────────────────────────────────── */
function BookingCard({ booking: b, now, onPay, onCancel, onReview, onViewHostReviews, onChat }) {
  const spot  = b.postoPrivatoId
  const stato = STATO[b.stato] ?? { label: b.stato, bg: '#f3f4f6', color: '#374151', dot: '#9ca3af' }
  const ore   = durataOre(b.dataOraInizio, b.dataOraFine)

  const giorno = fmt(b.dataOraInizio, { weekday: 'long', day: 'numeric', month: 'long' })
  const orariO = fmt(b.dataOraInizio, { hour: '2-digit', minute: '2-digit' })
  const orarioF = fmt(b.dataOraFine,  { hour: '2-digit', minute: '2-digit' })

  const isExpired  = new Date(b.dataOraFine) < now
  const canReview  = b.stato === 'PAGATA' && isExpired && !b.recensioneId
  const hostId     = spot?.hostId?._id ?? spot?.hostId

  return (
    <div style={S.card}>

      {/* Riga superiore: nome + stato */}
      <div style={S.cardTop}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={S.cardSpotName}>{spot?.nome ?? '—'}</p>
          {spot?.posizione?.indirizzoTestuale && (
            <p style={S.cardAddress}>{spot.posizione.indirizzoTestuale}</p>
          )}
          {hostId && onViewHostReviews && (
            <button
              onClick={() => onViewHostReviews(hostId)}
              style={S.hostLink}
            >
              👤 {spot.hostId?.nome} {spot.hostId?.cognome}
            </button>
          )}
        </div>
        <span style={{ ...S.statoBadge, background: stato.bg, color: stato.color }}>
          <span style={{ ...S.statoDot, background: stato.dot }} />
          {stato.label}
        </span>
      </div>

      {/* Dettagli prenotazione */}
      <div style={S.cardDetails}>
        <div style={S.detailItem}>
          <span style={S.detailIcon}>📅</span>
          <span style={S.detailText}>
            {giorno} · {orariO} → {orarioF}
            <span style={S.detailMeta}> · {ore}h</span>
          </span>
        </div>
        <div style={S.detailItem}>
          <span style={S.detailIcon}>🚗</span>
          <span style={S.detailText}>{b.targa}</span>
        </div>
      </div>

      {/* Riga inferiore: prezzo + azioni */}
      <div style={S.cardFooter}>
        <span style={S.cardPrice}>€{b.prezzoTotale?.toFixed(2)}</span>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {b.stato === 'PAGATA' && isExpired && (
            b.recensioneId ? (
              <span style={S.reviewedBadge}>✓ Recensito</span>
            ) : (
              <button onClick={() => onReview(b)} style={S.btnReview}>
                ⭐ Lascia recensione
              </button>
            )
          )}
          {b.stato !== 'ANNULLATA' && (
            <button onClick={() => onChat(b._id)} style={S.btnChat}>
              💬 Chat
            </button>
          )}
          {b.stato !== 'ANNULLATA' && !isExpired && (
            <>
              {b.stato === 'IN_ATTESA_PAGAMENTO' && (
                <button onClick={() => onPay(b)} style={S.btnPay}>
                  Paga ora
                </button>
              )}
              <button onClick={() => onCancel(b._id)} style={S.btnCancel}>
                Annulla
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Stili ────────────────────────────────────────────────────────── */
const S = {
  page: {
    minHeight: '100vh',
    background: '#f5f6f7',
    fontFamily: "'Inter', system-ui, sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },

  /* Navbar */
  nav: {
    height: 64,
    background: '#003049',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.75rem',
    flexShrink: 0,
  },
  navBack: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.88)',
    padding: '0.45rem 1rem',
    borderRadius: 999,
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  navLogo: {
    fontFamily: "'Sora', sans-serif",
    fontWeight: 800,
    fontSize: '1.2rem',
    letterSpacing: '-0.04em',
    cursor: 'pointer',
  },

  /* Contenuto */
  content: {
    flex: 1,
    maxWidth: 680,
    width: '100%',
    margin: '0 auto',
    padding: '2rem 1.25rem',
  },

  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.75rem',
    flexWrap: 'wrap',
  },
  pageTitle: {
    margin: 0,
    fontFamily: "'Sora', sans-serif",
    fontSize: '1.6rem',
    fontWeight: 800,
    color: '#003049',
    letterSpacing: '-0.03em',
  },
  countBadge: {
    background: 'rgba(42,157,143,0.12)',
    color: '#1f7a6e',
    border: '1px solid rgba(42,157,143,0.25)',
    borderRadius: 999,
    padding: '2px 12px',
    fontSize: '0.82rem',
    fontWeight: 700,
  },

  /* Stati */
  centeredMsg: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    padding: '3rem 0',
  },
  spinner: {
    display: 'block',
    width: 32,
    height: 32,
    border: '3px solid #e2e8f0',
    borderTopColor: '#2a9d8f',
    borderRadius: '50%',
    animation: 'mb-spin 0.8s linear infinite',
  },
  errorBox: {
    background: '#fee2e2',
    color: '#7f1d1d',
    border: '1px solid #fca5a5',
    borderRadius: 12,
    padding: '14px 18px',
    fontSize: 14,
  },
  emptyBox: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: '3rem 2rem',
    textAlign: 'center',
  },

  /* Sezioni */
  section: {
    marginBottom: '1.5rem',
  },
  sectionLabel: {
    margin: '0 0 0.75rem',
    fontSize: '0.78rem',
    fontWeight: 700,
    color: '#8a95a3',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },

  /* Card */
  card: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardSpotName: {
    margin: '0 0 2px',
    fontWeight: 700,
    fontSize: 15,
    color: '#003049',
    fontFamily: "'Sora', sans-serif",
    letterSpacing: '-0.02em',
  },
  cardAddress: {
    margin: 0,
    fontSize: 13,
    color: '#4a5568',
  },
  statoBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    padding: '3px 10px',
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  statoDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    flexShrink: 0,
  },

  /* Dettagli */
  cardDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    borderTop: '1px solid #f1f5f9',
    paddingTop: 10,
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  detailIcon: {
    fontSize: 14,
    flexShrink: 0,
  },
  detailText: {
    fontSize: 13,
    color: '#374151',
  },
  detailMeta: {
    color: '#8a95a3',
  },

  /* Footer card */
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTop: '1px solid #f1f5f9',
    paddingTop: 10,
    gap: 12,
    flexWrap: 'wrap',
  },
  cardPrice: {
    fontWeight: 800,
    fontSize: 18,
    color: '#2a9d8f',
  },

  /* Host link */
  hostLink: {
    background: 'none', border: 'none', padding: 0,
    cursor: 'pointer', color: '#2a9d8f',
    fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
    marginTop: 3,
  },

  /* Reviewed badge */
  reviewedBadge: {
    display: 'inline-flex', alignItems: 'center',
    padding: '7px 12px',
    background: '#f0fdf4', color: '#16a34a',
    border: '1px solid #bbf7d0',
    borderRadius: 8, fontSize: 12, fontWeight: 600,
  },

  /* Review button */
  btnReview: {
    padding: '7px 14px',
    background: '#fef9ec', color: '#92400e',
    border: '1px solid rgba(234,179,8,0.4)',
    borderRadius: 8, cursor: 'pointer',
    fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
  },

  /* Bottoni */
  btnPay: {
    padding: '7px 18px',
    background: '#2a9d8f',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'inherit',
  },
  btnCancel: {
    padding: '7px 14px',
    background: 'white',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
  },
  btnChat: {
    padding: '7px 14px',
    background: 'white',
    color: '#2563eb',
    border: '1px solid #bfdbfe',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
  },
}