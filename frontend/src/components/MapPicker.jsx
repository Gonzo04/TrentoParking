import { useEffect } from 'react';
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents
} from 'react-leaflet';

// Coordinate approssimative del centro di Trento.
// Le usiamo come punto iniziale della mappa.
const TRENTO_CENTER = [46.0679, 11.1211];

// Raggio predefinito del cerchio mostrato dopo il click.
// Serve per evitare di passare undefined a Leaflet.
const DEFAULT_RADIUS_METERS = 300;

// Controlla che la posizione sia nel formato corretto per Leaflet.
// Leaflet richiede latitudine e longitudine numeriche.
function isValidPosition(position) {
  return (
    position &&
    Number.isFinite(position.lat) &&
    Number.isFinite(position.lng)
  );
}

// Questo componente forza Leaflet a ricalcolare le dimensioni della mappa.
// È utile perché la mappa viene mostrata dopo il login e quindi può comparire
// dentro un layout che prima non era visibile.
function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [map]);

  return null;
}

// Questo componente intercetta il click sulla mappa.
// Non gestisce direttamente lo stato: comunica solo la posizione al componente padre.
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(event) {
      if (typeof onMapClick !== 'function') {
        console.warn('MapPicker: nessuna funzione valida ricevuta per gestire il click.');
        return;
      }

      const { lat, lng } = event.latlng;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.warn('MapPicker: coordinate non valide ricevute da Leaflet.', event.latlng);
        return;
      }

      onMapClick({ lat, lng });
    }
  });

  return null;
}

export default function MapPicker({
  selectedPosition,
  position,
  radiusMeters,
  onSelectPosition,
  onPositionSelected,
  onPositionSelect,
  onPositionChange,
  onLocationSelect,
  onSelectPosition: onSelectPositionAlternative
}) {
  // Accettiamo sia selectedPosition sia position per compatibilità con App.jsx.
  // In futuro conviene tenere un solo nome, ma ora evitiamo rotture inutili.
  const currentPosition = selectedPosition || position;

  // Accettiamo più nomi di callback perché nelle versioni precedenti del progetto
  // il componente mappa è stato usato con nomi diversi.
  const handleMapClick =
    onSelectPosition ||
    onPositionSelected ||
    onPositionSelect ||
    onPositionChange ||
    onLocationSelect ||
    onSelectPositionAlternative;

  const safeRadius = Number.isFinite(radiusMeters)
    ? radiusMeters
    : DEFAULT_RADIUS_METERS;

  const hasValidPosition = isValidPosition(currentPosition);

  return (
    <MapContainer
      center={TRENTO_CENTER}
      zoom={13}
      style={{ height: '500px', width: '100%', borderRadius: '12px' }}
    >
      <MapResizeHandler />

      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapClickHandler onMapClick={handleMapClick} />

      {hasValidPosition && (
        <>
          <Marker position={[currentPosition.lat, currentPosition.lng]} />

          <Circle
            center={[currentPosition.lat, currentPosition.lng]}
            radius={safeRadius}
            pathOptions={{
              color: '#2563eb',
              fillColor: '#60a5fa',
              fillOpacity: 0.2
            }}
          />
        </>
      )}
    </MapContainer>
  );
}