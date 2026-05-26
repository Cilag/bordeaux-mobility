import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { loadDataset } from '../../datasets/loadDataset'

const entry = {
  id: 'arrets-tbm',
  source: { type: 'datahub-geojson', datahubId: 'SV_ARRET_P' },
}

describe('loadDataset', () => {
  let fetchSpy
  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })
  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('fetches and returns the feature collection', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ type: 'FeatureCollection', features: [{ id: 1 }, { id: 2 }] }),
    })
    const result = await loadDataset(entry)
    expect(result.features).toHaveLength(2)
  })

  it('returns empty features when the response has none', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })
    const result = await loadDataset(entry)
    expect(result.features).toEqual([])
  })

  it('throws on a non-ok response', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve(null),
    })
    await expect(loadDataset(entry)).rejects.toThrow('HTTP 503')
  })

  it('builds the DataHub GeoJSON url from the datahubId', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ features: [] }),
    })
    await loadDataset(entry)
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/datahub/geojson/features/SV_ARRET_P')
  })

  it('builds the opendatasoft url from the datasetId', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ features: [] }),
    })
    await loadDataset({ id: 'x', source: { type: 'opendatasoft', datasetId: 'FOO' } })
    expect(fetchSpy.mock.calls[0][0]).toContain('/api/opendata/api/explore/v2.1/catalog/datasets/FOO/exports/geojson')
  })

  it('throws on an unsupported source type', async () => {
    await expect(loadDataset({ id: 'x', source: { type: 'bogus' } })).rejects.toThrow('non supporté')
  })
})
