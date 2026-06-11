---
phase: 63-journey-flow-editor-core
plan: 02
subsystem: ui
tags: [react, xyflow, reactflow, tailwind, shadcn, canvas, journey-flow]

# Dependency graph
requires:
  - phase: 63-01
    provides: JourneyFlowNode, JourneyFlowEdge, UI_TYPE_LABELS, PRIORITY_LABELS from @/lib/journey-flow/types
provides:
  - JourneyFlowNodeCard: screen-card node component with 8 hover handles + 4 directional (+) buttons
  - JourneyFlowEdge: bezier edge with fat interaction zone and selected endpoint circles
  - JourneyFlowNodeDetail: editable dialog for name, uiType, priority, purpose, keyElements + delete
affects: [63-03-canvas, 63-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Handles declared with pointerEvents:'all' — load-bearing for drag-to-connect in ReactFlow"
    - "DropdownMenu as picker — no Select component available in this shadcn setup"
    - "Blank keyElements lines filtered on dialog close, not per-keystroke (preserves newline UX)"

key-files:
  created:
    - src/components/journey-flow/journey-flow-node-card.tsx
    - src/components/journey-flow/journey-flow-edge.tsx
    - src/components/journey-flow/journey-flow-node-detail.tsx
  modified: []

key-decisions:
  - "JourneyFlowEdge endpoint circles use var(--background) not hardcoded white — olive token compliance"
  - "Priority dot colors via inline style backgroundColor with CSS vars (destructive/primary/muted-foreground) — avoids palette hardcodes the old dialog had (bg-red-500, bg-amber-500, bg-blue-400)"
  - "onAddNodeAt (+) buttons rendered conditionally — absent when prop not provided (read-only canvas mode)"
  - "keyElements blank-line filter deferred to onOpenChange close callback to avoid eating the newline user just typed"

patterns-established:
  - "Handle declaration block: 8 handles (source+target on all 4 sides), pointerEvents:'all', cursor:crosshair — copy exactly for any new node type"
  - "Directional (+) buttons: nodrag nopan classes prevent click from starting node drag"
  - "Edge component: exported as named alias (JourneyFlowEdgeComponent as JourneyFlowEdge) so Plan 03 can import with alias to avoid shadowing the types.ts JourneyFlowEdge interface"

requirements-completed: [FLOW-02, FLOW-04, FLOW-05]

# Metrics
duration: 2min
completed: 2026-06-10
---

# Phase 63 Plan 02: Journey Flow Node Card, Edge, and Detail Dialog Summary

**Three presentational Journey Flow components: data-only screen-card node with 8 hover handles and 4 directional (+) buttons, bezier edge with fat click zone, and fully editable node-detail dialog (name/uiType/priority/purpose/keyElements/delete)**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-06-10T22:53:43Z
- **Completed:** 2026-06-10T22:55:49Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `JourneyFlowNodeCard`: data-only card rendering name, UI type badge, and purpose with 8 hover handles (source+target on all 4 sides) and 4 directional (+) add buttons; olive token styling throughout
- `JourneyFlowEdge`: bezier edge ported from journey-mapper with fat invisible interaction zone, selection state color/width change, and endpoint circles using `var(--background)` instead of hardcoded white
- `JourneyFlowNodeDetail`: editable dialog with write-through pattern — no local form state, all field changes call `onFieldChange` immediately; DropdownMenu pickers for uiType and priority; blank keyElement lines filtered on dialog close; isReadOnly disables inputs and hides delete button

## Task Commits

Each task was committed atomically:

1. **Task 1: JourneyFlowNodeCard and JourneyFlowEdge** - `eb002a1` (feat)
2. **Task 2: JourneyFlowNodeDetail editable dialog** - `7bd412e` (feat)

**Plan metadata:** (included in final docs commit)

## Files Created/Modified
- `src/components/journey-flow/journey-flow-node-card.tsx` - Screen card node component with handles and (+) buttons
- `src/components/journey-flow/journey-flow-edge.tsx` - Bezier edge component with selection styling and fat interaction zone
- `src/components/journey-flow/journey-flow-node-detail.tsx` - Editable node detail dialog

## Decisions Made
- Priority dot colors use CSS variable references (`var(--destructive)`, `var(--primary)`, `var(--muted-foreground)`) via inline style — the old journey-mapper dialog had hardcoded `bg-red-500`, `bg-amber-500`, `bg-blue-400` which violates the olive token rule
- Blank keyElement lines filtered in `onOpenChange` close callback rather than in `onChange` — filtering on every keystroke ate the newline the user just typed (cursor jumped to previous line)
- `onAddNodeAt` (+) buttons are conditionally rendered — when the prop is absent the buttons don't render, enabling read-only canvas mode without a separate flag

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- All three components are pure presentational; Plan 03 registers them as `nodeTypes`/`edgeTypes` in the ReactFlow canvas
- `JourneyFlowEdge` component exported as named alias (`JourneyFlowEdgeComponent as JourneyFlowEdge`) — Plan 03 imports as `JourneyFlowEdge as JourneyFlowEdgeComponent` to avoid shadowing the `JourneyFlowEdge` interface from types.ts (per plan comment)
- No blockers

---
*Phase: 63-journey-flow-editor-core*
*Completed: 2026-06-10*
