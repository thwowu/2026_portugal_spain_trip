import { expect, test } from '@playwright/test'

test.describe('transport decision persistence', () => {
  test('choose option + write reason + reload keeps it', async ({ page }) => {
    await page.goto('/transport')
    await page.evaluate(() => {
      localStorage.removeItem('tripPlanner.planning.v1')
      location.reload()
    })
    await page.waitForLoadState('networkidle')

    const decision = page.locator('[data-testid^="transport-decision-"]').first()
    await expect(decision).toBeVisible()

    await decision.getByLabel('火車').click()

    const reason = `E2E reason ${Date.now()}`
    await decision.getByRole('textbox', { name: /^交通決定理由：/ }).fill(reason)

    await page.reload()
    await page.waitForLoadState('networkidle')

    const decisionAfter = page.locator('[data-testid^="transport-decision-"]').first()
    await expect(decisionAfter.getByText('已選：火車')).toBeVisible()
    await expect(decisionAfter.getByRole('textbox', { name: /^交通決定理由：/ })).toHaveValue(reason)
  })
})

