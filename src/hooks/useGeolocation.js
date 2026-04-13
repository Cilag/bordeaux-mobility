import { useState, useEffect } from 'react'

export function useGeolocation() {
  const [position, setPosition] = useState(null) // { lat, lng }

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setPosition(null)
    )
  }, [])

  return position
}

// Calcule la distance en km entre deux points (Haversine)
export function distanceTo(pos, lat, lng) {
  if (!pos) return Infinity
  const R = 6371
  const dLat = ((lat - pos.lat) * Math.PI) / 180
  const dLon = ((lng - pos.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((pos.lat * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
