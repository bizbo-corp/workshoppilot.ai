---
phase: 18-step-specific-canvases
plan: 02
subsystem: canvas-integration
tags: [canvas, quadrants, ai-context, reactflow, integration]
dependency_graph:
  requires:
    - phase: 18
      plan: 01
      provides: "Quadrant detection logic, step config registry, QuadrantOverlay component"
  provides:
    - "ReactFlowCanvas with conditional quadrant overlay rendering"
    - "Automatic quadrant detection on post-it creation and drag"
    - "AI context assembly functions with quadrant grouping"
    - "Step-specific canvas behavior (Steps 2 and 4 show quadrants, others don't)"
  affects:
    - subsystem: canvas-rendering
      change: "ReactFlowCanvas conditionally renders QuadrantOverlay based on step config"
    - subsystem: canvas-store
      change: "Post-its created/dragged now receive quadrant metadata"
    - subsystem: ai-context
      change: "New canvas context assembly module ready for Phase 19 integration"
tech_stack:
  added:
    - "src/lib/workshop/context/canvas-context.ts - AI context assembly with quadrant grouping"
  patterns:
    - "Step-aware canvas behavior using getStepCanvasConfig dispatcher"
    - "Quadrant detection at creation and drag-end using center-point calculation"
    - "Conditional JSX rendering for step-specific overlays"
    - "Context assembly dispatcher pattern routing by stepId"
key_files:
  created:
    - path: "src/lib/workshop/context/canvas-context.ts"
      purpose: "AI context assembly with step-specific quadrant grouping"
      exports: ["assembleStakeholderCanvasContext", "assembleEmpathyMapCanvasContext", "assembleCanvasContextForStep"]
  modified:
    - path: "src/components/canvas/react-flow-canvas.tsx"
      changes: ["Added step config access", "Wired quadrant detection to creation and drag handlers", "Conditionally render QuadrantOverlay", "Added onInit for empty quadrant canvas centering"]
decisions:
  - id: "quadrant-at-creation"
    choice: "Detect quadrant immediately on post-it creation (double-click, toolbar)"
    alternatives: ["Detect only on drag", "Detect on save"]
    rationale: "Immediate detection provides instant feedback and ensures quadrant is always set, even if user never drags the post-it"
  - id: "empty-canvas-centering"
    choice: "Use onInit callback to center viewport on (0,0) for empty quadrant canvases"
    alternatives: ["Use defaultViewport calculation", "Wait for first post-it then fitView"]
    rationale: "onInit provides access to container dimensions needed to calculate centered viewport, only runs once per canvas mount"
  - id: "phase-19-wiring"
    choice: "Create context assembly functions now, wire to AI pipeline in Phase 19"
    alternatives: ["Wire immediately to assembleStepContext", "Wait for Phase 19 to create"]
    rationale: "Phase 18 creates canvas primitives, Phase 19 integrates with AI - separation of concerns per roadmap"
metrics:
  duration_minutes: 2
  tasks_completed: 2
  files_created: 1
  files_modified: 1
  commits: 2
  lines_added: 196
  completed_date: 2026-02-11
---

# Phase 18 Plan 02: Step-Specific Canvas Integration Summary

**One-liner:** Complete step-specific canvas implementation with automatic quadrant detection on post-it creation/drag, conditional overlay rendering for Steps 2 and 4, and AI context assembly functions that group by quadrant.

## Objective Achievement

Successfully integrated the quadrant infrastructure from Plan 01 into the existing ReactFlowCanvas component and created AI context assembly functions for quadrant-grouped post-its. Achieved:

1. **Conditional Quadrant Rendering** - Steps 2 (stakeholder-mapping) and 4 (sense-making) display quadrant overlays, other steps render standard canvas
2. **Automatic Quadrant Detection** - Post-its created via double-click or toolbar button receive quadrant metadata immediately
3. **Drag-End Quadrant Update** - Post-its dragged to new positions update their quadrant field based on final position
4. **AI Context Assembly** - Three functions assemble human-readable context strings with quadrant grouping for AI facilitation
5. **Viewport Centering** - Empty quadrant canvases center on origin (0,0) to show crosshair immediately

## Tasks Completed

### Task 1: Wire QuadrantOverlay and quadrant detection into ReactFlowCanvas

**Commit:** `c00c3c0`

Modified `src/components/canvas/react-flow-canvas.tsx` to add step-specific quadrant support:

