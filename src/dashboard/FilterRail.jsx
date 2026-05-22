import { useMemo } from 'react'
import { useDashboard } from './DashboardContext'
import { THEMES, FALLBACK_THEME } from './themes'

const MODE_LABELS = {
  pieton: 'Piéton', velo: 'Vélo', bus_tram: 'Bus / Tram',
  voiture: 'Voiture', autopartage: 'Autopartage', freefloating: 'Freefloating',
}

// options.categories : liste des catégories disponibles (issues des entrées chargées)
// options.categoryCounts (optionnel) : { [categorie]: nombre de features }
// options.modes, options.zones, options.annees : autres axes de filtrage
export default function FilterRail({ options }) {
  const { state, dispatch } = useDashboard()
  const { categories, modes, zones, annees, categoryCounts = {} } = options
  const { filters } = state

  // Regroupe les catégories disponibles par thème pour l'affichage.
  const grouped = useMemo(() => {
    const set = new Set(categories)
    const groups = THEMES
      .map((t) => ({ ...t, items: t.categories.filter((c) => set.has(c)) }))
      .filter((t) => t.items.length > 0)
    const claimed = new Set(groups.flatMap((g) => g.items))
    const leftover = categories.filter((c) => !claimed.has(c))
    if (leftover.length) groups.push({ ...FALLBACK_THEME, items: leftover })
    return groups
  }, [categories])

  return (
    <aside className="filter-rail">
      <div className="filter-rail-head">
        <h2>Filtres</h2>
        <button type="button" onClick={() => dispatch({ type: 'RESET_FILTERS' })}>
          Réinitialiser
        </button>
      </div>

      <fieldset>
        <legend>Catégories de données</legend>
        {grouped.length === 0 && <p className="state-msg">Aucune donnée chargée</p>}
        {grouped.map((g) => (
          <div key={g.id} className="filter-group">
            <div className="filter-group-head">
              <span className="filter-group-dot" style={{ background: g.color }} />
              <span className="filter-group-label">{g.label}</span>
            </div>
            {g.items.map((c) => (
              <label key={c} className="filter-cat">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(c)}
                  onChange={() => dispatch({ type: 'TOGGLE_CATEGORY', value: c })}
                />
                <span className="filter-cat-name">{c}</span>
                {categoryCounts[c] != null && (
                  <span className="filter-cat-count">{categoryCounts[c].toLocaleString('fr-FR')}</span>
                )}
              </label>
            ))}
          </div>
        ))}
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

      <fieldset>
        <legend>Temporel</legend>
        <label htmlFor="annee-select">Année</label>
        <select
          id="annee-select"
          value={filters.annee ?? ''}
          onChange={(e) => dispatch({ type: 'SET_ANNEE', value: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">Toutes les années</option>
          {annees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </fieldset>
    </aside>
  )
}
