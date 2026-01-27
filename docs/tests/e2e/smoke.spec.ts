import { expect, test } from '@playwright/test'

test.describe('trip planner smoke', () => {
  test('GitHub Pages fallback style route restore (?p=...)', async ({ page }) => {
    await page.goto('/?p=%2Fitinerary&v=1')
    await expect(page.getByText('Day 1–15 總行程')).toBeVisible()
  })

  test('bottom nav routes work and 404 renders', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('規劃看板')).toBeVisible()

    await page.getByRole('link', { name: '行程' }).click({ force: true })
    await expect(page.getByText('Day 1–15 總行程')).toBeVisible()

    await page.getByRole('link', { name: '交通' }).click({ force: true })
    await expect(page.getByText('交通比較')).toBeVisible()

    await page.getByRole('link', { name: '住宿' }).click({ force: true })
    await expect(
      page.getByText(
        '每城市固定模板：住宿推薦＋入住提醒＋附近交通節點＋「大眾交通怎麼買」＋省錢密技。',
      ),
    ).toBeVisible()

    await page.getByRole('link', { name: '景點' }).click({ force: true })
    await expect(page.getByText('景點（模板）')).toBeVisible()

    await page.goto('/__does_not_exist__')
    await expect(page.getByText('找不到這個頁面')).toBeVisible()
    await page.getByRole('link', { name: '規劃看板' }).click()
    await expect(page.getByText('規劃看板')).toBeVisible()
  })

  test('Dashboard state persists after reload (localStorage)', async ({ page }) => {
    await page.goto('/dashboard')

    // Create a checklist item.
    const todoText = `e2e todo ${Date.now()}`
    const todoInput = page.getByPlaceholder('新增待辦…')
    await todoInput.fill(todoText)
    await todoInput.locator('..').getByRole('button', { name: '新增' }).click()
    await expect(page.getByText(todoText, { exact: true })).toBeVisible()

    // Set first transport segment status to decided and add a reason.
    await page.getByRole('button', { name: '已決定' }).first().click()
    const reason = `e2e reason ${Date.now()}`
    const reasonInput = page.getByPlaceholder('例：轉乘少、行李比較好處理').first()
    await reasonInput.fill(reason)
    await expect(reasonInput).toHaveValue(reason)

    await page.reload()

    await expect(page.getByText(todoText, { exact: true })).toBeVisible()
    await expect(page.getByPlaceholder('例：轉乘少、行李比較好處理').first()).toHaveValue(
      reason,
    )
  })

  test('Export JSON triggers download and can be imported back', async ({ page }) => {
    await page.goto('/dashboard')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '匯出 JSON（用 LINE 傳給我）' }).click()
    const download = await downloadPromise
    const filename = download.suggestedFilename()
    expect(filename.endsWith('.json')).toBeTruthy()

    const savedPath = test.info().outputPath(filename)
    await download.saveAs(savedPath)

    // Import the same file back.
    await page.getByRole('button', { name: '匯入 JSON' }).click()
    await page.setInputFiles('input[type="file"][accept="application/json"]', savedPath)
    await expect(page.getByText(`已匯入：${filename}`)).toBeVisible()
  })
})

