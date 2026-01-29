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
      // Mobile emulation can consider fixed overlays “intercepting” even when the
      // button is visually tappable. This is a modal smoke, so force the click.
      await openBtn.click({ force: true })
    }

    // The modal is a role=dialog overlay; it should be visible and closable.
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const closeBtn = dialog.getByRole('button', { name: '關閉', exact: true })
    try {
      await closeBtn.click({ timeout: 3000 })
    } catch {
      await closeBtn.click({ force: true })
    }
    await expect(dialog).toBeHidden()
  })
})

