import { expect, test } from '@playwright/test'

test.describe('itinerary adjacent day peek', () => {
  test.beforeEach(async ({ page }) => {
    // Avoid onboarding overlay blocking interactions/assertions.
    await page.addInitScript(() => {
      localStorage.setItem('tripPlanner.onboarding.v1', JSON.stringify({ seen: true }))
    })
  })

  test('Day 2 shows Day 1 (top) and Day 3 (bottom) preview cards', async ({ page }) => {
    await page.goto('/itinerary')
    await page.waitForLoadState('networkidle')

    // Scroll Day 2 into the "active" region to update the adjacent dock.
    const day2 = page.locator('#day-2')
    await expect(day2).toBeVisible()
    await day2.scrollIntoViewIfNeeded()

    // Wait for IntersectionObserver-driven activeDay updates to settle.
    await expect
      .poll(async () => page.locator('text=Day 2').first().isVisible())
      .toBeTruthy()

    const prev = page.getByRole('button', { name: /上一天：Day 1/ })
    const next = page.getByRole('button', { name: /下一天：Day 3/ })

    await expect(prev).toBeVisible()
    await expect(next).toBeVisible()
  })
})

