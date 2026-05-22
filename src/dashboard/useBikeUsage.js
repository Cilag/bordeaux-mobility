import { useState, useEffect } from 'react'

// pc_velo_p contient ~1M de mesures horaires sur 2 ans. On laisse le serveur
// Opendatasoft agréger via ODSQL pour ne télécharger qu'un top N.
const URL = '/api/opendata/api/explore/v2.1/catalog/datasets/pc_velo_p/records'
  + '?select=libelle,sum(comptage_1h)+as+total'
  + '&group_by=libelle'
  + '&order_by=total+desc'
  + '&limit=15'

// Renvoie { status, items, error } où items = [{ libelle, total }] (top 15).
export function useBikeUsage() {
  const [state, setState] = useState({ status: 'chargement', items: [], error: null })

  useEffect(() => {
    let cancelled = false
    fetch(URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json) => {
        if (cancelled) return
        const items = (json.results || [])
          .map((r) => ({ libelle: r.libelle, total: Math.round(r.total || 0) }))
          .filter((r) => r.libelle && r.total > 0)
        setState({ status: 'pret', items, error: null })
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'erreur', items: [], error: err.message })
      })
    return () => { cancelled = true }
  }, [])

  return state
}
