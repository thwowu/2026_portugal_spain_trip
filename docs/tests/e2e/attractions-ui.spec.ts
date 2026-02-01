import { expect, test } from '@playwright/test'

test.describe('attractions UI (carousel / timeline / toolbox)', () => {
  test('carousel renders and item details modal opens', async ({ page }) => {
    await page.goto('/attractions')
    await page.waitForLoadState('networkidle')

    const seville = page.getByTestId('attr-city-seville')
    await seville.scrollIntoViewIfNeeded()

    // Ensure we are on "必去" tab for Seville
    await seville.getByRole('tab', { name: '必去' }).click()

    const carousel = seville.getByTestId('attr-carousel-seville-must')
    await expect(carousel).toBeVisible()

    // Navigate a bit (next should be enabled for Seville must)
    await carousel.getByTestId('attr-carousel-seville-must-next').click({ timeout: 5000 })

    // Open details from the first visible card
    await carousel.getByRole('button', { name: /詳情/ }).first().click()
    await expect(page.getByTestId('attractions-longread-body')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('attractions-longread-body')).toBeHidden()
  })

  test('routes timeline renders and opens details modal', async ({ page }) => {
    await page.goto('/attractions')
    await page.waitForLoadState('networkidle')

    const seville = page.getByTestId('attr-city-seville')
    await seville.scrollIntoViewIfNeeded()
    await seville.getByRole('tab', { name: '路線' }).click()

    const timeline = seville.getByTestId('routes-timeline-seville')
    await expect(timeline).toBeVisible()

    await timeline.getByRole('button', { name: /詳情/ }).first().click()
    await expect(page.getByTestId('attractions-longread-body')).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('toolbox opens and highlight renders as <mark>', async ({ page }) => {
    await page.goto('/attractions')
    await page.waitForLoadState('networkidle')

    const seville = page.getByTestId('attr-city-seville')
    await seville.scrollIntoViewIfNeeded()

    const toolbox = seville.getByTestId('attr-toolbox-seville')
    await expect(toolbox).toBeVisible()

    await toolbox.getByRole('button', { name: /安全提醒/ }).click()
    const body = page.getByTestId('attractions-longread-body')
    await expect(body).toBeVisible()

    // We highlight "::手機不要拿在手上走路::" in Seville safety.
    await expect(body.locator('mark').first()).toBeVisible()
    await page.keyboard.press('Escape')
  })
})

