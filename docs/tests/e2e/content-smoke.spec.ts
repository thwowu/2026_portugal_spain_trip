import { expect, test } from '@playwright/test'

test.describe('content smoke (non-empty UI)', () => {
  test('itinerary: scrolly renders multiple day cards', async ({ page }) => {
    await page.goto('/itinerary')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Day 1–15 總行程')).toBeVisible()

    const scrolly = page.locator('[aria-label="行程卡片（地圖跟著走）"]')
    await expect(scrolly).toBeVisible()

    const dayCards = scrolly.locator('article.step')
    await expect.poll(async () => await dayCards.count()).toBeGreaterThan(5)
    await expect(dayCards.first().getByRole('heading', { name: /^Day 1/ })).toBeVisible()
  })

  test('transport: has segments + opens screenshot lightbox', async ({ page }) => {
    await page.goto('/transport')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('.pageHeroTitle')).toHaveText('交通比較', { timeout: 15000 })
    await expect(page.getByText('每段移動都有「火車 vs 巴士」比較')).toBeVisible()

    const segmentNav = page.locator('.chipRow').getByRole('button')
    await expect.poll(async () => await segmentNav.count()).toBeGreaterThan(1)

    // Open the first accordion we can find, then verify screenshot lightbox works.
    const openBtn = page.getByRole('button', { name: '看完整說明', exact: true }).first()
    await openBtn.scrollIntoViewIfNeeded()
    try {
      await openBtn.click({ timeout: 3000 })
    } catch {
      await openBtn.click({ force: true })
    }

    const dialogs = page.getByRole('dialog')
    await expect(dialogs).toHaveCount(1)
    const optionDialog = dialogs.first()
    await expect(optionDialog).toBeVisible()
    await expect(optionDialog.getByText('怎麼搭（Step-by-step）')).toBeVisible()
    await expect(optionDialog.getByText('截圖（可點放大）')).toBeVisible()

    const screenshotBtn = optionDialog.getByRole('button', { name: /^查看大圖：/ }).first()
    await screenshotBtn.scrollIntoViewIfNeeded()
    await screenshotBtn.click()

    await expect(dialogs).toHaveCount(2)
    const lightbox = dialogs.nth(1)
    await expect(lightbox.locator('img')).toBeVisible()

    // Close lightbox then close the option dialog.
    await page.keyboard.press('Escape')
    await expect(lightbox).toBeHidden()
    await page.keyboard.press('Escape')
    await expect(optionDialog).toBeHidden()
  })

  test('stays: renders city sections and non-empty recommendations', async ({ page }) => {
    await page.goto('/stays')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('每城市固定模板：住宿推薦、入住/省錢提醒、附近交通節點與票卡怎麼買。')).toBeVisible()

    const cityNav = page.locator('.chipRow').getByRole('button')
    await expect.poll(async () => await cityNav.count()).toBeGreaterThan(1)

    // Ensure at least one "住宿推薦" section renders a non-empty list of option cards.
    await expect(page.getByText('住宿推薦').first()).toBeVisible()
    await expect(page.locator('.cardInner').filter({ hasText: '住宿推薦' }).first()).toBeVisible()
  })

  test('attractions: seville carousel renders card actions', async ({ page }) => {
    await page.goto('/attractions')
    await page.waitForLoadState('networkidle')

    const seville = page.getByTestId('attr-city-seville')
    await seville.scrollIntoViewIfNeeded()
    await seville.getByRole('tab', { name: '必去' }).click()

    const carousel = seville.getByTestId('attr-carousel-seville-must')
    await expect(carousel).toBeVisible()
    await expect(carousel.getByRole('button', { name: /詳情/ }).first()).toBeVisible()
  })
})

