import { useMemo, useState } from 'react'
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
  const [collapsed, setCollapsed] = useState(() => new Set())
  function toggleCollapse(themeId) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(themeId)) next.delete(themeId)
      else next.add(themeId)
      return next
    })
  }

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

  function isOn(id) {
    return !disabled.includes(id)
  }

  return (
    <aside className="filter-rail">
      <div className="filter-rail-head">
        <h2>Filtres</h2>
        <button type="button" className="filter-rail-reset" onClick={() => dispatch({ type: 'RESET_FILTERS' })}>
          Réinitialiser
        </button>
      </div>
      <div className="filter-rail-status">
        {entries.filter((e) => !disabled.includes(e.id)).length} jeux affichés sur {entries.length}
      </div>

      <fieldset>
        <legend>Jeux de données ({entries.length})</legend>
        {grouped.length === 0 && <p className="state-msg">Aucun jeu de données</p>}
        {grouped.map((g) => {
          const groupIds = g.entries.map((e) => e.id)
          const activeCount = g.entries.filter((e) => !disabled.includes(e.id)).length
          return (
            <div key={g.id} className="filter-group">
              <button
                type="button"
                className="filter-group-head"
                onClick={() => toggleCollapse(g.id)}
                aria-expanded={!collapsed.has(g.id)}
              >
                <span className="filter-group-chevron">{collapsed.has(g.id) ? '▸' : '▾'}</span>
                <span className="filter-group-dot" style={{ background: g.color }} />
                <span className="filter-group-label">{g.label}</span>
                <span className="filter-group-count">{activeCount} / {g.entries.length}</span>
              </button>
              {!collapsed.has(g.id) && (
                <>
                  <div className="filter-group-actions">
                    <button
                      type="button"
                      className="filter-group-action"
                      onClick={() =>
                        dispatch({
                          type: 'SET_DISABLED_DATASETS',
                          value: disabled.filter((id) => !groupIds.includes(id)),
                        })
                      }
                    >
                      Tout
                    </button>
                    <button
                      type="button"
                      className="filter-group-action"
                      onClick={() =>
                        dispatch({
                          type: 'SET_DISABLED_DATASETS',
                          value: [...new Set([...disabled, ...groupIds])],
                        })
                      }
                    >
                      Aucun
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
                </>
              )}
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
