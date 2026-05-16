import { describe, it, expect } from 'vitest'
import { datasetDate, formatFreshness, oldestDate } from '../../dashboard/freshness'

describe('datasetDate', () => {
  const entry = { dateField: 'mdate' }

  it('reads the date field from the first feature', () => {
    const ds = { features: [{ properties: { mdate: '2024-03-01' } }] }
    expect(datasetDate(entry, ds)).toEqual(new Date('2024-03-01'))
  })

  it('returns null when the entry has no dateField', () => {
    expect(datasetDate({ dateField: null }, { features: [] })).toBeNull()
  })

  it('returns null when the dataset has no features', () => {
    expect(datasetDate(entry, { features: [] })).toBeNull()
  })
})

describe('formatFreshness', () => {
  it('formats a valid date in French', () => {
    expect(formatFreshness(new Date('2024-03-01'))).toBe('01/03/2024')
  })

  it('returns "date inconnue" for null', () => {
    expect(formatFreshness(null)).toBe('date inconnue')
  })

  it('returns "date inconnue" for an invalid date', () => {
    expect(formatFreshness(new Date('not-a-date'))).toBe('date inconnue')
  })
})

describe('oldestDate', () => {
  it('returns the earliest valid date', () => {
    const r = oldestDate([new Date('2024-01-01'), new Date('2020-06-01'), null])
    expect(r).toEqual(new Date('2020-06-01'))
  })

  it('returns null when there is no valid date', () => {
    expect(oldestDate([null, undefined])).toBeNull()
  })
})
