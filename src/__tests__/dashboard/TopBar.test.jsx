import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TopBar from '../../dashboard/TopBar'

function renderBar(props = {}) {
  return render(
    <MemoryRouter>
      <TopBar domaine="mobilite" oldestDate={new Date('2024-03-01')} {...props} />
    </MemoryRouter>,
  )
}

describe('TopBar', () => {
  it('marks the active domaine button', () => {
    renderBar()
    expect(screen.getByRole('link', { name: 'Mobilité' })).toHaveClass('active')
    expect(screen.getByRole('link', { name: 'Stationnement' })).not.toHaveClass('active')
  })

  it('links each domaine to its dashboard route', () => {
    renderBar()
    expect(screen.getByRole('link', { name: 'Stationnement' }))
      .toHaveAttribute('href', '/dashboard/stationnement')
  })

  it('shows the oldest data date', () => {
    renderBar()
    expect(screen.getByText(/01\/03\/2024/)).toBeInTheDocument()
  })
})
