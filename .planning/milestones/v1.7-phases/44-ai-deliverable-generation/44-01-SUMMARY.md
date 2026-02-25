---
phase: 44-ai-deliverable-generation
plan: "01"
subsystem: api

tags: [gemini, build-pack, prd, tech-specs, drizzle, clerk]

requires:
  - phase: 43-workshop-completion
    provides: completeWorkshop action + deliverable card shell with disabled=true state

provides:
  - AllWorkshopArtifacts interface + loadAllWorkshopArtifacts() covering all 10 design thinking steps
  - buildFullPrdPrompt() and buildFullPrdJsonPrompt() in prd-generation.ts
  - buildTechSpecsPrompt() and buildTechSpecsJsonPrompt() in tech-specs-generation.ts
  - POST /api/build-pack/generate-prd (type='full-prd') — generates Markdown + JSON PRD, cached in build_packs
  - POST /api/build-pack/generate-tech-specs — generates Markdown + JSON Tech Specs, cached in build_packs

affects:
  - 44-02 (UI wiring that calls these routes and renders the generated documents)
  - build_packs table (two rows per deliverable: markdown + json formatType)

tech-stack:
  added: []
  patterns:
    - "Dual-format storage: each AI deliverable stored as both formatType='markdown' and formatType='json' in build_packs"
    - "Parallel generation: Promise.allSettled for concurrent Gemini calls halves latency"
    - "Cache-first: check build_packs for existing rows before invoking Gemini"
    - "Graceful degradation: JSON parse failure falls back to { raw: text }, markdown failure noted in response without blocking JSON"
    - "Type-branched routing: type='full-prd' vs default V0 path in generate-prd route"

key-files:
  created:
    - src/lib/ai/prompts/tech-specs-generation.ts
    - src/app/api/build-pack/generate-tech-specs/route.ts
  modified:
    - src/lib/build-pack/load-workshop-artifacts.ts
    - src/lib/ai/prompts/prd-generation.ts
    - src/app/api/build-pack/generate-prd/route.ts

key-decisions:
  - "type='full-prd' field differentiates PRD generation from V0 prototype path — no type field = V0 (backward compatible)"
  - "PRD title prefix 'PRD:' and Tech Specs prefix 'Tech Specs:' used for cache lookup via LIKE query"
  - "maxDuration=60 for both generation routes (Gemini needs more time for 2000-3000 word documents)"
  - "Auth check added to generate-prd route (was missing in original V0 implementation)"
  - "Markdown fences stripped from JSON responses before JSON.parse (Gemini sometimes wraps in ```json blocks)"

patterns-established:
  - "AI generation routes: auth() + ownership check + cache check + parallel generation + usage tracking + upsert storage"

requirements-completed: [GEN-01, GEN-02, GEN-03, GEN-04]

duration: 4min
completed: 2026-02-25
---

# Phase 44 Plan 01: AI Generation Engine Summary

**Gemini-powered PRD and Tech Specs generation from all 10 workshop steps, stored as Markdown + JSON in build_packs with caching and parallel generation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-25T07:30:40Z
- **Completed:** 2026-02-25T07:34:50Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Expanded artifact loader from 6 steps to all 10 (added stakeholder-mapping, user-research, ideation, validate)
- Created comprehensive PRD prompt (Markdown + JSON variants) mapping each section to specific workshop steps
- Created Technical Specifications prompt (Markdown + JSON variants) deriving tech requirements from workshop data
- Refactored generate-prd route to support dual paths (V0 prototype preserved + new full-PRD), added auth
- Created generate-tech-specs route with same pattern: auth + cache + parallel generation + dual storage

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand artifact loading to all 10 steps and create PRD + Tech Specs prompts** - `86220a7` (feat)
2. **Task 2: Create PRD and Tech Specs generation API routes with dual-format storage** - `c01e10d` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified

- `src/lib/build-pack/load-workshop-artifacts.ts` - Added AllWorkshopArtifacts interface (10 steps) + loadAllWorkshopArtifacts()
- `src/lib/ai/prompts/prd-generation.ts` - Added buildFullPrdPrompt() and buildFullPrdJsonPrompt() for full PRD
- `src/lib/ai/prompts/tech-specs-generation.ts` - Created: buildTechSpecsPrompt() and buildTechSpecsJsonPrompt()
- `src/app/api/build-pack/generate-prd/route.ts` - Refactored: type-branched routing, added auth, preserved V0 path
- `src/app/api/build-pack/generate-tech-specs/route.ts` - Created: full Tech Specs generation API

## Decisions Made

- `type='full-prd'` field in POST body differentiates new PRD path from existing V0 prototype path — no breaking changes
- Cache lookup uses `LIKE 'PRD:%'` and `LIKE 'Tech Specs:%'` title prefixes to find existing rows regardless of exact concept name
- `maxDuration=60` for both routes — PRD/Tech Specs generation uses more tokens than the short V0 prompt
- Auth check added to generate-prd route — the original V0 implementation lacked ownership verification (Rule 2 fix applied)
- Markdown fences stripped from JSON output with regex before parsing — Gemini sometimes ignores the "no fences" instruction
- Partial failure handling: if one format (markdown/json) fails, the other is still stored and returned

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added auth to existing generate-prd route**
- **Found during:** Task 2 (refactoring generate-prd/route.ts)
- **Issue:** Original V0 generate-prd route had no auth() or ownership check — any user could generate for any workshopId
- **Fix:** Added auth() from @clerk/nextjs/server + workshop ownership query before generation
- **Files modified:** src/app/api/build-pack/generate-prd/route.ts
- **Verification:** TypeScript passes, auth pattern matches other API routes (e.g., workshops/migrate/route.ts)
- **Committed in:** c01e10d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical security)
**Impact on plan:** Auth fix was a security correctness requirement. No scope creep.

## Issues Encountered

None — plan executed cleanly. TypeScript passed on first attempt for both tasks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Generation engine is complete and ready for Phase 44-02 (UI wiring)
- `/api/build-pack/generate-prd` (with `type: 'full-prd'`) returns `{ markdown, json, title, cached }`
- `/api/build-pack/generate-tech-specs` returns `{ markdown, json, title, cached }`
- Both routes cache to `build_packs` table — Phase 44-02 can read from there or call the routes directly
- No blockers

---
*Phase: 44-ai-deliverable-generation*
*Completed: 2026-02-25*
