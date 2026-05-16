import { MapContainer, TileLayer } from 'react-leaflet'
import { BORDEAUX_CENTER } from '../services/api'
import 'leaflet/dist/leaflet.css'

// Conteneur de carte Leaflet réutilisable. Les couches sont passées en children.
export default function BaseMap({ children, zoom = 12 }) {
  return (
    <MapContainer
      center={BORDEAUX_CENTER}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
      />
      {children}
    </MapContainer>
  )
}
