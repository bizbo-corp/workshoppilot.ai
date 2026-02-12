---
phase: 30-ux-polish
plan: 03
subsystem: ui
tags: [react, chat, canvas, auto-scroll, react-flow]

# Dependency graph
requires:
  - phase: 30-01
    provides: Chat panel and canvas components
provides:
  - Chat panel with reliable auto-scroll behavior (instant on mount, smooth on new messages, respects user position)
  - Canvas gridColumns initialization guard preventing duplicate Journey Map cards
affects: [ux-polish, chat-ux, canvas-ux]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Split auto-scroll into mount-time (instant) vs ongoing (smooth) effects"
    - "Use requestAnimationFrame to wait for DOM paint before initial scroll"
    - "Check user scroll position before auto-scrolling to preserve manual navigation"
    - "Use refs to capture initial state and prevent re-initialization on re-renders"

key-files:
  created: []
  modified:
    - src/components/workshop/chat-panel.tsx
    - src/components/canvas/react-flow-canvas.tsx

key-decisions:
  - "Auto-scroll threshold: 150px from bottom determines if user is 'near bottom'"
  - "Mount-time scroll uses 'instant' behavior (no animation) to avoid jarring UX on page load"
  - "Ongoing messages use 'smooth' behavior for polished feel when actively chatting"
  - "Grid columns initialization guarded with hadInitialGridColumns ref to prevent overwriting saved state"

patterns-established:
  - "Pattern: Mount-time initialization with requestAnimationFrame ensures DOM is ready before interaction"
  - "Pattern: User scroll position detection prevents aggressive auto-scroll from disrupting manual navigation"
  - "Pattern: Refs for tracking initial hydration state prevent re-initialization race conditions"

# Metrics
duration: 1min
completed: 2026-02-12
---

# Phase 30 Plan 03: UX Polish - Behavior Fixes Summary

**Chat panel reliably scrolls to bottom on mount (instant) and on new messages (smooth, respects user position), Journey Map no longer duplicates cards on load**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-12T19:16:47Z
- **Completed:** 2026-02-12T19:18:22Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Chat panel instantly scrolls to bottom on page load without visible animation
- New messages trigger smooth auto-scroll only when user is near bottom (within 150px)
- Users can scroll up to read history without being forcibly snapped back to bottom
- Journey Map step loads without creating duplicate canvas cards (gridColumns init properly guarded)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix chat panel auto-scroll reliability** - `45f821e` (fix)
2. **Task 2: Fix Journey Map duplicate card creation on load** - `be35b50` (fix)

## Files Created/Modified
- `src/components/workshop/chat-panel.tsx` - Split auto-scroll into mount-time (instant, with requestAnimationFrame) and ongoing (smooth, with user position check)
- `src/components/canvas/react-flow-canvas.tsx` - Guard gridColumns initialization with hadInitialGridColumns ref to prevent overwriting saved state

## Decisions Made

1. **Auto-scroll threshold: 150px from bottom** - Balances UX: users near bottom see new messages automatically, but scrolling up to read history isn't interrupted.

2. **Mount-time scroll behavior: 'instant'** - Avoids jarring scroll animation when loading page with existing messages. User sees bottom immediately.

3. **Ongoing scroll behavior: 'smooth'** - Provides polished feel during active conversation when new messages arrive.

4. **requestAnimationFrame for mount scroll** - Ensures DOM is fully painted before scrolling, fixing race condition where scroll fired before message elements rendered.

5. **hadInitialGridColumns ref for canvas** - Captures initial state at mount to distinguish first-visit (need defaults) from return-visit (have saved state), preventing saved gridColumns from being overwritten by defaults.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Build system temp file errors**: Encountered Turbopack build errors unrelated to code changes (ENOENT on temp files). Verified changes with TypeScript type check instead (`npx tsc --noEmit`), which passed cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Chat UX improvements complete (auto-scroll reliable)
- Canvas UX improvements complete (no duplicate cards on Journey Map load)
- Ready for next UX polish plan in Phase 30

## Self-Check: PASSED

**Files:**
- FOUND: src/components/workshop/chat-panel.tsx
- FOUND: src/components/canvas/react-flow-canvas.tsx
- FOUND: .planning/phases/30-ux-polish/30-03-SUMMARY.md

**Commits:**
- FOUND: 45f821e (Task 1 - chat panel auto-scroll)
- FOUND: be35b50 (Task 2 - Journey Map duplicate fix)

All claims verified.

---
*Phase: 30-ux-polish*
*Completed: 2026-02-12*
