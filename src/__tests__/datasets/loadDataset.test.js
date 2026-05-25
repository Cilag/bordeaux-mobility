import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadDataset, clearDatasetCache } from '../../datasets/loadDataset'

const entry = {
  id: 'arrets-tbm',
  source: { type: 'datahub-geojson', datahubId: 'SV_ARRET_P' },
}

function fakeFetch(body, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  })
}

function seqFetch(...responses) {
  const mock = vi.fn()
  responses.forEach((r) => {
    if (r instanceof Error) mock.mockRejectedValueOnce(r)
    else mock.mockResolvedValueOnce(r)
  })
  return mock
}

describe('loadDataset', () => {
  beforeEach(() => clearDatasetCache())

  it('fetches and returns the feature collection', async () => {
    const fc = { type: 'FeatureCollection', features: [{ id: 1 }, { id: 2 }] }
    const fetchImpl = fakeFetch(fc)
    const result = await loadDataset(entry, { fetchImpl })
    expect(result.features).toHaveLength(2)
  })

  it('caches the result — second call does not refetch', async () => {
    const fetchImpl = fakeFetch({ features: [{ id: 1 }] })
    await loadDataset(entry, { fetchImpl })
    await loadDataset(entry, { fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('returns empty features when the response has none', async () => {
    const result = await loadDataset(entry, { fetchImpl: fakeFetch({}) })
    expect(result.features).toEqual([])
  })

  it('throws on a non-ok response', async () => {
    const fetchImpl = fakeFetch(null, false, 503)
    await expect(loadDataset(entry, { fetchImpl })).rejects.toThrow('HTTP 503')
  })

  it('builds the DataHub GeoJSON url from the datahubId', async () => {
    const fetchImpl = fakeFetch({ features: [] })
    await loadDataset(entry, { fetchImpl })
    expect(fetchImpl.mock.calls[0][0]).toBe('/api/datahub/geojson/features/SV_ARRET_P')
  })

  it('marks degraded:false when the first attempt succeeds', async () => {
    const result = await loadDataset(entry, { fetchImpl: fakeFetch({ features: [] }) })
    expect(result.degraded).toBe(false)
  })

  it('marks degraded:true when the retry rescues the call', async () => {
    const fetchImpl = seqFetch(
      { ok: false, status: 503, json: () => Promise.resolve(null) },
      { ok: true, status: 200, json: () => Promise.resolve({ features: [{ id: 1 }] }) },
    )
    const result = await loadDataset(entry, { fetchImpl })
    expect(result.degraded).toBe(true)
    expect(result.features).toHaveLength(1)
  })
})
