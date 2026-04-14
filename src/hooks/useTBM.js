import { useState, useEffect, useRef } from 'react'
import { fetchTBMVehicles, fetchTBMStops } from '../services/api'

export function useTBM() {
  const [vehicles, setVehicles] = useState([])
  const [stops, setStops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const intervalRef = useRef(null)
  const stopsLoaded = useRef(false)

  async function loadVehicles() {
    try {
      const data = await fetchTBMVehicles()
      setVehicles(data)
      setLastUpdate(new Date())
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadStops() {
    if (stopsLoaded.current) return
    try {
      const data = await fetchTBMStops()
      setStops(data)
      stopsLoaded.current = true
    } catch (e) {
      console.error('[TBM] stops error:', e.message)
    }
  }

  useEffect(() => {
    loadStops()
    loadVehicles()
    intervalRef.current = setInterval(loadVehicles, 30_000)
    return () => clearInterval(intervalRef.current)
  }, [])

  return { vehicles, stops, loading, error, lastUpdate }
}
