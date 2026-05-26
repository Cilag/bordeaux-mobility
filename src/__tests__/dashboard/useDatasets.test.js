import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import { useDatasets } from '../../dashboard/useDatasets'
import { createTestQueryClient, wrapWithQueryClient } from '../testQueryClient'
import * as loader from '../../datasets/loadDataset'

describe('useDatasets', () => {
  let client
  beforeEach(() => {
    client = createTestQueryClient()
    vi.spyOn(loader, 'loadDataset')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads every entry and marks each ready', async () => {
    loader.loadDataset.mockResolvedValue({ features: [{ properties: {} }] })
    const entries = [
      { id: 'a', libelle: 'A', dateField: null, source: { type: 'datahub-geojson', datahubId: 'A' } },
      { id: 'b', libelle: 'B', dateField: null, source: { type: 'datahub-geojson', datahubId: 'B' } },
    ]
    const { result } = renderHook(() => useDatasets(entries), {
      wrapper: wrapWithQueryClient(client),
    })
    await waitFor(() => expect(result.current.a.status).toBe('pret'))
    expect(result.current.b.status).toBe('pret')
    expect(result.current.a.dataset.features).toHaveLength(1)
    expect(result.current.a.degraded).toBe(false)
  })

  it('marks a failed entry as erreur without affecting the others', async () => {
    loader.loadDataset.mockImplementation((entry) =>
      entry?.id === 'a' ? Promise.reject(new Error('boom')) : Promise.resolve({ features: [] }))
    const entries = [
      { id: 'a', libelle: 'A', dateField: null, source: { type: 'datahub-geojson', datahubId: 'A' } },
      { id: 'b', libelle: 'B', dateField: null, source: { type: 'datahub-geojson', datahubId: 'B' } },
    ]
    const { result } = renderHook(() => useDatasets(entries), {
      wrapper: wrapWithQueryClient(client),
    })
    await waitFor(() => expect(result.current.a.status).toBe('erreur'))
    expect(result.current.b.status).toBe('pret')
    expect(result.current.a.error).toBe('boom')
  })

  it('defaults degraded to false on a clean first-attempt success', async () => {
    loader.loadDataset.mockResolvedValue({ features: [] })
    const entries = [{ id: 'a', libelle: 'A', dateField: null, source: { type: 'datahub-geojson', datahubId: 'A' } }]
    const { result } = renderHook(() => useDatasets(entries), {
      wrapper: wrapWithQueryClient(client),
    })
    await waitFor(() => expect(result.current.a.status).toBe('pret'))
    expect(result.current.a.degraded).toBe(false)
  })

  it('propagates degraded:true when the queryFn rejected before succeeding', async () => {
    let attempt = 0
    loader.loadDataset.mockImplementation(() => {
      attempt += 1
      if (attempt === 1) return Promise.reject(new Error('HTTP 503'))
      return Promise.resolve({ features: [] })
    })
    const clientWithRetry = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,
          retryDelay: 0,
          gcTime: Infinity,
          staleTime: Infinity,
          refetchOnWindowFocus: false,
        },
      },
    })
    const entries = [{ id: 'a', libelle: 'A', dateField: null, source: { type: 'datahub-geojson', datahubId: 'A' } }]
    const { result } = renderHook(() => useDatasets(entries), {
      wrapper: wrapWithQueryClient(clientWithRetry),
    })
    await waitFor(() => expect(result.current.a.status).toBe('pret'))
    expect(result.current.a.degraded).toBe(true)
  })
})
