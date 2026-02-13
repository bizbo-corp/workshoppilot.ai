import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Desktop-only configuration for testing WorkshopPilot.ai against local dev server.
 * Tests run sequentially (no fullyParallel) since they share a real database.
 * Auth bypass via BYPASS_AUTH env var allows accessing protected routes without Clerk.
 */
export default defineConfig({
  testDir: './e2e',

  // Long timeouts for AI-powered flows
  timeout: 120_000, // 2 minutes per test (Gemini streaming responses are slow)
  expect: {
    timeout: 30_000, // 30 seconds for assertions (AI responses take time)
  },

  // No parallel execution - tests share a database
  fullyParallel: false,

  // Fail fast - stop on first failure
  forbidOnly: !!process.env.CI,

  // Retry once on failure
  retries: process.env.CI ? 2 : 0,

  // Use all available workers in CI, single worker locally
  workers: process.env.CI ? 2 : 1,

  // Reporter configuration
  reporter: 'html',

  // Shared settings for all projects
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry', // Capture trace on retry for debugging
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Configure projects for browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start dev server before running tests
  webServer: {
    command: 'BYPASS_AUTH=true npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000, // 2 minutes to start server
  },
});
