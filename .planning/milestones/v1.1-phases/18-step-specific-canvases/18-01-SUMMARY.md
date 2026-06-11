---
phase: 18-step-specific-canvases
plan: 01
subsystem: canvas-infrastructure
tags: [canvas, quadrants, configuration, overlay, data-model]
dependency_graph:
  requires:
    - phase: 17
      plan: 03
      provides: "Group creation and management"
    - phase: 15
      plan: 01
      provides: "ReactFlow canvas infrastructure and store pattern"
  provides:
    - "Step canvas configuration registry with quadrant definitions"
    - "Quadrant detection logic using center-point calculation"
    - "Extended PostIt data model with optional quadrant field"
    - "QuadrantOverlay SVG component for viewport-aware rendering"
  affects:
    - subsystem: canvas-store
      change: "Extended PostIt type with optional quadrant field"
    - subsystem: canvas-rendering
      change: "New QuadrantOverlay component for step-specific layouts"
tech_stack:
  added:
    - "src/lib/canvas/quadrant-detection.ts - Quadrant type definitions and detection logic"
    - "src/lib/canvas/step-canvas-config.ts - Step-specific canvas configuration registry"
    - "src/components/canvas/quadrant-overlay.tsx - Viewport-aware SVG overlay component"
  patterns:
    - "Type discriminator pattern (QuadrantType) for union type narrowing"
    - "ReactFlow useStore selector for reactive viewport subscription"
    - "Configuration registry pattern with step ID mapping"
    - "Center-point calculation for quadrant detection (not top-left corner)"
key_files:
  created:
    - path: "src/lib/canvas/quadrant-detection.ts"
      purpose: "Quadrant type definitions, detection logic, and label mapping"
      exports: ["Quadrant", "QuadrantType", "detectQuadrant", "getQuadrantLabel"]
    - path: "src/lib/canvas/step-canvas-config.ts"
      purpose: "Step-specific canvas configuration registry"
      exports: ["QuadrantConfig", "StepCanvasConfig", "STEP_CANVAS_CONFIGS", "getStepCanvasConfig"]
    - path: "src/components/canvas/quadrant-overlay.tsx"
      purpose: "Viewport-aware SVG overlay with crosshair lines and quadrant labels"
      exports: ["QuadrantOverlay"]
  modified:
    - path: "src/stores/canvas-store.ts"
      changes: ["Added optional quadrant field to PostIt type", "Imported Quadrant type"]
decisions:
  - id: "center-point-detection"
    choice: "Use center point (x + width/2, y + height/2) for quadrant detection"
    alternatives: ["Top-left corner detection", "Bounding box intersection"]
    rationale: "Center point provides most intuitive user experience - users expect quadrant to be determined by where the post-it's center lands"
  - id: "viewport-aware-overlay"
    choice: "Use ReactFlow useStore selector for reactive viewport subscription"
    alternatives: ["useReactFlow hook with manual effect", "Transform prop from parent"]
    rationale: "useStore selector provides automatic reactive updates on viewport changes without manual effect management"
  - id: "fixed-label-offset"
    choice: "Fixed 80px offset for quadrant labels (not scaled by zoom)"
    alternatives: ["Scale labels with zoom", "Use percentage-based positioning"]
    rationale: "Fixed offset keeps labels readable at all zoom levels and prevents overlap with crosshair at high zoom"
  - id: "step-id-mapping"
    choice: "Use semantic step IDs from step-metadata.ts ('stakeholder-mapping', 'sense-making')"
    alternatives: ["Use step order numbers (2, 4)", "Use separate enum"]
    rationale: "Semantic IDs match existing step-metadata.ts pattern and are more maintainable than magic numbers"
metrics:
  duration_minutes: 2
  tasks_completed: 2
  files_created: 3
  files_modified: 1
  commits: 2
  lines_added: 348
  completed_date: 2026-02-11
---

# Phase 18 Plan 01: Step Canvas Config and Quadrant Detection Summary

**One-liner:** Foundational quadrant infrastructure with step-specific config registry, center-point detection logic, extended PostIt data model, and viewport-aware SVG overlay component.

## Objective Achievement

Created the foundational components for step-specific quadrant canvases. Established:

1. **Step Configuration Registry** - Data-driven config for Steps 2 (Power-Interest) and 4 (Empathy Map)
2. **Quadrant Detection Logic** - Center-point calculation for 8 quadrant types
3. **Extended Data Model** - Backward-compatible quadrant field on PostIt type
4. **SVG Overlay Component** - Viewport-aware rendering with reactive viewport subscription

These primitives provide the foundation for Plan 02 to wire quadrant detection into ReactFlowCanvas drag handlers and conditionally render the overlay based on step configuration.

## Tasks Completed

### Task 1: Create step canvas config and quadrant detection logic

**Commit:** `5025459`

Created two new files under `src/lib/canvas/`:

1. **quadrant-detection.ts**
   - Exported `Quadrant` union type with 8 values (4 power-interest, 4 empathy-map)
   - Exported `QuadrantType` discriminator ('power-interest' | 'empathy-map')
   - Implemented `detectQuadrant(position, width, height, type)` function using center-point calculation
   - Canvas origin (0,0) divides quadrants: Y < 0 = top, X < 0 = left
   - Implemented `getQuadrantLabel(quadrant)` function for human-readable labels

2. **step-canvas-config.ts**
   - Defined `QuadrantConfig` type with labels and optional axis labels
   - Defined `StepCanvasConfig` type with hasQuadrants flag and optional config
   - Exported `STEP_CANVAS_CONFIGS` registry with entries for:
     - `'stakeholder-mapping'`: Power-Interest matrix with axis labels
     - `'sense-making'`: Empathy Map without axis labels
   - Step IDs match semantic IDs from `step-metadata.ts`
   - Exported `getStepCanvasConfig(stepId)` with default fallback

