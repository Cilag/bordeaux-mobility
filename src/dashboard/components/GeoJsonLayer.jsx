import { GeoJSON } from 'react-leaflet'
import L from 'leaflet'

// Rend les features d'un jeu (point/ligne/polygone). La prop `key` du parent
// doit changer quand les données changent, car <GeoJSON> ne re-rend pas seul.
export default function GeoJsonLayer({ features, color = '#1e3a5f' }) {
  if (!features || features.length === 0) return null
  const data = { type: 'FeatureCollection', features }
  return (
    <GeoJSON
      data={data}
      style={{ color, weight: 2 }}
      pointToLayer={(feature, latlng) =>
        L.circleMarker(latlng, { radius: 5, color, fillOpacity: 0.7 })}
    />
  )
}
