import { useMemo, useRef } from 'react'
import { useQueries } from '@tanstack/react-query'
import { loadDataset } from '../datasets/loadDataset'

// Charge tous les jeux d'un domaine via useQueries.
// Renvoie un objet { [id]: { status, dataset, error, degraded } } — contrat identique
// à l'ancienne version (DashboardPage / LayerLegend ne changent pas).
//   status   ∈ 'chargement' | 'pret' | 'erreur'
//   degraded = true si la query a vu au moins un échec avant de succéder.
//
// NB : TanStack Query remet à zéro `failureCount` et `errorUpdateCount` au succès
// final (cf. query.ts reducer 'success'), donc on ne peut pas se contenter de lire
// ces champs sur le résultat post-succès. On encapsule donc loadDataset dans un
// wrapper qui incrémente un compteur de retries dans une ref locale ; après succès,
// degraded = compteur > 0.
export function useDatasets(entries) {
  const retriesRef = useRef(new Map())

  const results = useQueries({
    queries: entries.map((entry) => ({
      queryKey: ['dataset', entry.id],
      queryFn: async () => {
        try {
          return await loadDataset(entry)
        } catch (err) {
          const prev = retriesRef.current.get(entry.id) ?? 0
          retriesRef.current.set(entry.id, prev + 1)
          throw err
        }
      },
    })),
  })

  return useMemo(() => Object.fromEntries(entries.map((entry, i) => {
    const r = results[i]
    if (r.isPending) {
      return [entry.id, { status: 'chargement', dataset: null, error: null, degraded: false }]
    }
    if (r.isError) {
      return [entry.id, { status: 'erreur', dataset: null, error: r.error?.message ?? 'unknown', degraded: false }]
    }
    const retries = retriesRef.current.get(entry.id) ?? 0
    return [entry.id, { status: 'pret', dataset: r.data, error: null, degraded: retries > 0 }]
  })), [entries, results])
}
