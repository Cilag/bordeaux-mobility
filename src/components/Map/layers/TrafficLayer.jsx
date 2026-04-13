// src/components/Map/layers/TrafficLayer.jsx
import { TileLayer } from 'react-leaflet'
import { getTomTomTrafficTileUrl } from '../../../services/api'

export default function TrafficLayer() {
  return (
    <TileLayer
      url={getTomTomTrafficTileUrl()}
      opacity={0.7}
      attribution='Traffic &copy; <a href="https://tomtom.com">TomTom</a>'
    />
  )
}
