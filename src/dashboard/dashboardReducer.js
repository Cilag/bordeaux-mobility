export function initialState(domaine) {
  return {
    domaine,
    filters: { categories: [], modes: [], zone: null, annee: null },
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
    case 'RESET_FILTERS':
      return initialState(state.domaine)
    default:
      return state
  }
}
