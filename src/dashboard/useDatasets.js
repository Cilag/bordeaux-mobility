import { useState, useEffect } from 'react'
import { loadDataset } from '../datasets/loadDataset'

// Charge tous les jeux d'un domaine. Renvoie un objet
//   { [id]: { status, dataset, error, degraded } }.
// status ∈ 'chargement' | 'pret' | 'erreur'.
// degraded = true si la 1re tentative a échoué mais la retry a sauvé.
export function useDatasets(entries) {
  const [states, setStates] = useState(() =>
    Object.fromEntries(entries.map((e) => [e.id, { status: 'chargement', dataset: null, error: null, degraded: false }])))

  useEffect(() => {
    let cancelled = false
    setStates(Object.fromEntries(
      entries.map((e) => [e.id, { status: 'chargement', dataset: null, error: null, degraded: false }])))

    async function load(entry) {
      try {
        const dataset = await loadDataset(entry)
        if (cancelled) return
        setStates((prev) => ({
          ...prev,
          [entry.id]: { status: 'pret', dataset, error: null, degraded: dataset.degraded === true },
        }))
      } catch (err) {
        if (cancelled) return
        setStates((prev) => ({
          ...prev,
          [entry.id]: { status: 'erreur', dataset: null, error: err.message, degraded: false },
        }))
      }
    }

    for (const entry of entries) {
      load(entry)
    }

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.map((e) => e.id).join(',')])

  return states
}
