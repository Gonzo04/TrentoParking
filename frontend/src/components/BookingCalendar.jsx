import { useMemo, useState } from 'react'

const MESI = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre'
]

const GIORNI_HEADER = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

// getDay() di JavaScript usa 0 per domenica, 1 per lunedì e così via
// Questo array usa lo stesso ordine, ma con i valori tecnici salvati dal backend
const GIORNI_BACKEND = [
  'DOMENICA',
  'LUNEDI',
  'MARTEDI',
  'MERCOLEDI',
  'GIOVEDI',
  'VENERDI',
  'SABATO'
]

// Etichette leggibili da mostrare all'utente
// Il backend usa valori tecnici, il frontend li traduce in testi più chiari
const LABEL_GIORNI = {
  LUNEDI: 'Lunedì',
  MARTEDI: 'Martedì',
  MERCOLEDI: 'Mercoledì',
  GIOVEDI: 'Giovedì',
  VENERDI: 'Venerdì',
  SABATO: 'Sabato',
  DOMENICA: 'Domenica'
}

function normalizeGiorno(value) {
  // Normalizziamo il giorno per evitare problemi tra "MERCOLEDI" e "mercoledì"
  // Togliamo gli accenti e portiamo tutto in maiuscolo
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
}

function isSameDay(firstDate, secondDate) {
  // Confrontiamo solo anno, mese e giorno
  // Non confrontiamo ore e minuti perché qui ci interessa solo la data del calendario
  return firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
}

