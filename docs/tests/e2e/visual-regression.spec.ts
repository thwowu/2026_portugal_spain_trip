import { expect, test } from '@playwright/test'

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
    label: '標準模式',
    // Keep it stable: avoid high motion + keep hints on.
    settings: { uiMode: 'standard', motion: 'low', fontScale: 0, showSeenHints: true },
  },
  {
    id: 'senior',
    label: '長輩模式',
    settings: { uiMode: 'senior', motion: 'low', fontScale: 1, showSeenHints: true },
  },
]

const PAGES: Array<{ id: string; path: string; stableSelector?: string }> = [
  { id: 'itinerary', path: '/itinerary', stableSelector: '.container' },
  { id: 'transport', path: '/transport', stableSelector: '.container' },
  { id: 'stays', path: '/stays', stableSelector: '.container' },
  { id: 'attractions', path: '/attractions', stableSelector: '.container' },
]

test.describe('visual regression (key pages)', () => {
  for (const mode of MODES) {
    test.describe(mode.label, () => {
      test.beforeEach(async ({ page }) => {
        await page.addInitScript((settings) => {
          localStorage.setItem('tripPlanner.settings.v1', JSON.stringify(settings))
        }, mode.settings)
      })

      for (const p of PAGES) {
        test(`${p.id} - above the fold`, async ({ page }) => {
          await page.goto(p.path)
          await page.waitForLoadState('networkidle')
          if (p.stableSelector) await page.locator(p.stableSelector).first().waitFor()

          await expect(page).toHaveScreenshot(`vr-${mode.id}-${p.id}.png`, {
            fullPage: false,
          })
        })
      }

      test('attractions - longread modal', async ({ page }) => {
        await page.goto('/attractions')
        await page.waitForLoadState('networkidle')

        // Use a stable, content-driven modal test already supported by the page.
        // We open the first "長文" button if present; otherwise skip.
        const openLongRead = page.getByRole('button', { name: /長文|閱讀|完整/i }).first()
        if (!(await openLongRead.isVisible().catch(() => false))) {
          test.skip(true, 'No long read entry point found')
        }

        await openLongRead.click()

        const body = page.getByTestId('attractions-longread-body')
        await expect(body).toBeVisible()

        await expect(body).toHaveScreenshot(`vr-${mode.id}-attractions-longread-body.png`)
      })
    })
  }
})

