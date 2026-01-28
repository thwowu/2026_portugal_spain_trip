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

    // Flip UI mode + motion to ensure settings updates are reflected.
    await page.getByTitle('標準模式').click()
    await page.getByTitle('標準動態（仍會尊重系統減少動態）').click()

    await page.getByRole('button', { name: '完成' }).click()

    // Verify dataset is updated (fontScale is reflected as data-font)
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.font))
      .toBe('2')
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.ui))
      .toBe('standard')
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.motion))
      .toBe('standard')

    // Reload should keep settings
    await page.reload()
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.font))
      .toBe('2')
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.ui))
      .toBe('standard')
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.dataset.motion))
      .toBe('standard')

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

