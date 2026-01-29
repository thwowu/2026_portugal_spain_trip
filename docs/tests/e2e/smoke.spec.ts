import { expect, test } from '@playwright/test'

test.describe('trip planner smoke', () => {
  test('GitHub Pages fallback style route restore (?p=...)', async ({ page }) => {
    await page.goto('/?p=%2Fitinerary&v=1')
    await expect(page.getByText('Day 1–15 總行程')).toBeVisible()
  })

  test('bottom nav routes work and 404 renders', async ({ page }) => {
    await page.goto('/itinerary')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Day 1–15 總行程')).toBeVisible()

    const bottomNav = page.getByRole('navigation', { name: '主選單' })
    const clickNav = async (name: string) => {
      const link = bottomNav.getByRole('link', { name })
      // On mobile emulation, Playwright can consider the fixed bottom nav “intercepted”
      // by the scrolling content even though it’s visually tappable. Use a short
      // timeout then fall back to forced click to keep this a true route smoke test.
      try {
        await link.click({ timeout: 3000 })
      } catch {
        await link.click({ force: true })
      }
    }

    await clickNav('交通')
    await expect(page).toHaveURL(/\/transport/)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.pageHeroTitle')).toHaveText('交通比較', { timeout: 15000 })

    await clickNav('住宿')
    await expect(page).toHaveURL(/\/stays/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByText(
        '每城市固定模板：住宿推薦、入住/省錢提醒、附近交通節點與票卡怎麼買。',
      ),
    ).toBeVisible()

    await clickNav('景點')
    await expect(page).toHaveURL(/\/attractions/)
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByText(
        '依城市整理景點與注意事項（必去、走路少、雨天備案、視角點、路線、可跳過、實用資訊、吃什麼、拍照點、安全提醒）。',
      ),
    ).toBeVisible()

    await page.goto('/__does_not_exist__')
    await expect(page.getByText('找不到這個頁面')).toBeVisible()
    await page.locator('.container').getByRole('link', { name: '行程' }).click()
    await expect(page.getByText('Day 1–15 總行程')).toBeVisible()
  })
})

