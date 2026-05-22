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
  categories: ['arrets', 'carrefours'],
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
  it('toggles a category checkbox into the state', async () => {
    renderRail()
    await userEvent.click(screen.getByLabelText('arrets'))
    expect(screen.getByTestId('state')).toHaveTextContent('"categories":["arrets"]')
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
    await userEvent.click(screen.getByLabelText('arrets'))
    await userEvent.click(screen.getByRole('button', { name: /Réinitialiser/ }))
    expect(screen.getByTestId('state'))
      .toHaveTextContent('{"categories":[],"modes":[],"zone":null,"annee":null,"from":null,"to":null}')
  })
})
