import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    // Vite preview default is 4173; we also pin it in webServer.
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], browserName: 'chromium' },
    },
    {
      name: 'tablet-chromium',
      // iPad device descriptors default to WebKit; keep Chromium for consistency.
      use: { ...devices['iPad (gen 7)'], browserName: 'chromium' },
    },
    {
      name: 'mobile-chromium',
      // Playwright's iPhone device descriptors default to WebKit.
      // We want mobile viewport/emulation on Chromium for this project.
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
  ],
})

