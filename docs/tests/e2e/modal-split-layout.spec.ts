import { expect, test } from '@playwright/test'

test.describe('split-layout modals (scroll progress)', () => {
  test('extensions trip modal: internal scroll updates progress bar', async ({ page }) => {
    await page.goto('/attractions')
    await page.waitForLoadState('networkidle')

    // Expand extensions in any city card that has them.
    const extensionsToggle = page.getByRole('button', { name: /延伸行程/ }).first()
    await extensionsToggle.click()

    // Open the first trip detail.
    await page.getByRole('button', { name: '詳情…', exact: true }).first().click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const body = page.getByTestId('extensions-modal-body')
    const progress = page.getByTestId('extensions-modal-progress')

    const isScrollable = await body.evaluate((el) => el.scrollHeight > el.clientHeight)
    expect(isScrollable).toBeTruthy()

    const before = await progress.evaluate((el) => el.style.width || '')
    const beforeNum = Number.parseFloat(before) || 0

    await body.evaluate((el) => {
      el.scrollTop = el.scrollHeight * 0.65
      el.dispatchEvent(new Event('scroll'))
    })

    const after = await progress.evaluate((el) => el.style.width || '')
    const afterNum = Number.parseFloat(after) || 0

    expect(afterNum).toBeGreaterThan(beforeNum)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('attractions long-read modal: internal scroll updates progress bar', async ({ page }) => {
    await page.goto('/attractions')
    await page.waitForLoadState('networkidle')

    const openBtnPrimary = page.getByRole('button', { name: '看完整段落…', exact: true }).first()
    const openBtnFallback = page.getByRole('button', { name: '開啟詳情…', exact: true }).first()
    const openBtn = (await openBtnPrimary.count()) > 0 ? openBtnPrimary : openBtnFallback
    try {
      await openBtn.click({ timeout: 3000 })
    } catch {
      await openBtn.click({ force: true })
    }

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const body = page.getByTestId('attractions-longread-body')
    const progress = page.getByTestId('attractions-longread-progress')

    const isScrollable = await body.evaluate((el) => el.scrollHeight > el.clientHeight)
    expect(isScrollable).toBeTruthy()

    const before = await progress.evaluate((el) => el.style.width || '')
    const beforeNum = Number.parseFloat(before) || 0

    await body.evaluate((el) => {
      el.scrollTop = el.scrollHeight * 0.65
      el.dispatchEvent(new Event('scroll'))
    })

    const after = await progress.evaluate((el) => el.style.width || '')
    const afterNum = Number.parseFloat(after) || 0

    expect(afterNum).toBeGreaterThan(beforeNum)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})

