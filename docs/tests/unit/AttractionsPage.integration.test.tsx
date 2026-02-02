import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SettingsProvider } from '../../src/state/settings'
import { createDefaultPlanningState, PlanningProvider } from '../../src/state/planning'
import { AttractionsPage } from '../../src/pages/AttractionsPage'

function renderAttractions() {
  return render(
    <MemoryRouter initialEntries={['/attractions']}>
      <SettingsProvider>
        <PlanningProvider initialState={createDefaultPlanningState()}>
          <AttractionsPage />
        </PlanningProvider>
      </SettingsProvider>
    </MemoryRouter>,
  )
}

describe('AttractionsPage (integration)', () => {
  it('renders without crashing and shows the hero title', () => {
    renderAttractions()
    expect(screen.getByText('景點')).toBeInTheDocument()
  })

  it('supports keyboard quick-nav without throwing', async () => {
    const scrollSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView')
    const user = userEvent.setup()
    renderAttractions()

    // The page registers a keydown listener when no modal is open.
    await user.keyboard('{ArrowRight}')
    await user.keyboard('{ArrowLeft}')

    // We don't assert specific city order here (content-dependent),
    // but key presses should attempt to scroll at least once.
    expect(scrollSpy.mock.calls.length).toBeGreaterThan(0)
    scrollSpy.mockRestore()
  })
})

