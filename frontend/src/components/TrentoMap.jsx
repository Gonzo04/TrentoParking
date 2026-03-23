import React from 'react';
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ZONES } from '../zones'; // Import the zone data

// Fix for default marker icon issue with Webpack/Vite
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function TrentoMap({ onZoneClick }) { // Destructure the onZoneClick prop
  const position = [46.0667, 11.125]; // Adjusted center for better view of zones

  return (
    <MapContainer center={position} zoom={14} scrollWheelZoom={true} className="trento-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {ZONES.map((zone) => (
        <Polygon
          key={zone.id}
          pathOptions={{ color: zone.color }}
          positions={zone.bounds}
          eventHandlers={{
            click: () => {
              // When a polygon is clicked, call the function passed from the parent
              onZoneClick(zone.name);
            },
          }}
        >
          <Popup>
            <strong>{zone.name}</strong>
            <p>{zone.description}</p>
          </Popup>
        </Polygon>
      ))}
    </MapContainer>
  );
}

export default TrentoMap;
