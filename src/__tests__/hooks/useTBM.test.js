import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTBM } from '../../hooks/useTBM'
import * as api from '../../services/api'

describe('useTBM', () => {
  beforeEach(() => {
    vi.spyOn(api, 'fetchTBMVehicles')
    vi.spyOn(api, 'fetchTBMStops')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches vehicles and stops on mount', async () => {
    const mockVehicles = [{ id: '1', ligne: 'A', lat: 44.84, lon: -0.57 }]
    const mockStops = [{ idarret: '10', nomarret: 'Victoire', lat: 44.83, lon: -0.58 }]
    api.fetchTBMVehicles.mockResolvedValue(mockVehicles)
    api.fetchTBMStops.mockResolvedValue(mockStops)

    const { result } = renderHook(() => useTBM())

    await waitFor(() => expect(result.current.vehicles).toEqual(mockVehicles))
    expect(result.current.stops).toEqual(mockStops)
    expect(result.current.loading).toBe(false)
  })

  it('sets error if vehicles fetch fails', async () => {
    api.fetchTBMVehicles.mockRejectedValue(new Error('Timeout'))
    api.fetchTBMStops.mockResolvedValue([])

    const { result } = renderHook(() => useTBM())

    await waitFor(() => expect(result.current.error).toBe('Timeout'))
  })
})
