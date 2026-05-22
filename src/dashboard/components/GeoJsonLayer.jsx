import { GeoJSON } from 'react-leaflet'
import L from 'leaflet'

// Champs internes/techniques masqués dans les popups.
const HIDDEN_FIELDS = new Set(['gid', 'objectid', 'fid', 'geo_point_2d', 'geo_shape', 'coordonnees'])

function buildPopup(libelle, properties) {
  if (!properties) return `<strong>${libelle}</strong>`
  const entries = Object.entries(properties)
    .filter(([k, v]) => v != null && v !== '' && !HIDDEN_FIELDS.has(k))
    .slice(0, 6)
    .map(([k, v]) => {
      const val = typeof v === 'object' ? JSON.stringify(v) : String(v)
      const short = val.length > 80 ? val.slice(0, 77) + '…' : val
      return `<div><span style="color:#5C6B7A">${k}</span> : ${short}</div>`
    })
    .join('')
  return `<div style="font-family:system-ui;font-size:12px;max-width:260px">
    <div style="font-weight:600;color:#1F2933;margin-bottom:4px">${libelle}</div>
    ${entries}
  </div>`
}

// Rend les features d'un jeu (point/ligne/polygone). La prop `key` du parent
// doit changer quand les données changent, car <GeoJSON> ne re-rend pas seul.
export default function GeoJsonLayer({ features, color = '#1e3a5f', libelle = '', weight = 2, radius = 5 }) {
  if (!features || features.length === 0) return null
  const filtered = features.filter((f) => f.geometry) // exclut features sans géométrie
  if (filtered.length === 0) return null
  const data = { type: 'FeatureCollection', features: filtered }
  return (
    <GeoJSON
      data={data}
      style={{ color, weight, fillColor: color, fillOpacity: 0.15 }}
      pointToLayer={(feature, latlng) =>
        L.circleMarker(latlng, { radius, color, fillColor: color, fillOpacity: 0.7, weight: 1.5 })}
      onEachFeature={(feature, layer) => {
        layer.bindPopup(buildPopup(libelle, feature.properties))
      }}
    />
  )
}