**Files created:**
- `src/lib/canvas/quadrant-detection.ts` (95 lines)
- `src/lib/canvas/step-canvas-config.ts` (76 lines)

### Task 2: Extend PostIt type and create QuadrantOverlay component

**Commit:** `48d4381`

1. **Extended PostIt type in canvas-store.ts**
   - Added import for `Quadrant` type from quadrant-detection
   - Added optional `quadrant?: Quadrant` field to PostIt type
   - Backward compatible - existing post-its without quadrant field continue to work
   - No store action changes needed (quadrant assignment wired in Plan 02)

2. **Created QuadrantOverlay component**
   - Viewport-aware SVG component that renders inside ReactFlow
   - Uses `useStore` selector from `@xyflow/react` for reactive viewport subscription
   - Calculates screen coordinates: `screenCenterX = 0 * zoom + x`
   - Renders two dashed crosshair lines through canvas origin
   - Renders four quadrant labels 80px from center (fixed offset, not scaled)
   - Renders optional axis labels 40px from center
   - Entire SVG has `pointer-events-none` to avoid blocking post-it interaction
   - Component accepts `QuadrantConfig` prop

**Files created:**
- `src/components/canvas/quadrant-overlay.tsx` (177 lines)

**Files modified:**
- `src/stores/canvas-store.ts` (added 2 lines)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification checks passed:

1. ✅ `npx tsc --noEmit` - No TypeScript errors
2. ✅ `detectQuadrant` function exported from quadrant-detection.ts
3. ✅ `STEP_CANVAS_CONFIGS` exported from step-canvas-config.ts
4. ✅ `quadrant` field present in PostIt type
5. ✅ `QuadrantOverlay` component exported
6. ✅ `'stakeholder-mapping'` step ID present in config
7. ✅ `'sense-making'` step ID present in config

## Technical Implementation Details

### Quadrant Detection Algorithm

```typescript
// Center-point calculation
const centerX = position.x + width / 2;
const centerY = position.y + height / 2;

// Canvas origin (0,0) divides quadrants
if (type === 'power-interest') {
  // Y < 0 = High Power, Y >= 0 = Low Power
  // X < 0 = Low Interest, X >= 0 = High Interest
  if (centerY < 0) {
    return centerX < 0 ? 'high-power-low-interest' : 'high-power-high-interest';
  } else {
    return centerX < 0 ? 'low-power-low-interest' : 'low-power-high-interest';
  }
}
```

### Viewport-Aware Rendering

```typescript
// Reactive viewport subscription
const viewportSelector = (state: ReactFlowState) => ({
  x: state.transform[0],
  y: state.transform[1],
  zoom: state.transform[2],
});

const { x, y, zoom } = useReactFlowStore(viewportSelector);

// Screen coordinates for canvas origin
const screenCenterX = 0 * zoom + x;
const screenCenterY = 0 * zoom + y;
```

### Step Configuration Structure

```typescript
STEP_CANVAS_CONFIGS = {
  'stakeholder-mapping': {
    hasQuadrants: true,
    quadrantType: 'power-interest',
    quadrantConfig: {
      type: 'power-interest',
      labels: {
        topLeft: 'Keep Satisfied',
        topRight: 'Manage Closely',
        bottomLeft: 'Monitor',
        bottomRight: 'Keep Informed',
      },
      axisLabels: {
        horizontal: { left: 'Low Interest', right: 'High Interest' },
        vertical: { top: 'High Power', bottom: 'Low Power' },
      },
    },
  },
  // ... sense-making config
}
```

## Integration Points for Plan 02

Plan 02 will wire these primitives into the existing canvas:

1. **ReactFlowCanvas component** - Import and conditionally render QuadrantOverlay
2. **Drag handlers** - Call detectQuadrant on drag end, update PostIt with quadrant value
3. **Step detection** - Use getStepCanvasConfig(stepId) to determine if quadrants enabled
4. **Store actions** - updatePostIt already handles quadrant field (no changes needed)

## Success Criteria Met

- ✅ Step canvas configuration registry exists with correct step IDs matching step-metadata.ts
- ✅ Quadrant detection function uses center-point calculation (not top-left corner)
- ✅ PostIt type extended with optional quadrant field (backward compatible)
- ✅ QuadrantOverlay component renders viewport-aware SVG lines and labels
- ✅ All files compile without TypeScript errors

## Next Phase Readiness

**Ready for Plan 02** - All foundational primitives complete:
- Configuration registry provides step-specific quadrant definitions
- Detection logic ready to be called on drag end
- Data model extended to store quadrant assignments
- Overlay component ready to be conditionally rendered

No blockers for Plan 02 integration.

## Self-Check: PASSED

**Created files verification:**
```bash
✅ FOUND: src/lib/canvas/quadrant-detection.ts
✅ FOUND: src/lib/canvas/step-canvas-config.ts
✅ FOUND: src/components/canvas/quadrant-overlay.tsx
```

**Modified files verification:**
```bash
✅ FOUND: src/stores/canvas-store.ts (quadrant field added)
```

**Commits verification:**
```bash
✅ FOUND: 5025459 (Task 1 - step config and quadrant detection)
✅ FOUND: 48d4381 (Task 2 - PostIt extension and QuadrantOverlay)
```

**TypeScript compilation:**
```bash
✅ PASSED: npx tsc --noEmit (no errors)
```

All claims verified. Plan execution complete.
