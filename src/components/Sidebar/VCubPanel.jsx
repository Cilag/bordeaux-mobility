// src/components/Sidebar/VCubPanel.jsx
import { distanceTo } from '../../hooks/useGeolocation'

export default function VCubPanel({ stations, userPosition }) {
  const totalBikes = stations.reduce((acc, s) => acc + (s.nbvelos ?? 0), 0)

  const sorted = [...stations]
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
        <span>🚲 VCub</span>
        <span style={{ color: '#F5A623', fontWeight: 700 }}>{totalBikes} vélos dispo</span>
      </div>
      <div className="panel-body">
        {sorted.map((s, i) => (
          <div key={i} className="panel-row">
            <span>{s.nom ?? s.name ?? '?'}</span>
            <span>
              <span style={{ color: '#F5A623' }}>🚲 {s.nbvelos ?? '?'}</span>
              {' '}<span style={{ color: '#888' }}>🅿️ {s.nbplaces ?? '?'}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
