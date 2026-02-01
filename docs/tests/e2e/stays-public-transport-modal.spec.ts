import { expect, test } from '@playwright/test'

test.describe('stays modal (public transport how-to)', () => {
  test('opens and closes from stays page', async ({ page }) => {
    await page.goto('/stays')
    await page.waitForLoadState('networkidle')

    // Open modal from any city's stays card.
    const openBtn = page.getByRole('button', { name: '看完整說明', exact: true }).first()
    try {
      await openBtn.click({ timeout: 3000 })
    } catch {
      await openBtn.click({ force: true })
    }

    // The modal is a role=dialog overlay; it should be visible and closable.
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})

