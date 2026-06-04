import { GIORNI, TAGS } from '../../utils/SpotOptions'

// Opzioni ora inizio: 00:00 -> 23:00
const ORA_INIZIO_OPTS = Array.from(
  { length: 24 },
  (_, i) => String(i).padStart(2, '0') + ':00'
)

// Opzioni ora fine: 01:00 -> 24:00
const ORA_FINE_OPTS = Array.from(
  { length: 24 },
  (_, i) => String(i + 1).padStart(2, '0') + ':00'
)

export function AvailabilityEditor({ disponibilita, onChange }) {
  function toggleDay(giorno) {
    const exists = disponibilita.find(d => d.giorno === giorno)

    if (exists) {
      onChange(disponibilita.filter(d => d.giorno !== giorno))
      return
    }

    const next = [...disponibilita, { giorno, oraInizio: '08:00', oraFine: '20:00' }]

    next.sort((a, b) =>
      GIORNI.findIndex(g => g.key === a.giorno) -
      GIORNI.findIndex(g => g.key === b.giorno)
    )

    onChange(next)
  }

  function updateTime(giorno, field, value) {
    onChange(disponibilita.map(d => {
      if (d.giorno !== giorno) return d

      const updated = { ...d, [field]: value }

      // Se l'ora finale non è successiva, la spostiamo automaticamente avanti
      if (parseInt(updated.oraFine, 10) <= parseInt(updated.oraInizio, 10)) {
        const h = Math.min(parseInt(updated.oraInizio, 10) + 1, 24)
        updated.oraFine = String(h).padStart(2, '0') + ':00'
      }

      return updated
    }))
  }

  const activeDays = GIORNI.filter(g => disponibilita.some(d => d.giorno === g.key))

  return (
    <div className="db-avail-editor">
      <div className="db-avail-days">
        {GIORNI.map(g => {
          const active = disponibilita.some(d => d.giorno === g.key)

          return (
            <button
              key={g.key}
              type="button"
              className={`db-day-btn${active ? ' db-day-btn--on' : ''}`}
              onClick={() => toggleDay(g.key)}
              title={g.full}
            >
              {g.short}
            </button>
          )
        })}
      </div>

      {activeDays.length > 0 && (
        <div className="db-avail-slots">
          {activeDays.map(g => {
            const slot = disponibilita.find(d => d.giorno === g.key)
            const fineOpts = ORA_FINE_OPTS.filter(
              t => parseInt(t, 10) > parseInt(slot.oraInizio, 10)
            )

            return (
              <div key={g.key} className="db-avail-row">
                <span className="db-avail-day-name">{g.full}</span>
                <div className="db-avail-times">
                  <select
                    value={slot.oraInizio}
                    onChange={e => updateTime(g.key, 'oraInizio', e.target.value)}
                    className="db-time-input"
                  >
                    {ORA_INIZIO_OPTS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  <span className="db-avail-arrow">→</span>

                  <select
                    value={slot.oraFine}
                    onChange={e => updateTime(g.key, 'oraFine', e.target.value)}
                    className="db-time-input"
                  >
                    {fineOpts.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeDays.length === 0 && (
        <p className="db-avail-empty">
          Nessun giorno selezionato. Il posto risulterà disponibile su richiesta.
        </p>
      )}
    </div>
  )
}

export function TagsEditor({ caratteristiche, onChange }) {
  function toggle(key) {
    if (caratteristiche.includes(key)) {
      onChange(caratteristiche.filter(c => c !== key))
      return
    }

    onChange([...caratteristiche, key])
  }

  return (
    <div className="db-tags-grid">
      {TAGS.map(tag => {
        const active = caratteristiche.includes(tag.key)

        return (
          <button
            key={tag.key}
            type="button"
            className={`db-tag-toggle${active ? ' db-tag-toggle--on' : ''}`}
            onClick={() => toggle(tag.key)}
          >
            <span className="db-tag-emoji">{active ? '✓' : tag.emoji}</span>
            <span>{tag.label}</span>
          </button>
        )
      })}
    </div>
  )
}