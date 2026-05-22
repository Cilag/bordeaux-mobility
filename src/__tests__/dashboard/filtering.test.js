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

describe('filterFeatures — intervalles temporels', () => {
  const features = [
    { properties: { date_debut: '2018-06-01', date_fin: '2018-08-31' } }, // été 2018
    { properties: { date_debut: '2020-01-01', date_fin: '2024-12-31' } }, // long chantier
    { properties: { date_debut: '2025-11-24', date_fin: '2026-05-30' } }, // récent
    { properties: { date_debut: '2022-03-01', date_fin: '2022-09-30' } }, // 2022
  ]
  const obs = { start: 'date_debut', end: 'date_fin' }

  it('garde les intervalles qui chevauchent [2018,2020]', () => {
    expect(filterFeatures(features, { from: 2018, to: 2020 }, null, obs)).toHaveLength(2)
  })

  it('garde les intervalles actifs sur [2023,2026]', () => {
    expect(filterFeatures(features, { from: 2023, to: 2026 }, null, obs)).toHaveLength(2)
  })

  it('exclut les intervalles entièrement hors plage', () => {
    // Seul 2022 chevauche [2022,2022]
    expect(filterFeatures(features, { from: 2022, to: 2022 }, null, obs)).toHaveLength(2)
    // 2018 isolé : seul l'intervalle été 2018 chevauche
    expect(filterFeatures(features, { from: 2018, to: 2018 }, null, obs)).toHaveLength(1)
  })

  it('gère les dates multi-valeurs séparées par # (convention Opendatasoft)', () => {
    const multi = [
      // Chantier en deux périodes, toutes les deux en 2025-2026
      { properties: { date_debut: '2025-11-05#2026-01-16', date_fin: '2026-06-30#2026-07-31' } },
      // Une période 2022 et une période 2023
      { properties: { date_debut: '2022-03-01#2023-04-01', date_fin: '2022-09-30#2023-09-30' } },
    ]
    // 2021-2022 : exclut le chantier 2025-26, garde celui qui a une période en 2022
    expect(filterFeatures(multi, { from: 2021, to: 2022 }, null, obs)).toHaveLength(1)
    // 2025-2026 : garde le 2025-26, exclut le second
    expect(filterFeatures(multi, { from: 2025, to: 2026 }, null, obs)).toHaveLength(1)
  })
})
