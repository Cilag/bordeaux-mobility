// src/components/Map/layers/TramBusLayer.jsx
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

const TRAM_COLOR = '#009EE3'
const BUS_COLOR = '#00A550'

function makeIcon(color, emoji) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 1px 3px rgba(0,0,0,0.4)">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const tramIcon = makeIcon(TRAM_COLOR, '🚋')
const busIcon = makeIcon(BUS_COLOR, '🚌')

export default function TramBusLayer({ vehicles, stops, type }) {
  const color = type === 'tram' ? TRAM_COLOR : BUS_COLOR
  const icon = type === 'tram' ? tramIcon : busIcon
  const keyword = type === 'tram' ? 'TRAM' : 'BUS'

  const filtered = vehicles.filter((v) =>
    (v.type ?? v.mode ?? v.ligne ?? '').toString().toUpperCase().includes(keyword)
  )

  return (
    <>
      {filtered.map((v, i) => {
        const lat = v.latitude ?? v.lat ?? v.geo_point_2d?.lat
        const lng = v.longitude ?? v.lon ?? v.geo_point_2d?.lon
        if (!lat || !lng) return null
        return (
          <Marker key={v.id ?? i} position={[lat, lng]} icon={icon}>
            <Popup>
              <strong style={{ color }}>Ligne {v.ligne ?? v.route ?? '?'}</strong><br />
              {v.direction ?? v.destination ?? ''}<br />
              {v.prochain_passage && <span>Prochain : {v.prochain_passage}</span>}
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}
