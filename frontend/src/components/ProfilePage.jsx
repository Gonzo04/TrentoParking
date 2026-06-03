import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { TAGS } from '../utils/SpotOptions'
import { AvailabilityEditor, TagsEditor } from './SpotFormControls'
// Il backend salva {giorno:'LUNEDI', oraInizio:8, oraFine:20}
// L'editor usa {giorno:'lunedi', oraInizio:'08:00', oraFine:'20:00'}
function dispToEditor(disp) {
  return (disp ?? []).map(d => ({
    giorno: d.giorno.toLowerCase(),
    oraInizio: String(d.oraInizio).padStart(2, '0') + ':00',
    oraFine:   String(d.oraFine).padStart(2, '0')   + ':00',
  }))
}
function dispToBackend(disp) {
  return disp.map(d => ({
    giorno: d.giorno,
    oraInizio: parseInt(d.oraInizio.split(':')[0], 10),
    oraFine:   parseInt(d.oraFine.split(':')[0],   10),
  }))
}

/* ── Componente principale ────────────────────────────────────────── */
export default function ProfilePage({ authenticatedUser, onBack, onUpdateUser, onViewPostoReviews }) {
  return (
    <div style={S.page}>

      {/* ── Navbar ───────────────────────────────────────────────── */}
      <nav style={S.nav}>
        <span style={S.navLogo} onClick={onBack}>
          <span style={{ color: '#fff' }}>Trento</span>
          <span style={{ color: '#2a9d8f' }}>Parking</span>
        </span>
        <button onClick={onBack} style={S.navBack}>← Dashboard</button>
      </nav>

      <div style={S.content}>
        <UserSection user={authenticatedUser} onUpdateUser={onUpdateUser} />
        {authenticatedUser?.ruolo === 'HOST' && <MieiPosti onViewPostoReviews={onViewPostoReviews} />}
      </div>
    </div>
  )
}

