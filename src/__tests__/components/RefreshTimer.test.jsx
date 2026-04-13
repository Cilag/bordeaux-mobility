import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import RefreshTimer from '../../components/UI/RefreshTimer'

describe('RefreshTimer', () => {
  it('displays last update time', () => {
    const date = new Date('2026-04-13T12:34:00')
    render(<RefreshTimer lastUpdate={date} intervalSeconds={30} />)
    expect(screen.getByText(/12:34/)).toBeInTheDocument()
  })

  it('displays "..." when no last update', () => {
    render(<RefreshTimer lastUpdate={null} intervalSeconds={30} />)
    expect(screen.getByText(/\.\.\./)).toBeInTheDocument()
  })
})
