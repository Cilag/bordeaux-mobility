import { MapContainer, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Centre par défaut de la carte (place de la Bourse, Bordeaux).
const BORDEAUX_CENTER = [44.8378, -0.5792]

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
