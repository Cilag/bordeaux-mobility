import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDatasets } from '../../dashboard/useDatasets'
import * as loader from '../../datasets/loadDataset'

describe('useDatasets', () => {
  beforeEach(() => vi.spyOn(loader, 'loadDataset'))
  afterEach(() => vi.restoreAllMocks())

  it('loads every entry and marks each ready', async () => {
    loader.loadDataset.mockResolvedValue({ features: [{ properties: {} }] })
    const entries = [
      { id: 'a', libelle: 'A', dateField: null },
      { id: 'b', libelle: 'B', dateField: null },
    ]
    const { result } = renderHook(() => useDatasets(entries))
    await waitFor(() => expect(result.current.a.status).toBe('pret'))
    expect(result.current.b.status).toBe('pret')
    expect(result.current.a.dataset.features).toHaveLength(1)
  })

  it('marks a failed entry as erreur without affecting the others', async () => {
    // `entry?.id` : tolère un appel fantôme sans argument déclenché par la
    // phase de nettoyage de Vitest (hors du flux de useDatasets).
    loader.loadDataset.mockImplementation((entry) =>
      entry?.id === 'a' ? Promise.reject(new Error('boom')) : Promise.resolve({ features: [] }))
    const entries = [
      { id: 'a', libelle: 'A', dateField: null },
      { id: 'b', libelle: 'B', dateField: null },
    ]
    const { result } = renderHook(() => useDatasets(entries))
    await waitFor(() => expect(result.current.a.status).toBe('erreur'))
    expect(result.current.b.status).toBe('pret')
  })

  it('propagates degraded:true from loadDataset to the state', async () => {
    loader.loadDataset.mockResolvedValue({ features: [], degraded: true })
    const entries = [{ id: 'a', libelle: 'A', dateField: null }]
    const { result } = renderHook(() => useDatasets(entries))
    await waitFor(() => expect(result.current.a.status).toBe('pret'))
    expect(result.current.a.degraded).toBe(true)
  })

  it('defaults degraded to false when loadDataset does not set it', async () => {
    loader.loadDataset.mockResolvedValue({ features: [] })
    const entries = [{ id: 'a', libelle: 'A', dateField: null }]
    const { result } = renderHook(() => useDatasets(entries))
    await waitFor(() => expect(result.current.a.status).toBe('pret'))
    expect(result.current.a.degraded).toBe(false)
  })
})
