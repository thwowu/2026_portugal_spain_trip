import { expect, test } from '@playwright/test'

test.describe('landing page logic', () => {
  test('onboarding shows once, can be reopened, persists across reload', async ({ page }) => {
    await page.goto('/itinerary')
    // Ensure a clean first-run state, but don't keep clearing on reloads.
    await page.evaluate(() => {
      localStorage.clear()
      location.reload()
    })

    await page.waitForLoadState('networkidle')

    // First visit should show onboarding
    await expect(page.getByText('第一次使用：給爸媽的 30 秒導覽')).toBeVisible()

    await page.getByRole('button', { name: '關閉' }).click()
    await expect(page.getByText('第一次使用：給爸媽的 30 秒導覽')).toBeHidden()

    // Reload should not show onboarding again
    await page.reload()
    await expect(page.getByText('第一次使用：給爸媽的 30 秒導覽')).toBeHidden()

    // But help button should reopen it
    await page.getByRole('button', { name: '使用說明' }).click()
    await expect(page.getByText('第一次使用：給爸媽的 30 秒導覽')).toBeVisible()
  })

  test('settings changes update dataset + persist, reset recommended restores defaults', async ({ page }) => {
    await page.goto('/itinerary')
    // Ensure a clean state once (don't clear again on reloads).
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('tripPlanner.onboarding.v1', JSON.stringify({ seen: true }))
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

