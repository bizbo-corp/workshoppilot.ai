---
phase: 06-production-deployment
plan: 01
subsystem: infra
tags: [vercel, analytics, error-boundary, environment-validation, drizzle, database-migration]

# Dependency graph
requires:
  - phase: 05-ai-chat-integration
    provides: Working AI chat with streaming responses and message persistence
provides:
  - Production error boundary catching runtime errors with user-friendly UI
  - Custom 404 page with WorkshopPilot branding
  - Environment variable verification blocking production deploys with test keys or missing vars
  - Database migration config using unpooled connection for reliability
  - Vercel Analytics and Speed Insights tracking user behavior and performance
affects: [deployment, monitoring, production-readiness]

# Tech tracking
tech-stack:
  added: ['@vercel/analytics', '@vercel/speed-insights']
  patterns: ['Error boundaries at app root level', 'Build-time environment validation', 'Unpooled migrations pattern']

key-files:
  created:
    - src/app/error.tsx
    - src/app/not-found.tsx
    - scripts/verify-env.ts
  modified:
    - src/app/layout.tsx
    - drizzle.config.ts
    - package.json

key-decisions:
  - "Use tsx to run verify-env.ts directly (avoid dotenv-cli in production, Vercel injects env vars)"
  - "Place Analytics and SpeedInsights inside ThemeProvider to ensure theme context available"
  - "Log errors to console.error in error boundary for future Sentry integration"
  - "DATABASE_URL_UNPOOLED fallback to DATABASE_URL for local development compatibility"

patterns-established:
  - "Build pipeline: verify-env → migrate → build (fail fast on misconfiguration)"
  - "Error boundary at app root catches all unhandled errors gracefully"
  - "Analytics components self-contained, render nothing in dev, track in production"

# Metrics
duration: 2min
completed: 2026-02-08
---

# Phase 6 Plan 01: Production Hardening Summary

**Production-ready error handling, environment validation, analytics instrumentation, and reliable database migrations using unpooled connections**

## Performance

- **Duration:** 2 minutes
- **Started:** 2026-02-07T23:00:14Z
- **Completed:** 2026-02-07T23:02:23Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Error boundary catches runtime errors and displays user-friendly recovery UI
- Custom 404 page replaces Next.js default with branded experience
- Build pipeline validates environment variables and blocks test keys in production
- Database migrations use unpooled connection to avoid serverless connection pooling issues
- Analytics and Speed Insights track user behavior and performance on every page

## Task Commits

Each task was committed atomically:

1. **Task 1: Add production error boundaries, env verification, and fix Drizzle migration config** - `ab85f77` (feat)
2. **Task 2: Install and wire Vercel Analytics and Speed Insights** - `2c40eba` (feat)

## Files Created/Modified
- `src/app/error.tsx` - Production error boundary with retry button and home link
- `src/app/not-found.tsx` - Custom 404 page with WorkshopPilot branding
- `scripts/verify-env.ts` - Environment variable verification script checking all required vars
- `drizzle.config.ts` - Modified to use DATABASE_URL_UNPOOLED for migrations (falls back to DATABASE_URL)
- `package.json` - Updated vercel-build script to run verify-env → migrate → build pipeline
- `src/app/layout.tsx` - Added Analytics and SpeedInsights components inside ThemeProvider
- `package.json` + `package-lock.json` - Added @vercel/analytics and @vercel/speed-insights dependencies

## Decisions Made

**Environment validation approach:** Used tsx to run verify-env.ts directly instead of dotenv-cli because Vercel injects environment variables during build - no need for .env.local loading in production.

**Analytics placement:** Placed Analytics and SpeedInsights components inside ThemeProvider (after children) to ensure they have access to theme context if needed, though they're self-contained.

**Error logging strategy:** Error boundary logs to console.error for now, structured for future Sentry integration when we add error tracking service.

**Migration connection:** DATABASE_URL_UNPOOLED falls back to DATABASE_URL for local development where unpooled connection may not be configured, ensuring dev/prod parity.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without problems. Build succeeded on first attempt with all new error boundaries and analytics components.

## User Setup Required

None - no external service configuration required. Analytics and Speed Insights work automatically on Vercel (free tier included).

## Next Phase Readiness

**Production hardening complete.** The codebase now has:
- ✅ Graceful error handling for all runtime errors
- ✅ Custom 404 page for better UX
- ✅ Environment validation blocking misconfigured deployments
- ✅ Reliable database migrations using unpooled connections
- ✅ Performance and usage analytics instrumentation

**Ready for:** Production deployment to Vercel. Next plan should handle actual deployment, environment variable configuration in Vercel dashboard, and smoke testing the deployed application.

**No blockers.** All code changes committed and verified with successful builds.

## Self-Check: PASSED

All created files verified:
- ✅ src/app/error.tsx
- ✅ src/app/not-found.tsx
- ✅ scripts/verify-env.ts

All commits verified:
- ✅ ab85f77 (Task 1)
- ✅ 2c40eba (Task 2)

---
*Phase: 06-production-deployment*
*Completed: 2026-02-08*
