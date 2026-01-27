import fs from 'node:fs'
import path from 'node:path'
import { test } from '@playwright/test'

type Mode = {
  id: string
  label: string
  settings: {
    uiMode: 'standard' | 'senior'
    motion: 'standard' | 'low'
    fontScale: 0 | 1 | 2
    showSeenHints: boolean
  }
}

const MODES: Mode[] = [
  {
    id: 'standard',
    label: '標準模式（標準字體/標準動態）',
    settings: { uiMode: 'standard', motion: 'standard', fontScale: 0, showSeenHints: true },
  },
  {
    id: 'senior',
    label: '長輩模式（更大字/低動態）',
    settings: { uiMode: 'senior', motion: 'low', fontScale: 1, showSeenHints: true },
  },
]

const PAGES: Array<{ id: string; path: string }> = [
  { id: 'itinerary', path: '/itinerary' },
  { id: 'transport', path: '/transport' },
  { id: 'stays', path: '/stays' },
  { id: 'attractions', path: '/attractions' },
]

test.describe('design review screenshots', () => {
  for (const mode of MODES) {
    test(`${mode.label}`, async ({ page }, testInfo) => {
      // Make the run deterministic (no onboarding overlay, fixed settings).
      await page.addInitScript((settings) => {
        localStorage.setItem('tripPlanner.onboarding.v1', JSON.stringify({ seen: true }))
        localStorage.setItem('tripPlanner.settings.v1', JSON.stringify(settings))
      }, mode.settings)

      const outDir = path.join(process.cwd(), 'tests', 'design-review-output', testInfo.project.name)
      fs.mkdirSync(outDir, { recursive: true })

      for (const p of PAGES) {
        await page.goto(p.path)
        await page.waitForLoadState('networkidle')

        // Focus on the default above-the-fold layout for design review.
        const file = path.join(outDir, `design-${mode.id}-${p.id}.png`)
        await page.screenshot({ path: file, fullPage: false })
      }
    })
  }
})

