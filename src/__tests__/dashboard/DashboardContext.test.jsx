import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardProvider, useDashboard } from '../../dashboard/DashboardContext'

function Probe() {
  const { state, dispatch } = useDashboard()
  return (
    <div>
      <span data-testid="domaine">{state.domaine}</span>
      <span data-testid="modes">{state.filters.modes.join(',')}</span>
      <button onClick={() => dispatch({ type: 'TOGGLE_MODE', value: 'velo' })}>toggle</button>
    </div>
  )
}

describe('DashboardContext', () => {
  it('provides the initial state for the given domaine', () => {
    render(<DashboardProvider domaine="stationnement"><Probe /></DashboardProvider>)
    expect(screen.getByTestId('domaine')).toHaveTextContent('stationnement')
  })

  it('dispatch updates the state', async () => {
    render(<DashboardProvider domaine="mobilite"><Probe /></DashboardProvider>)
    await userEvent.click(screen.getByText('toggle'))
    expect(screen.getByTestId('modes')).toHaveTextContent('velo')
  })
})