**Imports added:**
- `getStepCanvasConfig` from `@/lib/canvas/step-canvas-config`
- `QuadrantOverlay` from `./quadrant-overlay`
- `detectQuadrant` from `@/lib/canvas/quadrant-detection`
- `ReactFlowInstance` type from `@xyflow/react`

**Step config access:**
```typescript
const stepConfig = getStepCanvasConfig(stepId);
```

Called once per render to determine if current step has quadrants enabled.

**Quadrant detection at creation:**

Modified `createPostItAtPosition` (double-click handler):
```typescript
const quadrant = stepConfig.hasQuadrants && stepConfig.quadrantType
  ? detectQuadrant(snappedPosition, 120, 120, stepConfig.quadrantType)
  : undefined;

addPostIt({
  text: '',
  position: snappedPosition,
  width: 120,
  height: 120,
  quadrant,
});
```

Modified `handleToolbarAdd` (toolbar "+" button):
```typescript
const quadrant = stepConfig.hasQuadrants && stepConfig.quadrantType
  ? detectQuadrant(snappedPosition, 120, 120, stepConfig.quadrantType)
  : undefined;

addPostIt({
  // ... same as above
  quadrant,
});
```

**Quadrant detection on drag end:**

Modified `handleNodesChange`:
```typescript
changes.forEach((change) => {
  if (
    change.type === 'position' &&
    change.dragging === false &&
    change.position
  ) {
    const snappedPosition = snapToGrid(change.position);

    const quadrant = stepConfig.hasQuadrants && stepConfig.quadrantType
      ? detectQuadrant(snappedPosition, 120, 120, stepConfig.quadrantType)
      : undefined;

    updatePostIt(change.id, { position: snappedPosition, quadrant });
  }
});
```

Replaced the previous `updatePostIt(change.id, { position: snappedPosition })` call.

**Conditional overlay rendering:**

Added inside `<ReactFlow>` component (after `<Controls>`):
```tsx
{stepConfig.hasQuadrants && stepConfig.quadrantConfig && (
  <QuadrantOverlay config={stepConfig.quadrantConfig} />
)}
```

**Empty canvas centering:**

Added `onInit` callback:
```typescript
const handleInit = useCallback((instance: ReactFlowInstance) => {
  if (stepConfig.hasQuadrants && postIts.length === 0) {
    const container = document.querySelector('.react-flow');
    if (container) {
      const rect = container.getBoundingClientRect();
      instance.setViewport({
        x: rect.width / 2,
        y: rect.height / 2,
        zoom: 1,
      });
    }
  }
}, [stepConfig, postIts.length]);
```

Added `onInit={handleInit}` to `<ReactFlow>` props.

**Dependency array updates:**

Updated dependency arrays for callbacks that now use `stepConfig`:
- `createPostItAtPosition`: added `stepConfig`
- `handleToolbarAdd`: added `stepConfig`
- `handleNodesChange`: added `stepConfig`

**Files modified:**
- `src/components/canvas/react-flow-canvas.tsx` (+54 lines, -4 lines)

### Task 2: Create AI canvas context assembly with quadrant grouping

**Commit:** `9cb9a18`

Created `src/lib/workshop/context/canvas-context.ts` with three exported functions:

**1. assembleStakeholderCanvasContext(postIts: PostIt[]): string**

Groups post-its by Power-Interest quadrant for Step 2:
- Filters out group nodes (`type !== 'group'`)
- Groups by `postIt.quadrant` field
- Orders sections: high-power-high-interest, high-power-low-interest, low-power-high-interest, low-power-low-interest
- Uses `getQuadrantLabel()` for human-readable section headers
- Includes count: `**Manage Closely** (3 stakeholders):`
- Post-its without quadrant field grouped under "Unassigned" section
- Empty sections skipped
- Returns joined string with double newlines between sections

Example output:
```
**Manage Closely** (2 stakeholders):
- CEO
- Product Manager

**Keep Satisfied** (1 stakeholder):
- Legal Department

**Keep Informed** (3 stakeholders):
- End Users
- Support Team
- Marketing
```

**2. assembleEmpathyMapCanvasContext(postIts: PostIt[]): string**

Groups post-its by empathy map quadrant for Step 4:
- Same filtering and grouping logic
- Orders sections: said, thought, felt, experienced
- Section headers from `getQuadrantLabel()`: "What they said", "What they thought", etc.
- No count in headers (just section name)
- Unassigned section at end if needed

