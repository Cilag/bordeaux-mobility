import { describe, it, expect } from 'vitest'
import { REGISTRY, entriesForDomaine } from '../../datasets/registry'
import { validateEntry } from '../../datasets/schema'

describe('registry', () => {
  it('every entry is valid against the schema', () => {
    for (const entry of REGISTRY) {
      expect(validateEntry(entry), `entrée ${entry.id}`).toEqual([])
    }
  })

  it('has no duplicate ids', () => {
    const ids = REGISTRY.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('returns only entries for the requested domaine', () => {
    const mob = entriesForDomaine('mobilite')
    expect(mob.length).toBeGreaterThan(0)
    expect(mob.every((e) => e.domaine === 'mobilite')).toBe(true)
    expect(entriesForDomaine('stationnement').every((e) => e.domaine === 'stationnement')).toBe(true)
  })
})
