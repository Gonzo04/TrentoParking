import { useMemo, useState } from 'react'

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
const GIORNO_FULL = {
  LUNEDI: 'Lunedì', MARTEDI: 'Martedì', MERCOLEDI: 'Mercoledì',
  GIOVEDI: 'Giovedì', VENERDI: 'Venerdì', SABATO: 'Sabato', DOMENICA: 'Domenica',
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
  const first   = new Date(year, month, 1)
  const last    = new Date(year, month + 1, 0)
  const startDow = (first.getDay() + 6) % 7 // Lun = 0

  const cells = []

  for (let i = startDow; i > 0; i--) {
    cells.push({
      date: new Date(year, month, 1 - i),
      current: false
    })
  }

  for (let d = 1; d <= last.getDate(); d++) {
    cells.push({
      date: new Date(year, month, d),
      current: true
    })
  }

  while (cells.length % 7 !== 0) {
    const prev = cells[cells.length - 1].date
    const next = new Date(prev)

    next.setDate(prev.getDate() + 1)

    cells.push({
      date: next,
      current: false
    })
  }

  const weeks = []

  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }

  return weeks
}

function getDisponibilitaForDate(date, disponibilita) {
  const giorno = GIORNO_IT[date.getDay()] // es. 'LUNEDI'
  return disponibilita.find(d => d.giorno === giorno) || null
}

function getBookedHours(date, prenotazioni) {
  // Restituisce le ore già occupate in una certa data
  // Ogni ora occupata viene inserita in un Set per controllarla velocemente
  const booked = new Set()

  if (!Array.isArray(prenotazioni)) {
    return booked
  }

  prenotazioni.forEach((prenotazione) => {
    const start = new Date(prenotazione.dataOraInizio)
    const end = new Date(prenotazione.dataOraFine)
    const current = new Date(start)

    while (current < end) {
      if (isSameDay(current, date)) {
        booked.add(current.getHours())
      }

      current.setHours(current.getHours() + 1)
    }
  })

  return booked
}

function padHour(h) {
  return String(h).padStart(2, '0') + ':00'
}

/* ── Componente ──────────────────────────────────────────────────── */
export default function BookingCalendar({ posto, prenotazioni, onConfirm, isOwner = false }) {
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

  // Ordina la disponibilità seguendo l'ordine dei giorni della settimana
  const disponibilitaOrdinata = useMemo(() => {
    const order = ['LUNEDI','MARTEDI','MERCOLEDI','GIOVEDI','VENERDI','SABATO','DOMENICA']
    return [...(posto.disponibilita ?? [])].sort(
      (a, b) => order.indexOf(a.giorno) - order.indexOf(b.giorno)
    )
  }, [posto.disponibilita])

  function prevMonth() {
    // Evitiamo di andare prima del mese corrente
    if (!canGoPrev) {
      return
    }

    if (month === 0) {
      setMonth(11)
      setYear((currentYear) => currentYear - 1)
    } else {
      setMonth((currentMonth) => currentMonth - 1)
    }

    resetSelection()
  }

  function nextMonth() {
    // Evitiamo di andare oltre il limite coperto dal backend
    if (!canGoNext) {
      return
    }

    if (month === 11) {
      setMonth(0)
      setYear((currentYear) => currentYear + 1)
    } else {
      setMonth((currentMonth) => currentMonth + 1)
    }

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
    // Se il giorno non è disponibile, non facciamo nulla
    if (!isDayAvailable(date)) {
      return
    }

    setSelectedDate(new Date(date))
    setStartHour(null)
    setEndHour(null)
  }

  function canUseHourAsStart(hour) {
    // L'ora finale della fascia non può essere usata come inizio
    // Esempio: se il posto è disponibile 8-18, 18 può essere solo fine, non inizio
    if (!disp) {
      return false
    }

    return hour < disp.oraFine && !bookedHours.has(hour)
  }

  function canUseHourAsEnd(hour) {
    // L'ora di fine deve essere maggiore dell'ora di inizio
    // Inoltre l'intervallo scelto non deve attraversare ore già prenotate
    if (startHour === null || hour <= startHour) {
      return false
    }

    return !hasBookedHourInsideInterval(startHour, hour, bookedHours)
  }

  function handleHourClick(hour) {
    // Primo click: selezioniamo l'ora di inizio
    if (startHour === null) {
      setStartHour(h); setEndHour(null)
    } else if (h > startHour && endHour === null) {
      const hasOverlap = Array.from({ length: h - startHour }, (_, i) => startHour + i)
        .some(hour => bookedHours.has(hour))
      if (hasOverlap) { setStartHour(h); setEndHour(null) }
      else setEndHour(h)
    } else {
      setStartHour(h); setEndHour(null)
    }
  }

  const disp       = selectedDate ? getDisponibilitaForDate(selectedDate, posto.disponibilita ?? []) : null
  const bookedHours = selectedDate ? getBookedHours(selectedDate, prenotazioni) : new Set()

    dataOraInizio.setHours(startHour, 0, 0, 0)
    dataOraFine.setHours(endHour, 0, 0, 0)

    setLoading(true)

    try {
      await onConfirm({
        dataOraInizio: dataOraInizio.toISOString(),
        dataOraFine: dataOraFine.toISOString()
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

        {/* Tags */}
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
            {/* Navigazione mese */}
            <div style={S.calNav}>
              <button onClick={prevMonth} style={S.navBtn}>‹</button>
              <span style={S.calTitle}>{MESI[month]} {year}</span>
              <button onClick={nextMonth} style={S.navBtn}>›</button>
            </div>

            {/* Header giorni */}
            <div style={S.weekHeader}>
              {GIORNI_HEADER.map(g => (
                <div key={g} style={S.weekHeaderCell}>{g}</div>
              ))}
            </div>

            {/* Celle giorni */}
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
                  if (isBooked)                  btnStyle = { ...btnStyle, ...S.hourBtnBooked }
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

              <button
                onClick={handleConfirm}
                disabled={loading}
                style={S.confirmBtn}
              >
                {loading ? 'Prenotazione in corso…' : `Prenota — €${prezzoTotale.toFixed(2)}`}
              </button>
            </div>
          )}
        </>
      )}
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

  /* Header */
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

  /* Tags */
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

  /* Disponibilità */
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

  /* Calendario */
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
    cursor: 'pointer',
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

  /* Time picker */
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

  /* Owner notice */
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

  /* Summary + confirm */
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
