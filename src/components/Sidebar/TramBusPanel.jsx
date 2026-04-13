// src/components/Sidebar/TramBusPanel.jsx
import { distanceTo } from '../../hooks/useGeolocation'

export default function TramBusPanel({ stops, userPosition }) {
  const sorted = [...stops]
    .map((s) => {
      const lat = s.geo_point_2d?.lat ?? s.latitude
      const lng = s.geo_point_2d?.lon ?? s.longitude
      return { ...s, _dist: distanceTo(userPosition, lat, lng) }
    })
    .sort((a, b) => a._dist - b._dist)
    .slice(0, 20)

  return (
    <div className="panel">
      <div className="panel-header">
        <span>🚋🚌 Tram / Bus</span>
        <span style={{ color: '#888', fontWeight: 400 }}>{stops.length} arrêts</span>
      </div>
      <div className="panel-body">
        {sorted.map((s, i) => (
          <div key={i} className="panel-row">
            <span>{s.nomarret ?? s.nom ?? '?'}</span>
            <span style={{ color: '#888' }}>
              {s._dist < Infinity ? `${(s._dist * 1000).toFixed(0)} m` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
