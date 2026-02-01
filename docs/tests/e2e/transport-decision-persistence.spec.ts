import { expect, test } from '@playwright/test'

test.describe('transport: decision UI removed', () => {
  test('does not render "我的決定" section', async ({ page }) => {
    await page.goto('/transport')
    await page.evaluate(() => {
      localStorage.removeItem('tripPlanner.planning.v1')
      location.reload()
    })
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('我的決定')).toHaveCount(0)
    await expect(page.locator('[data-testid^="transport-decision-"]')).toHaveCount(0)
  })
})

