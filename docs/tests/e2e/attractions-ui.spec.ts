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

    // Navigate a bit: clicking next must actually scroll the carousel.
    const viewport = carousel.locator('.textCarouselViewport')
    const before = await viewport.evaluate((el) => el.scrollLeft)
    const nextBtn = carousel.getByTestId('attr-carousel-seville-must-next')

    try {
      await nextBtn.click({ timeout: 5000 })
    } catch {
      // Keep this as a functional test even if Playwright thinks the element is "intercepted"
      // in some viewport/emulation edge cases.
      await nextBtn.click({ force: true })
    }

    await expect.poll(async () => Math.round(await viewport.evaluate((el) => el.scrollLeft))).toBeGreaterThan(before)
    await expect(carousel.getByTestId('attr-carousel-seville-must-prev')).toBeEnabled()

    // Open details from the first visible card
    await carousel.getByRole('button', { name: /詳情/ }).first().click()
    await expect(page.getByTestId('attractions-longread-body')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('attractions-longread-body')).toBeHidden()
  })

  test('carousel supports mouse drag scrolling', async ({ page }, testInfo) => {
    // This test targets desktop mouse drag; skip on mobile projects.
    if (testInfo.project.name.includes('mobile')) test.skip()

    // Ensure we are in a viewport where the carousel is scrollable.
    await page.setViewportSize({ width: 700, height: 820 })
    await page.goto('/attractions')
    await page.waitForLoadState('networkidle')

    const seville = page.getByTestId('attr-city-seville')
    await seville.scrollIntoViewIfNeeded()
    await seville.getByRole('tab', { name: '必去' }).click()

    const carousel = seville.getByTestId('attr-carousel-seville-must')
    await expect(carousel).toBeVisible()

    const viewport = carousel.locator('.textCarouselViewport')
    const before = await viewport.evaluate((el) => el.scrollLeft)

    const box = await viewport.boundingBox()
    expect(box).toBeTruthy()
    if (!box) return

    // Dispatch pointer events (pointerType=mouse) so we exercise the actual implementation.
    // Drag left to scroll right (increasing scrollLeft).
    const x = box.x + box.width * 0.55
    const y = box.y + box.height * 0.5
    const id = 1
    await viewport.dispatchEvent('pointerdown', {
      pointerId: id,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: x,
      clientY: y,
    })
    await viewport.dispatchEvent('pointermove', {
      pointerId: id,
      pointerType: 'mouse',
      isPrimary: true,
      buttons: 1,
      clientX: x - 360,
      clientY: y,
    })
    await viewport.dispatchEvent('pointerup', {
      pointerId: id,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: 0,
      clientX: x - 360,
      clientY: y,
    })

    await expect
      .poll(async () => Math.round(await viewport.evaluate((el) => el.scrollLeft)))
      .toBeGreaterThan(before)
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

