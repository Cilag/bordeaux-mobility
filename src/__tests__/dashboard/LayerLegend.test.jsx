import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LayerLegend from '../../dashboard/LayerLegend'

const baseItem = {
  id: 'a',
  libelle: 'Jeu A',
  entry: { categorie: 'arrets', mode: ['bus_tram'] },
  status: 'pret',
  count: 10,
  date: null,
}

describe('LayerLegend', () => {
  it('does not render the degraded badge when not degraded', () => {
    render(<LayerLegend items={[{ ...baseItem, degraded: false }]} />)
    expect(screen.queryByTitle('Récupéré après retry')).toBeNull()
  })

  it('renders the degraded badge when degraded:true', () => {
    render(<LayerLegend items={[{ ...baseItem, degraded: true }]} />)
    expect(screen.getByTitle('Récupéré après retry')).toBeInTheDocument()
  })

  it('does not render the degraded badge for erreur status even if flag is true', () => {
    render(<LayerLegend items={[{ ...baseItem, status: 'erreur', degraded: true }]} />)
    expect(screen.queryByTitle('Récupéré après retry')).toBeNull()
  })
})
