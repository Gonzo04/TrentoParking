import { useState, useEffect } from 'react'
import { api } from '../services/api'

const TABS = ['Utenti', 'Posti', 'Prenotazioni']

const RUOLI = ['UTENTE', 'HOST', 'AMMINISTRATORE']

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/* ── Confirm dialog state ─────────────────────────────────────────── */
function useConfirm() {
  const [pending, setPending] = useState(null)
  const ask = (msg, onConfirm) => setPending({ msg, onConfirm })
  const confirm = () => { pending?.onConfirm(); setPending(null) }
  const cancel = () => setPending(null)
  return { pending, ask, confirm, cancel }
}

/* ── Main component ───────────────────────────────────────────────── */
export default function AdminDashboard({ onBack }) {
  const [tab, setTab] = useState(0)
  const { pending, ask, confirm, cancel } = useConfirm()

  return (
    <div style={S.page}>

      {pending && (
        <div style={S.overlay}>
          <div style={S.dialog}>
            <p style={S.dialogMsg}>{pending.msg}</p>
            <div style={S.dialogBtns}>
              <button style={S.btnCancel} onClick={cancel}>Annulla</button>
              <button style={S.btnDanger} onClick={confirm}>Conferma</button>
            </div>
          </div>
        </div>
      )}

      <nav style={S.nav}>
        <span style={S.navLogo}>
          <span style={{ color: '#fff' }}>Trento</span>
          <span style={{ color: '#2a9d8f' }}>Parking</span>
          <span style={S.adminBadge}>Admin</span>
        </span>
        <button onClick={onBack} style={S.navBack}>← Dashboard</button>
      </nav>

      <div style={S.content}>
        <h1 style={S.title}>Pannello di amministrazione</h1>

        <div style={S.tabs}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              style={{ ...S.tab, ...(tab === i ? S.tabActive : {}) }}>
              {t}
            </button>
          ))}
        </div>

        {tab === 0 && <UsersTab ask={ask} />}
        {tab === 1 && <SpotsTab ask={ask} />}
        {tab === 2 && <BookingsTab ask={ask} />}
      </div>
    </div>
  )
}

/* ── Users tab ────────────────────────────────────────────────────── */
function UsersTab({ ask }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.adminGetUsers()
      .then(setUsers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function handleRoleChange(userId, ruolo) {
    ask(`Cambiare il ruolo in ${ruolo}?`, async () => {
      try {
        const updated = await api.adminUpdateUser(userId, { ruolo })
        setUsers(prev => prev.map(u => u._id === userId ? { ...u, ruolo: updated.ruolo } : u))
      } catch (e) { alert(e.message) }
    })
  }

  function handleDelete(userId, name) {
    ask(`Eliminare l'utente "${name}"? L'operazione è irreversibile.`, async () => {
      try {
        await api.adminDeleteUser(userId)
        setUsers(prev => prev.filter(u => u._id !== userId))
      } catch (e) { alert(e.message) }
    })
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || u.email?.toLowerCase().includes(q) || u.nomeUtente?.toLowerCase().includes(q) ||
      u.nome?.toLowerCase().includes(q) || u.cognome?.toLowerCase().includes(q)
  })

  if (loading) return <Spinner />
  if (error) return <ErrorBox msg={error} />

  return (
    <div>
      <div style={S.toolbar}>
        <input style={S.search} placeholder="Cerca per nome, email, username…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <span style={S.count}>{filtered.length} utenti</span>
      </div>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              {['Nome', 'Email', 'Username', 'Ruolo', 'Verificato', 'Registrato', ''].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u._id} style={S.tr}>
                <td style={S.td}>{[u.nome, u.cognome].filter(Boolean).join(' ') || '—'}</td>
                <td style={S.td}>{u.email}</td>
                <td style={S.td}>{u.nomeUtente}</td>
                <td style={S.td}>
                  <select style={S.select} value={u.ruolo}
                    onChange={e => handleRoleChange(u._id, e.target.value)}>
                    {RUOLI.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td style={S.td}>
                  <span style={{ ...S.dot, background: u.emailVerificata ? '#16a34a' : '#dc2626' }} />
                  {u.emailVerificata ? 'Sì' : 'No'}
                </td>
                <td style={S.td}>{fmt(u.createdAt)}</td>
                <td style={S.td}>
                  <button style={S.btnDel} onClick={() => handleDelete(u._id, u.email)}>Elimina</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p style={S.empty}>Nessun utente trovato.</p>}
      </div>
    </div>
  )
}

