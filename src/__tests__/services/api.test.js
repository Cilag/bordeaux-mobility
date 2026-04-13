import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  BORDEAUX_CENTER,
  fetchVCub,
  fetchTBMStops,
  fetchTBMVehicles,
  fetchTrafficLights,
  fetchSNCF,
  fetchOpenSky,
  getTomTomTrafficTileUrl,
} from '../../services/api'

describe('api constants', () => {
  it('BORDEAUX_CENTER has correct coordinates', () => {
    expect(BORDEAUX_CENTER).toEqual([44.8378, -0.5792])
  })
})

describe('fetchVCub', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls DataHub VCub endpoint with API key', async () => {
    const mockData = { results: [{ name: 'Station A', nbvelos: 5, nbplaces: 10 }] }
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockData) })

    const result = await fetchVCub()

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('ci_vcub_p'),
      expect.any(Object)
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

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls DataHub TBM stops endpoint', async () => {
    const mockData = { results: [{ idarret: '1', nomarret: 'Victoire' }] }
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockData) })

    const result = await fetchTBMStops()

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('sv_arret_p'),
      expect.any(Object)
    )
    expect(result).toEqual(mockData.results)
  })
})

describe('fetchTBMVehicles', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls DataHub TBM vehicles endpoint', async () => {
    const mockData = { results: [{ id: '1', lat: 44.8, lon: -0.5 }] }
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockData) })

    const result = await fetchTBMVehicles()

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('sv_vehic_p'),
      expect.any(Object)
    )
    expect(result).toEqual(mockData.results)
  })
})

describe('fetchTrafficLights', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls DataHub traffic lights endpoint', async () => {
    const mockData = { results: [{ id: '1', etat: 'vert' }] }
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockData) })

    const result = await fetchTrafficLights()

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('pc_carf_p'),
      expect.any(Object)
    )
    expect(result).toEqual(mockData.results)
  })
})

describe('fetchSNCF', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls SNCF API with Authorization header', async () => {
    const mockData = { departures: [{ id: '1', departure_time: '14:30' }] }
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockData) })

    const result = await fetchSNCF()

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.sncf.com'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
        }),
      })
    )
    expect(result).toEqual(mockData.departures)
  })

  it('returns empty array when departures is missing', async () => {
    const mockData = {}
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockData) })

    const result = await fetchSNCF()

    expect(result).toEqual([])
  })
})

describe('fetchOpenSky', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls opensky-network.org API with bbox params', async () => {
    const mockData = { states: [[1, 'ABC123', 'France', 1000, 2000, 44.8, -0.5, 3000, true, 15.5, 180, 1.2, null, 1234567890, null, 'M']] }
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockData) })

    const result = await fetchOpenSky()

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('opensky-network.org'),
      expect.any(Object)
    )
    expect(result).toEqual(mockData.states)
  })

  it('returns empty array when states is missing', async () => {
    const mockData = {}
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockData) })

    const result = await fetchOpenSky()

    expect(result).toEqual([])
  })
})

describe('getTomTomTrafficTileUrl', () => {
  it('returns tile URL with placeholder coordinates', () => {
    const url = getTomTomTrafficTileUrl()

    expect(url).toContain('api.tomtom.com/traffic/map/4/tile/flow/relative/{z}/{x}/{y}.png')
    expect(url).toContain('key=')
  })
})
