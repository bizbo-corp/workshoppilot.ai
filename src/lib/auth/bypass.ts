/**
 * E2E auth bypass — TEST ENVIRONMENTS ONLY.
 *
 * When `BYPASS_AUTH=true`, Playwright drives the app without a Clerk session.
 * This helper is the single source of truth for whether that bypass is active,
 * and it FAILS CLOSED: it returns `false` in any production-like environment,
 * so the bypass can never weaken auth on a real deployment even if the env var
 * is accidentally set there.
 *
 * Why `NODE_ENV === 'production'` is sufficient to cover all deploys:
 * Vercel builds BOTH production and preview deployments with
 * `NODE_ENV='production'`. Local dev (`next dev`) and CI run with
 * `NODE_ENV` of `development`/`test`. So the single NODE_ENV gate already
 * blocks every deployed environment; the explicit VERCEL_ENV checks below are
 * belt-and-suspenders in case a future runtime sets NODE_ENV differently.
 *
 * No imports — must stay Edge-runtime safe so `middleware.ts` can use it.
 */
export function isAuthBypassEnabled(): boolean {
  // Hard stop in any deployed environment. Order matters: these run before we
  // even look at BYPASS_AUTH, so a leaked env var is inert in prod/preview.
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') {
    return false;
  }
  return process.env.BYPASS_AUTH === 'true';
}
