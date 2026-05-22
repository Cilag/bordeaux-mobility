import { describe, it, expect } from 'vitest'
import { initialState, dashboardReducer } from '../../dashboard/dashboardReducer'

describe('dashboardReducer', () => {
  it('has an initial state with empty filters', () => {
    expect(initialState('mobilite')).toEqual({
      domaine: 'mobilite',
      filters: { categories: [], modes: [], zone: null, annee: null, from: null, to: null },
    })
  })

  it('SET_DATE_RANGE sets from/to and clears annee', () => {
    const dirty = { domaine: 'mobilite', filters: { categories: [], modes: [], zone: null, annee: 2019, from: null, to: null } }
    const s = dashboardReducer(dirty, { type: 'SET_DATE_RANGE', from: 2015, to: 2020 })
    expect(s.filters.from).toBe(2015)
    expect(s.filters.to).toBe(2020)
    expect(s.filters.annee).toBeNull()
  })

  it('SET_DOMAINE changes the domaine and resets filters', () => {
    const dirty = {
      domaine: 'mobilite',
      filters: { categories: ['arrets'], modes: ['velo'], zone: 'Pessac', annee: 2019 },
    }
    expect(dashboardReducer(dirty, { type: 'SET_DOMAINE', domaine: 'stationnement' }))
      .toEqual(initialState('stationnement'))
  })

  it('TOGGLE_CATEGORY adds then removes a category', () => {
    const s1 = dashboardReducer(initialState('mobilite'), { type: 'TOGGLE_CATEGORY', value: 'arrets' })
    expect(s1.filters.categories).toEqual(['arrets'])
    const s2 = dashboardReducer(s1, { type: 'TOGGLE_CATEGORY', value: 'arrets' })
    expect(s2.filters.categories).toEqual([])
  })

  it('TOGGLE_MODE adds then removes a mode', () => {
    const s1 = dashboardReducer(initialState('mobilite'), { type: 'TOGGLE_MODE', value: 'velo' })
    expect(s1.filters.modes).toEqual(['velo'])
    const s2 = dashboardReducer(s1, { type: 'TOGGLE_MODE', value: 'velo' })
    expect(s2.filters.modes).toEqual([])
  })

  it('SET_ZONE sets the zone', () => {
    const s = dashboardReducer(initialState('mobilite'), { type: 'SET_ZONE', value: 'Bordeaux' })
    expect(s.filters.zone).toBe('Bordeaux')
  })

  it('SET_ANNEE sets the year', () => {
    const s = dashboardReducer(initialState('mobilite'), { type: 'SET_ANNEE', value: 2019 })
    expect(s.filters.annee).toBe(2019)
  })

  it('RESET_FILTERS clears all filters but keeps the domaine', () => {
    const dirty = {
      domaine: 'stationnement',
      filters: { categories: ['x'], modes: ['velo'], zone: 'z', annee: 2020 },
    }
    expect(dashboardReducer(dirty, { type: 'RESET_FILTERS' })).toEqual(initialState('stationnement'))
  })
})
