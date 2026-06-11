---
phase: 14-production-hardening
plan: 01
subsystem: resilience-infrastructure
tags: [rate-limiting, retry-logic, cold-starts, health-checks, vercel-cron]
requires: [gemini-api, neon-database, vercel-deployment]
provides: [rate-limit-retry-wrapper, health-warming, 429-handling]
affects: [chat-route, extraction, summary-generation]
tech-stack:
  added: [exponential-backoff]
  patterns: [retry-with-backoff, auth-gates, cron-warming]
key-files:
  created:
    - src/lib/ai/gemini-retry.ts
    - vercel.json
  modified:
    - src/app/api/chat/route.ts
    - src/lib/extraction/extract-artifact.ts
    - src/lib/context/generate-summary.ts
    - src/app/api/health/route.ts
    - package.json
key-decisions:
  - decision: "Use exponential-backoff library instead of custom implementation"
    rationale: "Battle-tested library with jitter support, configurable delays, and clear retry callback API"
    impact: "Reliable retry logic without reinventing the wheel"
  - decision: "Sentinel error pattern ('NON_RETRYABLE') to distinguish retryable vs non-retryable errors"
    rationale: "backOff library's retry callback needs boolean return; sentinel error allows fail-fast for non-rate-limit errors"
    impact: "Non-rate-limit errors fail immediately, rate-limit errors retry up to 5 times"
  - decision: "Optional CRON_SECRET auth (required in prod, optional in dev)"
    rationale: "Allows health endpoint to work unauthenticated in dev while securing cron warming in production"
    impact: "Developer experience preserved, production security enforced"
  - decision: "4-minute cron interval (Neon scales to zero at 5 minutes)"
    rationale: "Keeps Neon compute active during user hours, prevents cold start death spiral"
    impact: "500ms-5s cold start latency eliminated for active workshops"
duration: 3 min
completed: 2026-02-10
---

# Phase 14 Plan 01: Rate Limit Retry & Cold Start Prevention Summary

**One-liner:** Exponential backoff retry wrappers for all Gemini API calls (chat/extraction/summaries) with 4-minute Vercel cron warming to prevent Neon cold starts.

## Performance

**Rate Limit Resilience:**
- Gemini 429 errors trigger exponential backoff: 1s → 2s → 4s → 8s → 15s (max)
- Full jitter prevents thundering herd after rate limit recovery
- Up to 5 retry attempts before returning structured 429 response to client
- Non-rate-limit errors fail immediately (no retry overhead)

**Cold Start Prevention:**
- Vercel cron pings `/api/health` every 4 minutes
- Keeps Neon database compute active (5-minute scale-to-zero timeout)
- Eliminates 500ms-5s cold start latency during user hours
- Optional `CRON_SECRET` authentication secures warming endpoint in production

## Accomplishments

1. **Retry Infrastructure**
   - Created `src/lib/ai/gemini-retry.ts` with `streamTextWithRetry` and `generateTextWithRetry` wrappers
   - Installed `exponential-backoff` package for battle-tested retry logic
   - Implemented `isGeminiRateLimitError()` to detect 429/RESOURCE_EXHAUSTED/quota errors
   - Sentinel error pattern for fail-fast on non-retryable errors

2. **API Integration**
   - Wired retry wrappers into all 3 Gemini call sites:
     - Chat route (`src/app/api/chat/route.ts`) — streaming chat responses
     - Extraction (`src/lib/extraction/extract-artifact.ts`) — structured artifact extraction
     - Summary generation (`src/lib/context/generate-summary.ts`) — conversation summaries
   - Chat route returns structured 429 response with `retryAfter: 30` when all retries exhausted
   - Extraction and summary retry at API level, plus existing schema validation retry loop

3. **Health Check Authentication**
   - Updated `/api/health` to accept `Request` parameter and check `Authorization` header
   - Optional `CRON_SECRET` authentication (required when env var is set, optional otherwise)
   - Added `warmedAt` timestamp to response for monitoring

4. **Vercel Cron Configuration**
   - Created `vercel.json` with 4-minute cron schedule
   - Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` header when env var is configured
   - Cron interval keeps Neon compute active, preventing cold start latency

## Task Commits

| Task | Description                              | Commit  | Duration |
| ---- | ---------------------------------------- | ------- | -------- |
| 1    | Gemini retry wrapper library             | 7809cd3 | 2 min    |
| 2    | Health check auth and Vercel cron config | a8677bc | 1 min    |

## Files Created/Modified

**Created:**
- `src/lib/ai/gemini-retry.ts` (165 lines) — Retry wrappers for streamText/generateText
- `vercel.json` (7 lines) — Cron configuration for health check warming

**Modified:**
- `src/app/api/chat/route.ts` — Import streamTextWithRetry, handle 429 errors
- `src/lib/extraction/extract-artifact.ts` — Replace streamText with streamTextWithRetry
- `src/lib/context/generate-summary.ts` — Replace generateText with generateTextWithRetry
- `src/app/api/health/route.ts` — Add CRON_SECRET auth guard and warmedAt timestamp
- `package.json` / `package-lock.json` — Add exponential-backoff dependency

## Decisions Made

1. **Exponential Backoff Library:** Used `exponential-backoff` npm package instead of custom retry logic
   - Provides jitter, configurable delays, max attempts, retry callbacks
   - Battle-tested in production environments
   - Clear API for distinguishing retryable vs non-retryable errors

2. **Sentinel Error Pattern:** Use `new Error('NON_RETRYABLE')` to signal fail-fast
   - `backOff` library's retry callback expects boolean return
   - Rate limit errors rethrow for retry, non-rate-limit errors throw sentinel
   - Retry callback checks for sentinel and returns false (don't retry)

3. **Optional CRON_SECRET Auth:** Health endpoint works unauthenticated in dev, requires auth in prod
   - Check `process.env.CRON_SECRET` existence before enforcing auth
   - If set, require `Authorization: Bearer <secret>` header
   - Allows local development without secrets while securing production

4. **4-Minute Cron Interval:** Keeps Neon active (5-minute scale-to-zero timeout)
   - Prevents cold start death spiral during user hours
   - Minimal cost impact (Neon bills per compute time)
   - User setup required: Set CRON_SECRET in Vercel dashboard

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — all tasks completed successfully without blockers.

## Next Phase Readiness

**Ready for Plan 02 (User-facing resilience UI):**
- ✅ Backend retry infrastructure in place
- ✅ Structured 429 responses ready for frontend consumption
- ✅ Cold start prevention configured (pending user env var setup)

**Blockers:**
- None

**User setup required before production deployment:**
1. Generate CRON_SECRET: `openssl rand -base64 32`
2. Add CRON_SECRET to `.env.local` for local testing
3. Add CRON_SECRET to Vercel project environment variables (Dashboard → Settings → Environment Variables)
4. Deploy to production to activate cron job

**Dependencies for Plan 02:**
- React Query or similar for retry/error handling on frontend
- Toast notification system for user-friendly error messages
- Loading states for retry in progress

## Self-Check: PASSED

All files and commits verified:
- ✓ FOUND: src/lib/ai/gemini-retry.ts
- ✓ FOUND: vercel.json
- ✓ FOUND: commit 7809cd3 (Gemini retry wrapper library)
- ✓ FOUND: commit a8677bc (Health check auth and Vercel cron config)
