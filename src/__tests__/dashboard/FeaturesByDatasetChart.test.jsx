import { describe, it, expect, vi } from 'vitest'
import { cloneElement } from 'react'
import { render, screen } from '@testing-library/react'
import FeaturesByDatasetChart from '../../dashboard/FeaturesByDatasetChart'

// jsdom ne mesure pas les dimensions : on remplace ResponsiveContainer
// par un clone du diagramme avec une taille fixe, sinon Recharts ne dessine rien.
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => cloneElement(children, { width: 600, height: 300 }),
  }
})

describe('FeaturesByDatasetChart', () => {
  it('renders a bar label for each dataset', () => {
    const data = [
      { libelle: 'Arrêts', count: 1200 },
      { libelle: 'Carrefours', count: 340 },
    ]
    render(<FeaturesByDatasetChart data={data} />)
    // Recharts renders each label twice (SVG tick + hidden measurement span), so use getAllByText
    expect(screen.getAllByText('Arrêts').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Carrefours').length).toBeGreaterThan(0)
  })

  it('renders an empty message when there is no data', () => {
    render(<FeaturesByDatasetChart data={[]} />)
    expect(screen.getByText(/Aucun jeu de données actif/)).toBeInTheDocument()
  })
})
