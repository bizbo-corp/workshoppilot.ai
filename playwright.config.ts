import { defineConfig, devices } from '@playwright/test';

/**
 * End to end tests run against the real app with two switches:
 *   BYPASS_AUTH=true  a fixed test account instead of Clerk
 *   AI_FAKE=true      a scripted facilitator instead of a model
 * Nightly runs set AI_FAKE=false to exercise real models.
 */
const PORT = 3011;

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `BYPASS_AUTH=true AI_FAKE=${process.env.AI_FAKE ?? 'true'} NEXT_DIST_DIR=.next-e2e npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