function buildMonthGrid(year, month) {
  // Costruisce la griglia del mese includendo anche alcuni giorni del mese precedente o successivo
  // Serve per avere sempre settimane complete da lunedì a domenica
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startDow = (first.getDay() + 6) % 7

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
  // Recupera la fascia di disponibilità valida per il giorno selezionato
  // Il confronto usa i valori tecnici del backend, non le etichette italiane con accenti
  if (!Array.isArray(disponibilita)) {
    return null
  }

  const giornoRichiesto = GIORNI_BACKEND[date.getDay()]

  return disponibilita.find((fascia) => (
    normalizeGiorno(fascia.giorno) === giornoRichiesto
  )) || null
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

function hasBookedHourInsideInterval(startHour, endHour, bookedHours) {
  // Controlla se tra ora inizio inclusa e ora fine esclusa esistono ore già prenotate
  // Esempio: 10-12 controlla 10 e 11, non 12
  for (let hour = startHour; hour < endHour; hour++) {
    if (bookedHours.has(hour)) {
      return true
    }
  }

  return false
}

function formatDisponibilita(disponibilita) {
  // Mostra le fasce disponibili in modo leggibile dentro al calendario
  if (!Array.isArray(disponibilita) || disponibilita.length === 0) {
    return 'Nessuna disponibilità impostata'
  }

  return disponibilita
    .map((fascia) => {
      const giorno = normalizeGiorno(fascia.giorno)
      const label = LABEL_GIORNI[giorno] || fascia.giorno

      return `${label} ${fascia.oraInizio}:00-${fascia.oraFine}:00`
    })
    .join(', ')
}

export default function BookingCalendar({ posto, prenotazioni, onConfirm }) {
  const today = useMemo(() => {
    // Usiamo la data di oggi senza ore, minuti e secondi
    // Così il confronto con i giorni del calendario è più stabile
    const date = new Date()

    date.setHours(0, 0, 0, 0)

    return date
  }, [])

  const maxMonth = useMemo(() => {
    // Limitiamo il calendario ai prossimi due mesi
    // Il backend carica le prenotazioni future fino a due mesi, quindi evitiamo mesi non coperti
    return new Date(today.getFullYear(), today.getMonth() + 2, 1)
  }, [today])

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(null)
  const [startHour, setStartHour] = useState(null)
  const [endHour, setEndHour] = useState(null)
  const [loading, setLoading] = useState(false)

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month])

  const visibleMonthDate = new Date(year, month, 1)
  const currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1)

  const canGoPrev = visibleMonthDate > currentMonthDate
  const canGoNext = visibleMonthDate < maxMonth

  const disp = selectedDate
    ? getDisponibilitaForDate(selectedDate, posto.disponibilita)
    : null

  const bookedHours = selectedDate
    ? getBookedHours(selectedDate, prenotazioni)
    : new Set()

  const ore = startHour !== null && endHour !== null
    ? endHour - startHour
    : 0

  const prezzoTotale = Math.round(ore * posto.tariffaOraria * 100) / 100

  const selectionComplete = Boolean(
    selectedDate &&
    startHour !== null &&
    endHour !== null
  )

  function resetSelection() {
    // Quando cambiamo mese o giorno puliamo la selezione oraria
    setSelectedDate(null)
    setStartHour(null)
    setEndHour(null)
  }

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
    // Un giorno è disponibile solo se non è passato e se esiste una disponibilità per quel giorno
    if (date < today) {
      return false
    }

    const disponibilitaGiorno = getDisponibilitaForDate(date, posto.disponibilita)

    if (!disponibilitaGiorno) {
      return false
    }

    const oreOccupate = getBookedHours(date, prenotazioni)

    // Il giorno è cliccabile se almeno un'ora della fascia è libera
    for (let hour = disponibilitaGiorno.oraInizio; hour < disponibilitaGiorno.oraFine; hour++) {
      if (!oreOccupate.has(hour)) {
        return true
      }
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
      if (canUseHourAsStart(hour)) {
        setStartHour(hour)
        setEndHour(null)
      }

      return
    }

    // Secondo click: se l'ora è valida come fine, completiamo la selezione
    if (canUseHourAsEnd(hour)) {
      setEndHour(hour)
      return
    }

    // Se il click non è valido come fine ma è valido come nuovo inizio, ricominciamo da lì
    if (canUseHourAsStart(hour)) {
      setStartHour(hour)
      setEndHour(null)
    }
  }

  async function handleConfirm() {
    // Costruiamo le date complete partendo dal giorno selezionato e dalle ore scelte
    const dataOraInizio = new Date(selectedDate)
    const dataOraFine = new Date(selectedDate)

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
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 460 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px' }}>
          {posto.nome}
        </h2>

        <p style={{ margin: '0 0 2px', color: '#6b7280', fontSize: 14 }}>
          {posto.posizione?.indirizzoTestuale || 'Indirizzo non disponibile'}
        </p>

        <p style={{ margin: 0, fontWeight: 700, color: '#2563eb' }}>
          €{Number(posto.tariffaOraria).toFixed(2)}/ora
        </p>

        {posto.descrizione && (
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#555' }}>
            {posto.descrizione}
          </p>
        )}

        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280' }}>
          Disponibilità: {formatDisponibilita(posto.disponibilita)}
        </p>
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            background: '#f9fafb',
            borderBottom: '1px solid #e5e7eb'
          }}
        >
          <button
            onClick={prevMonth}
            disabled={!canGoPrev}
            style={{
              ...S.navBtn,
              opacity: canGoPrev ? 1 : 0.35,
              cursor: canGoPrev ? 'pointer' : 'not-allowed'
            }}
          >
            ‹
          </button>

          <span style={{ fontWeight: 600 }}>
            {MESI[month]} {year}
          </span>

          <button
            onClick={nextMonth}
            disabled={!canGoNext}
            style={{
              ...S.navBtn,
              opacity: canGoNext ? 1 : 0.35,
              cursor: canGoNext ? 'pointer' : 'not-allowed'
            }}
          >
            ›
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            background: '#f9fafb',
            borderBottom: '1px solid #e5e7eb'
          }}
        >
          {GIORNI_HEADER.map((giorno) => (
            <div
              key={giorno}
              style={{
                textAlign: 'center',
                padding: '6px 0',
                fontSize: 12,
                color: '#9ca3af',
                fontWeight: 600
              }}
            >
              {giorno}
            </div>
          ))}
        </div>

        <div style={{ padding: 8 }}>
          {grid.map((week, weekIndex) => (
            <div
              key={weekIndex}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}
            >
              {week.map(({ date, current }, dayIndex) => {
                const available = current && isDayAvailable(date)
                const selected = selectedDate && isSameDay(date, selectedDate)

                let cellStyle = { ...S.dayCell }

                if (!current) {
                  cellStyle = { ...cellStyle, color: '#d1d5db' }
                } else if (selected) {
                  cellStyle = {
                    ...cellStyle,
                    background: '#2563eb',
                    color: '#fff',
                    fontWeight: 700
                  }
                } else if (available) {
                  cellStyle = {
                    ...cellStyle,
                    background: 'rgba(42,157,143,0.12)',
                    color: '#2a9d8f',
                    fontWeight: 700
                  }
                } else {
                  cellStyle = {
                    ...cellStyle,
                    color: '#d1d5db',
                    cursor: 'default'
                  }
                }

                return (
                  <button
                    key={dayIndex}
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

      {selectedDate && disp && (
        <div style={{ marginTop: 16 }}>
          <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 14 }}>
            Seleziona orario · {selectedDate.toLocaleDateString('it-IT', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
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
            {Array.from(
              { length: disp.oraFine - disp.oraInizio + 1 },
              (_, index) => disp.oraInizio + index
            ).map((hour) => {
              const isBooked = bookedHours.has(hour)
              const isSelected = startHour !== null &&
                endHour !== null &&
                hour >= startHour &&
                hour < endHour

              const isStart = hour === startHour
              const canStartHere = canUseHourAsStart(hour)
              const canEndHere = canUseHourAsEnd(hour)
              const disabled = startHour === null
                ? !canStartHere
                : !(canStartHere || canEndHere)

              let buttonStyle = { ...S.hourBtn }

              if (isBooked && disabled) {
                buttonStyle = { ...buttonStyle, ...S.hourBtnBooked }
              } else if (isStart || isSelected) {
                buttonStyle = { ...buttonStyle, ...S.hourBtnSelected }
              } else if (canEndHere) {
                buttonStyle = { ...buttonStyle, border: '1px solid #2563eb' }
              }

              return (
                <button
                  key={hour}
                  style={{
                    ...buttonStyle,
                    cursor: disabled ? 'not-allowed' : 'pointer'
                  }}
                  disabled={disabled}
                  onClick={() => handleHourClick(hour)}
                >
                  {hour}:00
                </button>
              )
            })}
          </div>
        </div>
      )}

      {selectionComplete && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: '#eff6ff',
            borderRadius: 10,
            border: '1px solid #bfdbfe'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12
            }}
          >
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {posto.nome}
              </p>

              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                {startHour}:00 – {endHour}:00 · {ore}h
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                {ore}h × €{Number(posto.tariffaOraria).toFixed(2)}
              </p>

              <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: 18, color: '#2563eb' }}>
                €{prezzoTotale.toFixed(2)}
              </p>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              ...S.btnPrimary,
              width: '100%',
              padding: '12px 0',
              fontSize: 15,
              opacity: loading ? 0.7 : 1
            }}
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
    background: 'none',
    border: '1px solid #e5e7eb',
    borderRadius: '50%',
    width: 32,
    height: 32,
    fontSize: 18,
    lineHeight: 1
  },
  dayCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    margin: '2px auto',
    borderRadius: '50%',
    fontSize: 14,
    cursor: 'pointer',
    border: 'none',
    background: 'none'
  },
  hourBtn: {
    padding: '5px 10px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 13,
    background: '#fff',
    color: '#374151',
    minWidth: 58
  },
  hourBtnBooked: {
    background: '#f3f4f6',
    color: '#d1d5db',
    textDecoration: 'line-through'
  },
  hourBtnSelected: {
    background: '#2563eb',
    color: '#fff',
    border: '1px solid #2563eb'
  },
  btnPrimary: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer'
  }
}