import { useState, useMemo } from 'react'
import { useDashboard } from './DashboardContext'

// Frise chronologique : une bande d'années cliquables.
// Premier clic = borne basse ; second clic = borne haute (auto-swap si inversé).
// Un troisième clic sur la même borne basse remet à zéro.
export default function Timeline({ minYear, maxYear }) {
  const { state, dispatch } = useDashboard()
  const { from, to } = state.filters
  const [pending, setPending] = useState(null) // état intermédiaire après le 1er clic

  const years = useMemo(() => {
    const out = []
    for (let y = minYear; y <= maxYear; y++) out.push(y)
    return out
  }, [minYear, maxYear])

  function selectYear(y) {
    if (pending === null) {
      // Premier clic : on initialise la sélection à un seul point.
      dispatch({ type: 'SET_DATE_RANGE', from: y, to: y })
      setPending(y)
    } else {
      // Second clic : on finalise la plage (auto-swap).
      const lo = Math.min(pending, y)
      const hi = Math.max(pending, y)
      dispatch({ type: 'SET_DATE_RANGE', from: lo, to: hi })
      setPending(null)
    }
  }

  function reset() {
    dispatch({ type: 'SET_DATE_RANGE', from: null, to: null })
    setPending(null)
  }

  const hasRange = from != null && to != null
  const label = hasRange
    ? (from === to ? `Année ${from}` : `${from} → ${to}`)
    : 'Toute la période'

  function classFor(y) {
    let c = 'timeline-year'
    if (hasRange && y >= from && y <= to) c += ' active'
    if (pending === y) c += ' pending'
    if (hasRange && y === from) c += ' edge edge-from'
    if (hasRange && y === to) c += ' edge edge-to'
    return c
  }

  return (
    <div className="timeline">
      <div className="timeline-head">
        <span className="timeline-icon">📅</span>
        <span className="timeline-title">Période</span>
        <span className="timeline-range">{label}</span>
        {(hasRange || pending !== null) && (
          <button type="button" className="timeline-reset" onClick={reset}>
            Réinitialiser
          </button>
        )}
      </div>
      <div className="timeline-track">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            className={classFor(y)}
            onClick={() => selectYear(y)}
            title={`Cliquer pour ${pending === null ? 'commencer une plage' : 'terminer la plage'} à ${y}`}
          >
            {y}
          </button>
        ))}
      </div>
      <p className="timeline-hint">
        {pending !== null
          ? `Sélectionnez la fin de la plage (commence à ${pending}).`
          : 'Cliquez sur une année pour commencer, puis sur une autre pour fixer la plage.'}
      </p>
    </div>
  )
}
