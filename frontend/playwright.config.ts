import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests of the critical journeys (e2e/*.spec.ts) on a 360 px phone screen. Starts the E2E backend
 * (backend/e2e/server.ts: fake AI and weather, in-memory MongoDB filled by the seed script, all features on)
 * and the production build (vite preview, with the service worker). Journeys share one database: run in order.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  // Generous: CI runners and busy laptops can be slow. Waiting longer never changes what a journey checks.
  timeout: 180_000,
  expect: { timeout: 30_000 },
  // No retries: a journey that only passes on a second try is a bug to fix, not to hide.
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['Pixel 5'],
    viewport: { width: 360, height: 780 },
    locale: 'hi-IN',
    timezoneId: 'Asia/Kolkata',
    trace: 'retain-on-failure',
    // On a first visit the service worker installs and takes over the page; when that lands in the middle of a
    // form it starts the screen over, which makes journeys depend on machine speed. Only the offline journey,
    // which is about the service worker, turns it on (e2e/7-offline.spec.ts).
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'phone', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command: 'npm --prefix ../backend run e2e:server',
      url: 'http://localhost:4000/health',
      timeout: 300_000,
      reuseExistingServer: false,
      stdout: 'pipe',
    },
    {
      command: 'npm run build && npx vite preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      timeout: 300_000,
      reuseExistingServer: false,
    },
  ],
});
