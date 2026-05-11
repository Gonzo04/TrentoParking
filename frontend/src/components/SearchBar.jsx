import { useRef, useState } from 'react'

const POPULAR = [
  { name: 'Piazza Duomo',              subtitle: 'Centro storico',         lat: 46.0677, lng: 11.1213 },
  { name: 'Stazione Ferroviaria',      subtitle: 'Piazza Dante',            lat: 46.0742, lng: 11.1189 },
  { name: 'Castello del Buonconsiglio', subtitle: 'Via Bernardo Clesio',    lat: 46.0740, lng: 11.1276 },
  { name: 'Polo Universitario',        subtitle: 'Via Mesiano',             lat: 46.0638, lng: 11.1495 },
  { name: 'Piazza Fiera',              subtitle: 'Quartiere Fiera',         lat: 46.0641, lng: 11.1273 },
  { name: 'Ospedale Santa Chiara',     subtitle: 'Largo Medaglie d\'Oro',   lat: 46.0628, lng: 11.1378 },
]

async function geocode(query) {
  const q = /trento/i.test(query) ? query : `${query}, Trento`
  const params = new URLSearchParams({
    q,
    format: 'json',
    limit: 5,
    countrycodes: 'it',
    viewbox: '11.05,46.15,11.30,45.98',
    bounded: 0,
    'accept-language': 'it',
  })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': 'TrentoParkingApp/1.0' },
  })
  return res.json()
}

export default function SearchBar({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef(null)

  const showPopular = open && query.length < 3
  const showResults = open && query.length >= 3 && results.length > 0

  function handleChange(e) {
    const val = e.target.value
    setQuery(val)
    clearTimeout(timer.current)
    if (val.length < 3) { setResults([]); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await geocode(val)
        setResults(data)
      } finally {
        setLoading(false)
      }
    }, 350)
  }

  function handleFocus() {
    setOpen(true)
  }

  function handleBlur() {
    setTimeout(() => setOpen(false), 150)
  }

  function handleSelectPopular(spot) {
    setQuery(spot.name)
    setOpen(false)
    onSelect({ lat: spot.lat, lng: spot.lng })
  }

  function handleSelectResult(item) {
    const [primary] = item.display_name.split(',')
    setQuery(primary.trim())
    setResults([])
    setOpen(false)
    onSelect({ lat: parseFloat(item.lat), lng: parseFloat(item.lon) })
  }

  function handleClear() {
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        border: '2px solid #e2e8f0', borderRadius: 999,
        background: '#fff', padding: '11px 18px',
        boxShadow: '0 2px 16px rgba(18,50,74,0.10)',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2a9d8f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Cerca un indirizzo o una zona a Trento..."
          style={{
            flex: 1, border: 'none', outline: 'none',
            fontSize: 15, color: '#12324a', background: 'transparent',
          }}
        />
        {loading && <span style={{ fontSize: 13, color: '#9ca3af' }}>...</span>}
        {query && !loading && (
          <button
            onClick={handleClear}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20, lineHeight: 1, padding: 0, flexShrink: 0 }}
          >
            ×
          </button>
        )}
      </div>

      {(showPopular || showResults) && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18,
          boxShadow: '0 8px 32px rgba(18,50,74,0.16)', zIndex: 1100, overflow: 'hidden',
        }}>
          {showPopular && (
            <>
              <div style={{ padding: '10px 18px 6px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Zone popolari
              </div>
              {POPULAR.map((spot, i) => (
                <button
                  key={spot.name}
                  onMouseDown={() => handleSelectPopular(spot)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', textAlign: 'left',
                    padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
                    borderBottom: i < POPULAR.length - 1 ? '1px solid #f1f5f9' : 'none',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span style={{ fontSize: 16 }}>📍</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#12324a', fontSize: 14 }}>{spot.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{spot.subtitle}</div>
                  </div>
                </button>
              ))}
            </>
          )}

          {showResults && results.map((item, i) => {
            const parts = item.display_name.split(',')
            const primary = parts[0].trim()
            const secondary = parts.slice(1, 3).join(',').trim()
            return (
              <button
                key={i}
                onMouseDown={() => handleSelectResult(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', textAlign: 'left',
                  padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
                  borderBottom: i < results.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{ fontSize: 16 }}>🔍</span>
                <div>
                  <div style={{ fontWeight: 600, color: '#12324a', fontSize: 14 }}>{primary}</div>
                  {secondary && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{secondary}</div>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
