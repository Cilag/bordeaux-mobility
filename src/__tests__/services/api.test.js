import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BORDEAUX_CENTER, fetchVCub, fetchTBMStops } from '../../services/api'

describe('api constants', () => {
  it('BORDEAUX_CENTER has correct coordinates', () => {
    expect(BORDEAUX_CENTER).toEqual([44.8378, -0.5792])
  })
})

describe('fetchVCub', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('calls DataHub VCub endpoint with API key', async () => {
    const mockData = { results: [{ name: 'Station A', nbvelos: 5, nbplaces: 10 }] }
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockData) })

    const result = await fetchVCub()

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('sv_vcub_p')
    )
    expect(result).toEqual(mockData.results)
  })

  it('throws on HTTP error', async () => {
    fetch.mockResolvedValue({ ok: false, status: 401 })
    await expect(fetchVCub()).rejects.toThrow('HTTP 401')
  })
})

describe('fetchTBMStops', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('calls DataHub TBM stops endpoint', async () => {
    const mockData = { results: [{ idarret: '1', nomarret: 'Victoire' }] }
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockData) })

    const result = await fetchTBMStops()

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('sv_arret_p'))
    expect(result).toEqual(mockData.results)
  })
})
