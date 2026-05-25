export function initialState(domaine) {
  return {
    domaine,
    // disabledIds : liste des id de jeux de données désactivés (par défaut vide = tout affiché)
    filters: { categories: [], disabledIds: [], modes: [], zone: null, annee: null, from: null, to: null },
  }
}

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export function dashboardReducer(state, action) {
  switch (action.type) {
    case 'SET_DOMAINE':
      return initialState(action.domaine)
    case 'TOGGLE_CATEGORY':
      return { ...state, filters: { ...state.filters, categories: toggle(state.filters.categories, action.value) } }
    case 'TOGGLE_MODE':
      return { ...state, filters: { ...state.filters, modes: toggle(state.filters.modes, action.value) } }
    case 'SET_ZONE':
      return { ...state, filters: { ...state.filters, zone: action.value } }
    case 'SET_ANNEE':
      return { ...state, filters: { ...state.filters, annee: action.value } }
    case 'SET_CATEGORIES':
      // Remplace la liste complète des catégories sélectionnées.
      return { ...state, filters: { ...state.filters, categories: action.value } }
    case 'TOGGLE_DATASET':
      return { ...state, filters: { ...state.filters, disabledIds: toggle(state.filters.disabledIds, action.value) } }
    case 'SET_DISABLED_DATASETS':
      return { ...state, filters: { ...state.filters, disabledIds: action.value } }
    case 'SET_DATE_RANGE':
      return { ...state, filters: { ...state.filters, from: action.from, to: action.to, annee: null } }
    case 'RESET_FILTERS':
      return initialState(state.domaine)
    default:
      return state
  }
}
