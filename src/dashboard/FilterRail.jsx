import { useDashboard } from './DashboardContext'

export default function FilterRail({ options }) {
  const { state, dispatch } = useDashboard()
  const { categories, modes, zones, annees } = options
  const { filters } = state

  return (
    <aside className="filter-rail">
      <div className="filter-rail-head">
        <h2>Filtres</h2>
        <button type="button" onClick={() => dispatch({ type: 'RESET_FILTERS' })}>
          Réinitialiser
        </button>
      </div>

      <fieldset>
        <legend>Catégorie de données</legend>
        {categories.length === 0 && <p className="state-msg">Aucune donnée chargée</p>}
        {categories.map((c) => (
          <label key={c}>
            <input
              type="checkbox"
              checked={filters.categories.includes(c)}
              onChange={() => dispatch({ type: 'TOGGLE_CATEGORY', value: c })}
            />
            {c}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Mode de transport</legend>
        {modes.map((m) => (
          <label key={m}>
            <input
              type="checkbox"
              checked={filters.modes.includes(m)}
              onChange={() => dispatch({ type: 'TOGGLE_MODE', value: m })}
            />
            {m}
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
