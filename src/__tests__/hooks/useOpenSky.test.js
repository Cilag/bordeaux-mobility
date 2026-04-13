import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useOpenSky } from '../../hooks/useOpenSky'
import * as api from '../../services/api'

describe('useOpenSky', () => {
  beforeEach(() => {
    vi.spyOn(api, 'fetchOpenSky')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses OpenSky state vectors into flight objects', async () => {
    const mockStates = [
      ['abc123', 'AFR123  ', 'France', 1713000000, 1713000000, -0.5, 44.8, 9000, false, 250, 45, 0],
    ]
    api.fetchOpenSky.mockResolvedValue(mockStates)

    const { result } = renderHook(() => useOpenSky())

    await waitFor(() => expect(result.current.flights).toHaveLength(1))
    expect(result.current.flights[0]).toMatchObject({
      icao24: 'abc123',
      callsign: 'AFR123',
      lng: -0.5,
      lat: 44.8,
      altitude: 9000,
      velocity: 250,
      heading: 45,
    })
  })

  it('includes on-ground aircraft to show airport activity', async () => {
    // On-ground planes are included intentionally (airport de Bordeaux-Mérignac)
    const mockStates = [
      ['xyz', 'EZY001  ', 'UK', 1713000000, 1713000000, -0.715, 44.828, 0, true, 0, 0, 0],
    ]
    api.fetchOpenSky.mockResolvedValue(mockStates)

    const { result } = renderHook(() => useOpenSky())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.flights).toHaveLength(1)
  })
})
