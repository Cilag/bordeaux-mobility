// src/components/Map/layers/TrafficLightLayer.jsx
import { CircleMarker, Popup } from 'react-leaflet'

export default function TrafficLightLayer({ data }) {
  return (
    <>
      {data.map((light, i) => {
        const lat = light.geo_point_2d?.lat ?? light.latitude
        const lng = light.geo_point_2d?.lon ?? light.longitude
        if (!lat || !lng) return null
        return (
          <CircleMarker
            key={i}
            center={[lat, lng]}
            radius={4}
            pathOptions={{ color: '#FFD700', fillColor: '#FFD700', fillOpacity: 0.8 }}
          >
            <Popup>
              <strong>🚦 Feux tricolores</strong><br />
              {light.adresse ?? light.libelle ?? ''}
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}
