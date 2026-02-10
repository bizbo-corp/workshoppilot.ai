---
phase: 15-canvas-infrastructure-ssr-safety
plan: 01
subsystem: ui
tags: [reactflow, zustand, ssr, canvas, post-it, dynamic-import]

# Dependency graph
requires:
  - phase: 14-schema-versioning
    provides: Workshop persistence patterns and stepArtifacts JSONB column
provides:
  - Zustand canvas store factory with per-request isolation (SSR-safe)
  - React context provider for canvas store
  - PostIt type with CRUD operations (add, update, delete, set, markClean)
  - Custom ReactFlow post-it node component (yellow sticky, 120x120px)
  - Canvas loading skeleton with dot grid
  - SSR-safe dynamic import wrapper preventing hydration errors
affects: [15-02-react-flow-canvas-component, 15-03-persistence-layer, 16-ai-canvas-control]

# Tech tracking
tech-stack:
  added: [@xyflow/react@12.10.0, zustand/vanilla (factory pattern)]
  patterns: [factory-pattern-zustand, per-request-store-isolation, ssr-safe-dynamic-imports]

key-files:
  created:
    - src/stores/canvas-store.ts
    - src/providers/canvas-store-provider.tsx
    - src/components/canvas/post-it-node.tsx
    - src/components/canvas/canvas-loading-skeleton.tsx
    - src/components/canvas/canvas-wrapper.tsx
  modified:
    - package.json (added @xyflow/react)

key-decisions:
  - "Use Zustand vanilla factory pattern (createStore) instead of module-level store for SSR safety"
  - "Canvas store provider creates store once per mount for per-request isolation"
  - "Post-it appearance: amber-100 yellow, shadow-md, 120x120px, system font, no rotation"
  - "Dynamic import with ssr: false to prevent ReactFlow hydration errors"
  - "isDirty flag tracks unsaved changes, setPostIts does not set dirty (for DB load)"

patterns-established:
  - "Factory pattern for Zustand stores: export createStore function, not store instance"
  - "Per-request isolation: Provider creates store with useState(() => createCanvasStore())"
  - "SSR-safe canvas: next/dynamic with ssr: false and loading skeleton"
  - "Post-it editing: nodrag nopan classes prevent ReactFlow pan/zoom during text input"

# Metrics
duration: 2min
completed: 2026-02-10
---

# Phase 15 Plan 01: Canvas Infrastructure & SSR Safety Summary

**ReactFlow installed with Zustand factory-pattern store, classic yellow post-it nodes, and SSR-safe dynamic import wrapper preventing hydration errors**

## Performance

- **Duration:** 1min 52sec
- **Started:** 2026-02-10T20:38:33Z
- **Completed:** 2026-02-10T20:40:25Z
- **Tasks:** 2
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments

- @xyflow/react@12.10.0 installed as canvas rendering engine
- Zustand canvas store with factory pattern ensures SSR safety and per-request isolation
- Post-it node renders as classic yellow sticky note (120x120px, amber background, drop shadow)
- SSR-safe wrapper with dynamic import (ssr: false) prevents ReactFlow hydration errors
- Loading skeleton with dot grid background for smooth UX during dynamic import

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @xyflow/react and create Zustand canvas store with provider** - `fbba2a3` (feat)
2. **Task 2: Create post-it node, loading skeleton, and SSR-safe wrapper** - `e70c8b5` (feat)

## Files Created/Modified

### Created
- `src/stores/canvas-store.ts` - Zustand store factory with PostIt CRUD (add, update, delete, set, markClean) and isDirty tracking
- `src/providers/canvas-store-provider.tsx` - React context provider creating isolated store per request via useState
- `src/components/canvas/post-it-node.tsx` - Custom ReactFlow node rendering classic yellow post-it with edit mode (nodrag/nopan)
- `src/components/canvas/canvas-loading-skeleton.tsx` - Loading state with dot grid background and pulse animation
- `src/components/canvas/canvas-wrapper.tsx` - SSR-safe wrapper using next/dynamic with ssr: false

### Modified
- `package.json` - Added @xyflow/react@12.10.0
- `package-lock.json` - Lockfile updated (19 packages added)

## Decisions Made

**1. Zustand factory pattern for SSR safety**
- Used `createStore` from `zustand/vanilla` instead of `create` from `zustand`
- Export factory function `createCanvasStore()` that returns store instance
- Provider creates store once per mount with `useState(() => createCanvasStore())`
- **Rationale:** Prevents shared state across requests in SSR, ensures per-request isolation

**2. Post-it visual design (locked decisions)**
- Color: `bg-amber-100` (warm yellow, not neon)
- Size: 120x120px fixed width, min-height with vertical growth
- Shadow: `shadow-md` (skeuomorphic depth)
- Font: System font (`font-sans`), not handwritten
- No rotation: Perfectly aligned by default
- Hover effect: Subtle lift with `hover:shadow-lg hover:-translate-y-0.5`
- **Rationale:** Classic sticky note appearance that's familiar and functional

**3. Edit mode with nodrag/nopan classes**
- Textarea includes `nodrag nopan` classes when editing
- **Rationale:** Prevents ReactFlow from intercepting drag/pan gestures during text input

**4. isDirty tracking pattern**
- `addPostIt`, `updatePostIt`, `deletePostIt` set `isDirty: true`
- `setPostIts` (for DB load) does NOT set isDirty
- `markClean` resets isDirty after save
- **Rationale:** Distinguishes user edits from DB load, enables auto-save detection

**5. Dynamic import with ssr: false**
- Canvas wrapper uses `next/dynamic` with `{ ssr: false }`
- Loading skeleton shown during import
- **Rationale:** ReactFlow uses browser APIs (canvas, DOM measurements) incompatible with SSR

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without blockers. Expected TypeScript error for missing `react-flow-canvas.tsx` is intentional (created in Plan 02).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Plan 02:** ReactFlow canvas component implementation
- Canvas store and provider ready for consumption
- Post-it node ready to be registered as custom node type
- Canvas wrapper established contract (expects ReactFlowCanvas with sessionId/stepId props)
- SSR infrastructure prevents hydration errors

**Ready for Plan 03:** Canvas persistence layer
- `isDirty` flag tracks unsaved changes
- `setPostIts` loads from DB without marking dirty
- `markClean` called after successful save
- Canvas store provides full CRUD for persistence layer

**Key for Plan 02 to implement:**
- Create `src/components/canvas/react-flow-canvas.tsx` with export `ReactFlowCanvas`
- Accept `sessionId` and `stepId` props
- Register `PostItNode` as custom node type with ReactFlow
- Consume `useCanvasStore` hook from provider

## Self-Check: PASSED

All files created and commits verified:
- ✓ 5 files created at expected paths
- ✓ 2 task commits exist (fbba2a3, e70c8b5)

---
*Phase: 15-canvas-infrastructure-ssr-safety*
*Completed: 2026-02-10*
