import { describe, it, expect, vi } from 'vitest'
import { cloneElement } from 'react'
import { render, screen } from '@testing-library/react'
import VcubOccupancyChart from '../../dashboard/VcubOccupancyChart'

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts')
  return { ...actual, ResponsiveContainer: ({ children }) => cloneElement(children, { width: 600, height: 300 }) }
})

describe('VcubOccupancyChart', () => {
  it('renders commune names when data non-empty', () => {
    const data = [
      { commune: 'Bordeaux', disponibles: 120, occupes: 80, total: 200 },
      { commune: 'Mérignac', disponibles: 40, occupes: 30, total: 70 },
    ]
    render(<VcubOccupancyChart data={data} />)
    expect(screen.getAllByText('Bordeaux').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Mérignac').length).toBeGreaterThan(0)
  })

  it('renders fallback when data empty', () => {
    render(<VcubOccupancyChart data={[]} />)
    expect(screen.getByText(/Aucune station VCub disponible/)).toBeInTheDocument()
  })
})
