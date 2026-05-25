import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import KpiRow from '../../dashboard/KpiRow'

describe('KpiRow', () => {
  it('renders one card per kpi with its label and value', () => {
    const kpis = [
      { label: 'Jeux actifs', value: 3 },
      { label: 'Features affichées', value: 1280 },
    ]
    render(<KpiRow kpis={kpis} />)
    expect(screen.getByText('Jeux actifs')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Features affichées')).toBeInTheDocument()
    expect(screen.getByText('1280')).toBeInTheDocument()
  })
})
