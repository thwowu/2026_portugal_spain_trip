import { expect, test } from '@playwright/test'

test.describe('planning export/import', () => {
  test('export downloads JSON then import restores state', async ({ page }) => {
    await page.goto('/transport')
    await page.evaluate(() => {
      localStorage.removeItem('tripPlanner.planning.v1')
      location.reload()
    })
    await page.waitForLoadState('networkidle')

    // Create some non-empty planning state.
    const decision = page.locator('[data-testid^="transport-decision-"]').first()
    await decision.getByLabel('巴士').click()
    const reason = `ExportImport ${Date.now()}`
    await decision.getByRole('textbox', { name: /^交通決定理由：/ }).fill(reason)

    // Open settings modal.
    await page.getByRole('button', { name: '設定' }).click()
    await expect(page.getByRole('dialog', { name: '設定' })).toBeVisible()

    // Export should trigger a download.
    const downloadPromise = page.waitForEvent('download')
    await page.getByTestId('planning-export').click()
    const download = await downloadPromise
    const filePath = await download.path()
    expect(filePath, 'download.path() should be available for import').toBeTruthy()

    // Close settings.
    await page.keyboard.press('Escape')

    // Clear persisted planning state and verify decision is gone after reload.
    await page.evaluate(() => {
      localStorage.removeItem('tripPlanner.planning.v1')
      location.reload()
    })
    await page.waitForLoadState('networkidle')

    const decisionAfterClear = page.locator('[data-testid^="transport-decision-"]').first()
    await expect(decisionAfterClear.getByText('未決定')).toBeVisible()

    // Import the exported JSON.
    await page.getByRole('button', { name: '設定' }).click()
    await expect(page.getByRole('dialog', { name: '設定' })).toBeVisible()

    await page.getByTestId('planning-import').setInputFiles(filePath!)
    await expect(page.getByLabel('匯入匯出狀態')).toHaveText(/匯入成功/)

    // Close and confirm transport decision is restored.
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid^="transport-decision-"]').first().getByText('已選：巴士')).toBeVisible()
    await expect(page.locator('[data-testid^="transport-decision-"]').first().getByRole('textbox', { name: /^交通決定理由：/ })).toHaveValue(reason)
  })
})

