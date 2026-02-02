import { expect, test } from '@playwright/test'

test.describe('bilingual inline (zh + en hint)', () => {
  test('mobile: tap ► expands English inline; desktop: focus shows tooltip', async ({ page }, testInfo) => {
    await page.goto('/attractions')
    await page.waitForLoadState('networkidle')

    const seville = page.getByTestId('attr-city-seville')
    await seville.scrollIntoViewIfNeeded()

    // Open the safety toolbox modal (contains the term "迷迭香" in content).
    const toolbox = seville.getByTestId('attr-toolbox-seville')
    await expect(toolbox).toBeVisible()
    const openSafety = toolbox.getByRole('button', { name: /安全提醒/ })
    await openSafety.scrollIntoViewIfNeeded()
    try {
      await openSafety.click({ timeout: 5000 })
    } catch {
      await openSafety.click({ force: true })
    }

    const body = page.getByTestId('attractions-longread-body')
    await expect(body).toBeVisible()

    // bilink: ensure href is rendered correctly (anchor inside a bilingual container)
    const bilinkContainer = body.locator('.bi', { hasText: '塞維爾主教座堂' }).first()
    await expect(bilinkContainer).toBeVisible()
    const bilink = bilinkContainer.locator('a').first()
    await expect(bilink).toHaveAttribute('href', /google\.com\/maps\/search\/\?api=1&query=Seville%20Cathedral/)

    const bi = body.locator('.bi', { hasText: '迷迭香' }).first()
    await expect(bi).toBeVisible()
    const hintBtn = bi.locator('button.biHintBtn')
    await expect(hintBtn).toBeVisible()

    const isDesktop = testInfo.project.name.includes('desktop')
    if (isDesktop) {
      await hintBtn.focus()
      await expect(body.locator('.biBubble', { hasText: 'Rosemary' })).toBeVisible()
    } else {
      await hintBtn.click({ force: true })
      await expect(body.locator('.biEnInline', { hasText: 'Rosemary' })).toBeVisible()
      await expect(hintBtn).toHaveAttribute('aria-expanded', 'true')
    }
  })
})

