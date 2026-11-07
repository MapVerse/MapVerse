import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'
import { serviceWorker } from './build/serviceWorker.ts'

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

/** The commit being built: GitHub Actions says, else ask git. */
function commit(): string {
  const sha = process.env.GITHUB_SHA
  if (sha) return sha.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: 'pipe' })
      .toString()
      .trim()
  } catch {
    return 'dev'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serviceWorker()],
  // Relative asset paths, so the build also works under /MapVerse/ on GitHub Pages
  base: './',
  // Shown in the about dialog and sent with error reports
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(commit()),
    __APP_BUILT__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    // maplibre-gl is lazy-loaded in its own ~1 MB chunk; that's expected
    chunkSizeWarningLimit: 1200,
  },
  // maplibre-gl's worker is an ES module that imports a shared chunk
  worker: { format: 'es' },
  // e2e/ holds the Playwright tests, run by `npm run e2e`
  test: { exclude: [...configDefaults.exclude, 'e2e/**'] },
})