Example output:
```
**What they said**:
- "This is too complicated"
- "I wish it was faster"

**What they thought**:
- Worried about security

**What they felt**:
- Frustrated
- Confused
```

**3. assembleCanvasContextForStep(stepId: string, postIts: PostIt[]): string**

Dispatcher function:
- Routes to `assembleStakeholderCanvasContext` if `stepId === 'stakeholder-mapping'`
- Routes to `assembleEmpathyMapCanvasContext` if `stepId === 'sense-making'`
- Otherwise returns flat list: `Canvas items:\n- Item 1\n- Item 2`
- Always filters out group nodes first
- Returns empty string if no post-its

**Module design notes:**

- All functions filter out group nodes to prevent duplicated context (children are already listed separately)
- Graceful handling of missing quadrant field (grouped under "Unassigned")
- Empty canvas returns empty string (not "No canvas items" message)
- Ready for Phase 19 to call from `assembleStepContext` in AI pipeline
- NOT wired into AI context yet - Phase 18 creates primitives, Phase 19 integrates

**Files created:**
- `src/lib/workshop/context/canvas-context.ts` (142 lines)

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification checks passed:

1. ✅ `npx tsc --noEmit` - No TypeScript errors
2. ✅ `npm run build` - Build completes without errors (SSR safety preserved)
3. ✅ `grep "QuadrantOverlay" react-flow-canvas.tsx` - Overlay integration confirmed (import + JSX render)
4. ✅ `grep "detectQuadrant" react-flow-canvas.tsx` - Detection wiring confirmed (3 call sites: creation, toolbar, drag-end)
5. ✅ `grep "getStepCanvasConfig" react-flow-canvas.tsx` - Step-aware behavior confirmed (import + call)
6. ✅ `grep "assembleStakeholderCanvasContext" canvas-context.ts` - Export confirmed
7. ✅ `grep "assembleEmpathyMapCanvasContext" canvas-context.ts` - Export confirmed
8. ✅ `grep "assembleCanvasContextForStep" canvas-context.ts` - Export confirmed

## Technical Implementation Details

### Quadrant Detection Flow

**On post-it creation (double-click or toolbar):**
1. Get flow position from screen coordinates
2. Snap to grid (20px)
3. Check if step has quadrants: `stepConfig.hasQuadrants && stepConfig.quadrantType`
4. If yes, call `detectQuadrant(position, 120, 120, type)` using center-point calculation
5. If no, set `quadrant` to `undefined`
6. Pass `quadrant` field to `addPostIt`

**On post-it drag end:**
1. `handleNodesChange` receives position change with `dragging: false`
2. Snap position to grid
3. Check if step has quadrants
4. If yes, detect quadrant using final snapped position
5. If no, set `quadrant` to `undefined`
6. Update post-it with both position and quadrant: `updatePostIt(id, { position, quadrant })`

**Center-point calculation (from quadrant-detection.ts):**
```typescript
const centerX = position.x + width / 2;  // 120px width → +60
const centerY = position.y + height / 2; // 120px height → +60

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

### Conditional Rendering Pattern

```typescript
// Step config determines behavior
const stepConfig = getStepCanvasConfig(stepId);

// Overlay renders only if hasQuadrants and config present
{stepConfig.hasQuadrants && stepConfig.quadrantConfig && (
  <QuadrantOverlay config={stepConfig.quadrantConfig} />
)}

// Quadrant detection only if hasQuadrants and type present
const quadrant = stepConfig.hasQuadrants && stepConfig.quadrantType
  ? detectQuadrant(snappedPosition, 120, 120, stepConfig.quadrantType)
  : undefined;
```

For steps without quadrants (e.g., 'challenge', 'user-research'):
- `getStepCanvasConfig` returns `{ hasQuadrants: false }`
- Overlay doesn't render
- Quadrant detection returns `undefined`
- Post-its created without quadrant field (backward compatible)

### Empty Canvas Viewport Centering

Problem: For quadrant steps with no post-its, we want the viewport centered on (0,0) to show the crosshair.

Solution: Use `onInit` callback with container dimensions:
```typescript
const handleInit = useCallback((instance: ReactFlowInstance) => {
  if (stepConfig.hasQuadrants && postIts.length === 0) {
    const container = document.querySelector('.react-flow');
    if (container) {
      const rect = container.getBoundingClientRect();
      // Center origin in middle of viewport
      instance.setViewport({
        x: rect.width / 2,
        y: rect.height / 2,
        zoom: 1,
      });
    }
  }
}, [stepConfig, postIts.length]);
```

Runs once on canvas mount. For steps with existing post-its, the existing `fitView` logic handles centering.

### AI Context Assembly Structure

**Stakeholder context example:**
```
**Manage Closely** (2 stakeholders):
- CEO
- Product Manager

