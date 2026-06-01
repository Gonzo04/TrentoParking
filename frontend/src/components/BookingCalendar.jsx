import { useState, useMemo } from 'react'

/* ── Costanti ─────────────────────────────────────────────────────── */
const MESI = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
]
const GIORNI_HEADER = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']

// Mapping JS getDay() (0 = domenica) → formato salvato dal backend (uppercase, no accenti)
const GIORNO_IT = ['DOMENICA','LUNEDI','MARTEDI','MERCOLEDI','GIOVEDI','VENERDI','SABATO']

// Label brevi per la visualizzazione
const GIORNO_SHORT = {
  LUNEDI: 'Lun', MARTEDI: 'Mar', MERCOLEDI: 'Mer',
  GIOVEDI: 'Gio', VENERDI: 'Ven', SABATO: 'Sab', DOMENICA: 'Dom',
}

// Stessi tag definiti in Dashboard.jsx (duplicati qui per evitare dipendenze circolari)
const TAGS_INFO = {
  coperto:          { emoji: '🏠', label: 'Coperto'          },
  vicino_centro:    { emoji: '📍', label: 'Vicino al centro' },
  sorvegliato:      { emoji: '🔒', label: 'Sorvegliato'      },
  carica_elettrica: { emoji: '⚡', label: 'Ricarica EV'      },
  facile_accesso:   { emoji: '✅', label: 'Facile accesso'   },
  accessibile:      { emoji: '♿', label: 'Accessibile'      },
}

/* ── Helpers griglia calendario ──────────────────────────────────── */
function buildMonthGrid(year, month) {
  const first    = new Date(year, month, 1)
  const last     = new Date(year, month + 1, 0)
  const startDow = (first.getDay() + 6) % 7 // Lun = 0

  const cells = []
  for (let i = startDow; i > 0; i--)
    cells.push({ date: new Date(year, month, 1 - i), current: false })
  for (let d = 1; d <= last.getDate(); d++)
    cells.push({ date: new Date(year, month, d), current: true })
  while (cells.length % 7 !== 0) {
    const prev = cells[cells.length - 1].date
    const next = new Date(prev); next.setDate(prev.getDate() + 1)
    cells.push({ date: next, current: false })
  }

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

function getDisponibilitaForDate(date, disponibilita) {
  const giorno = GIORNO_IT[date.getDay()]
  return disponibilita.find(d => d.giorno === giorno) || null
}

function getBookedHours(date, prenotazioni) {
  const booked = new Set()
  prenotazioni.forEach(p => {
    const start = new Date(p.dataOraInizio)
    const end   = new Date(p.dataOraFine)
    const cur   = new Date(start)
    while (cur < end) {
      if (cur.toDateString() === date.toDateString()) booked.add(cur.getHours())
      cur.setHours(cur.getHours() + 1)
    }
  })
  return booked
}

function padHour(h) {
  return String(h).padStart(2, '0') + ':00'
}

/* ── Componente ──────────────────────────────────────────────────── */
function StarsMini({ n, total }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: 13, color: i <= Math.round(n) ? '#f59e0b' : '#e2e8f0', lineHeight: 1 }}>★</span>
      ))}
      <span style={{ fontSize: 12, color: '#4a5568', marginLeft: 2 }}>
        {n} ({total} {total === 1 ? 'rec.' : 'rec.'})
      </span>
    </span>
  )
}

