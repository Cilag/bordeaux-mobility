import { useState, useEffect } from 'react'
import { fetchTrafficLights } from '../services/api'

export function useTrafficLights() {
  const [lights, setLights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchTrafficLights()
      .then((data) => { setLights(data); setLoading(false) })
      .catch((e) => { setError(e.message); setLoading(false) })
  }, []) // chargement unique — données statiques

  return { lights, loading, error }
}
