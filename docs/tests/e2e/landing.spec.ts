import { expect, test } from '@playwright/test'

test.describe('landing page logic', () => {
  test('settings changes update dataset + persist, reset recommended restores defaults', async ({ page }) => {
    await page.goto('/itinerary')
    // Ensure a clean state once (don't clear again on reloads).
    await page.evaluate(() => {
      localStorage.clear()
      location.reload()
    })
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: '設定' }).click()
    await expect(page.getByText('字體大小')).toBeVisible()

    // Set font scale to largest (2)
    const slider = page.getByRole('slider', { name: '字體大小滑桿' })
    await slider.focus()
    await slider.press('ArrowRight')

    // Toggle seen hints OFF
    await page.getByRole('button', { name: '開', exact: true }).click()
    await expect(page.getByRole('button', { name: '關', exact: true })).toBeVisible()

    await page.getByRole('button', { name: '完成' }).click()

    // Verify dataset is updated (fontScale is reflected as data-font)
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.font))
      .toBe('2')

    // Reload should keep settings
    await page.reload()
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.font))
      .toBe('2')

    // Reset recommended should restore defaults and close
    await page.getByRole('button', { name: '設定' }).click()
    await page.getByRole('button', { name: '一鍵回到推薦設定' }).click()

    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.ui))
      .toBe('senior')
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.motion))
      .toBe('low')
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.font))
      .toBe('1')
  })
})

