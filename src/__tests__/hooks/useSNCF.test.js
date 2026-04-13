import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSNCF } from '../../hooks/useSNCF'
import * as api from '../../services/api'

describe('useSNCF', () => {
  beforeEach(() => {
    vi.spyOn(api, 'fetchSNCF')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches SNCF departures on mount', async () => {
    const mockDepartures = [
      {
        route: { name: 'TGV Paris' },
        stop_date_time: { departure_date_time: '20260413T143000' },
      },
    ]
    api.fetchSNCF.mockResolvedValue(mockDepartures)

    const { result } = renderHook(() => useSNCF())

    await waitFor(() => expect(result.current.departures).toEqual(mockDepartures))
    expect(result.current.loading).toBe(false)
  })
})
