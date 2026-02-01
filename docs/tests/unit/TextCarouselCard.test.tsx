import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TextCarouselCard } from '../../src/components/TextCarouselCard'

describe('TextCarouselCard', () => {
  it('supports mouse drag scrolling on the viewport', () => {
    const { container } = render(
      <TextCarouselCard
        title="快速掃重點"
        items={Array.from({ length: 6 }).map((_, i) => ({
          title: `Item ${i + 1}`,
          summary: `Summary ${i + 1}`,
        }))}
      />,
    )

    const viewport = container.querySelector<HTMLDivElement>('.textCarouselViewport')
    expect(viewport).toBeTruthy()
    if (!viewport) return

    // JSDOM doesn't lay out, but our drag handler updates scrollLeft directly.
    viewport.scrollLeft = 0

    fireEvent.pointerDown(viewport, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
      clientX: 200,
      clientY: 10,
    })

    // Drag left => scrollRight (scrollLeft increases)
    fireEvent.pointerMove(viewport, {
      pointerId: 1,
      pointerType: 'mouse',
      buttons: 1,
      clientX: 120,
      clientY: 10,
    })

    fireEvent.pointerUp(viewport, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 0,
      clientX: 120,
      clientY: 10,
    })

    expect(viewport.scrollLeft).toBeGreaterThan(0)
  })
})

