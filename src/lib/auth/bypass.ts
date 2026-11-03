/**
 * Test-only auth bypass. When BYPASS_AUTH=true, the proxy protects nothing
 * and getCurrentUser returns a fixed test account, so Playwright and the
 * dummy-workshop runner can drive the app without a Clerk session.
 *
 * Fails closed: never true on a Vercel production or preview deployment,
 * whatever the env var says.
 */
export function isAuthBypassEnabled(): boolean {
  if (process.env.BYPASS_AUTH !== 'true') return false;
  const env = process.env.VERCEL_ENV;
  if (env === 'production' || env === 'preview') return false;
  return true;
}

export const BYPASS_TEST_USER = {
  clerkUserId: 'user_bypass_test',
  email: 'test@workshoppilot.local',
  name: 'Test User',
} as const;
