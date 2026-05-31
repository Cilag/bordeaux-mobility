import { describe, it, expect, vi } from 'vitest'
import { cloneElement } from 'react'
import { render, screen } from '@testing-library/react'
import BikeTrafficChart from '../../dashboard/BikeTrafficChart'

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts')
  return { ...actual, ResponsiveContainer: ({ children }) => cloneElement(children, { width: 600, height: 300 }) }
})

describe('BikeTrafficChart', () => {
  it('renders zone names when data non-empty', () => {
    const data = [
      { zone: 'Bordeaux Centre', count: 1500 },
      { zone: 'Mérignac', count: 800 },
    ]
    render(<BikeTrafficChart data={data} />)
    expect(screen.getAllByText('Bordeaux Centre').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Mérignac').length).toBeGreaterThan(0)
  })

  it('renders fallback when data empty', () => {
    render(<BikeTrafficChart data={[]} />)
    expect(screen.getByText(/Aucune mesure de trafic vélo disponible/)).toBeInTheDocument()
  })
})