/* ── Spots tab ────────────────────────────────────────────────────── */
function SpotsTab({ ask }) {
  const [spots, setSpots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.adminGetSpots()
      .then(setSpots)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function handleDelete(id, name) {
    ask(`Eliminare il posto "${name}"? L'operazione è irreversibile.`, async () => {
      try {
        await api.adminDeleteSpot(id)
        setSpots(prev => prev.filter(s => s._id !== id))
      } catch (e) { alert(e.message) }
    })
  }

  const filtered = spots.filter(s => {
    const q = search.toLowerCase()
    return !q || s.nome?.toLowerCase().includes(q) ||
      s.posizione?.indirizzoTestuale?.toLowerCase().includes(q) ||
      s.hostId?.email?.toLowerCase().includes(q)
  })

  if (loading) return <Spinner />
  if (error) return <ErrorBox msg={error} />

  return (
    <div>
      <div style={S.toolbar}>
        <input style={S.search} placeholder="Cerca per nome, indirizzo, host…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <span style={S.count}>{filtered.length} posti</span>
      </div>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              {['Nome', 'Indirizzo', 'Host', 'Tariffa/h', 'Attivo', 'Creato', ''].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s._id} style={S.tr}>
                <td style={S.td}>{s.nome}</td>
                <td style={S.td}>{s.posizione?.indirizzoTestuale || '—'}</td>
                <td style={S.td}>{s.hostId?.email || '—'}</td>
                <td style={S.td}>€{Number(s.tariffaOraria ?? 0).toFixed(2)}</td>
                <td style={S.td}>
                  <span style={{ ...S.dot, background: s.attivo ? '#16a34a' : '#dc2626' }} />
                  {s.attivo ? 'Sì' : 'No'}
                </td>
                <td style={S.td}>{fmt(s.createdAt)}</td>
                <td style={S.td}>
                  <button style={S.btnDel} onClick={() => handleDelete(s._id, s.nome)}>Elimina</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p style={S.empty}>Nessun posto trovato.</p>}
      </div>
    </div>
  )
}

/* ── Bookings tab ─────────────────────────────────────────────────── */
const STATO_COLOR = {
  IN_ATTESA_PAGAMENTO: '#92400e',
  PAGATA: '#14532d',
  ANNULLATA: '#7f1d1d',
}

function BookingsTab({ ask }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.adminGetBookings()
      .then(setBookings)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function handleCancel(id) {
    ask('Annullare questa prenotazione?', async () => {
      try {
        const updated = await api.adminCancelBooking(id)
        setBookings(prev => prev.map(b => b._id === id ? { ...b, stato: updated.stato } : b))
      } catch (e) { alert(e.message) }
    })
  }

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase()
    return !q || b.utenteId?.email?.toLowerCase().includes(q) ||
      b.postoPrivatoId?.nome?.toLowerCase().includes(q) ||
      b.targa?.toLowerCase().includes(q)
  })

  if (loading) return <Spinner />
  if (error) return <ErrorBox msg={error} />

  return (
    <div>
      <div style={S.toolbar}>
        <input style={S.search} placeholder="Cerca per email, posto, targa…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <span style={S.count}>{filtered.length} prenotazioni</span>
      </div>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              {['Utente', 'Posto', 'Inizio', 'Fine', 'Targa', 'Importo', 'Stato', ''].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b._id} style={S.tr}>
                <td style={S.td}>{b.utenteId?.email || '—'}</td>
                <td style={S.td}>{b.postoPrivatoId?.nome || '—'}</td>
                <td style={S.td}>{fmtDt(b.dataOraInizio)}</td>
                <td style={S.td}>{fmtDt(b.dataOraFine)}</td>
                <td style={S.td}>{b.targa}</td>
                <td style={S.td}>€{Number(b.prezzoTotale ?? 0).toFixed(2)}</td>
                <td style={S.td}>
                  <span style={{ ...S.statoBadge, color: STATO_COLOR[b.stato] ?? '#374151' }}>
                    {b.stato}
                  </span>
                </td>
                <td style={S.td}>
                  {b.stato !== 'ANNULLATA' && (
                    <button style={S.btnDel} onClick={() => handleCancel(b._id)}>Annulla</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p style={S.empty}>Nessuna prenotazione trovata.</p>}
      </div>
    </div>
  )
}

