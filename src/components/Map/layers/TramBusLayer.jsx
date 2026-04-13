// src/components/Map/layers/TramBusLayer.jsx
import { Marker, CircleMarker, Popup } from 'react-leaflet'
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
  // Le champ réel de l'API DataHub est "vehicule" (valeur "TRAM" ou "BUS")
  const keyword = type === 'tram' ? 'TRAM' : 'BUS'

  // "TRAM_LONG", "TRAM_COURT" → startsWith("TRAM") ; "BUS" → startsWith("BUS")
  const filteredVehicles = vehicles.filter((v) =>
    (v.vehicule ?? '').toString().toUpperCase().startsWith(keyword)
  )

  const filteredStops = stops.filter((s) =>
    (s.vehicule ?? '').toString().toUpperCase().startsWith(keyword)
  )

  return (
    <>
      {/* Arrêts — petits cercles */}
      {filteredStops.map((s, i) => {
        const lat = s.geo_point_2d?.lat
        const lng = s.geo_point_2d?.lon
        if (!lat || !lng) return null
        return (
          <CircleMarker
            key={`stop-${i}`}
            center={[lat, lng]}
            radius={5}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.6, weight: 1 }}
          >
            <Popup>
              <strong style={{ color }}>{s.libelle ?? '?'}</strong><br />
              {s.vehicule}
            </Popup>
          </CircleMarker>
        )
      })}

      {/* Véhicules en temps réel — icônes */}
      {filteredVehicles.map((v, i) => {
        const lat = v.geo_point_2d?.lat
        const lng = v.geo_point_2d?.lon
        if (!lat || !lng) return null
        return (
          <Marker key={`veh-${i}`} position={[lat, lng]} icon={icon}>
            <Popup>
              <strong style={{ color }}>Ligne {v.rs_sv_ligne_a ?? '?'}</strong><br />
              {v.terminus ?? ''}<br />
              {v.etat && <span style={{ fontSize: 11, color: '#888' }}>{v.etat}</span>}
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}
