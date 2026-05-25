import { useMemo } from 'react'
import { useDashboard } from './DashboardContext'
import { THEMES, FALLBACK_THEME, themeForEntry } from './themes'

const MODE_LABELS = {
  pieton: 'Piéton', velo: 'Vélo', bus_tram: 'Bus / Tram',
  voiture: 'Voiture', autopartage: 'Autopartage', freefloating: 'Freefloating',
}

// options.entries       : tous les jeux du domaine (registry filtré)
// options.entryCounts   : { [id]: nb features actuellement affichées }
// options.modes, options.zones : axes secondaires
export default function FilterRail({ options }) {
  const { state, dispatch } = useDashboard()
  const { entries = [], entryCounts = {}, modes = [], zones = [] } = options
  const { filters } = state
  const disabled = filters.disabledIds || []

  // Regroupement des entries par thème (via la catégorie de chaque entry).
  const grouped = useMemo(() => {
    const buckets = {}
    THEMES.forEach((t) => { buckets[t.id] = { ...t, entries: [] } })
    const fallback = { ...FALLBACK_THEME, entries: [] }
    entries.forEach((e) => {
      const t = themeForEntry(e)
      const id = t.id
      if (buckets[id]) buckets[id].entries.push(e)
      else fallback.entries.push(e)
    })
    const out = THEMES.map((t) => buckets[t.id]).filter((g) => g.entries.length > 0)
    if (fallback.entries.length) out.push(fallback)
    return out
  }, [entries])

  function toggleTheme(themeEntries) {
    const ids = themeEntries.map((e) => e.id)
    const allEnabled = ids.every((id) => !disabled.includes(id))
    const next = allEnabled
      ? [...new Set([...disabled, ...ids])]            // tout désactiver
      : disabled.filter((id) => !ids.includes(id))     // tout réactiver
    dispatch({ type: 'SET_DISABLED_DATASETS', value: next })
  }

  function isOn(id) {
    return !disabled.includes(id)
  }

  return (
    <aside className="filter-rail">
      <div className="filter-rail-head">
        <h2>Filtres</h2>
        <button type="button" onClick={() => dispatch({ type: 'RESET_FILTERS' })}>
          Réinitialiser
        </button>
      </div>

      <fieldset>
        <legend>Jeux de données ({entries.length})</legend>
        {grouped.length === 0 && <p className="state-msg">Aucun jeu de données</p>}
        {grouped.map((g) => {
          const allEnabled = g.entries.every((e) => !disabled.includes(e.id))
          return (
            <div key={g.id} className="filter-group">
              <div className="filter-group-head">
                <span className="filter-group-dot" style={{ background: g.color }} />
                <span className="filter-group-label">{g.label}</span>
                <span className="filter-group-count">{g.entries.length}</span>
                <button
                  type="button"
                  className="filter-group-toggle"
                  onClick={() => toggleTheme(g.entries)}
                  title={allEnabled ? `Tout désactiver — ${g.label}` : `Tout activer — ${g.label}`}
                >
                  {allEnabled ? 'Aucun' : 'Tout'}
                </button>
              </div>
              {g.entries.map((entry) => (
                <label key={entry.id} className="filter-cat" title={entry.libelle}>
                  <input
                    type="checkbox"
                    checked={isOn(entry.id)}
                    onChange={() => dispatch({ type: 'TOGGLE_DATASET', value: entry.id })}
                  />
                  <span className="filter-cat-name">{entry.libelle}</span>
                  {entryCounts[entry.id] != null && entryCounts[entry.id] > 0 && (
                    <span className="filter-cat-count">{entryCounts[entry.id].toLocaleString('fr-FR')}</span>
                  )}
                </label>
              ))}
            </div>
          )
        })}
      </fieldset>

      <fieldset>
        <legend>Mode de transport</legend>
        {modes.map((m) => (
          <label key={m} className="filter-mode">
            <input
              type="checkbox"
              checked={filters.modes.includes(m)}
              onChange={() => dispatch({ type: 'TOGGLE_MODE', value: m })}
            />
            {MODE_LABELS[m] || m}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Géographique</legend>
        <label htmlFor="zone-select">Commune / quartier</label>
        <select
          id="zone-select"
          value={filters.zone ?? ''}
          onChange={(e) => dispatch({ type: 'SET_ZONE', value: e.target.value || null })}
        >
          <option value="">Toute la métropole</option>
          {zones.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
      </fieldset>

      {/* Filtre temporel : voir la frise chronologique au-dessus du dashboard. */}
    </aside>
  )
}
