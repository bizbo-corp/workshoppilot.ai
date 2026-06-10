---
phase: 63-journey-flow-editor-core
plan: 03
subsystem: ui
tags: [xyflow, react-flow, zustand, canvas, journey-flow]

# Dependency graph
requires:
  - phase: 63-01
    provides: store, types, save route, provider hooks
  - phase: 63-02
    provides: JourneyFlowNodeCard, JourneyFlowEdge component, JourneyFlowNodeDetail

provides:
  - JourneyFlowCanvas: ReactFlow canvas with connect/reconnect/add/delete/approve wiring
  - JourneyFlowToolbar: top-left Panel (back link + Mark complete button / approved badge)
  - JourneyFlowCanvasToolbar: bottom-center floating toolbar (pointer/hand + Add Screen)

affects:
  - 63-04 (route mount — imports JourneyFlowCanvas)
  - 64 (AI generation writes nodes that this canvas renders)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ReactFlowProvider wrapper pattern (outer export wraps inner to ensure useReactFlow access)
    - Display-nodes mirror (displayNodes/displayEdges state separate from store, synced via useEffect, updated by applyNodeChanges for anti-snap-back drag)
    - module-level nodeTypes/edgeTypes consts (outside component to avoid ReactFlow re-registration warnings)
    - deleteKeyCode null guard while detail dialog is open (prevents Backspace in input deleting selected node)

key-files:
  created:
    - src/components/journey-flow/journey-flow-canvas.tsx
    - src/components/journey-flow/journey-flow-toolbar.tsx
  modified: []

key-decisions:
  - "spinner icon name used for approving state (not loader-circle) — matches phosphor-icons alias in icon.tsx"
  - "JourneyFlowCanvasToolbar rendered as sibling outside ReactFlow div so it is unaffected by ReactFlow zoom/pan transforms"
  - "handleAddNodeAt opens detail dialog immediately after creating adjacent node so user names it right away"
  - "handleApprove reverts setApproved(false) on fetch failure + shows toast.error — prevents ghost-approved state"

patterns-established:
  - "Provider wrapper: export function Foo(props) { return <ReactFlowProvider><FooInner {...props} /></ReactFlowProvider>; }"
  - "Display mirror: rfNodes/rfEdges derived via useMemo, mirrored to displayNodes/displayEdges via useEffect, handlers use applyNodeChanges/applyEdgeChanges first then sync to store"
  - "Reconnect trio: edgeReconnectSuccessful ref initialized false in onReconnectStart, set true in onReconnect, checked in onReconnectEnd to guard missed-drop deletion"

requirements-completed: [FLOW-03, FLOW-04, FLOW-05, FLOW-07]

# Metrics
duration: 2min
completed: 2026-06-11
---

# Phase 63 Plan 03: Journey Flow Canvas and Toolbar Summary

**ReactFlow canvas with display-node mirror, fork-capable edges, (+) adjacency add, keyboard delete guard, and approve-with-immediate-save — wired to the journey-flow-store**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-06-10T22:58:11Z
- **Completed:** 2026-06-10T23:00:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `JourneyFlowCanvas`: full ReactFlow surface with display-nodes mirror pattern, drag-to-connect (forks allowed), reconnect trio, (+) adjacency add at directional offsets, keyboard Delete with dialog-open guard, and approve-with-save flow
- `JourneyFlowToolbar`: top-left Panel with back link and Mark complete / approved badge swap on `isApproved`
- `JourneyFlowCanvasToolbar`: bottom-center floating bar with pointer/hand toggle and Add Screen button

## Task Commits

1. **Task 1: Create JourneyFlowToolbar** - `f279c57` (feat)
2. **Task 2: Create JourneyFlowCanvas** - `e1720e3` (feat)

## Files Created/Modified

- `src/components/journey-flow/journey-flow-toolbar.tsx` — two exports: `JourneyFlowToolbar` (top Panel) and `JourneyFlowCanvasToolbar` (bottom floating bar)
- `src/components/journey-flow/journey-flow-canvas.tsx` — `JourneyFlowCanvas` (provider wrapper) + `JourneyFlowCanvasInner` (full canvas logic)

## Decisions Made

- `spinner` icon name used (not `loader-circle`) — matches the phosphor-icons alias registered in `src/components/ui/icon.tsx`
- `JourneyFlowCanvasToolbar` rendered as a sibling outside the `<ReactFlow>` element so it is unaffected by zoom/pan
- `handleAddNodeAt` opens the detail dialog immediately after node creation so users name the screen before dismissing
- `handleApprove` reverts `setApproved(false)` on fetch failure + shows `toast.error` — prevents ghost-approved state persisting in the store

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong icon name `loader-circle` replaced with `spinner`**
- **Found during:** Task 1 (JourneyFlowToolbar)
- **Issue:** `loader-circle` is not a registered icon alias in icon.tsx — TypeScript error TS2820
- **Fix:** Changed to `spinner` (CircleNotch), which is the correct Phosphor alias and accepts `animate-spin`
- **Files modified:** src/components/journey-flow/journey-flow-toolbar.tsx
- **Verification:** `npx tsc --noEmit` passes with no errors
- **Committed in:** f279c57 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug, wrong icon name)
**Impact on plan:** Trivial naming fix. No scope change.

## Issues Encountered

None beyond the icon name fix above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `JourneyFlowCanvas` is store-agnostic and route-agnostic — Plan 04 mounts it at `/workshop/[sessionId]/outputs/journey-flow/` with the `JourneyFlowStoreProvider` wrapper
- FLOW-03 (edges/forks), FLOW-04 ((+) add), FLOW-05 (delete), FLOW-07 (approve) all implemented
- Phase 64 AI generation writes nodes/edges directly to the store; this canvas renders them immediately via the display-mirror pattern

---
*Phase: 63-journey-flow-editor-core*
*Completed: 2026-06-11*
