import { useState, useEffect } from 'react'
import { loadDataset } from '../datasets/loadDataset'

// Charge tous les jeux d'un domaine. Renvoie un objet { [id]: { status, dataset, error } }.
// status ∈ 'chargement' | 'pret' | 'erreur'.
export function useDatasets(entries) {
  const [states, setStates] = useState(() =>
    Object.fromEntries(entries.map((e) => [e.id, { status: 'chargement', dataset: null, error: null }])))

  useEffect(() => {
    let cancelled = false
    setStates(Object.fromEntries(
      entries.map((e) => [e.id, { status: 'chargement', dataset: null, error: null }])))

    async function load(entry) {
      try {
        const dataset = await loadDataset(entry)
        if (cancelled) return
        setStates((prev) => ({ ...prev, [entry.id]: { status: 'pret', dataset, error: null } }))
      } catch (err) {
        if (cancelled) return
        setStates((prev) => ({ ...prev, [entry.id]: { status: 'erreur', dataset: null, error: err.message } }))
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
