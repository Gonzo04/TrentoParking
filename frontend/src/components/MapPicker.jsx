import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'

// Coordinate approssimative del centro di Trento.
// Le usiamo come posizione iniziale della mappa.
const TRENTO_CENTER = [46.0679, 11.1211]

/**
 * Questo componente interno ascolta i click sulla mappa.
 * Quando l'utente clicca, prendiamo latitudine e longitudine
 * e le passiamo al componente padre tramite onSelectPosition.
 */
function MapClickHandler({ onSelectPosition }) {
  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng
      onSelectPosition({ lat, lng })
    },
  })

  return null
}

/**
 * MapPicker:
 * - mostra la mappa centrata su Trento
 * - permette all'utente di cliccare un punto
 * - disegna un marker nel punto selezionato
 * - disegna un cerchio che rappresenta il raggio di ricerca
 */
export default function MapPicker({
  selectedPosition,
  radiusMeters,
  onSelectPosition,
}) {
  return (
    <MapContainer
      center={TRENTO_CENTER}
      zoom={13}
      style={{ height: '500px', width: '100%', borderRadius: '12px' }}
    >
      {/* TileLayer = "sfondo" della mappa.
          Qui usiamo OpenStreetMap*/}
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />

      {/* Componente che intercetta il click sulla mappa */}
      <MapClickHandler onSelectPosition={onSelectPosition} />

      {/* Se l'utente ha già selezionato una posizione, mostriamo marker e cerchio */}
      {selectedPosition && (
        <>
          <Marker position={[selectedPosition.lat, selectedPosition.lng]} />

          <Circle
            center={[selectedPosition.lat, selectedPosition.lng]}
            radius={radiusMeters}
            pathOptions={{
              color: '#2563eb',
              fillColor: '#60a5fa',
              fillOpacity: 0.2,
            }}
          />
        </>
      )}
    </MapContainer>
  )
}