**Keep Satisfied** (1 stakeholder):
- Legal Department
```

**Empathy map context example:**
```
**What they said**:
- "This is too complicated"

**What they thought**:
- Worried about security
```

**Flat list (non-quadrant steps):**
```
Canvas items:
- Challenge statement
- User pain point
- Idea for solution
```

**Empty canvas:**
```
(empty string)
```

## Integration Points for Phase 19

Phase 19 (AI-Canvas Integration) will wire the context assembly functions into the AI pipeline:

1. **Modify `assembleStepContext` in `src/lib/context/assemble-context.ts`:**
   - Import `assembleCanvasContextForStep`
   - Load canvas post-its from `stepArtifacts.canvas` or new DB query
   - Call `assembleCanvasContextForStep(stepId, postIts)`
   - Append canvas context to existing context string

2. **Update step prompts** (if needed):
   - Step 2 prompt: reference quadrant groups in instructions
   - Step 4 prompt: reference empathy map quadrants in instructions

3. **Test AI responses** use quadrant grouping:
   - Step 2: "I notice you have 3 stakeholders in the Manage Closely quadrant..."
   - Step 4: "Based on what they said and felt..."

Phase 18 provides the context assembly functions; Phase 19 calls them from the AI pipeline.

## Success Criteria Met

- ✅ Step 2 canvas displays Power x Interest quadrant grid overlay with labeled quadrants
- ✅ Step 4 canvas displays empathy map quadrant overlay with labeled quadrants
- ✅ Post-its created via double-click receive correct quadrant metadata immediately
- ✅ Post-its created via toolbar button receive correct quadrant metadata
- ✅ Post-its dragged to new positions update quadrant field based on center-point calculation
- ✅ Non-quadrant steps render standard canvas without overlay (no regression)
- ✅ AI context functions produce quadrant-grouped text for stakeholder mapping
- ✅ AI context functions produce quadrant-grouped text for empathy map
- ✅ AI context dispatcher routes by stepId correctly
- ✅ TypeScript compiles without errors
- ✅ Build succeeds (SSR safety preserved)
- ✅ Empty quadrant canvases center viewport on (0,0) to show crosshair

## Next Phase Readiness

**Ready for Phase 19 (AI-Canvas Integration)** - All step-specific canvas primitives complete:
- Quadrant overlays render conditionally based on step config
- Post-its automatically receive quadrant metadata
- AI context assembly functions ready to be called from AI pipeline
- No blockers for Phase 19 integration work

**What Phase 19 needs to do:**
1. Call `assembleCanvasContextForStep` from `assembleStepContext`
2. Update step prompts to reference quadrant groups
3. Test AI responses use quadrant-grouped context effectively

## Self-Check: PASSED

**Created files verification:**
```bash
✅ FOUND: src/lib/workshop/context/canvas-context.ts
```

**Modified files verification:**
```bash
✅ FOUND: src/components/canvas/react-flow-canvas.tsx (quadrant detection wired)
```

**Commits verification:**
```bash
✅ FOUND: c00c3c0 (Task 1 - QuadrantOverlay and detection wiring)
✅ FOUND: 9cb9a18 (Task 2 - AI context assembly functions)
```

**TypeScript compilation:**
```bash
✅ PASSED: npx tsc --noEmit (no errors)
```

**Build verification:**
```bash
✅ PASSED: npm run build (no errors, SSR safety preserved)
```

**Integration verification:**
```bash
✅ QuadrantOverlay import and render present in react-flow-canvas.tsx
✅ detectQuadrant called at 3 sites: createPostItAtPosition, handleToolbarAdd, handleNodesChange
✅ getStepCanvasConfig called with stepId prop
✅ assembleStakeholderCanvasContext exported from canvas-context.ts
✅ assembleEmpathyMapCanvasContext exported from canvas-context.ts
✅ assembleCanvasContextForStep exported from canvas-context.ts
```

All claims verified. Plan execution complete.
