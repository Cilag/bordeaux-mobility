import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FreshnessBadge from '../../dashboard/components/FreshnessBadge'

describe('FreshnessBadge', () => {
  it('shows the formatted date', () => {
    render(<FreshnessBadge date={new Date('2024-03-01')} />)
    expect(screen.getByText(/01\/03\/2024/)).toBeInTheDocument()
  })

  it('shows "date inconnue" when date is null', () => {
    render(<FreshnessBadge date={null} />)
    expect(screen.getByText(/date inconnue/)).toBeInTheDocument()
  })
})
