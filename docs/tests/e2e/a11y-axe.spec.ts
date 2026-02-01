import fs from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const PAGES: Array<{ id: string; path: string }> = [
  { id: 'itinerary', path: '/itinerary' },
  { id: 'transport', path: '/transport' },
  { id: 'stays', path: '/stays' },
  { id: 'attractions', path: '/attractions' },
]

test.describe('axe a11y scan (representative pages)', () => {
  test('no critical violations', async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      // Make the scan deterministic.
      localStorage.setItem(
        'tripPlanner.settings.v1',
        JSON.stringify({ uiMode: 'standard', motion: 'low', fontScale: 0, showSeenHints: true }),
      )
    })

    const outDir = path.join(process.cwd(), 'tests', 'a11y-output', testInfo.project.name)
    fs.mkdirSync(outDir, { recursive: true })

    for (const p of PAGES) {
      await page.goto(p.path)
      await page.waitForLoadState('networkidle')

      const results = await new AxeBuilder({ page }).analyze()
      fs.writeFileSync(path.join(outDir, `axe-${p.id}.json`), JSON.stringify(results, null, 2))

      // Treat any violation as a failure by default.
      expect(results.violations, `Axe violations on ${p.path}`).toEqual([])
    }
  })
})

