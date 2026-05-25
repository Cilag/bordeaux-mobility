import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'

// DashboardPage est lourd (carte + chargement) : on le mocke pour tester le routage seul.
vi.mock('../dashboard/DashboardPage', () => ({
  default: () => <div>DASHBOARD</div>,
}))

describe('App routing', () => {
  it('redirects / to the mobilité dashboard', () => {
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    expect(screen.getByText('DASHBOARD')).toBeInTheDocument()
  })

  it('renders the dashboard for /dashboard/:domaine', () => {
    render(<MemoryRouter initialEntries={['/dashboard/stationnement']}><App /></MemoryRouter>)
    expect(screen.getByText('DASHBOARD')).toBeInTheDocument()
  })

  it('catches unknown routes and redirects to mobilité', () => {
    render(<MemoryRouter initialEntries={['/live']}><App /></MemoryRouter>)
    expect(screen.getByText('DASHBOARD')).toBeInTheDocument()
  })
})
