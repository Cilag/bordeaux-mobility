import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useVCub } from '../../hooks/useVCub'
import * as api from '../../services/api'

describe('useVCub', () => {
  beforeEach(() => {
    vi.spyOn(api, 'fetchVCub')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches VCub data on mount', async () => {
    const mockStations = [{ name: 'Station A', nbvelos: 5, nbplaces: 10 }]
    api.fetchVCub.mockResolvedValue(mockStations)

    const { result } = renderHook(() => useVCub())

    await waitFor(() => expect(result.current.stations).toEqual(mockStations))
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets error on fetch failure', async () => {
    api.fetchVCub.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useVCub())

    await waitFor(() => expect(result.current.error).toBe('Network error'))
    expect(result.current.stations).toEqual([])
  })
})
