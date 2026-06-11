---
phase: 16-split-screen-layout
plan: 01
subsystem: ui
tags: [react-resizable-panels, split-screen, canvas, accordion, layout]

# Dependency graph
requires:
  - phase: 15-canvas-foundation
    provides: CanvasWrapper component rendering ReactFlow canvas
  - phase: 14-output-extraction
    provides: OutputPanel and ArtifactConfirmation components
provides:
  - RightPanel component with canvas + output accordion layout
  - OutputAccordion component for collapsible output display
  - Split-screen desktop layout (320px chat left, canvas right)
  - Invisible-until-hover resizable divider
  - Panel size persistence across steps
affects: [16-02-mobile-tabs, canvas-features, output-display]

# Tech tracking
tech-stack:
  added: []
  patterns: [accordion-expansion-callback, conditional-layout-switching, invisible-divider-pattern]

key-files:
  created:
    - src/components/workshop/output-accordion.tsx
    - src/components/workshop/right-panel.tsx
  modified:
    - src/components/workshop/step-container.tsx

key-decisions:
  - "Chat panel defaults to 25% width (~320px on 1280px viewport)"
  - "Divider invisible by default (w-0) with hover/drag reveal"
  - "Panel sizes persist via Group id='workshop-panels' (react-resizable-panels auto-save)"
  - "Accordion expansion triggers layout switch between full-canvas and 50/50 split"
  - "OutputAccordion uses callback pattern (onExpandedChange) to notify parent of expansion state"

patterns-established:
  - "Accordion expansion callback: Child component exposes onExpandedChange prop to notify parent of internal state changes"
  - "Conditional layout switching: Parent tracks accordion expansion state and conditionally renders vertical Group only when expanded"
  - "Invisible divider: w-0 default with hover/drag opacity reveal on inner visual indicator div"

# Metrics
duration: 3min
completed: 2026-02-11
---

# Phase 16 Plan 01: Split-Screen Layout Summary

**Desktop split-screen with 320px chat panel, canvas on all steps, and collapsible output accordion at bottom**

## Performance

- **Duration:** 2 min 40 sec
- **Started:** 2026-02-10T20:21:42Z
- **Completed:** 2026-02-10T20:24:22Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created OutputAccordion component with collapsible UI and ArtifactConfirmation integration
- Created RightPanel component rendering CanvasWrapper on ALL steps (not just step 8)
- Refactored step-container desktop layout to 25/75 split with invisible divider
- Canvas now visible as primary workspace on every step
- Output appears as accordion at bottom of right panel when artifact extracted
- Panel sizes persist across steps and page reloads via react-resizable-panels id prop

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OutputAccordion and RightPanel components** - `3777941` (feat)
2. **Task 2: Refactor step-container desktop layout** - `0dfed8f` (feat)

## Files Created/Modified
- `src/components/workshop/output-accordion.tsx` - Collapsible accordion with OutputPanel and ArtifactConfirmation, collapsed state shows "Output" label with chevron
- `src/components/workshop/right-panel.tsx` - Right panel container with CanvasWrapper (always rendered) and OutputAccordion (conditionally), switches between full-canvas and 50/50 split based on expansion
- `src/components/workshop/step-container.tsx` - Desktop layout refactored to 25% chat panel (320px), 75% right panel, invisible divider (w-0 with hover reveal), deleted renderOutput() function

## Decisions Made

**Chat panel sizing:** Set to 25% default (approximately 320px on typical 1280px viewport) instead of 50%. This makes chat the "assistant sidebar" rather than equal partner, giving canvas primary visual focus.

**Divider visibility:** Implemented invisible-until-hover pattern (w-0 class with opacity-based reveal) instead of always-visible border. Creates cleaner visual split while maintaining full resize functionality.

**Panel persistence prop:** Used `id="workshop-panels"` on Group (not `autoSaveId`). The react-resizable-panels library uses the `id` prop for localStorage persistence, not a custom autoSaveId prop.

**Accordion expansion pattern:** OutputAccordion exposes `onExpandedChange` callback to notify RightPanel of internal expansion state. RightPanel tracks this and conditionally renders either full-height canvas + collapsed bar OR vertical Group with 50/50 split. This avoids prop-drilling expansion state down and lets the accordion control its own display.

## Deviations from Plan

**1. [Rule 1 - Bug] Fixed react-resizable-panels prop name**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** Plan specified `autoSaveId` prop but react-resizable-panels uses `id` for persistence
- **Fix:** Changed `autoSaveId="workshop-panels"` to `id="workshop-panels"`
- **Files modified:** src/components/workshop/step-container.tsx
- **Verification:** TypeScript compilation passes, build succeeds
- **Committed in:** 0dfed8f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential correctness fix. Prop name error would have prevented panel size persistence. No scope creep.

## Issues Encountered
None - TypeScript error was quickly identified and fixed via prop name correction.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Split-screen desktop layout complete and functional
- Canvas visible on all steps as primary workspace
- Output accordion appears conditionally when artifact extracted
- Mobile layout currently uses RightPanel but needs tab-based redesign (Plan 02)
- Ready for mobile tab layout implementation

## Self-Check: PASSED

**Created files verified:**
```
FOUND: src/components/workshop/output-accordion.tsx
FOUND: src/components/workshop/right-panel.tsx
```

**Commits verified:**
```
FOUND: 3777941
FOUND: 0dfed8f
```

**Build verification:**
```
npm run build succeeded with no errors
```

---
*Phase: 16-split-screen-layout*
*Completed: 2026-02-11*
