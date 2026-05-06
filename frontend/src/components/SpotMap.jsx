import L from 'leaflet'
import { useMapEvents, MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet'

const TRENTO_CENTER = [46.0679, 11.1211]

function priceIcon(price) {
  return L.divIcon({
    className: 'price-marker-icon',
    html: `<div class="price-marker">€${price.toFixed(2)}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -18],
  })
}

function ClickHandler({ onClick }) {
  useMapEvents({ click: e => onClick(e.latlng) })
  return null
}

export default function SpotMap({ spots, onSelectSpot, searchCircle, onMapClick }) {
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
      <ClickHandler onClick={onMapClick} />

      {searchCircle && (
        <Circle
          center={[searchCircle.lat, searchCircle.lng]}
          radius={searchCircle.radiusM}
          pathOptions={{ color: '#2a9d8f', fillColor: '#2a9d8f', fillOpacity: 0.12 }}
        />
      )}

      {spots.map(spot => (
        <Marker
          key={spot._id}
          position={[spot.posizione.latitudine, spot.posizione.longitudine]}
          icon={priceIcon(spot.tariffaOraria)}
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
        </Marker>
      ))}
    </MapContainer>
  )
}
