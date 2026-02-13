/**
 * E2E Authentication Bypass
 *
 * This file documents the approach for bypassing Clerk authentication during E2E tests.
 *
 * How it works:
 * - When BYPASS_AUTH=true environment variable is set, the Clerk middleware in src/proxy.ts
 *   skips authentication checks, allowing Playwright tests to access all routes including
 *   protected routes (steps 4-10, dashboard, admin) without requiring Clerk credentials.
 *
 * - The createWorkshopSession server action gracefully handles missing auth by falling back
 *   to clerkUserId = 'anonymous' when auth() returns { userId: null }.
 *
 * - This eliminates the need for Clerk API keys during testing and simplifies CI/CD setup.
 *
 * Usage:
 * - Run tests with: BYPASS_AUTH=true playwright test
 * - Or use npm scripts: npm run test:e2e (which sets BYPASS_AUTH=true automatically)
 */

export const E2E_AUTH_BYPASS = true;
