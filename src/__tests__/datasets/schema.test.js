import { describe, it, expect } from 'vitest'
import { DOMAINES, MODES, GEOMETRIES, validateEntry } from '../../datasets/schema'

const valid = {
  id: 'arrets-tbm',
  domaine: 'mobilite',
  libelle: 'Arrêts de transport en commun',
  source: { type: 'datahub-geojson', datahubId: 'SV_ARRET_P' },
  geometrie: 'point',
  mode: ['bus_tram'],
  categorie: 'arrets',
  dateField: 'mdate',
  millesime: null,
  viz: ['carte', 'kpi-comptage'],
}

describe('schema', () => {
  it('exposes the enum constants', () => {
    expect(DOMAINES).toEqual(['mobilite', 'stationnement'])
    expect(MODES).toContain('velo')
    expect(GEOMETRIES).toEqual(['point', 'ligne', 'polygone'])
  })

  it('accepts a valid entry', () => {
    expect(validateEntry(valid)).toEqual([])
  })

  it('reports a missing id', () => {
    expect(validateEntry({ ...valid, id: '' })).toContain('id manquant')
  })

  it('reports an invalid domaine', () => {
    expect(validateEntry({ ...valid, domaine: 'autre' }))
      .toContain('domaine invalide: autre')
  })

  it('reports an invalid geometrie', () => {
    expect(validateEntry({ ...valid, geometrie: 'cube' }))
      .toContain('geometrie invalide: cube')
  })

  it('reports an unknown mode', () => {
    expect(validateEntry({ ...valid, mode: ['fusee'] }))
      .toContain('mode invalide: fusee')
  })

  it('reports a non-array mode', () => {
    expect(validateEntry({ ...valid, mode: 'velo' }))
      .toContain('mode doit être un tableau')
  })

  it('reports a missing categorie', () => {
    expect(validateEntry({ ...valid, categorie: '' }))
      .toContain('categorie manquante')
  })
})
