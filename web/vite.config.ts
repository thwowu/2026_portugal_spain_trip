import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: (() => {
    // GitHub Pages (project pages): https://<user>.github.io/<repo>/
    // In Actions, GITHUB_REPOSITORY is like "owner/repo"
    const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]
    return repo ? `/${repo}/` : '/'
  })(),
})
