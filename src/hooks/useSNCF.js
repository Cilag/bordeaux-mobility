import { useState, useEffect, useRef } from 'react'
import { fetchSNCF } from '../services/api'

export function useSNCF() {
  const [departures, setDepartures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const intervalRef = useRef(null)

  async function load() {
    try {
      const data = await fetchSNCF()
      setDepartures(data)
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

  return { departures, loading, error, lastUpdate }
}
