---
phase: 65-validation-guidance-wiring
plan: 01
subsystem: validation
tags: [validation, output-type, guidance, build-pack, markdown, classifier]

# Dependency graph
requires:
  - phase: 63-journey-flow-editor-core
    provides: Journey Flow and isApproved state used by digital-path gate
  - phase: 64-ai-baseline-generation
    provides: Validation AI infrastructure
provides:
  - offPlatform field on ValidationGuidance for all 5 non-digital buckets
  - isDigitalOutputType() exported helper for UI code
  - Build Pack markdown export includes off-platform guidance
  - classifyOutputType() audited as single entry point with accurate docs
  - Corrected outputTypeSchema doc comment (digital bucket gate)
affects: [65-02, 65-03, 66-prototype-builder]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ValidationGuidance.offPlatform field: non-digital buckets carry external tool guidance; digital bucket intentionally omits it (in-platform path only)"
    - "isDigitalOutputType() is the canonical digital/non-digital split — never hand-roll bucket checks in UI code"

key-files:
  created: []
  modified:
    - src/lib/validation/output-type-guidance.ts
    - src/lib/validation/plan-markdown.ts
    - src/lib/validation/classify-output-type.ts
    - src/lib/schemas/validation-schemas.ts

key-decisions:
  - "offPlatform strings use double-quote delimiters to avoid escaped-apostrophe parse issues — original file had curly/smart quote corruption in the physical bucket; rewrite fixed to straight quotes throughout"
  - "classifyOutputType() confirmed invoked from exactly one place (src/app/api/validation/classify/route.ts) — no parallel classifier exists"
  - "Combined output types (outputTypes array) are UI-only; the classifier always returns a single type by design — documented in AUDIT block"

patterns-established:
  - "Non-digital guidance copy: direct, tool-named, step-oriented — matches soul.md voice (no filler, no platform lock-in language)"
  - "Doc-comment auditing pattern: AUDIT (Phase N) block added to single-entry-point functions to prevent duplication"

requirements-completed: [VAL-02, VAL-04]

# Metrics
duration: 6min
completed: 2026-06-11
---

# Phase 65 Plan 01: Validation Guidance Wiring — Content Layer Summary

**offPlatform field added to all 5 non-digital guidance buckets with concrete off-tool steps; isDigitalOutputType() exported; Build Pack markdown renders it; classifyOutputType() hardened with accurate 8-type/single-type/confidence docs**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-11T02:05:24Z
- **Completed:** 2026-06-11T02:11:xx Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Every non-digital guidance bucket (brand, physical, service, campaign, offering) now carries an `offPlatform` field with concrete external-tool steps matching the soul.md voice
- `isDigitalOutputType()` exported from `output-type-guidance.ts` as the canonical digital-bucket split so plan 03's UI code never hand-rolls it
- Build Pack markdown export (`plan-markdown.ts`) renders the off-platform line after "After the workshop" in plain text — no link syntax (Pitfall 1 avoided)
- `classifyOutputType()` header updated: "five types" → "eight types", AUDIT block documents single-entry-point contract, combined-types-are-UI-only, confidence threshold, and user_override semantics
- `outputTypeSchema` doc comment corrected: stale "ONLY app_digital" sentence replaced with accurate digital-path gate description referencing `isDigitalOutputType`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add offPlatform field + isDigitalOutputType helper, render in Build Pack markdown** - `f29a6bb` (feat)
2. **Task 2: Audit classifyOutputType docs and fix stale schema comment** - `46a0b67` (feat)

## Files Created/Modified
- `src/lib/validation/output-type-guidance.ts` — offPlatform field on interface + 5 non-digital entries + isDigitalOutputType() export + updated header doc
- `src/lib/validation/plan-markdown.ts` — renders offPlatform line after "After the workshop" block
- `src/lib/validation/classify-output-type.ts` — header comment corrected (8 types) + AUDIT block documenting single-entry-point contract
- `src/lib/schemas/validation-schemas.ts` — outputTypeSchema doc comment updated to accurate digital-path gate description

## Decisions Made
- `offPlatform` strings use double-quote delimiters (`"..."`) to avoid escaped-apostrophe parsing issues; the original file had mixed curly/smart quote corruption in the physical bucket — a full file rewrite fixed encoding to consistent straight quotes throughout.
- Combined output types (`outputTypes` array) are UI-only by design; the classifier returns a single type. Documented in the AUDIT block rather than as a code change — runtime behavior was audited-OK per 65-RESEARCH.md.
- `isDigitalOutputType()` takes `OutputType` (not `GuidanceBucket`) so callers never need to import the internal bucket type.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed smart/curly quote encoding corruption in physical bucket**
- **Found during:** Task 1 (offPlatform field addition)
- **Issue:** Edit operations introduced smart/curly left-quote characters (`\xe2\x80\x98`) as string delimiters in the physical bucket's approach string. TypeScript treats these as invalid characters (not string delimiters), causing tsc errors on lines 91+.
- **Fix:** Rewrote the entire file using `Write` tool to ensure consistent straight-quote delimiters throughout. Switched brand/physical offPlatform strings to double-quote delimiters to avoid escaped-apostrophe issues.
- **Files modified:** src/lib/validation/output-type-guidance.ts
- **Verification:** `npx tsc --noEmit` exits 0 post-fix; `eslint` exits 0
- **Committed in:** f29a6bb (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - encoding bug introduced during editing)
**Impact on plan:** Fix was necessary for correctness (tsc failures). No scope changes, no behavioral impact.

## Issues Encountered
- The original file had mixed quote styles (smart/curly quotes in the physical+service sections from prior editing). The Edit tool matched and re-emitted these as corrupted openers. Detected immediately via tsc, fixed by full-file Write.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `isDigitalOutputType()` is ready for plan 03 to consume (ValidationGuidanceCard digital-path routing)
- `offPlatform` content is live in the guidance layer — plan 02/03 can render it in the card without content work
- Classifier docs accurate — plan 03 can rely on the documented confidence contract for disclosure rendering

---
*Phase: 65-validation-guidance-wiring*
*Completed: 2026-06-11*
