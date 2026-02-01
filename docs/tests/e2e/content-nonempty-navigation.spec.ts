import { expect, test } from '@playwright/test'

test.describe('content non-empty navigation (tabs/sections)', () => {
  test('attractions: switching tabs keeps content non-empty (Seville)', async ({ page }) => {
    await page.goto('/attractions')
    await page.waitForLoadState('networkidle')

    const seville = page.getByTestId('attr-city-seville')
    await seville.scrollIntoViewIfNeeded()

    const tablist = seville.getByRole('tablist')
    const tabs = tablist.getByRole('tab')
    const tabCount = await tabs.count()
    expect(tabCount).toBeGreaterThan(2)

    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i)
      await tab.click()

      const panel = seville.getByRole('tabpanel')
      await expect(panel).toBeVisible()
      await expect(panel).not.toContainText('（此章節目前尚無內容）')
    }
  })

  test('transport: segment sections render non-empty content', async ({ page }) => {
    await page.goto('/transport')
    await page.waitForLoadState('networkidle')

    const segments = page.locator('section[id^="seg-"]')
    await expect.poll(async () => await segments.count()).toBeGreaterThan(1)

    // Check the first 2 segments (avoid making this too slow).
    const n = Math.min(2, await segments.count())
    for (let i = 0; i < n; i++) {
      const seg = segments.nth(i)
      await seg.scrollIntoViewIfNeeded()
      await expect(seg.getByText('大建議')).toBeVisible()
      await expect(seg.locator('[data-testid^="transport-decision-"]')).toBeVisible()
    }
  })

  test('stays: city sections render recommendations', async ({ page }) => {
    await page.goto('/stays')
    await page.waitForLoadState('networkidle')

    const sections = page.locator('section[id^="stay-"]')
    await expect.poll(async () => await sections.count()).toBeGreaterThan(1)

    // Check the first 2 city sections.
    const n = Math.min(2, await sections.count())
    for (let i = 0; i < n; i++) {
      const sec = sections.nth(i)
      await sec.scrollIntoViewIfNeeded()
      await expect(sec.getByText('住宿推薦')).toBeVisible()
    }
  })
})

