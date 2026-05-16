import { describe, it, expect } from 'vitest'
import { selectDatasets, filterFeatures } from '../../dashboard/filtering'

const entries = [
  { id: 'a', categorie: 'arrets', mode: ['bus_tram'], millesime: null },
  { id: 'b', categorie: 'capteurs', mode: ['velo'], millesime: null },
  { id: 'c', categorie: 'capteurs', mode: ['voiture'], millesime: 2019 },
  { id: 'd', categorie: 'capteurs', mode: ['voiture'], millesime: 2024 },
]
const empty = { categories: [], modes: [], annee: null, zone: null }

describe('selectDatasets', () => {
  it('returns all entries when no filter is set', () => {
    expect(selectDatasets(entries, empty).map((e) => e.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('filters by categorie', () => {
    expect(selectDatasets(entries, { ...empty, categories: ['arrets'] }).map((e) => e.id))
      .toEqual(['a'])
  })

  it('filters by mode (entry kept if any of its modes matches)', () => {
    expect(selectDatasets(entries, { ...empty, modes: ['velo'] }).map((e) => e.id))
      .toEqual(['b'])
  })

  it('drops millesime-tagged entries that do not match the year', () => {
    const r = selectDatasets(entries, { ...empty, annee: 2019 }).map((e) => e.id)
    expect(r).toEqual(['a', 'b', 'c'])
  })

  it('keeps non-millesime entries regardless of the year filter', () => {
    expect(selectDatasets(entries, { ...empty, annee: 2024 }).map((e) => e.id))
      .toEqual(['a', 'b', 'd'])
  })

  it('combines categorie and mode filters', () => {
    expect(selectDatasets(entries, { ...empty, categories: ['capteurs'], modes: ['voiture'] })
      .map((e) => e.id)).toEqual(['c', 'd'])
  })
})

describe('filterFeatures', () => {
  const features = [
    { properties: { commune: 'Bordeaux' } },
    { properties: { commune: 'Pessac' } },
    { properties: {} },
  ]

  it('returns all features when no zone is set', () => {
    expect(filterFeatures(features, { ...empty })).toHaveLength(3)
  })

  it('keeps only features in the selected zone', () => {
    expect(filterFeatures(features, { ...empty, zone: 'Bordeaux' })).toHaveLength(1)
  })

  it('excludes features without the commune property when a zone is set', () => {
    const r = filterFeatures(features, { ...empty, zone: 'Pessac' })
    expect(r).toEqual([{ properties: { commune: 'Pessac' } }])
  })
})
