import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
