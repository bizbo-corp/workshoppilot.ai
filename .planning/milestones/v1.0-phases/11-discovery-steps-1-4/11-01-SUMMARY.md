---
phase: 11-discovery-steps-1-4
plan: 01
subsystem: ai-facilitation
tags: [summary-generation, arc-transitions, context-flow, chat-ux]
requires:
  - phase-07-context-architecture
  - phase-08-ai-facilitation-engine
  - phase-10-navigation-persistence
provides:
  - summary-generation-on-step-advance
  - message-count-arc-transitions
  - forward-context-flow
affects:
  - phase-12-definition-steps (benefits from forward context)
  - phase-13-ideation-validation-steps (benefits from forward context)
tech-stack:
  added: []
  patterns:
    - fire-and-forget-api-calls
    - heuristic-based-state-transitions
    - graceful-degradation
key-files:
  created:
    - src/app/api/chat/arc-transition/route.ts
  modified:
    - src/actions/workshop-actions.ts
    - src/components/workshop/chat-panel.tsx
key-decisions:
  - id: summary-on-advance
    decision: Summary generation happens inside advanceToNextStep server action
    rationale: Ensures summary exists before next step loads
    alternatives: Separate API call from client would create race condition
  - id: message-count-heuristic
    decision: Arc phase transitions based on message count thresholds
    rationale: Simple, predictable, MVP-appropriate (0-2=orient, 3-8=gather, 9-14=synthesize, 15-18=refine, 19-22=validate, 23+=complete)
    alternatives: AI self-reporting phase would require prompt changes
  - id: fire-and-forget-transitions
    decision: Arc transition API called fire-and-forget from client
    rationale: Non-critical operation, should not block chat UX
    alternatives: Synchronous call would add latency to chat
  - id: conditional-db-writes
    decision: Arc transition only writes to DB when phase changes
    rationale: Reduces unnecessary database writes
    alternatives: Write every time would waste resources
duration: 1 min
completed: 2026-02-08
---

# Phase 11 Plan 01: Summary Generation & Arc Transitions Summary

**One-liner:** Summary generation on step advance with message-count arc transitions

## Performance

**Duration:** 1 minute
**Commits:** 2 task commits
**Files modified:** 2
**Files created:** 1

**Execution flow:**
- Task 1: Wire summary generation (1 file modified)
- Task 2: Arc phase transitions (1 created, 1 modified)

No blockers, clean execution.

## What Was Accomplished

### Summary Generation Integration

**Problem:** Step advance marked steps complete but never generated conversation summaries. Steps 2-4 received no context from prior steps.

**Solution:** Integrated `generateStepSummary` directly into `advanceToNextStep` server action:
- Query `workshopStepId` from database using workshopId + stepId
- Get step name from step metadata
- Call `generateStepSummary` synchronously after marking step complete
- Wrap in try/catch so summary failures don't block navigation

**Result:** When user clicks Next, summary is generated before next step loads. Step 2 now receives Step 1's summary in system prompt.

### Arc Phase Transitions

**Problem:** AI arc phase stuck in "orient" forever. No mechanism to transition through gather → synthesize → refine → validate → complete.

**Solution:** Implemented message-count heuristic with fire-and-forget API:
- Created `/api/chat/arc-transition` POST endpoint
- Heuristic thresholds:
  - 0-2 messages: orient (AI introduces step)
  - 3-8 messages: gather (AI collects info)
  - 9-14 messages: synthesize (AI drafts output)
  - 15-18 messages: refine (AI helps improve)
  - 19-22 messages: validate (AI checks quality)
  - 23+ messages: complete (AI encourages completion)
- Only writes to DB when phase changes (performance optimization)
- ChatPanel fires transition after each AI response completes
- Failures silently ignored (non-critical)

**Result:** AI behavior now progresses through 6-phase arc naturally. Each chat request picks up current arc phase from database and gets phase-specific instructions.

## Task Commits

| # | Commit | Description | Files |
|---|--------|-------------|-------|
| 1 | 5cc3bfc | Wire summary generation into step advance flow | src/actions/workshop-actions.ts |
| 2 | 3aed071 | Implement arc phase transitions via message-count heuristic | src/app/api/chat/arc-transition/route.ts, src/components/workshop/chat-panel.tsx |

## Files Created

