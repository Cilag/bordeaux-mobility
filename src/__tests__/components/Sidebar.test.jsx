import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Sidebar from '../../components/Sidebar/Sidebar'

const defaultProps = {
  open: true,
  onToggle: vi.fn(),
  tbm: { vehicles: [], stops: [], loading: false, error: null },
  vcub: { stations: [], loading: false, error: null },
  sncf: { departures: [], loading: false, error: null },
  openSky: { flights: [], loading: false, error: null },
  userPosition: null,
}

describe('Sidebar', () => {
  it('renders when open', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByRole('complementary')).toBeInTheDocument()
  })

  it('calls onToggle when toggle button clicked', () => {
    render(<Sidebar {...defaultProps} />)
    fireEvent.click(screen.getByTitle(/fermer/i))
    expect(defaultProps.onToggle).toHaveBeenCalled()
  })

  it('shows VCub bike count in header', () => {
    const props = {
      ...defaultProps,
      vcub: { stations: [{ nbvelos: 5 }, { nbvelos: 3 }], loading: false, error: null },
    }
    render(<Sidebar {...props} />)
    expect(screen.getByText(/8 vélos/i)).toBeInTheDocument()
  })
})
