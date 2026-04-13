// src/components/Map/layers/VCubLayer.jsx
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

const vcubIcon = L.divIcon({
  className: '',
  html: `<div style="background:#F5A623;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 1px 3px rgba(0,0,0,0.4)">🚲</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

export default function VCubLayer({ stations }) {
  return (
    <>
      {stations.map((s, i) => {
        const lat = s.geo_point_2d?.lat ?? s.latitude
        const lng = s.geo_point_2d?.lon ?? s.longitude
        if (!lat || !lng) return null
        return (
          <Marker key={s.ident ?? i} position={[lat, lng]} icon={vcubIcon}>
            <Popup>
              <strong style={{ color: '#F5A623' }}>{s.nom ?? s.name}</strong><br />
              🚲 {s.nbvelos ?? s.available_bikes ?? '?'} vélos dispo<br />
              🅿️ {s.nbplaces ?? s.available_stands ?? '?'} places libres
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}
