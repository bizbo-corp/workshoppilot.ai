---
phase: 60-core-voting-ui-solo-path
plan: 01
subsystem: ui
tags: [voting, canvas, crazy-8s, zustand, clerk, persistence, JSONB]

# Dependency graph
requires:
  - phase: 59-voting-types-store-foundation
    provides: DotVote, VotingSession types + Zustand store actions (castVote, retractVote, openVoting, closeVoting, setVotingResults)

provides:
  - VotingHud component with idle/open/closed states and budget dot glyphs
  - Crazy8sGrid extended with votingMode props, +1 vote button, and vote count badge
  - dotVotes + votingSession persisted to JSONB via saveCanvasState/loadCanvasState
  - initialDotVotes + initialVotingSession hydrated from DB into CanvasStoreProvider on page load
  - flushCanvasState in ideation-sub-step-container includes voting state

affects:
  - 60-02-PLAN (VotingResultsPanel builds on closed votingSession.results)
  - 61-multiplayer-voting (VotingHud will need multiplayer awareness)
  - canvas-store-provider (already had initialDotVotes/initialVotingSession — now used by page.tsx)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - VotingHud as floating pill using absolute positioning + translate-x-1/2 at top-3 left-1/2
    - Budget dot glyphs rendered via Array.from map with filled/empty Unicode characters
    - Vote retraction by finding last vote in myVotesOnSlot array (ordered by insertion)
    - Conditional canvas field persistence — idle sessions not saved (saves DB space)

key-files:
  created:
    - src/components/workshop/voting-hud.tsx
  modified:
    - src/actions/canvas-actions.ts
    - src/app/workshop/[sessionId]/step/[stepId]/page.tsx
    - src/components/workshop/ideation-sub-step-container.tsx
    - src/components/workshop/crazy-8s-grid.tsx

key-decisions:
  - "VotingHud reads useCanvasStore directly (no prop drilling) — keeps parent Crazy8sCanvas clean"
  - "Idle votingSession is NOT persisted to JSONB (default reconstructed on load saves DB space)"
  - "dotVotes conditional uses canvas?.dotVotes in loadCanvasState check so voting-only saves are recognized without stickyNotes"
  - "onRetractVote in Crazy8sGrid receives vote ID (not slotId) — enables precise DotVote removal from store"

patterns-established:
  - "Pattern 1: Floating HUD pill — absolute top-3 left-1/2 -translate-x-1/2 z-30 with rounded-full bg-background/90 backdrop-blur-sm border shadow-sm"
  - "Pattern 2: Voting result computation — Map slotId->count, sort descending, assign ranks with tie handling, include all 8 slots"

requirements-completed: [VOTE-02, VOTE-03, VOTE-04, VOTE-09, VOTE-13]

# Metrics
duration: 12min
completed: 2026-02-28
---

# Phase 60 Plan 01: Core Voting UI Solo Path Summary

**VotingHud pill component with budget dot glyphs, Start/Close Voting controls, and Crazy8sGrid extended with +1 vote buttons and vote count badges — plus JSONB persistence so dotVotes and votingSession survive page refresh**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-28T08:47:30Z
- **Completed:** 2026-02-28T08:59:30Z
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- Fixed the voting persistence gap: dotVotes and votingSession are now saved to and loaded from the JSONB `_canvas` column
- Created VotingHud with three states: "Start Voting" pill (idle), budget dot glyphs + remaining count (open), nothing (closed)
- Extended Crazy8sGrid with votingMode props — each slot shows a "+1" vote button (bottom-left, disabled when budget exhausted) and a clickable vote count badge (top-right, retracts last vote)
- VotingHud correctly computes ranked results with tie handling across all 8 slots on Close Voting

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix voting persistence in canvas-actions + page.tsx + ideation flush** - `e4db0b9` (feat)
2. **Task 2: Create VotingHud component and add vote buttons/badges to Crazy8sGrid** - `b3ec889` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/components/workshop/voting-hud.tsx` - Floating pill HUD: Start Voting / budget dots / Close Voting
- `src/actions/canvas-actions.ts` - saveCanvasState + loadCanvasState extended with dotVotes + votingSession fields
- `src/app/workshop/[sessionId]/step/[stepId]/page.tsx` - Reads canvasData.dotVotes + votingSession and passes as initialDotVotes + initialVotingSession to CanvasStoreProvider
- `src/components/workshop/ideation-sub-step-container.tsx` - flushCanvasState now includes dotVotes and non-idle votingSession
- `src/components/workshop/crazy-8s-grid.tsx` - Added votingMode, dotVotes, voterId, remainingBudget, onCastVote, onRetractVote props; +1 button and vote count badge per slot

## Decisions Made
- VotingHud reads from useCanvasStore directly (no prop drilling) — parent Crazy8sCanvas stays clean
- Idle votingSession is NOT persisted to JSONB — default VotingSession is reconstructed on load, saving DB space
- loadCanvasState conditional check extended with `|| canvas?.dotVotes` so voting-only saves (no stickyNotes) are recognized
- onRetractVote in Crazy8sGrid receives the vote ID (not slotId) — enables precise DotVote removal by ID

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- VotingHud and Crazy8sGrid voting UI are complete — Plan 02 can build the VotingResultsPanel on top of the closed session results
- The HUD accepts an `onVotingClosed` callback that Plan 02's parent component can use to trigger results panel display
- Persistence is in place — solo users can cast votes, refresh the page, and resume voting from where they left off

---
*Phase: 60-core-voting-ui-solo-path*
*Completed: 2026-02-28*
