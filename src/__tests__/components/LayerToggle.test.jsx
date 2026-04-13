import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LayerToggle from '../../components/Map/LayerToggle'

describe('LayerToggle', () => {
  const visibleLayers = { tram: true, bus: false, vcub: true, sncf: true, flights: true, traffic: true, lights: false }
  const onToggle = vi.fn()

  it('renders 7 toggle buttons', () => {
    render(<LayerToggle visibleLayers={visibleLayers} onToggleLayer={onToggle} />)
    expect(screen.getAllByRole('button')).toHaveLength(7)
  })

  it('calls onToggleLayer with correct key on click', () => {
    render(<LayerToggle visibleLayers={visibleLayers} onToggleLayer={onToggle} />)
    fireEvent.click(screen.getByTitle(/bus/i))
    expect(onToggle).toHaveBeenCalledWith('bus')
  })

  it('applies active class when layer is visible', () => {
    render(<LayerToggle visibleLayers={visibleLayers} onToggleLayer={onToggle} />)
    const tramBtn = screen.getByTitle(/tram/i)
    expect(tramBtn.className).toMatch(/active/)
  })
})
