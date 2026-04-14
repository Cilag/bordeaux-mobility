// src/components/Map/layers/TramBusLayer.jsx
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import StopPopup from './StopPopup'

const TRAM_COLOR = '#009EE3'
const BUS_COLOR = '#00A550'

function makeVehicleIcon(color, emoji) {
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 1px 3px rgba(0,0,0,0.4)">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function makeStopIcon(color, ligne) {
  const label = ligne ? String(ligne) : '·'
  const size = label.length > 2 ? 22 : 20
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};color:white;border-radius:50%;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;box-shadow:0 1px 2px rgba(0,0,0,0.35);border:1.5px solid rgba(255,255,255,0.7)">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

const tramIcon = makeVehicleIcon(TRAM_COLOR, '🚋')
const busIcon = makeVehicleIcon(BUS_COLOR, '🚌')

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
      {/* Arrêts — rond coloré avec numéro de ligne */}
      {filteredStops.map((s, i) => {
        const lat = s.geo_point_2d?.lat
        const lng = s.geo_point_2d?.lon
        if (!lat || !lng) return null
        const stopIcon = makeStopIcon(color, s.rs_sv_ligne_a)
        return (
          <Marker
            key={`stop-${i}`}
            position={[lat, lng]}
            icon={stopIcon}
          >
            <StopPopup stopId={s.gid} stopName={s.libelle ?? '?'} color={color} />
          </Marker>
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