export default function BookingCalendar({ posto, prenotazioni, onConfirm, isOwner = false, onViewSpotReviews }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  const [year,         setYear]         = useState(today.getFullYear())
  const [month,        setMonth]        = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(null)
  const [startHour,    setStartHour]    = useState(null)
  const [endHour,      setEndHour]      = useState(null)
  const [loading,      setLoading]      = useState(false)

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month])

  const tags = (posto.caratteristiche ?? [])
    .map(k => TAGS_INFO[k])
    .filter(Boolean)

  const hasDisponibilita = posto.disponibilita?.length > 0

  const disponibilitaOrdinata = useMemo(() => {
    const order = ['LUNEDI','MARTEDI','MERCOLEDI','GIOVEDI','VENERDI','SABATO','DOMENICA']
    return [...(posto.disponibilita ?? [])].sort(
      (a, b) => order.indexOf(a.giorno) - order.indexOf(b.giorno)
    )
  }, [posto.disponibilita])

  // Limite navigazione: non prima del mese corrente, non oltre 2 mesi avanti
  const limitMonth = new Date(today.getFullYear(), today.getMonth() + 2, 1)
  const canGoPrev  = !(year === today.getFullYear() && month === today.getMonth())
  const canGoNext  = new Date(year, month + 1, 1) < limitMonth

  function resetSelection() { setSelectedDate(null); setStartHour(null); setEndHour(null) }

  function prevMonth() {
    if (!canGoPrev) return
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    resetSelection()
  }

  function nextMonth() {
    if (!canGoNext) return
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    resetSelection()
  }

  function isDayAvailable(date) {
    if (date < today) return false
    const disp = getDisponibilitaForDate(date, posto.disponibilita ?? [])
    if (!disp) return false
    const booked = getBookedHours(date, prenotazioni)
    for (let h = disp.oraInizio; h < disp.oraFine; h++) {
      if (!booked.has(h)) return true
    }
    return false
  }

  function handleDayClick(date) {
    if (!isDayAvailable(date)) return
    setSelectedDate(date)
    setStartHour(null)
    setEndHour(null)
  }

  function handleHourClick(hour) {
    if (startHour === null) {
      setStartHour(hour); setEndHour(null)
    } else if (hour > startHour && endHour === null) {
      const hasOverlap = Array.from({ length: hour - startHour }, (_, i) => startHour + i)
        .some(h => bookedHours.has(h))
      if (hasOverlap) { setStartHour(hour); setEndHour(null) }
      else setEndHour(hour)
    } else {
      setStartHour(hour); setEndHour(null)
    }
  }

  const disp        = selectedDate ? getDisponibilitaForDate(selectedDate, posto.disponibilita ?? []) : null
  const bookedHours = selectedDate ? getBookedHours(selectedDate, prenotazioni) : new Set()

  const ore             = (startHour !== null && endHour !== null) ? endHour - startHour : 0
  const prezzoTotale    = Math.round(ore * posto.tariffaOraria * 100) / 100
  const selectionComplete = selectedDate && startHour !== null && endHour !== null

  async function handleConfirm() {
    const dataOraInizio = new Date(selectedDate); dataOraInizio.setHours(startHour, 0, 0, 0)
    const dataOraFine   = new Date(selectedDate); dataOraFine.setHours(endHour,   0, 0, 0)
    setLoading(true)
    try {
      await onConfirm({
        dataOraInizio: dataOraInizio.toISOString(),
        dataOraFine:   dataOraFine.toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.root}>

      {/* ── Intestazione posto ────────────────────────────────────── */}
      <div style={S.header}>
        <div style={S.headerTop}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={S.spotName}>{posto.nome}</h2>
            {posto.posizione?.indirizzoTestuale && (
              <p style={S.spotAddress}>{posto.posizione.indirizzoTestuale}</p>
            )}
          </div>
          <span style={S.price}>€{Number(posto.tariffaOraria).toFixed(2)}/h</span>
        </div>

        {posto.descrizione && (
          <p style={S.description}>{posto.descrizione}</p>
        )}

        {onViewSpotReviews && (
          <div style={{ marginTop: 6, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
            {posto.mediaStelle != null && (
              <StarsMini n={posto.mediaStelle} total={posto.totaleRecensioni ?? 0} />
            )}
            <button style={S.hostLink} onClick={() => onViewSpotReviews(posto)}>
              {posto.mediaStelle != null ? 'vedi tutte →' : '⭐ Vedi recensioni'}
            </button>
          </div>
        )}

        {posto.hostId && (
          <div style={S.hostRow}>
            <span style={S.hostLabel}>Host:</span>
            <span style={S.hostName}>
              {posto.hostId.nome} {posto.hostId.cognome}
            </span>
          </div>
        )}

        {tags.length > 0 && (
          <div style={S.tagsRow}>
            {tags.map(tag => (
              <span key={tag.label} style={S.tag}>
                {tag.emoji} {tag.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Disponibilità settimanale ─────────────────────────────── */}
      {hasDisponibilita ? (
        <div style={S.availSection}>
          <p style={S.sectionLabel}>Disponibilità settimanale</p>
          <div style={S.availGrid}>
            {disponibilitaOrdinata.map(slot => (
              <div key={slot.giorno} style={S.availRow}>
                <span style={S.availDay}>{GIORNO_SHORT[slot.giorno] ?? slot.giorno}</span>
                <span style={S.availTime}>
                  {padHour(slot.oraInizio)} – {padHour(slot.oraFine)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ ...S.availSection, color: '#8a95a3', fontSize: 13 }}>
          Disponibilità non specificata — contatta il proprietario per informazioni.
        </div>
      )}

      {/* ── Avviso proprietario ──────────────────────────────────── */}
      {isOwner && (
        <div style={S.ownerNotice}>
          <span style={{ fontSize: 22 }}>🏠</span>
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 700, color: '#003049', fontSize: 14 }}>
              Questo è il tuo posto
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#4a5568', lineHeight: 1.5 }}>
              Non puoi prenotare un posto che hai pubblicato tu stesso.
            </p>
          </div>
        </div>
      )}

      {/* ── Calendario ───────────────────────────────────────────── */}
      {hasDisponibilita && !isOwner && (
        <>
          <div style={S.calendarBox}>
            <div style={S.calNav}>
              <button
                onClick={prevMonth}
                style={{ ...S.navBtn, opacity: canGoPrev ? 1 : 0.3, cursor: canGoPrev ? 'pointer' : 'default' }}
              >‹</button>
              <span style={S.calTitle}>{MESI[month]} {year}</span>
              <button
                onClick={nextMonth}
                style={{ ...S.navBtn, opacity: canGoNext ? 1 : 0.3, cursor: canGoNext ? 'pointer' : 'default' }}
              >›</button>
            </div>

            <div style={S.weekHeader}>
              {GIORNI_HEADER.map(g => (
                <div key={g} style={S.weekHeaderCell}>{g}</div>
              ))}
            </div>

            <div style={{ padding: '6px 8px 8px' }}>
              {grid.map((week, wi) => (
                <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                  {week.map(({ date, current }, di) => {
                    const available = current && isDayAvailable(date)
                    const selected  = selectedDate && date.toDateString() === selectedDate.toDateString()

                    let cellStyle = { ...S.dayCell }
                    if (!current)       cellStyle = { ...cellStyle, color: '#d1d5db' }
                    else if (selected)  cellStyle = { ...cellStyle, background: '#003049', color: '#fff', fontWeight: 700 }
                    else if (available) cellStyle = { ...cellStyle, background: 'rgba(42,157,143,0.13)', color: '#1f7a6e', fontWeight: 600 }
                    else                cellStyle = { ...cellStyle, color: '#d1d5db', cursor: 'default' }

                    return (
                      <button
                        key={di}
                        style={cellStyle}
                        disabled={!available}
                        onClick={() => handleDayClick(date)}
                      >
                        {date.getDate()}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* ── Selezione orario ──────────────────────────────────── */}
          {selectedDate && disp && (
            <div style={S.timePicker}>
              <p style={S.sectionLabel}>
                {selectedDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <p style={S.timeHint}>
                Fascia oraria: {padHour(disp.oraInizio)} – {padHour(disp.oraFine)}
                {' · '}
                {startHour === null
                  ? 'Seleziona l\'orario di inizio'
                  : endHour === null
                    ? `Inizio: ${padHour(startHour)} — seleziona la fine`
                    : `${padHour(startHour)} → ${padHour(endHour)}`}
              </p>

              <div style={S.hoursGrid}>
                {Array.from(
                  { length: disp.oraFine - disp.oraInizio + 1 },
                  (_, i) => disp.oraInizio + i
                ).map(h => {
                  const isBooked   = bookedHours.has(h)
                  const isSelected = startHour !== null && endHour !== null && h >= startHour && h < endHour
                  const isStart    = h === startHour

                  let btnStyle = { ...S.hourBtn }
                  if (isBooked)                   btnStyle = { ...btnStyle, ...S.hourBtnBooked }
                  else if (isStart || isSelected) btnStyle = { ...btnStyle, ...S.hourBtnActive }

                  return (
                    <button key={h} style={btnStyle} disabled={isBooked} onClick={() => handleHourClick(h)}>
                      {padHour(h)}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Riepilogo e conferma ──────────────────────────────── */}
          {selectionComplete && (
            <div style={S.summary}>
              <div style={S.summaryRow}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: '#003049', fontSize: 15 }}>{posto.nome}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 13, color: '#4a5568' }}>
                    {selectedDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
                    {' · '}{padHour(startHour)} – {padHour(endHour)} · {ore}h
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#8a95a3' }}>{ore}h × €{posto.tariffaOraria.toFixed(2)}</p>
                  <p style={{ margin: '2px 0 0', fontWeight: 800, fontSize: 20, color: '#2a9d8f' }}>
                    €{prezzoTotale.toFixed(2)}
                  </p>
                </div>
              </div>

              <button onClick={handleConfirm} disabled={loading} style={S.confirmBtn}>
                {loading ? 'Prenotazione in corso…' : `Prenota — €${prezzoTotale.toFixed(2)}`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Reviews */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Recensioni</h3>
          {mediaVoti !== null && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Stars value={Math.round(mediaVoti)} />
              <span style={{ fontSize: 13, color: '#6b7280' }}>{mediaVoti.toFixed(1)} ({recensioni.length})</span>
            </span>
          )}
          {recensioni.length === 0 && (
            <span style={{ fontSize: 13, color: '#9ca3af' }}>Nessuna recensione ancora</span>
          )}
        </div>

        {recensioni.map(r => (
          <div key={r._id} style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{r.utenteId?.nomeUtente ?? 'Utente'}</span>
              <Stars value={r.voto} />
            </div>
            {r.testo && <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>{r.testo}</p>}
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              {new Date(r.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Stili ───────────────────────────────────────────────────────── */
const S = {
  root: {
    fontFamily: "'Inter', system-ui, sans-serif",
    maxWidth: 460,
    color: '#0d1b2a',
  },
  header: {
    paddingBottom: 14,
    borderBottom: '1px solid #e2e8f0',
    marginBottom: 14,
  },
  headerTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  spotName: {
    margin: '0 0 2px',
    fontSize: 18,
    fontWeight: 800,
    color: '#003049',
    fontFamily: "'Sora', sans-serif",
    letterSpacing: '-0.03em',
    lineHeight: 1.2,
  },
  spotAddress: {
    margin: 0,
    fontSize: 13,
    color: '#4a5568',
    lineHeight: 1.4,
  },
  price: {
    fontWeight: 800,
    fontSize: 17,
    color: '#2a9d8f',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  description: {
    margin: '6px 0 8px',
    fontSize: 13,
    color: '#4a5568',
    lineHeight: 1.5,
  },
  tagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    fontWeight: 600,
    color: '#1f7a6e',
    background: '#e6f4f2',
    border: '1px solid rgba(42,157,143,0.22)',
    borderRadius: 999,
    padding: '3px 10px',
    whiteSpace: 'nowrap',
  },
  availSection: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '10px 14px',
    marginBottom: 14,
  },
  sectionLabel: {
    margin: '0 0 8px',
    fontSize: 11,
    fontWeight: 700,
    color: '#8a95a3',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  availGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px 16px',
  },
  availRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  availDay: {
    fontWeight: 700,
    fontSize: 13,
    color: '#003049',
    minWidth: 28,
  },
  availTime: {
    fontSize: 12,
    color: '#4a5568',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '2px 7px',
    fontVariantNumeric: 'tabular-nums',
  },
  calendarBox: {
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  calNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  calTitle: {
    fontWeight: 700,
    fontSize: 14,
    color: '#003049',
  },
  navBtn: {
    background: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: '50%',
    width: 30,
    height: 30,
    fontSize: 18,
    lineHeight: 1,
    color: '#4a5568',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  weekHeaderCell: {
    textAlign: 'center',
    padding: '6px 0',
    fontSize: 11,
    fontWeight: 700,
    color: '#8a95a3',
    letterSpacing: '0.04em',
  },
  dayCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    margin: '2px auto',
    borderRadius: '50%',
    fontSize: 13,
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
  },
  timePicker: {
    marginBottom: 14,
  },
  timeHint: {
    margin: '0 0 10px',
    fontSize: 12,
    color: '#4a5568',
    lineHeight: 1.5,
  },
  hoursGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  hourBtn: {
    padding: '5px 10px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
    background: '#fff',
    color: '#0d1b2a',
    fontFamily: 'inherit',
    fontVariantNumeric: 'tabular-nums',
    transition: 'background 0.15s, border-color 0.15s',
    minWidth: 60,
  },
  hourBtnBooked: {
    background: '#f3f4f6',
    color: '#d1d5db',
    borderColor: '#f3f4f6',
    textDecoration: 'line-through',
    cursor: 'not-allowed',
  },
  hourBtnActive: {
    background: '#2a9d8f',
    color: '#fff',
    borderColor: '#2a9d8f',
  },
  ownerNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#fef9ec',
    border: '1px solid rgba(234,179,8,0.35)',
    borderRadius: 12,
    padding: '12px 16px',
    marginBottom: 14,
  },
  summary: {
    background: '#e6f4f2',
    border: '1px solid rgba(42,157,143,0.25)',
    borderRadius: 14,
    padding: '14px 16px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  hostRow: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginTop: 8,
  },
  hostLabel: {
    fontSize: 12, fontWeight: 700, color: '#8a95a3',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  hostLink: {
    background: 'none', border: 'none', padding: 0,
    cursor: 'pointer', color: '#2a9d8f',
    fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', gap: 5,
  },
  hostLinkHint: {
    fontSize: 11, color: '#8a95a3', fontWeight: 400,
  },
  hostName: {
    fontSize: 13, color: '#374151',
  },
  confirmBtn: {
    width: '100%',
    padding: '13px 0',
    background: '#2a9d8f',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.18s',
  },
}
