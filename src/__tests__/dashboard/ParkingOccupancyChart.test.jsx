import { describe, it, expect, vi } from 'vitest'
import { cloneElement } from 'react'
import { render, screen } from '@testing-library/react'
import ParkingOccupancyChart from '../../dashboard/ParkingOccupancyChart'

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts')
  return { ...actual, ResponsiveContainer: ({ children }) => cloneElement(children, { width: 600, height: 300 }) }
})

describe('ParkingOccupancyChart', () => {
  it('renders parking names when data non-empty', () => {
    const data = [
      { nom: 'Parking Victoire', occupancy: 85, libres: 3, total: 20 },
      { nom: 'Parking Gambetta', occupancy: 45, libres: 11, total: 20 },
    ]
    render(<ParkingOccupancyChart data={data} />)
    expect(screen.getAllByText('Parking Victoire').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Parking Gambetta').length).toBeGreaterThan(0)
  })

  it('renders fallback when data empty', () => {
    render(<ParkingOccupancyChart data={[]} />)
    expect(screen.getByText(/Aucune donnée d'occupation disponible/)).toBeInTheDocument()
  })
})
