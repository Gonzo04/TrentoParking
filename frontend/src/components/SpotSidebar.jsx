export default function SpotSidebar({ spots, radiusM, onRadiusChange, onClear, onSelectSpot }) {
  return (
    <div className="content-card spot-sidebar">
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 700, color: '#12324a' }}>
            {spots.length} {spots.length === 1 ? 'posto' : 'posti'} nel raggio
          </span>
          <button
            onClick={onClear}
            style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, padding: '3px 10px', fontSize: 13, color: '#6b7280', cursor: 'pointer' }}
          >
            Cancella
          </button>
        </div>

        <label style={{ fontSize: 13, color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
          Raggio: {radiusM >= 1000 ? `${(radiusM / 1000).toFixed(1)} km` : `${radiusM} m`}
          <input
            type="range"
            min={100}
            max={2000}
            step={100}
            value={radiusM}
            onChange={e => onRadiusChange(Number(e.target.value))}
            style={{ accentColor: '#2a9d8f' }}
          />
        </label>
      </div>

      {spots.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>Nessun posto in quest&apos;area.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {spots.map(spot => (
            <div
              key={spot._id}
              style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}
            >
              <p style={{ margin: '0 0 2px', fontWeight: 700, color: '#12324a', fontSize: 15 }}>{spot.nome}</p>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#6b7280' }}>{spot.posizione.indirizzoTestuale}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#2563eb' }}>€{spot.tariffaOraria.toFixed(2)}/ora</span>
                <button
                  onClick={() => onSelectSpot(spot._id)}
                  style={{
                    padding: '5px 12px', background: '#2563eb', color: '#fff',
                    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Prenota
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