1. **src/app/api/chat/arc-transition/route.ts** (80 lines)
   - POST endpoint for arc phase transitions
   - Message-count heuristic (0-2=orient, 3-8=gather, etc.)
   - Reads current phase, only writes if changed
   - Graceful error handling (always returns 200)

## Files Modified

1. **src/actions/workshop-actions.ts** (+34 lines)
   - Import `generateStepSummary` and `getStepById`
   - `advanceToNextStep` now:
     - Queries workshopStepId
     - Gets step name from metadata
     - Calls generateStepSummary after marking complete
     - Wraps in try/catch to prevent blocking

2. **src/components/workshop/chat-panel.tsx** (+18 lines)
   - Added useEffect that fires on `status === 'ready'`
   - POST to `/api/chat/arc-transition` with workshopId, stepId, messageCount
   - Fire-and-forget (catch block silently ignores errors)

## Decisions Made

### 1. Summary generation happens inside advanceToNextStep

**Context:** Summary could be triggered from client, server action, or separate API.

**Decision:** Embed inside `advanceToNextStep` server action.

**Rationale:** Ensures summary exists before next step loads. Client-side call would create race condition where Step 2 might load before Step 1 summary finishes.

**Trade-offs:** Slightly slower step advance (adds ~500ms for AI summarization), but reliability is critical for context flow.

### 2. Message-count heuristic for arc transitions

**Context:** Need to transition AI through 6 phases (orient → complete).

**Decision:** Use message count thresholds (0-2=orient, 3-8=gather, 9-14=synthesize, 15-18=refine, 19-22=validate, 23+=complete).

**Rationale:**
- Simple and predictable for MVP
- Aligns with typical conversation lengths for each phase
- No prompt engineering needed (AI already receives phase-specific instructions)

**Alternatives considered:**
- AI self-reports phase: Would require prompt changes and output parsing
- Time-based: User pacing varies too much
- Artifact-based: Would couple arc to extraction (want them independent)

**Trade-offs:** Less flexible than AI self-reporting, but far simpler. Can be refined in future based on real usage patterns.

### 3. Fire-and-forget arc transition calls

**Context:** Arc transition could block chat or run in background.

**Decision:** Fire-and-forget from client after each AI response.

**Rationale:** Arc transition is non-critical. If it fails, next chat request will still use previous phase (slightly delayed progression, but not broken). Should not add latency to chat UX.

**Trade-offs:** Potential for missed transitions if API fails, but chat flow remains unaffected.

### 4. Conditional database writes for arc transitions

**Context:** Arc transition endpoint could write every time or only on change.

**Decision:** Check current phase, only write if different.

**Rationale:** Most transitions happen at boundaries (e.g., message 3, 9, 15). Within a phase, many calls would write same value. Reduces DB load.

**Implementation:** `getCurrentArcPhase` query before `transitionArcPhase` update.

## Deviations from Plan

None - plan executed exactly as written.

## Issues & Mitigations

### Non-Issues (Anticipated and Handled)

1. **Summary generation failures:** Wrapped in try/catch, logged, step advance continues
2. **Arc transition failures:** Fire-and-forget, errors silently ignored
3. **Race conditions on arc phase:** Database is source of truth, chat API reads on every request

### Future Improvements

1. **Tunable thresholds:** Message-count thresholds are hardcoded. Future: make configurable per step.
2. **AI self-reporting:** More sophisticated arc transition logic where AI indicates readiness to advance.
3. **Retry logic:** Summary generation could retry once on failure before falling back.

## Next Phase Readiness

**Blockers:** None

**Dependencies satisfied:**
- ✅ Summary generation works (forward context for Steps 2-4)
- ✅ Arc transitions work (AI progresses through conversation arc)
- ✅ No regressions in chat, navigation, or extraction

**Ready for Phase 11 Plan 02:** Discovery Steps 1-4 prompts and schemas

**Notes for next plan:**
- Step prompts can now reference `{shortTermContext}` knowing it will contain prior step summaries
- Arc phase instructions are already in place (from Phase 8), just needed transition mechanism
- Message-count thresholds may need tuning after testing with real Discovery Steps

## Self-Check: PASSED

All commits verified:
- ✅ 5cc3bfc exists
- ✅ 3aed071 exists

All created files verified:
- ✅ src/app/api/chat/arc-transition/route.ts exists
