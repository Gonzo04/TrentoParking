import { useEffect } from 'react';
import L from 'leaflet';
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents
} from 'react-leaflet';

const TRENTO_CENTER = [46.0679, 11.1211];

function priceIcon(price, highlighted = false) {
  const safePrice = Number.isFinite(Number(price)) ? Number(price) : 0;
  const cls = highlighted ? 'price-marker price-marker--highlighted' : 'price-marker';

  return L.divIcon({
    className: 'price-marker-icon',
    html: `<div class="${cls}">€${safePrice.toFixed(2)}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -18],
  });
}

function createSpotIcon() {
  return L.divIcon({
    className: 'create-spot-marker-icon',
    html: '<div class="create-spot-marker">📍</div>',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28],
  });
}

function ClickHandler({ onClick }) {
  useMapEvents({
    click(event) {
      if (typeof onClick === 'function') {
        onClick(event.latlng);
      }
    }
  });

  return null;
}

function FlyTo({ target }) {
  const map = useMap();

  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 15, { duration: 1.2 });
    }
  }, [map, target]);

  return null;
}

function isValidSpotPosition(spot) {
  return (
    spot &&
    spot.posizione &&
    Number.isFinite(Number(spot.posizione.latitudine)) &&
    Number.isFinite(Number(spot.posizione.longitudine))
  );
}

function isValidLatLng(position) {
  return (
    position &&
    Number.isFinite(Number(position.lat)) &&
    Number.isFinite(Number(position.lng))
  );
}

export default function SpotMap({
  spots = [],
  onSelectSpot,
  searchCircle,
  onMapClick,
  flyTarget,
  isCreateSpotMode = false,
  createSpotPosition = null,
  hoveredSpotId = null,
}) {
  const validSpots = spots.filter(isValidSpotPosition);

  return (
    <MapContainer
      center={TRENTO_CENTER}
      zoom={14}
      style={{ height: '500px', width: '100%', borderRadius: 12 }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ClickHandler onClick={onMapClick} />
      <FlyTo target={flyTarget} />

      {searchCircle && !isCreateSpotMode && (
        <Circle
          center={[searchCircle.lat, searchCircle.lng]}
          radius={searchCircle.radiusM}
          pathOptions={{
            color: '#2a9d8f',
            fillColor: '#2a9d8f',
            fillOpacity: 0.12
          }}
        />
      )}

      {isValidLatLng(createSpotPosition) && (
        <Marker
          position={[
            Number(createSpotPosition.lat),
            Number(createSpotPosition.lng)
          ]}
          icon={createSpotIcon()}
        >
          <Popup>
            <strong>Nuovo posto auto</strong>
            <br />
            <span style={{ color: '#6b7280', fontSize: 13 }}>
              Punto selezionato per la pubblicazione
            </span>
          </Popup>
        </Marker>
      )}

      {validSpots.map((spot) => {
        const spotId = spot.id || spot._id;
        const isHovered = hoveredSpotId === spotId;

        return (
          <Marker
            key={spotId}
            position={[
              Number(spot.posizione.latitudine),
              Number(spot.posizione.longitudine)
            ]}
            icon={priceIcon(spot.tariffaOraria, isHovered)}
            zIndexOffset={isHovered ? 1000 : 0}
          >
            <Popup>
              {spot.foto && spot.foto.length > 0 && (
                <img
                  src={`http://localhost:8080${spot.foto[0]}`}
                  alt=""
                  style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 6, marginBottom: 6, display: 'block' }}
                />
              )}
              <strong>{spot.nome}</strong>
              <br />

              <span style={{ color: '#6b7280', fontSize: 13 }}>
                {spot.posizione.indirizzoTestuale || 'Indirizzo non specificato'}
              </span>
              <br />

              <span style={{ fontWeight: 600 }}>
                €{Number(spot.tariffaOraria || 0).toFixed(2)}/ora
              </span>
              <br />

              <button
                onClick={() => onSelectSpot(spotId)}
                style={{
                  marginTop: 6,
                  padding: '4px 10px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Vedi disponibilità
              </button>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}