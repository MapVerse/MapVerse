import { existsSync } from 'node:fs'
import { chromium, defineConfig, devices } from '@playwright/test'

const PORT = 4173

// Where this machine's Chromium is, when Playwright's own isn't installed:
// PLAYWRIGHT_CHROMIUM_PATH if given, else a preinstalled one if there is
// one. In CI, `npx playwright install` puts Playwright's own in place.
const PREINSTALLED = '/opt/pw-browsers/chromium'
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ||
  (!existsSync(chromium.executablePath()) && existsSync(PREINSTALLED)
    ? PREINSTALLED
    : undefined)

// Lets page.route see what the service worker fetches too
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT}/`,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    // Tests that want the service worker turn it on themselves
    serviceWorkers: 'block',
    trace: 'on-first-retry',
    launchOptions: { executablePath },
  },
  // The production build, as it is deployed
  webServer: {
    command: `npx vite build --logLevel warn && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
