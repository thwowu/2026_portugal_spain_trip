import { expect, test } from '@playwright/test'

test.describe('attractions spot cards', () => {
  test('cards expand, deep link opens, maps pill works, and spot nav updates hash', async ({ page }) => {
    await page.goto('/attractions')
    await page.waitForLoadState('networkidle')

    const firstCard = page.locator('.attrSpotCard').first()
    await expect(firstCard).toBeVisible()

    const firstId = await firstCard.getAttribute('id')
    expect(firstId).toBeTruthy()

    // Deep link should expand the targeted card.
    await page.goto(`/attractions#${firstId}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator(`#${firstId} .attrSpotExpanded`)).toBeVisible()

    // Maps pill should be a link and not toggle expand.
    const maps = page.locator(`#${firstId} .attrSpotMapsBtn`).first()
    if (await maps.count()) {
      const href = await maps.getAttribute('href')
      expect(href).toMatch(/^https?:\/\//)

      const popupPromise = page.waitForEvent('popup')
      await maps.click()
      const popup = await popupPromise
      await expect(popup).toHaveURL(/https?:\/\//)
      await popup.close()
    }

    // Spot nav icon should update hash and expand the next card.
    const nextBtn = page.locator(`#${firstId} .attrSpotNavBtn`).last()
    await nextBtn.click()
    await expect(page).toHaveURL(/#attr-/)

    // Collapse should keep the user anchored to the city section hash.
    const collapse = page.locator('.attrSpotCollapseBtn').first()
    await collapse.click()
    await expect(page).toHaveURL(/#attr-[a-z0-9_-]+/i)
  })
})

