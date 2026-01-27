import { expect, test } from '@playwright/test'

test.describe('itinerary adjacent day peek (removed)', () => {
  test('Day 2 does not show prev/next floating preview cards', async ({ page }) => {
    await page.goto('/itinerary')
    await page.waitForLoadState('networkidle')

    // Scroll Day 2 into the "active" region.
    const day2 = page.locator('#day-2')
    await expect(day2).toBeVisible()
    await day2.scrollIntoViewIfNeeded()

    // Wait for IntersectionObserver-driven activeDay updates to settle.
    await expect
      .poll(async () => page.locator('text=Day 2').first().isVisible())
      .toBeTruthy()

    const prev = page.getByRole('button', { name: /上一天：Day 1/ })
    const next = page.getByRole('button', { name: /下一天：Day 3/ })

    await expect(page.locator('[aria-label="前後一天"]')).toHaveCount(0)
    await expect(prev).toHaveCount(0)
    await expect(next).toHaveCount(0)
  })
})

