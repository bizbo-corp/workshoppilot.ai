---
phase: 61-multiplayer-voting
plan: 01
subsystem: ui
tags: [liveblocks, voting, multiplayer, zustand, broadcast-events, react]

# Dependency graph
requires:
  - phase: 60-core-voting-ui-solo-path
    provides: VotingHud, VotingResultsPanel, voting store actions (openVoting, closeVoting, setVotingResults, resetVoting)
  - phase: 59-voting-types-store-foundation
    provides: DotVote, VotingSession, VotingResult types, multiplayer store storageMapping for dotVotes + votingSession
provides:
  - Timer-voting coupling in FacilitatorControls (votingMode prop, VOTING_OPENED/VOTING_CLOSED broadcasts)
  - VotingEventListener renderless component in MultiplayerRoomInner
  - computeVotingResults shared utility in src/lib/canvas/voting-utils.ts
  - FacilitatorControls rendered in Step 8 early return path (was previously missing)
affects:
  - 61-02 (Plan 02 builds on this broadcast infrastructure for participant UI adaptations)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "votingSessionRef pattern: useRef + useEffect to keep current value available in timer interval closures (avoids stale closure Pitfall 2)"
    - "storeApi.getState() pattern: read fresh store state at event call time rather than closure-captured values"
    - "VotingEventListener mirrors StepChangedListener/SessionEndedListener renderless component pattern"
    - "Shared voting-utils.ts: pure functions imported by both FacilitatorControls and VotingEventListener"

key-files:
  created:
    - src/lib/canvas/voting-utils.ts
  modified:
    - src/components/workshop/facilitator-controls.tsx
    - src/components/workshop/multiplayer-room.tsx
    - src/components/workshop/step-container.tsx

key-decisions:
  - "computeVotingResults extracted to src/lib/canvas/voting-utils.ts — shared between FacilitatorControls (facilitator side) and VotingEventListener (participant side) to avoid duplication"
  - "FacilitatorControls added to Step 8 early return path in step-container.tsx — it was missing from the step 8 branch; only rendered for steps 1-7 and 9-10 previously"
  - "votingMode=true when brainRewritingMatrices.length===0 AND votingSession.status !== 'closed' — covers all idea-selection phase states before brain-rewriting begins"
  - "Re-vote broadcast NOT needed in IdeationSubStepContainer.handleReVote — CRDT storageMapping syncs resetVoting()+openVoting() to all participants automatically (per plan analysis)"

patterns-established:
  - "Timer-voting coupling: timer start opens voting; timer expiry/cancel closes voting. All three paths use votingSessionRef to read current status without stale closures."
  - "Facilitator self-update pattern: facilitator calls store actions directly (openVoting/closeVoting) because useEventListener does NOT fire for the broadcaster (Liveblocks design)"

requirements-completed: [VOTE-10, VOTE-11]

# Metrics
duration: 25min
completed: 2026-03-01
---

# Phase 61 Plan 01: Multiplayer Voting — Timer-Voting Coupling Summary

**Timer-voting coupling via FacilitatorControls votingMode prop + VotingEventListener broadcast listener wiring multiplayer voting lifecycle to countdown timer events**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-01T01:50:00Z
- **Completed:** 2026-03-01T02:15:25Z
- **Tasks:** 2
- **Files modified:** 4 (+ 1 created)

## Accomplishments
- FacilitatorControls now broadcasts VOTING_OPENED when timer starts (if votingMode and voting idle), and VOTING_CLOSED (with computed results) when timer expires or is cancelled while voting is open
- VotingEventListener added to MultiplayerRoomInner — participants receive VOTING_OPENED (opens their store) and VOTING_CLOSED (computes results from fresh CRDT state, closes their store)
- Fixed discovery: FacilitatorControls was completely absent from the Step 8 early return path in step-container.tsx — added it with StepAdvanceBroadcaster so useBroadcastEvent() works inside the RoomProvider tree
- Extracted computeVotingResults to shared src/lib/canvas/voting-utils.ts, imported by both FacilitatorControls and VotingEventListener

## Task Commits

Each task was committed atomically:

1. **Task 1: Add votingMode to FacilitatorControls and couple timer to voting lifecycle** - `192b188` (feat)
2. **Task 2: Add VotingEventListener renderless component to MultiplayerRoomInner** - `58d9f0c` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `src/lib/canvas/voting-utils.ts` - Shared computeVotingResults pure function (DRY extraction)
- `src/components/workshop/facilitator-controls.tsx` - Added votingMode prop, voting lifecycle coupling in timer callbacks, votingSessionRef pattern
- `src/components/workshop/multiplayer-room.tsx` - Added VotingEventListener component + rendered in MultiplayerRoomInner
- `src/components/workshop/step-container.tsx` - Added votingSession + brainRewritingMatrices selectors; added FacilitatorControls to Step 8 early return

## Decisions Made
- computeVotingResults extracted to src/lib/canvas/voting-utils.ts instead of duplicating in both files
- FacilitatorControls was missing from Step 8 (step-container.tsx returns early for stepOrder === 8 before reaching the multiplayer block at line 1366). Added it to the Step 8 branch with StepAdvanceBroadcaster.
- votingMode derivation: `brainRewritingMatrices.length === 0 && votingSession.status !== 'closed'` — covers all pre-brain-rewriting idea-selection states
- Re-vote broadcast not needed: CRDT storageMapping syncs resetVoting()+openVoting() automatically; no broadcast required per plan's final resolution

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FacilitatorControls missing from Step 8 render path**
- **Found during:** Task 1 (investigating where FacilitatorControls is rendered)
- **Issue:** step-container.tsx has an early return at `if (stepOrder === 8)` that renders IdeationSubStepContainer and exits before reaching the `workshopType === 'multiplayer'` block at line 1366 where FacilitatorControls is normally rendered. Result: facilitator had no timer controls on Step 8.
- **Fix:** Added FacilitatorControls + StepAdvanceBroadcaster to the Step 8 early return branch, gated on `workshopType === 'multiplayer'`
- **Files modified:** src/components/workshop/step-container.tsx
- **Verification:** TypeScript compiles clean; FacilitatorControls now visible in Step 8 multiplayer
- **Committed in:** 192b188 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Critical bug fix — without this, the entire voting lifecycle would never activate since the facilitator had no timer controls on Step 8. All plan objectives now achievable.

## Issues Encountered
None — plan analysis was accurate. The step 8 early return discovery was captured by the plan's instructions to "grep for FacilitatorControls render site."

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02 can now build on VOTING_OPENED/VOTING_CLOSED broadcast infrastructure
- VotingHud + VotingResultsPanel already exist from Phase 60 (solo path)
- Plan 02 will adapt these components to respond to broadcast events (e.g., hiding VotingHud's "Start Voting" button for participants, showing VotingResultsPanel when VOTING_CLOSED received)

## Self-Check: PASSED

- src/lib/canvas/voting-utils.ts — FOUND
- src/components/workshop/facilitator-controls.tsx — FOUND
- src/components/workshop/multiplayer-room.tsx — FOUND
- .planning/phases/61-multiplayer-voting/61-01-SUMMARY.md — FOUND
- Commit 192b188 — FOUND
- Commit 58d9f0c — FOUND

---
*Phase: 61-multiplayer-voting*
*Completed: 2026-03-01*
