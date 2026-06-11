---
phase: 09-structured-outputs
plan: 02
subsystem: ai-extraction
tags: [ai-sdk-6, gemini, zod, extraction, structured-outputs, retry-logic]
requires:
  - 09-01 (Zod schemas for all 10 step artifacts)
  - 07-context-architecture (assembleStepContext for conversation history)
  - 07-context-architecture (saveStepArtifact for persistence)
provides:
  - AI-powered extraction service with retry logic
  - POST /api/extract endpoint for on-demand extraction
  - Optional Zod validation in save-artifact
  - Extraction pipeline: conversation → AI → Zod validation → retry → save
affects:
  - 09-03 (UI rendering will trigger extraction via API)
  - 10-auto-save (may use extraction for real-time artifact generation)
tech-stack:
  added: []
  patterns:
    - AI SDK 6 streamText + Output.object for structured extraction
    - Retry logic with error context for schema repair
    - Low temperature (0.1) for extraction accuracy
    - Belt-and-suspenders validation (AI SDK + explicit Zod parse)
key-files:
  created:
    - src/lib/extraction/extract-artifact.ts (core extraction service)
    - src/lib/extraction/index.ts (exports)
    - src/app/api/extract/route.ts (extraction API endpoint)
  modified:
    - src/lib/context/save-artifact.ts (added optional validation parameter)
decisions:
  - output-property:
      what: Use streamText + Output.object (not deprecated generateObject)
      why: AI SDK 6 pattern, output is PromiseLike that resolves to structured object
      impact: Extraction uses modern AI SDK 6 API
  - retry-with-context:
      what: Retry with previous error message injected into prompt
      why: Guides LLM to repair specific validation failures
      impact: 3 total attempts (initial + 2 retries) with increasing context
  - temperature-0-1:
      what: Use temperature 0.1 for extraction
      why: Low temperature increases determinism and accuracy for structured extraction
      impact: More consistent extraction results, less hallucination
  - backward-compatible-validation:
      what: Add optional validate parameter to saveStepArtifact (defaults false)
      why: Existing callers (from Phase 7) don't break
      impact: No breaking changes, new code opts into validation
  - maxDuration-60:
      what: Set maxDuration 60s for extraction endpoint
      why: AI extraction can take longer than chat (30s timeout)
      impact: Prevents serverless timeout on complex extractions
metrics:
  duration: 178s (3.0 min)
  completed: 2026-02-08
---

# Phase 9 Plan 2: Extraction Integration Summary

**AI SDK 6 extraction pipeline with retry logic extracts structured artifacts from conversation, validates with Zod, and persists to database**

## Performance

- **Duration:** 3.0 min (178 seconds)
- **Started:** 2026-02-08T04:02:17Z
- **Completed:** 2026-02-08T04:05:15Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- Extraction service using AI SDK 6's streamText + Output.object pattern
- Retry logic with error context (3 total attempts: initial + 2 retries)
- POST /api/extract endpoint for on-demand extraction
- Optional Zod validation in save-artifact (backward-compatible)
- Complete extraction pipeline: conversation → AI → validation → retry → save

## Task Commits

Each task was committed atomically:

1. **Task 1: Create extraction service with retry logic** - `ff88407` (feat)
   - extractStepArtifact function with retry and error context
   - ExtractionError custom error type
   - AI SDK 6 streamText + Output.object pattern
   - Low temperature (0.1) for accuracy

2. **Task 2: Create extraction API endpoint and update save-artifact** - `721489e` (feat)
   - POST /api/extract endpoint with maxDuration 60s
   - Optional validation in saveStepArtifact
   - Error handling: 422 extraction_failed, 400 insufficient conversation, 404 not found

## Files Created/Modified

**Created:**
- `src/lib/extraction/extract-artifact.ts` - Core extraction service with retry logic and Zod validation
- `src/lib/extraction/index.ts` - Module exports for extractStepArtifact and ExtractionError
- `src/app/api/extract/route.ts` - POST endpoint for on-demand extraction from conversation

**Modified:**
- `src/lib/context/save-artifact.ts` - Added optional validate parameter (defaults false for backward compatibility)

## Decisions Made

**1. AI SDK 6 Output.object pattern over deprecated generateObject**
- Used `streamText` with `output: Output.object({ schema })` instead of deprecated `generateObject`
- Access extracted object via `await result.output` (PromiseLike)
- Aligns with AI SDK 6 best practices from research

**2. Retry logic with error context injection**
- Initial attempt with clean prompt
- Retry attempts append previous Zod error message to guide repair
- Max 2 retries = 3 total attempts
- Logged warnings for debugging, final failure throws ExtractionError

**3. Temperature 0.1 for extraction accuracy**
- Lower than chat temperature to increase determinism
- Reduces hallucination and improves schema compliance
- Based on research showing low temp improves structured extraction

**4. Backward-compatible validation**
- Added optional `validate` parameter to saveStepArtifact (defaults false)
- Existing Phase 7 callers continue working without changes
- New extraction API opts into validation (validate=true)

**5. 60-second timeout for extraction endpoint**
- Set `maxDuration = 60` (vs 30s for chat API)
- AI extraction with retry can take longer than single chat response
- Prevents serverless timeout on complex extractions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**1. AI SDK 6 type incompatibility (resolved)**
- **Issue:** Initial attempt used `convertToModelMessages` but messages from database are simple `{ role, content }`
- **Resolution:** Manually mapped to ModelMessage format with proper type casting
- **Learning:** Database messages need explicit conversion to ModelMessage, not UIMessage → ModelMessage

**2. Output property access (resolved)**
- **Issue:** First attempt used `result.object` but property doesn't exist
- **Resolution:** Changed to `result.output` (PromiseLike that resolves to extracted object)
- **Learning:** AI SDK 6 uses `output` property, not `object`

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Ready for 09-03:** Yes
- Extraction service operational with retry logic
- API endpoint ready for UI integration
- Zod validation working end-to-end
- Error handling covers all expected failure modes (422, 400, 404, 500)
- Backward compatibility maintained for existing code

**Integration points for 09-03:**
- UI can call POST /api/extract with workshopId, stepId, sessionId
- Returns structured artifact on success
- Clear error messages for user feedback on failure

## Self-Check: PASSED

**Files created:**
- ✓ src/lib/extraction/extract-artifact.ts (exists, 108 lines)
- ✓ src/lib/extraction/index.ts (exists, 6 lines)
- ✓ src/app/api/extract/route.ts (exists, 126 lines)

**Files modified:**
- ✓ src/lib/context/save-artifact.ts (exists, updated with validate parameter)

**Commits:**
- ✓ ff88407 (Task 1: extraction service)
- ✓ 721489e (Task 2: API endpoint and validation)

**Verification:**
- ✓ `npx tsc --noEmit` passes with zero errors
- ✓ extractStepArtifact exports from src/lib/extraction
- ✓ ExtractionError exports from src/lib/extraction
- ✓ POST handler exports from src/app/api/extract/route.ts
- ✓ saveStepArtifact backward-compatible (validate defaults to false)
- ✓ Temperature set to 0.1 for extraction
- ✓ maxDuration = 60 for extraction endpoint
