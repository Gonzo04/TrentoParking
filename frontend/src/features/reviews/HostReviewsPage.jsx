import { useEffect, useMemo, useState } from 'react'
import { api } from '../../services/api'

/* ── Helpers ─────────────────────────────────────────────────────── */
function Stars({ n, size = 16 }) {
  return (
    <span style={{ letterSpacing: 1, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ fontSize: size, color: i <= n ? '#f59e0b' : '#e2e8f0' }}>★</span>
      ))}
    </span>
  )
}

function fmt(iso) {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

/* ────────────────────────────────────────────────────────────────────
   Modalità singolo posto
   ──────────────────────────────────────────────────────────────────── */
function SingleSpotReviews({ posto, onBack }) {
  const [recensioni, setRecensioni] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [filter, setFilter]         = useState('recenti')

  useEffect(() => {
    api.getRecensioniPosto(posto._id)
      .then(setRecensioni)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [posto._id])

  const sorted = useMemo(() => {
    const list = [...recensioni]
    if (filter === 'recenti') return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    if (filter === 'alta')    return list.sort((a, b) => b.stelle - a.stelle)
    return list.sort((a, b) => a.stelle - b.stelle)
  }, [recensioni, filter])

  const media = recensioni.length
    ? Math.round(recensioni.reduce((s, r) => s + r.stelle, 0) / recensioni.length * 10) / 10
    : null

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <span style={S.navLogo} onClick={onBack}>
          <span style={{ color: '#fff' }}>Trento</span>
          <span style={{ color: '#2a9d8f' }}>Parking</span>
        </span>
        <button onClick={onBack} style={S.navBack}>← Torna indietro</button>
      </nav>

      <div style={S.content}>
        {/* Header posto */}
        <div style={S.hostCard}>
          <div style={S.hostAvatar}>🅿️</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={S.hostName}>{posto.nome}</h1>
            {posto.posizione?.indirizzoTestuale && (
              <p style={S.hostUsername}>{posto.posizione.indirizzoTestuale}</p>
            )}
          </div>
          {media !== null && (
            <div style={S.hostStats}>
              <Stars n={Math.round(media)} size={20} />
              <span style={S.hostStatsText}>
                {media} · {recensioni.length} {recensioni.length === 1 ? 'recensione' : 'recensioni'}
              </span>
            </div>
          )}
        </div>

        {loading && <div style={S.centered}><span style={S.spinner} /></div>}
        {!loading && error && <div style={S.errorBox}>⚠️ {error}</div>}

        {!loading && !error && recensioni.length === 0 && (
          <div style={S.emptyBox}>
            <p style={{ fontSize: 36, margin: '0 0 10px' }}>⭐</p>
            <p style={{ margin: 0, fontWeight: 700, color: '#003049' }}>Nessuna recensione ancora</p>
          </div>
        )}

        {!loading && !error && recensioni.length > 0 && (
          <>
            <div style={S.filterRow}>
              <span style={S.filterLabel}>Ordina:</span>
              {FILTER_OPTS.map(opt => (
                <button
                  key={opt.key}
                  style={{ ...S.filterBtn, ...(filter === opt.key ? S.filterBtnActive : {}) }}
                  onClick={() => setFilter(opt.key)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div style={S.reviewList}>
              {sorted.map(r => <ReviewCard key={r._id} recensione={r} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────
   Modalità host completo  (prop: hostId)
   ──────────────────────────────────────────────────────────────────── */
function AllHostReviews({ hostId, onBack }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [filter, setFilter]     = useState('recenti')
  const [openSpot, setOpenSpot] = useState(null)

  useEffect(() => {
    api.getRecensioniHost(hostId)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [hostId])

  const postiVisibili = useMemo(() => {
    if (!data) return []
    const lista = openSpot ? data.posti.filter(p => p.posto._id === openSpot) : data.posti
    return lista.map(entry => {
      const sorted = [...entry.recensioni]
      if (filter === 'recenti') sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      else if (filter === 'alta') sorted.sort((a, b) => b.stelle - a.stelle)
      else sorted.sort((a, b) => a.stelle - b.stelle)
      return { ...entry, recensioni: sorted }
    })
  }, [data, filter, openSpot])

  const totale = data?.posti.reduce((s, p) => s + p.totale, 0) ?? 0
  const mediaGlobale = data?.posti.length && totale > 0
    ? Math.round(data.posti.reduce((s, p) => s + p.mediaStelle * p.totale, 0) / totale * 10) / 10
    : null

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <span style={S.navLogo} onClick={onBack}>
          <span style={{ color: '#fff' }}>Trento</span>
          <span style={{ color: '#2a9d8f' }}>Parking</span>
        </span>
        <button onClick={onBack} style={S.navBack}>← Torna indietro</button>
      </nav>

      <div style={S.content}>
        {loading && <div style={S.centered}><span style={S.spinner} /></div>}
        {!loading && error && <div style={S.errorBox}>⚠️ {error}</div>}

        {!loading && !error && data && (
          <>
            <div style={S.hostCard}>
              <div style={S.hostAvatar}>
                {(data.host.nome?.[0] ?? '?').toUpperCase()}
              </div>
              <div>
                <h1 style={S.hostName}>{data.host.nome} {data.host.cognome}</h1>
                <p style={S.hostUsername}>@{data.host.nomeUtente}</p>
              </div>
              {mediaGlobale !== null && (
                <div style={S.hostStats}>
                  <Stars n={Math.round(mediaGlobale)} size={20} />
                  <span style={S.hostStatsText}>
                    {mediaGlobale} · {totale} {totale === 1 ? 'recensione' : 'recensioni'}
                  </span>
                </div>
              )}
            </div>

            {totale === 0 ? (
              <div style={S.emptyBox}>
                <p style={{ fontSize: 36, margin: '0 0 10px' }}>⭐</p>
                <p style={{ margin: 0, fontWeight: 700, color: '#003049' }}>Nessuna recensione ancora</p>
              </div>
            ) : (
              <>
                <div style={S.toolbar}>
                  <div style={S.tabsRow}>
                    <button
                      style={{ ...S.tab, ...(openSpot === null ? S.tabActive : {}) }}
                      onClick={() => setOpenSpot(null)}
                    >
                      Tutti i posti
                    </button>
                    {data.posti.map(entry => (
                      <button
                        key={entry.posto._id}
                        style={{ ...S.tab, ...(openSpot === entry.posto._id ? S.tabActive : {}) }}
                        onClick={() => setOpenSpot(entry.posto._id)}
                      >
                        {entry.posto.nome}
                        <span style={S.tabBadge}>{entry.totale}</span>
                      </button>
                    ))}
                  </div>
                  <div style={S.filterRow}>
                    <span style={S.filterLabel}>Ordina:</span>
                    {FILTER_OPTS.map(opt => (
                      <button
                        key={opt.key}
                        style={{ ...S.filterBtn, ...(filter === opt.key ? S.filterBtnActive : {}) }}
                        onClick={() => setFilter(opt.key)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {postiVisibili.map(entry => (
                  <section key={entry.posto._id} style={S.spotSection}>
                    <div style={S.spotHeader}>
                      <div>
                        <p style={S.spotName}>{entry.posto.nome}</p>
                        {entry.posto.posizione?.indirizzoTestuale && (
                          <p style={S.spotAddress}>{entry.posto.posizione.indirizzoTestuale}</p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <Stars n={Math.round(entry.mediaStelle)} size={14} />
                        <p style={S.spotMeta}>{entry.mediaStelle} · {entry.totale} rec.</p>
                      </div>
                    </div>
                    <div style={S.reviewList}>
                      {entry.recensioni.map(r => <ReviewCard key={r._id} recensione={r} />)}
                    </div>
                  </section>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────
   Entry point — sceglie la modalità in base alle props
   ──────────────────────────────────────────────────────────────────── */
export default function HostReviewsPage({ hostId, posto, onBack }) {
  if (posto) return <SingleSpotReviews posto={posto} onBack={onBack} />
  return <AllHostReviews hostId={hostId} onBack={onBack} />
}

/* ── ReviewCard ──────────────────────────────────────────────────── */
function ReviewCard({ recensione: r }) {
  const utente = r.utenteId
  const iniziali = utente
    ? `${utente.nome?.[0] ?? ''}${utente.cognome?.[0] ?? ''}`.toUpperCase() || '?'
    : '?'

  return (
    <div style={S.reviewCard}>
      <div style={S.reviewTop}>
        <div style={S.reviewAvatar}>{iniziali}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={S.reviewAuthor}>
            {utente ? `${utente.nome} ${utente.cognome}` : 'Utente anonimo'}
          </p>
          <p style={S.reviewDate}>{fmt(r.createdAt)}</p>
        </div>
        <Stars n={r.stelle} size={15} />
      </div>
      {r.testo && <p style={S.reviewText}>{r.testo}</p>}
    </div>
  )
}

/* ── Costanti ────────────────────────────────────────────────────── */
const FILTER_OPTS = [
  { key: 'recenti', label: 'Più recenti' },
  { key: 'alta',    label: '★ Più alta'  },
  { key: 'bassa',   label: '★ Più bassa' },
]

/* ── Stili ───────────────────────────────────────────────────────── */
const S = {
  page: {
    minHeight: '100vh', background: '#f5f6f7',
    fontFamily: "'Inter', system-ui, sans-serif",
    display: 'flex', flexDirection: 'column',
  },
  nav: {
    height: 64, background: '#003049',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 1.75rem', flexShrink: 0,
  },
  navLogo: {
    fontFamily: "'Sora', sans-serif",
    fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.04em', cursor: 'pointer',
  },
  navBack: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.88)',
    padding: '0.45rem 1rem', borderRadius: 999,
    fontSize: '0.85rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  },
  content: {
    flex: 1, maxWidth: 720, width: '100%',
    margin: '0 auto', padding: '2rem 1.25rem',
  },
  centered: {
    display: 'flex', justifyContent: 'center', padding: '3rem 0',
  },
  spinner: {
    display: 'block', width: 32, height: 32,
    border: '3px solid #e2e8f0', borderTopColor: '#2a9d8f',
    borderRadius: '50%', animation: 'mb-spin 0.8s linear infinite',
  },
  errorBox: {
    background: '#fee2e2', color: '#7f1d1d',
    border: '1px solid #fca5a5', borderRadius: 12,
    padding: '14px 18px', fontSize: 14,
  },
  emptyBox: {
    background: 'white', border: '1px solid #e2e8f0',
    borderRadius: 16, padding: '3rem 2rem', textAlign: 'center',
  },
  hostCard: {
    background: 'white', border: '1px solid #e2e8f0',
    borderRadius: 16, padding: '1.25rem 1.5rem',
    display: 'flex', alignItems: 'center', gap: '1rem',
    marginBottom: '1.5rem', flexWrap: 'wrap',
  },
  hostAvatar: {
    width: 52, height: 52, borderRadius: '50%',
    background: '#2a9d8f', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: 22, flexShrink: 0,
    fontFamily: "'Sora', sans-serif",
  },
  hostName: {
    margin: '0 0 2px',
    fontFamily: "'Sora', sans-serif",
    fontSize: '1.1rem', fontWeight: 800, color: '#003049',
    letterSpacing: '-0.03em',
  },
  hostUsername: { margin: 0, fontSize: 13, color: '#8a95a3' },
  hostStats: {
    marginLeft: 'auto',
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
  },
  hostStatsText: { fontSize: 13, color: '#4a5568', fontWeight: 600 },
  toolbar: { marginBottom: '1.25rem' },
  tabsRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '0.75rem' },
  tab: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 14px', background: 'white', color: '#374151',
    border: '1px solid #e2e8f0', borderRadius: 999,
    cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
  },
  tabActive: { background: '#003049', color: '#fff', borderColor: '#003049' },
  tabBadge: {
    background: 'rgba(255,255,255,0.2)', borderRadius: 999,
    padding: '1px 7px', fontSize: 11, fontWeight: 700,
  },
  filterRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  filterLabel: {
    fontSize: 12, fontWeight: 700, color: '#8a95a3',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  filterBtn: {
    padding: '5px 12px', background: 'white', color: '#374151',
    border: '1px solid #e2e8f0', borderRadius: 999,
    cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
  },
  filterBtnActive: {
    background: '#e6f4f2', color: '#1f7a6e', borderColor: 'rgba(42,157,143,0.4)',
  },
  spotSection: {
    background: 'white', border: '1px solid #e2e8f0',
    borderRadius: 16, padding: '1rem 1.25rem', marginBottom: '1rem',
  },
  spotHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: 12,
    paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9',
    marginBottom: '0.75rem',
  },
  spotName: {
    margin: '0 0 2px', fontWeight: 700, fontSize: 15, color: '#003049',
    fontFamily: "'Sora', sans-serif",
  },
  spotAddress: { margin: 0, fontSize: 12, color: '#8a95a3' },
  spotMeta: { margin: '2px 0 0', fontSize: 12, color: '#4a5568' },
  reviewList: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  reviewCard: { background: '#f8fafc', borderRadius: 12, padding: '12px 14px' },
  reviewTop: { display: 'flex', alignItems: 'center', gap: 10 },
  reviewAvatar: {
    width: 32, height: 32, borderRadius: '50%',
    background: '#e2e8f0', color: '#4a5568',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 12, flexShrink: 0,
  },
  reviewAuthor: { margin: 0, fontWeight: 700, fontSize: 13, color: '#003049' },
  reviewDate: { margin: '1px 0 0', fontSize: 11, color: '#8a95a3' },
  reviewText: {
    margin: '8px 0 0', fontSize: 13, color: '#374151', lineHeight: 1.55,
    paddingTop: 8, borderTop: '1px solid #e2e8f0',
  },
}
