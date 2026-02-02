import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
  },
  base: (() => {
    /**
     * GitHub Pages base path:
     * - User site:    https://<owner>.github.io/                -> "/"
     * - Project site: https://<owner>.github.io/<repo>/         -> "/<repo>/"
     *
     * In GitHub Actions:
     * - GITHUB_REPOSITORY is "owner/repo"
     * - GITHUB_REPOSITORY_OWNER is "owner"
     */
    const owner = process.env.GITHUB_REPOSITORY_OWNER
    const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]

    if (owner && repo && repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
      return '/'
    }

    return repo ? `/${repo}/` : '/'
  })(),
})
