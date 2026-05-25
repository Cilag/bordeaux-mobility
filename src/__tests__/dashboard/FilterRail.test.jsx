import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardProvider, useDashboard } from '../../dashboard/DashboardContext'
import FilterRail from '../../dashboard/FilterRail'

function StateProbe() {
  const { state } = useDashboard()
  return <span data-testid="state">{JSON.stringify(state.filters)}</span>
}

const options = {
  entries: [
    { id: 'arrets-tbm', libelle: 'Arrêts TBM', categorie: 'arrets', mode: ['bus_tram'] },
    { id: 'carrefours-feux', libelle: 'Carrefours à feux', categorie: 'carrefours', mode: ['voiture'] },
  ],
  entryCounts: {},
  modes: ['bus_tram', 'voiture'],
  zones: ['Bordeaux', 'Pessac'],
  annees: [2019, 2024],
}

function renderRail() {
  return render(
    <DashboardProvider domaine="mobilite">
      <FilterRail options={options} />
      <StateProbe />
    </DashboardProvider>,
  )
}

describe('FilterRail', () => {
  it('décocher une case ajoute son id à disabledIds', async () => {
    renderRail()
    await userEvent.click(screen.getByLabelText('Arrêts TBM'))
    expect(screen.getByTestId('state')).toHaveTextContent('"disabledIds":["arrets-tbm"]')
  })

  it('toggles a mode checkbox into the state', async () => {
    renderRail()
    await userEvent.click(screen.getByLabelText('Voiture'))
    expect(screen.getByTestId('state')).toHaveTextContent('"modes":["voiture"]')
  })

  it('sets the zone from the select', async () => {
    renderRail()
    await userEvent.selectOptions(screen.getByLabelText('Commune / quartier'), 'Pessac')
    expect(screen.getByTestId('state')).toHaveTextContent('"zone":"Pessac"')
  })

  it('resets all filters', async () => {
    renderRail()
    await userEvent.click(screen.getByLabelText('Arrêts TBM'))
    await userEvent.click(screen.getByRole('button', { name: /Réinitialiser/ }))
    expect(screen.getByTestId('state'))
      .toHaveTextContent('{"categories":[],"disabledIds":[],"modes":[],"zone":null,"annee":null,"from":null,"to":null}')
  })
})