/* ── Sezione informazioni utente ─────────────────────────────────── */
function UserSection({ user, onUpdateUser }) {
  const [editing, setEditing]   = useState(false)
  const [form,    setForm]      = useState({ nome: '', cognome: '', targa: '' })
  const [saving,  setSaving]    = useState(false)
  const [error,   setError]     = useState('')
  const [success, setSuccess]   = useState('')

  function startEdit() {
    setForm({ nome: user.nome, cognome: user.cognome, targa: user.targa ?? '' })
    setError('')
    setSuccess('')
    setEditing(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const data = await api.updateMe(form)
      onUpdateUser(data.user)
      setSuccess('Profilo aggiornato!')
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const initials = ((user.nome?.[0] ?? '') + (user.cognome?.[0] ?? '')).toUpperCase()

  return (
    <section style={S.card}>
      {/* Avatar + nome */}
      <div style={S.userTop}>
        <div style={S.avatar}>{initials}</div>
        <div>
          <p style={S.userName}>{user.nome} {user.cognome}</p>
          <p style={S.userHandle}>@{user.nomeUtente}</p>
          <span style={{ ...S.roleBadge, ...(user.ruolo === 'HOST' ? S.roleBadgeHost : {}) }}>
            {user.ruolo === 'HOST' ? '🏠 Host' : '👤 Utente'}
          </span>
        </div>
      </div>

      {/* Griglia info */}
      {!editing && (
        <>
          <div style={S.infoGrid}>
            <InfoRow icon="📧" label="Email">
              {user.email}
              <span style={{ ...S.verifyBadge, background: user.emailVerificata ? '#dcfce7' : '#fee2e2', color: user.emailVerificata ? '#14532d' : '#7f1d1d' }}>
                {user.emailVerificata ? '✓ Verificata' : '✗ Non verificata'}
              </span>
            </InfoRow>
            <InfoRow icon="🚗" label="Targa">{user.targa ?? '—'}</InfoRow>
            <InfoRow icon="🏆" label="Livello">Livello {user.livello} · {user.punti} punti</InfoRow>
          </div>
          <button onClick={startEdit} style={S.editBtn}>Modifica profilo</button>
        </>
      )}

      {/* Form modifica */}
      {editing && (
        <form onSubmit={handleSave} style={S.editForm}>
          {error   && <p style={S.formError}>{error}</p>}
          {success && <p style={S.formSuccess}>{success}</p>}

          <div style={S.formRow}>
            <label style={S.label}>
              Nome
              <input style={S.input} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
            </label>
            <label style={S.label}>
              Cognome
              <input style={S.input} value={form.cognome} onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))} required />
            </label>
          </div>

          <label style={S.label}>
            Targa
            <input
              style={S.input}
              value={form.targa}
              onChange={e => setForm(f => ({ ...f, targa: e.target.value.toUpperCase() }))}
              placeholder="Es. AB123CD"
              maxLength={10}
            />
          </label>

          <div style={S.formActions}>
            <button type="submit" disabled={saving} style={S.btnSave}>
              {saving ? 'Salvataggio…' : 'Salva modifiche'}
            </button>
            <button type="button" onClick={() => setEditing(false)} style={S.btnCancel}>
              Annulla
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

function InfoRow({ icon, label, children }) {
  return (
    <div style={S.infoRow}>
      <span style={S.infoIcon}>{icon}</span>
      <span style={S.infoLabel}>{label}</span>
      <span style={S.infoValue}>{children}</span>
    </div>
  )
}

/* ── Sezione posti dell'host ──────────────────────────────────────── */
function MieiPosti({ onViewPostoReviews }) {
  const [posti,   setPosti]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [medieMap, setMedieMap] = useState({})

  useEffect(() => {
    Promise.all([
      api.getMieiPosti(),
      api.getMediaPosti().catch(() => []),
    ]).then(([p, medie]) => {
      setPosti(p)
      setMedieMap(Object.fromEntries(medie.map(m => [String(m._id), m])))
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function handleUpdated(updated) {
    setPosti(ps => ps.map(p => (p._id === updated._id ? updated : p)))
  }

  function handleDeleted(id) {
    setPosti(ps => ps.filter(p => p._id !== id))
  }

  function handleDisattivato(updated) {
    setPosti(ps => ps.map(p => p._id === updated._id ? updated : p))
  }

  const attivi   = posti.filter(p => p.attivo)
  const inattivi = posti.filter(p => !p.attivo)

  return (
    <section style={{ ...S.card, marginTop: '1.25rem' }}>
      <div style={S.sectionHeader}>
        <h2 style={S.sectionTitle}>I miei posti</h2>
        {!loading && !error && (
          <span style={S.countBadge}>{attivi.length} {attivi.length === 1 ? 'attivo' : 'attivi'}</span>
        )}
      </div>

      {loading && <p style={{ color: '#8a95a3', fontSize: 14 }}>Caricamento…</p>}
      {error   && <p style={S.formError}>{error}</p>}

      {!loading && !error && posti.length === 0 && (
        <p style={{ color: '#8a95a3', fontSize: 14 }}>
          Non hai ancora pubblicato nessun posto.
        </p>
      )}

      {attivi.length > 0 && (
        <div>
          <p style={S.subLabel}>Attivi</p>
          <div style={S.postoList}>
            {attivi.map(p => (
              <PostoRow key={p._id} posto={p} stat={medieMap[String(p._id)]} onUpdated={handleUpdated} onDeleted={handleDeleted} onDisattivato={handleDisattivato} onViewReviews={onViewPostoReviews} />
            ))}
          </div>
        </div>
      )}

      {inattivi.length > 0 && (
        <div style={{ marginTop: attivi.length > 0 ? '1.25rem' : 0 }}>
          <p style={S.subLabel}>Non attivi</p>
          <div style={S.postoList}>
            {inattivi.map(p => (
              <PostoRow key={p._id} posto={p} stat={medieMap[String(p._id)]} onUpdated={handleUpdated} onDeleted={handleDeleted} onDisattivato={handleDisattivato} onViewReviews={onViewPostoReviews} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

/* ── Stelline mini ────────────────────────────────────────────────── */
function StarsMini({ n, total }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: 13, color: i <= Math.round(n) ? '#f59e0b' : '#e2e8f0', lineHeight: 1 }}>★</span>
      ))}
      <span style={{ fontSize: 12, color: '#8a95a3', marginLeft: 3, fontWeight: 600 }}>
        {n} ({total} {total === 1 ? 'rec.' : 'rec.'})
      </span>
    </span>
  )
}

/* ── Singolo posto con form di modifica inline ────────────────────── */
function PostoRow({ posto, stat, onUpdated, onDeleted, onDisattivato, onViewReviews }) {
  const [expanded, setExpanded] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const [form, setForm] = useState({
    nome:          posto.nome,
    descrizione:   posto.descrizione ?? '',
    tariffaOraria: posto.tariffaOraria,
    caratteristiche: posto.caratteristiche ?? [],
    disponibilita:   dispToEditor(posto.disponibilita),
  })

  function openEdit() {
    setForm({
      nome:            posto.nome,
      descrizione:     posto.descrizione ?? '',
      tariffaOraria:   posto.tariffaOraria,
      caratteristiche: posto.caratteristiche ?? [],
      disponibilita:   dispToEditor(posto.disponibilita),
    })
    setError('')
    setExpanded(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const updated = await api.updatePosto(posto._id, {
        nome:            form.nome,
        descrizione:     form.descrizione,
        tariffaOraria:   Number(form.tariffaOraria),
        caratteristiche: form.caratteristiche,
        disponibilita:   dispToBackend(form.disponibilita),
      })
      onUpdated(updated)
      setExpanded(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDisattiva() {
    if (!confirm(`Vuoi disattivare "${posto.nome}"? Non sarà più visibile sulla mappa.`)) return
    try {
      const updated = await api.updatePosto(posto._id, { attivo: false })
      onDisattivato(updated)
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleRiattiva() {
    try {
      const updated = await api.updatePosto(posto._id, { attivo: true })
      onDisattivato(updated)
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleDelete() {
  // Chiediamo conferma prima di eliminare il posto dalla vista dell'host
  // L'eliminazione è logica: il posto sparisce dall'interfaccia ma resta nel database
  const conferma = confirm(
    `Vuoi eliminare "${posto.nome}"? Il posto non sarà più visibile, ma resterà nello storico.`
  )

  if (!conferma) return

  try {
    await api.deletePosto(posto._id)
    onDeleted(posto._id)
  } catch (err) {
    alert(err.message || 'Errore durante eliminazione')
  }
}

  const visibleTags = (posto.caratteristiche ?? [])
    .map(k => TAGS.find(t => t.key === k))
    .filter(Boolean)

  return (
    <div style={S.postoCard}>
      {/* ── Intestazione posto ─── */}
      <div style={S.postoTop}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={S.postoName}>{posto.nome}</p>
          {posto.posizione?.indirizzoTestuale && (
            <p style={S.postoAddress}>{posto.posizione.indirizzoTestuale}</p>
          )}
          {onViewReviews && (
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              {stat && <StarsMini n={stat.media} total={stat.totale} />}
              <button onClick={() => onViewReviews(posto)} style={S.reviewLink}>
                {stat ? 'Vedi recensioni →' : '⭐ Vedi recensioni'}
              </button>
            </div>
          )}
          {visibleTags.length > 0 && (
            <div style={S.tagsRow}>
              {visibleTags.map(t => (
                <span key={t.key} style={S.tagPill}>{t.emoji} {t.label}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={S.postoPrice}>€{Number(posto.tariffaOraria).toFixed(2)}/h</p>
          <span style={{ ...S.activeBadge, background: posto.attivo ? '#dcfce7' : '#f3f4f6', color: posto.attivo ? '#14532d' : '#6b7280' }}>
            {posto.attivo ? '🟢 Attivo' : '⚫ Non attivo'}
          </span>
        </div>
      </div>

      {/* ── Azioni ─── */}
      {!expanded && (
        <div style={S.postoActions}>
          <button onClick={openEdit} style={S.btnEdit}>✏️ Modifica</button>
          {posto.attivo
            ? <button onClick={handleDisattiva} style={S.btnDeactivate}>⏸ Disattiva</button>
            : <>
                <button onClick={handleRiattiva} style={S.btnReactivate}>▶ Riattiva</button>
                <button onClick={handleDelete} style={S.btnDelete}>🗑 Elimina</button>
              </>
          }
        </div>
      )}

      {/* ── Form modifica inline ─── */}
      {expanded && (
        <form onSubmit={handleSave} style={S.inlineForm}>
          {error && <p style={S.formError}>{error}</p>}

          <label style={S.label}>
            Nome posto
            <input
              style={S.input}
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              required
            />
          </label>

          <label style={S.label}>
            Tariffa oraria (€)
            <input
              style={S.input}
              type="number"
              min="0"
              step="0.5"
              value={form.tariffaOraria}
              onChange={e => setForm(f => ({ ...f, tariffaOraria: e.target.value }))}
              required
            />
          </label>

          <label style={S.label}>
            Descrizione <span style={{ color: '#8a95a3', fontWeight: 400 }}>(facoltativa)</span>
            <textarea
              style={{ ...S.input, resize: 'vertical', minHeight: 72 }}
              value={form.descrizione}
              onChange={e => setForm(f => ({ ...f, descrizione: e.target.value }))}
              rows={3}
            />
          </label>

          <div>
            <p style={S.subLabel}>Caratteristiche</p>
            <TagsEditor
              caratteristiche={form.caratteristiche}
              onChange={v => setForm(f => ({ ...f, caratteristiche: v }))}
            />
          </div>

          <div>
            <p style={S.subLabel}>Disponibilità settimanale</p>
            <AvailabilityEditor
              disponibilita={form.disponibilita}
              onChange={v => setForm(f => ({ ...f, disponibilita: v }))}
            />
          </div>

          <div style={S.formActions}>
            <button type="submit" disabled={saving} style={S.btnSave}>
              {saving ? 'Salvataggio…' : 'Salva modifiche'}
            </button>
            <button type="button" onClick={() => setExpanded(false)} style={S.btnCancel}>
              Annulla
            </button>
          </div>
        </form>
      )}
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
  navLogo: {
    fontFamily: "'Sora', sans-serif",
    fontWeight: 800,
    fontSize: '1.2rem',
    letterSpacing: '-0.04em',
    cursor: 'pointer',
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

  /* Layout */
  content: {
    maxWidth: 720,
    width: '100%',
    margin: '0 auto',
    padding: '2rem 1.25rem 3rem',
  },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 20,
    padding: '1.5rem',
  },

  /* Avatar e intestazione utente */
  userTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: '#003049',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Sora', sans-serif",
    fontSize: '1.4rem',
    fontWeight: 800,
    flexShrink: 0,
  },
  userName: {
    margin: '0 0 2px',
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#003049',
    fontFamily: "'Sora', sans-serif",
    letterSpacing: '-0.02em',
  },
  userHandle: {
    margin: '0 0 6px',
    fontSize: 13,
    color: '#8a95a3',
  },
  roleBadge: {
    display: 'inline-block',
    background: '#f3f4f6',
    color: '#374151',
    borderRadius: 999,
    padding: '2px 10px',
    fontSize: 12,
    fontWeight: 700,
  },
  roleBadgeHost: {
    background: 'rgba(42,157,143,0.12)',
    color: '#1f7a6e',
  },

  /* Griglia info */
  infoGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: '1.25rem',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 14,
  },
  infoIcon: { fontSize: 16, flexShrink: 0 },
  infoLabel: { color: '#8a95a3', fontWeight: 600, minWidth: 56 },
  infoValue: { color: '#374151', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  verifyBadge: {
    borderRadius: 999,
    padding: '1px 8px',
    fontSize: 11,
    fontWeight: 700,
  },

  /* Sezione posti */
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
  },
  sectionTitle: {
    margin: 0,
    fontFamily: "'Sora', sans-serif",
    fontSize: '1.2rem',
    fontWeight: 800,
    color: '#003049',
    letterSpacing: '-0.02em',
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
  subLabel: {
    margin: '0 0 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#8a95a3',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  postoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },

  /* Card posto */
  postoCard: {
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    background: '#fafbfc',
  },
  postoTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  postoName: {
    margin: '0 0 2px',
    fontWeight: 700,
    fontSize: 14,
    color: '#003049',
    fontFamily: "'Sora', sans-serif",
  },
  postoAddress: {
    margin: '0 0 6px',
    fontSize: 12,
    color: '#8a95a3',
  },
  reviewLink: {
    background: 'none', border: 'none', padding: 0,
    cursor: 'pointer', color: '#2a9d8f',
    fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
    marginLeft: 6,
  },
  postoPrice: {
    margin: '0 0 4px',
    fontWeight: 800,
    fontSize: 15,
    color: '#2a9d8f',
  },
  activeBadge: {
    display: 'inline-block',
    borderRadius: 999,
    padding: '2px 9px',
    fontSize: 11,
    fontWeight: 700,
  },
  tagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 5,
  },
  tagPill: {
    background: '#e6f4f2',
    color: '#1f7a6e',
    border: '1px solid rgba(42,157,143,0.2)',
    borderRadius: 999,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 600,
  },

  /* Azioni posto */
  postoActions: {
    display: 'flex',
    gap: 8,
    borderTop: '1px solid #f1f5f9',
    paddingTop: 10,
  },

  /* Form comune */
  inlineForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '1rem',
    marginTop: 4,
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '1rem',
    marginTop: 4,
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
  },
  input: {
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 14,
    fontFamily: 'inherit',
    color: '#0d1b2a',
    outline: 'none',
    background: '#fff',
    marginTop: 2,
  },
  formActions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  formError:   { margin: 0, fontSize: 13, color: '#dc2626', background: '#fee2e2', borderRadius: 8, padding: '8px 12px' },
  formSuccess: { margin: 0, fontSize: 13, color: '#14532d', background: '#dcfce7', borderRadius: 8, padding: '8px 12px' },

  /* Bottoni */
  editBtn: {
    padding: '8px 20px',
    background: '#003049',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
    fontFamily: 'inherit',
  },
  btnSave: {
    padding: '8px 20px',
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
    padding: '8px 16px',
    background: '#fff',
    color: '#374151',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
  },
  btnEdit: {
    padding: '6px 14px',
    background: '#fff',
    color: '#003049',
    border: '1.5px solid #003049',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
    fontFamily: 'inherit',
  },
  btnReactivate: {
    padding: '6px 14px',
    background: '#fff',
    color: '#1f7a6e',
    border: '1px solid rgba(42,157,143,0.4)',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
    fontFamily: 'inherit',
  },
  btnDeactivate: {
    padding: '6px 14px',
    background: '#fff',
    color: '#92400e',
    border: '1px solid #fde68a',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
  },
  btnDelete: {
    padding: '6px 14px',
    background: '#fff',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
  },
}
