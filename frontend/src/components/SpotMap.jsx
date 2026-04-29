import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'

const TRENTO_CENTER = [46.0679, 11.1211]

// TODO: replace CircleMarker with custom icons (Marker + L.divIcon) for a richer look
export default function SpotMap({ spots, onSelectSpot }) {
  return (
    <MapContainer
      center={TRENTO_CENTER}
      zoom={14}
      style={{ height: '500px', width: '100%', borderRadius: 12 }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />

      {spots.map(spot => (
        <CircleMarker
          key={spot._id}
          center={[spot.posizione.latitudine, spot.posizione.longitudine]}
          radius={14}
          pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.85 }}
        >
          <Popup>
            <strong>{spot.nome}</strong>
            <br />
            <span style={{ color: '#6b7280', fontSize: 13 }}>{spot.posizione.indirizzoTestuale}</span>
            <br />
            <span style={{ fontWeight: 600 }}>€{spot.tariffaOraria.toFixed(2)}/ora</span>
            <br />
            <button
              onClick={() => onSelectSpot(spot._id)}
              style={{
                marginTop: 6, padding: '4px 10px',
                background: '#2563eb', color: '#fff',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
              }}
            >
              Vedi disponibilità
            </button>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
