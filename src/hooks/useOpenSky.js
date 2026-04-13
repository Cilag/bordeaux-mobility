import { useState, useEffect, useRef } from 'react'
import { fetchOpenSky } from '../services/api'

function parseState(s) {
  return {
    icao24: s[0],
    callsign: (s[1] ?? '').trim(),
    originCountry: s[2],
    lng: s[5],
    lat: s[6],
    altitude: s[7],
    onGround: s[8],
    velocity: s[9],
    heading: s[10],
    verticalRate: s[11],
  }
}

export function useOpenSky() {
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const intervalRef = useRef(null)

  async function load() {
    try {
      const states = await fetchOpenSky()
      const airborne = states
        .map(parseState)
        .filter((f) => !f.onGround && f.lat != null && f.lng != null)
      setFlights(airborne)
      setLastUpdate(new Date())
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, 30_000)
    return () => clearInterval(intervalRef.current)
  }, [])

  return { flights, loading, error, lastUpdate }
}
