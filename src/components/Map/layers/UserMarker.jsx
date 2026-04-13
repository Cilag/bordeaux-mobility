// src/components/Map/layers/UserMarker.jsx
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

const userIcon = L.divIcon({
  className: '',
  html: `<div style="background:#4285F4;border:3px solid white;border-radius:50%;width:16px;height:16px;box-shadow:0 0 0 3px rgba(66,133,244,0.3)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

export default function UserMarker({ position }) {
  return (
    <Marker position={[position.lat, position.lng]} icon={userIcon}>
      <Popup>Ma position</Popup>
    </Marker>
  )
}
