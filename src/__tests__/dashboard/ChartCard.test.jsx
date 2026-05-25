import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChartCard from '../../dashboard/components/ChartCard'

describe('ChartCard', () => {
  it('renders the title and children when ready', () => {
    render(<ChartCard title="Comptage" status="pret" date={new Date('2024-03-01')}>
      <div>contenu</div>
    </ChartCard>)
    expect(screen.getByText('Comptage')).toBeInTheDocument()
    expect(screen.getByText('contenu')).toBeInTheDocument()
    expect(screen.getByText(/01\/03\/2024/)).toBeInTheDocument()
  })

  it('shows a loading state', () => {
    render(<ChartCard title="X" status="chargement"><div>contenu</div></ChartCard>)
    expect(screen.getByText(/Chargement/)).toBeInTheDocument()
    expect(screen.queryByText('contenu')).not.toBeInTheDocument()
  })

  it('shows an error state', () => {
    render(<ChartCard title="X" status="erreur"><div>contenu</div></ChartCard>)
    expect(screen.getByText(/Source indisponible/)).toBeInTheDocument()
  })

  it('shows an empty state', () => {
    render(<ChartCard title="X" status="vide"><div>contenu</div></ChartCard>)
    expect(screen.getByText(/Aucune donnée/)).toBeInTheDocument()
  })
})