/* ── Shared sub-components ────────────────────────────────────────── */
function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
      <span style={S.spinner} />
    </div>
  )
}
function ErrorBox({ msg }) {
  return <div style={S.errorBox}>⚠️ {msg}</div>
}

/* ── Styles ───────────────────────────────────────────────────────── */
const S = {
  page: {
    minHeight: '100vh',
    background: '#f5f6f7',
    fontFamily: "'Inter', system-ui, sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },
  nav: {
    height: 64,
    background: '#003049',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.75rem',
    flexShrink: 0,
  },
  navLogo: {
    fontFamily: "'Sora', sans-serif",
    fontWeight: 800,
    fontSize: '1.2rem',
    letterSpacing: '-0.04em',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  adminBadge: {
    background: '#e11d48',
    color: '#fff',
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 999,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    fontFamily: "'Inter', sans-serif",
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
  },
  content: {
    flex: 1,
    maxWidth: 1100,
    width: '100%',
    margin: '0 auto',
    padding: '2rem 1.25rem',
  },
  title: {
    margin: '0 0 1.5rem',
    fontFamily: "'Sora', sans-serif",
    fontSize: '1.6rem',
    fontWeight: 800,
    color: '#003049',
    letterSpacing: '-0.03em',
  },
  tabs: {
    display: 'flex',
    gap: 8,
    marginBottom: '1.5rem',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: 0,
  },
  tab: {
    background: 'none',
    border: 'none',
    padding: '0.6rem 1.25rem',
    fontFamily: 'inherit',
    fontSize: '0.92rem',
    fontWeight: 600,
    color: '#64748b',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: -2,
    borderRadius: '6px 6px 0 0',
  },
  tabActive: {
    color: '#003049',
    borderBottomColor: '#003049',
    background: '#fff',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: '1rem',
  },
  search: {
    flex: 1,
    maxWidth: 360,
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
  },
  count: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: 600,
  },
  tableWrap: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    padding: '10px 14px',
    textAlign: 'left',
    fontWeight: 700,
    color: '#64748b',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '10px 14px',
    color: '#374151',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  },
  dot: {
    display: 'inline-block',
    width: 7,
    height: 7,
    borderRadius: '50%',
    marginRight: 5,
    verticalAlign: 'middle',
  },
  statoBadge: {
    fontWeight: 700,
    fontSize: 11,
  },
  select: {
    border: '1px solid #d1d5db',
    borderRadius: 6,
    padding: '3px 6px',
    fontSize: 12,
    fontFamily: 'inherit',
    background: '#fff',
    cursor: 'pointer',
  },
  btnDel: {
    background: '#fee2e2',
    color: '#b91c1c',
    border: '1px solid #fca5a5',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  empty: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: '2rem 0',
    fontSize: 14,
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
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    background: '#fff',
    borderRadius: 12,
    padding: '24px 28px',
    maxWidth: 380,
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  },
  dialogMsg: {
    margin: '0 0 20px',
    fontSize: 15,
    color: '#1e293b',
    lineHeight: 1.5,
  },
  dialogBtns: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
  },
  btnCancel: {
    background: '#f1f5f9',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: '8px 16px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 14,
  },
  btnDanger: {
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 14,
  },
}
