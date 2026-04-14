// src/components/Map/layers/StopPopup.jsx
import { Popup } from 'react-leaflet'

export default function StopPopup({ stopId, stopName, color }) {
  return (
    <Popup minWidth={180}>
      <strong style={{ color, display: 'block', marginBottom: 4 }}>{stopName}</strong>
      <div style={{ color: '#888', fontSize: 11 }}>Arrêt #{stopId}</div>
    </Popup>
  )
}
