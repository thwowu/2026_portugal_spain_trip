import { expect, test } from '@playwright/test'

test.describe('itinerary details modal (scrolly)', () => {
  test('scrolly card opens and closes details modal', async ({ page }) => {
    await page.goto('/itinerary')
    await page.waitForLoadState('networkidle')

    const scrolly = page.locator('[aria-label="行程卡片（地圖跟著走）"]')
    await expect(scrolly).toBeVisible()

    // Click the first "展開細節" in scrolly cards.
    const openBtn = scrolly.getByRole('button', { name: '展開細節' }).first()
    await openBtn.scrollIntoViewIfNeeded()
    await openBtn.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Content assertion: either has some section headers, or shows "尚無細節".
    const hasAnySection = await dialog
      .getByText(/^(早|中|晚|備註)$/)
      .first()
      .isVisible()
      .catch(() => false)
    const hasNoDetails = await dialog.getByText('尚無細節').isVisible().catch(() => false)
    expect(hasAnySection || hasNoDetails).toBeTruthy()

    // Close via Escape.
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  })
})

