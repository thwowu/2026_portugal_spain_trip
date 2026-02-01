import { expect, test } from '@playwright/test'

test.describe('planning export/import', () => {
  test('export downloads JSON then import restores state', async ({ page }) => {
    await page.goto('/transport')
    // Clear persisted planning state, then reload in a Playwright-controlled way.
    // (Avoid doing `location.reload()` inside page.evaluate, which can race with subsequent evals.)
    await page.evaluate(() => localStorage.removeItem('tripPlanner.planning.v1'))
    await page.reload()
    await page.waitForLoadState('networkidle')

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

    // Clear persisted planning state.
    await page.evaluate(() => localStorage.removeItem('tripPlanner.planning.v1'))
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Import a JSON payload that contains a transport decision (even though the UI is removed,
    // the planning state should still be importable/mergeable).
    const segId = 'granada-madrid'
    const reason = `ExportImport ${Date.now()}`
    const importJson = {
      version: 1,
      createdAt: new Date().toISOString(),
      payload: {
        planning: {
          attractionDecisions: {},
          transportDecisions: {
            [segId]: { segmentId: segId, choice: 'bus', reason },
          },
          checklist: [],
          changelog: [],
        },
      },
    }

    await page.getByRole('button', { name: '設定' }).click()
    await expect(page.getByRole('dialog', { name: '設定' })).toBeVisible()

    await page.getByTestId('planning-import').setInputFiles({
      name: 'planning-import.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(importJson), 'utf-8'),
    })
    await expect(page.getByLabel('匯入匯出狀態')).toHaveText(/匯入成功/)

    // Verify localStorage is updated with the imported decision.
    await expect.poll(async () => {
      return await page.evaluate(() => localStorage.getItem('tripPlanner.planning.v1'))
    }).toBeTruthy()

    const persisted = await page.evaluate(() => {
      const raw = localStorage.getItem('tripPlanner.planning.v1')
      return raw ? JSON.parse(raw) : null
    })
    expect(persisted?.transportDecisions?.[segId]?.choice).toBe('bus')
    expect(persisted?.transportDecisions?.[segId]?.reason).toBe(reason)
  })
})

