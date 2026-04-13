// src/components/Map/layers/FlightLayer.jsx
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

function makeFlightIcon(heading) {
  return L.divIcon({
    className: '',
    html: `<div style="transform:rotate(${heading}deg);font-size:22px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4))">✈️</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

export default function FlightLayer({ flights }) {
  return (
    <>
      {flights.map((f) => (
        <Marker
          key={f.icao24}
          position={[f.lat, f.lng]}
          icon={makeFlightIcon(f.heading ?? 0)}
        >
          <Popup>
            <strong style={{ color: '#444' }}>{f.callsign || f.icao24}</strong><br />
            🌍 {f.originCountry}<br />
            📏 Alt: {f.altitude ? Math.round(f.altitude) + ' m' : '?'}<br />
            💨 Vitesse: {f.velocity ? Math.round(f.velocity * 3.6) + ' km/h' : '?'}
          </Popup>
        </Marker>
      ))}
    </>
  )
}
