import { expect, test } from '@playwright/test'

test.describe('stays modal (public transport how-to)', () => {
  test('opens and closes from stays page', async ({ page }) => {
    await page.goto('/stays')
    await page.waitForLoadState('networkidle')

    // Open modal from any city's stays card.
    await page.getByRole('button', { name: '看完整說明', exact: true }).first().click()

    // The modal is a role=dialog overlay; it should be visible and closable.
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: '關閉', exact: true }).click()
    await expect(dialog).toBeHidden()
  })
})

