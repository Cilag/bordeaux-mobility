// src/components/Map/layers/SNCFLayer.jsx
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

const GARE_POS = [44.8257, -0.5563]

const sncfIcon = L.divIcon({
  className: '',
  html: `<div style="background:#CC0000;color:white;border-radius:6px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 1px 3px rgba(0,0,0,0.4)">🚆</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
})

export default function SNCFLayer({ departures }) {
  return (
    <Marker position={GARE_POS} icon={sncfIcon}>
      <Popup maxWidth={280}>
        <strong style={{ color: '#CC0000' }}>Bordeaux Saint-Jean</strong>
        <div style={{ marginTop: 6, maxHeight: 200, overflowY: 'auto' }}>
          {departures.slice(0, 10).map((d, i) => {
            const name = d.route?.name ?? d.display_informations?.direction ?? '?'
            const time = d.stop_date_time?.departure_date_time?.slice(9, 13) ?? '?'
            const hh = time.slice(0, 2)
            const mm = time.slice(2, 4)
            return (
              <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid #eee', fontSize: 12 }}>
                <strong>{hh}:{mm}</strong> — {name}
              </div>
            )
          })}
        </div>
      </Popup>
    </Marker>
  )
}
