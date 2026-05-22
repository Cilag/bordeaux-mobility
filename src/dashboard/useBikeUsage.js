import { useState, useEffect } from 'react'

// pc_velo_p : ~1M de mesures horaires sur une fenêtre glissante de 2 ans (J+1).
// On laisse Opendatasoft agréger côté serveur via ODSQL et on borne la plage
// via un where clause sur datedebut pour respecter la frise temporelle.
function buildUrl({ from, to } = {}) {
  const where = []
  if (from != null) where.push(`datedebut >= "${from}-01-01"`)
  if (to != null) where.push(`datedebut < "${to + 1}-01-01"`)
  const params = [
    'select=libelle,sum(comptage_1h)+as+total',
    'group_by=libelle',
    'order_by=total+desc',
    'limit=15',
  ]
  if (where.length) params.push('where=' + encodeURIComponent(where.join(' AND ')))
  return '/api/opendata/api/explore/v2.1/catalog/datasets/pc_velo_p/records?' + params.join('&')
}

// Renvoie { status, items, error } où items = [{ libelle, total }] (top 15).
// Re-fetche dès que from/to changent.
export function useBikeUsage({ from = null, to = null } = {}) {
  const [state, setState] = useState({ status: 'chargement', items: [], error: null })

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({ ...prev, status: 'chargement' }))
    fetch(buildUrl({ from, to }))
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
  }, [from, to])

  return state
}
