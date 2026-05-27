import { useState, useMemo } from 'react'

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const GIORNI_HEADER = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom']
// Mapping JS getDay() (0=domenica) → Italian day name used in disponibilita
const GIORNO_IT = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato']

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const startDow = (first.getDay() + 6) % 7 // Mon = 0

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

// Returns a Set of hour numbers that are occupied on the given date.
// Handles bookings that span midnight by checking each occupied hour's date.
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

export default function BookingCalendar({ posto, prenotazioni, onConfirm }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])

  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(null)
  const [startHour, setStartHour] = useState(null)
  const [endHour,   setEndHour]   = useState(null)
  const [loading,   setLoading]   = useState(false)

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    resetSelection()
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    resetSelection()
  }
  function resetSelection() { setSelectedDate(null); setStartHour(null); setEndHour(null) }

  function isDayAvailable(date) {
    if (date < today) return false
    const disp = getDisponibilitaForDate(date, posto.disponibilita)
    if (!disp) return false
    const booked = getBookedHours(date, prenotazioni)
    // At least one hour must be free to start a booking (end must be > start)
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

  function handleHourClick(h) {
    if (startHour === null) {
      setStartHour(h)
      setEndHour(null)
    } else if (h > startHour && endHour === null) {
      // Reject if any booked hour falls within [startHour, h)
      const hasOverlap = Array.from({ length: h - startHour }, (_, i) => startHour + i)
        .some(hour => bookedHours.has(hour))
      if (hasOverlap) {
        setStartHour(h)
        setEndHour(null)
      } else {
        setEndHour(h)
      }
    } else {
      setStartHour(h)
      setEndHour(null)
    }
  }

  const disp = selectedDate ? getDisponibilitaForDate(selectedDate, posto.disponibilita) : null
  const bookedHours = selectedDate ? getBookedHours(selectedDate, prenotazioni) : new Set()

  const ore = (startHour !== null && endHour !== null) ? endHour - startHour : 0
  const prezzoTotale = Math.round(ore * posto.tariffaOraria * 100) / 100
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
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 460 }}>
      {/* Spot header */}
      <div style={{ marginBottom: 20 }}>
        {posto.foto && posto.foto.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto' }}>
            {posto.foto.map((url, i) => (
              <img
                key={i}
                src={`http://localhost:8080${url}`}
                alt=""
                style={{ height: 120, minWidth: 160, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
              />
            ))}
          </div>
        )}
        <h2 style={{ margin: '0 0 4px' }}>{posto.nome}</h2>
        <p style={{ margin: '0 0 2px', color: '#6b7280', fontSize: 14 }}>{posto.posizione.indirizzoTestuale}</p>
        <p style={{ margin: 0, fontWeight: 700, color: '#2563eb' }}>€{posto.tariffaOraria.toFixed(2)}/ora</p>
        {posto.descrizione && <p style={{ margin: '6px 0 0', fontSize: 13, color: '#555' }}>{posto.descrizione}</p>}
      </div>

      {/* Month calendar */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          <button onClick={prevMonth} style={S.navBtn}>‹</button>
          <span style={{ fontWeight: 600 }}>{MESI[month]} {year}</span>
          <button onClick={nextMonth} style={S.navBtn}>›</button>
        </div>

        {/* Day-of-week header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          {GIORNI_HEADER.map(g => (
            <div key={g} style={{ textAlign: 'center', padding: '6px 0', fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>{g}</div>
          ))}
        </div>

        {/* Days */}
        <div style={{ padding: 8 }}>
          {grid.map((week, wi) => (
            <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {week.map(({ date, current }, di) => {
                const available = current && isDayAvailable(date)
                const selected  = selectedDate && date.toDateString() === selectedDate.toDateString()

                let cellStyle = { ...S.dayCell }
                if (!current)        cellStyle = { ...cellStyle, color: '#d1d5db' }
                else if (selected)   cellStyle = { ...cellStyle, background: '#2563eb', color: '#fff', fontWeight: 700 }
                else if (available)  cellStyle = { ...cellStyle, background: 'rgba(42,157,143,0.12)', color: '#2a9d8f', fontWeight: 600 }
                else                 cellStyle = { ...cellStyle, color: '#d1d5db', cursor: 'default' }

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

      {/* Time picker */}
      {selectedDate && disp && (
        <div style={{ marginTop: 16 }}>
          <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 14 }}>
            Seleziona orario · {selectedDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: '#6b7280' }}>
            Disponibile {disp.oraInizio}:00 – {disp.oraFine}:00 ·{' '}
            {startHour === null
              ? 'Seleziona orario inizio'
              : endHour === null
              ? `Inizio: ${startHour}:00 — seleziona la fine`
              : `${startHour}:00 → ${endHour}:00`}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Array.from({ length: disp.oraFine - disp.oraInizio + 1 }, (_, i) => disp.oraInizio + i).map(h => {
              const isBooked   = bookedHours.has(h)
              const isSelected = startHour !== null && endHour !== null && h >= startHour && h < endHour
              const isStart    = h === startHour

              let btnStyle = { ...S.hourBtn }
              if (isBooked)            btnStyle = { ...btnStyle, ...S.hourBtnBooked }
              else if (isStart || isSelected) btnStyle = { ...btnStyle, ...S.hourBtnSelected }

              return (
                <button
                  key={h}
                  style={btnStyle}
                  disabled={isBooked}
                  onClick={() => handleHourClick(h)}
                >
                  {h}:00
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary + confirm */}
      {selectionComplete && (
        <div style={{ marginTop: 16, padding: 16, background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>{posto.nome}</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                {startHour}:00 – {endHour}:00 · {ore}h
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{ore}h × €{posto.tariffaOraria.toFixed(2)}</p>
              <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: 18, color: '#2563eb' }}>€{prezzoTotale.toFixed(2)}</p>
            </div>
          </div>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{ ...S.btnPrimary, width: '100%', padding: '12px 0', fontSize: 15 }}
          >
            {loading ? 'Prenotazione in corso...' : `Prenota — €${prezzoTotale.toFixed(2)}`}
          </button>
        </div>
      )}
    </div>
  )
}

const S = {
  navBtn: {
    background: 'none', border: '1px solid #e5e7eb', borderRadius: '50%',
    width: 32, height: 32, cursor: 'pointer', fontSize: 18, lineHeight: 1,
  },
  dayCell: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, margin: '2px auto', borderRadius: '50%',
    fontSize: 14, cursor: 'pointer', border: 'none', background: 'none',
  },
  hourBtn: {
    padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: 8,
    fontSize: 13, cursor: 'pointer', background: '#fff', color: '#374151', minWidth: 58,
  },
  hourBtnBooked: {
    background: '#f3f4f6', color: '#d1d5db', textDecoration: 'line-through', cursor: 'not-allowed',
  },
  hourBtnSelected: {
    background: '#2563eb', color: '#fff', border: '1px solid #2563eb',
  },
  btnPrimary: {
    background: '#2563eb', color: '#fff', border: 'none',
    borderRadius: 8, fontWeight: 600, cursor: 'pointer',
  },
}
