---
phase: 29-visual-concept-cards
plan: 04
subsystem: step-9-integration
tags: [step-9, canvas, concept-cards, ai-generation, step-integration]
dependency_graph:
  requires: [29-01-concept-card-node, 29-02-canvas-integration, 29-03-ai-generation]
  provides: [step-9-canvas-layout, concept-generation-ui, step-8-data-flow]
  affects: [step-navigation, canvas-persistence, ai-workflow]
tech_stack:
  added: []
  patterns: [canvas-overlay-pattern, multi-step-data-loading, conditional-canvas-rendering]
key_files:
  created:
    - src/components/workshop/concept-canvas-overlay.tsx
  modified:
    - src/providers/canvas-store-provider.tsx
    - src/components/workshop/step-container.tsx
    - src/app/workshop/[sessionId]/step/[stepId]/page.tsx
decisions:
  - "Step 9 added to both CANVAS_ENABLED_STEPS and CANVAS_ONLY_STEPS for chat + canvas layout"
  - "ConceptCanvasOverlay follows Suggest Prompts pattern (absolute bottom-16, z-20, conditional rendering)"
  - "Step 8 data loading happens server-side in page.tsx and passes down via props (not client-side fetch)"
  - "Canvas content detection includes conceptCards.length > 0 for Step 9 confirmation"
  - "Overlay shows info message when Step 8 incomplete, hides when concepts exist"
metrics:
  duration: 215s
  tasks: 2
  commits: 2
  files_created: 1
  files_modified: 3
  lines_added: ~215
  completed: 2026-02-12
---

# Phase 29 Plan 04: Step 9 Integration Summary

**One-liner:** Step 9 renders with chat panel + ReactFlow canvas layout, ConceptCanvasOverlay shows Generate button for AI concept creation from selected Crazy 8s sketches, concept cards persist across page refresh and trigger step confirmation.

## Overview

Completed the final integration plan for Phase 29, wiring Step 9 (Concept Development) to the canvas-first experience. This plan connects all previous work:
- ConceptCardNode component (29-01)
- Canvas integration with autosave (29-02)
- AI concept generation endpoint (29-03)

Step 9 now displays a ReactFlow canvas with AI-generated concept cards alongside the chat panel, replacing the previous text-only output panel layout.

## Tasks Completed

### Task 1: Create concept generation overlay and update CanvasStoreProvider
**Commit:** `8f60c67`
**Duration:** ~100s
**Files:** `src/components/workshop/concept-canvas-overlay.tsx`, `src/providers/canvas-store-provider.tsx`

Created ConceptCanvasOverlay component with:
- **Conditional rendering:** Shows only when `conceptCards.length === 0` (no concepts exist yet)
- **Info message:** Shows "Complete Step 8 to generate concept cards" when no `selectedSketchSlotIds` available
- **Generate button:** Displays sketch count, positioned `absolute bottom-16 left-1/2 -translate-x-1/2 z-20`
- **Loading state:** Shows spinner with "Generating concepts..." message during AI generation
- **AI generation loop:**
  - Iterates through `selectedSketchSlotIds`
  - Fetches from `/api/ai/generate-concept` for each selected sketch
  - Calculates dealing-cards position (30px x/y offset per card)
  - Calls `addConceptCard` store action with AI-generated data
  - Handles errors gracefully (logs and continues to next sketch)

Updated CanvasStoreProvider:
- Added `ConceptCardData` import from concept-card-types
- Added `initialConceptCards?: ConceptCardData[]` prop to interface
- Destructured `initialConceptCards` in component
- Passed to `createCanvasStore({ ..., conceptCards: initialConceptCards || [] })`

### Task 2: Wire Step 9 to canvas layout and update data flow
**Commit:** `0145c30`
**Duration:** ~115s
**Files:** `src/components/workshop/step-container.tsx`, `src/app/workshop/[sessionId]/step/[stepId]/page.tsx`

Updated step-container.tsx:
- Added `'concept'` to `CANVAS_ENABLED_STEPS` array (enables canvas for Step 9)
- Added `'concept'` to `CANVAS_ONLY_STEPS` array (renders canvas instead of RightPanel)
- Imported `ConceptCanvasOverlay` component
- Added `step8SelectedSlotIds` and `step8Crazy8sSlots` props to `StepContainerProps`
- Destructured new props in component
- Updated canvas content detection: `canvasHasContent = postIts.length > 0 || conceptCards.length > 0`
- Rendered `ConceptCanvasOverlay` conditionally for Step 9 in **3 layout contexts:**
  1. Mobile layout (when mobileTab === 'canvas')
  2. Desktop resizable panel (both panels open)
  3. Desktop full canvas (chat collapsed)
- Pattern: Wrapped `CanvasWrapper` in `<div className="h-full relative">` and added overlay as sibling with Step 9 check

Updated page.tsx:
- Added `ConceptCardData` import from concept-card-types
- Loaded `initialConceptCards: ConceptCardData[]` from `canvasData?.conceptCards || []`
- Added Step 8 data loading block (runs when `step.id === 'concept'`):
  - Queries Step 8 artifact for `selectedSketchSlotIds` from stepArtifacts table
  - Loads Step 8 canvas state via `loadCanvasState(session.workshop.id, 'ideation')`
  - Maps `crazy8sSlots` to extract `slotId`, `title`, `imageUrl` fields
- Passed `initialConceptCards` to `CanvasStoreProvider`
- Passed `step8SelectedSlotIds` and `step8Crazy8sSlots` to `StepContainer`

## Verification Results

✅ TypeScript compilation passes with zero errors
✅ Production build succeeds (`npm run build`)
✅ `/api/ai/generate-concept` appears in build output route list
✅ 'concept' in CANVAS_ENABLED_STEPS (line 22 of step-container.tsx)
✅ 'concept' in CANVAS_ONLY_STEPS (line 23 of step-container.tsx)
✅ CanvasStoreProvider accepts `initialConceptCards` prop
✅ ConceptCanvasOverlay renders in all 3 layout contexts (mobile, desktop resizable, desktop collapsed)
✅ Step 9 canvas content detection includes `conceptCards.length > 0`
✅ Page.tsx loads Step 8 data when `step.id === 'concept'`

## Deviations from Plan

None - plan executed exactly as written.

## Key Technical Details

**Overlay positioning:**
```typescript
className="absolute bottom-16 left-1/2 z-20 -translate-x-1/2"
```
Matches Suggest Prompts button pattern from Crazy 8s canvas. Bottom-16 keeps it above canvas toolbar, z-20 ensures it floats above canvas nodes.

**Dealing-cards layout:**
```typescript
let positionIndex = 0;
for (const slotId of selectedSketchSlotIds) {
  const position = positionIndex === 0
    ? { x: 100, y: 100 }
    : { x: 100 + positionIndex * 30, y: 100 + positionIndex * 30 };
  positionIndex++;
  addConceptCard({ position, ...conceptData });
}
```
Cascading 30px offset creates visual stack effect, matching PostIt toolbar pattern.

**Step 8 data query:**
```typescript
const ideationStep = session.workshop.steps.find((s) => s.stepId === 'ideation');
const ideationArtifacts = await db
  .select({ artifact: stepArtifacts.artifact })
  .from(stepArtifacts)
  .where(eq(stepArtifacts.workshopStepId, ideationStep.id))
  .limit(1);
step8SelectedSlotIds = artifact?.selectedSketchSlotIds as string[] | undefined;

const step8Canvas = await loadCanvasState(session.workshop.id, 'ideation');
step8Crazy8sSlots = step8Canvas.crazy8sSlots.map((s) => ({
  slotId: s.slotId,
  title: s.title,
  imageUrl: s.imageUrl,
}));
```
Server-side data loading avoids client-side waterfall fetching. Props pass through page.tsx → StepContainer → ConceptCanvasOverlay.

**Canvas content detection:**
```typescript
const conceptCards = useCanvasStore((s) => s.conceptCards);
const canvasHasContent = postIts.length > 0 || conceptCards.length > 0;
```
Step 9 is "confirmed" when concept cards exist (no extraction needed, same pattern as Steps 2 & 4).

## Impact

This plan completes Phase 29 and the entire v1.3 EzyDraw & Visual Ideation milestone. The end-to-end flow now works:

1. **Step 8 (Ideation):** User creates Crazy 8s sketches in EzyDraw, selects favorites
2. **Step 9 (Concept):** User clicks "Generate Concept Cards (N)", AI queries workshop context, generates structured concepts
3. **Concept cards appear:** Dealing-cards layout on ReactFlow canvas, fully interactive (drag, edit, collapse sections)
4. **State persists:** Autosave to stepArtifacts._canvas.conceptCards, survives page refresh
5. **Step confirmation:** Step 9 marked complete when `conceptCards.length > 0`

## User Flow

**Entering Step 9 (first time):**
1. User navigates to Step 9
2. Canvas renders empty, ConceptCanvasOverlay shows "Generate Concept Cards (N)" button
3. User clicks button
4. Spinner shows "Generating concepts..."
5. AI generates concept for each selected sketch (typically 2-3)
6. Concept cards appear on canvas with dealing-cards offset
7. Overlay hides (conceptCards.length > 0)
8. User can drag, edit, collapse sections, interact with canvas
9. Step navigation shows Step 9 as complete (green checkmark)

**Returning to Step 9:**
1. User navigates to Step 9
2. Canvas loads with existing concept cards from database
3. Overlay does NOT show (conceptCards.length > 0)
4. User continues editing or proceeds to next step

## Self-Check

Verified all claims:

✅ **Files created:**
```bash
[ -f "src/components/workshop/concept-canvas-overlay.tsx" ] && echo "FOUND"
```
Output: `FOUND`

✅ **Files modified:**
```bash
[ -f "src/providers/canvas-store-provider.tsx" ] && echo "FOUND"
[ -f "src/components/workshop/step-container.tsx" ] && echo "FOUND"
[ -f "src/app/workshop/[sessionId]/step/[stepId]/page.tsx" ] && echo "FOUND"
```
All: `FOUND`

✅ **Commits exist:**
```bash
git log --oneline --all | grep -E "(8f60c67|0145c30)"
```
Output:
```
0145c30 feat(29-04): wire Step 9 to canvas layout and update data flow
8f60c67 feat(29-04): create concept generation overlay and update CanvasStoreProvider
```

✅ **Step arrays updated:**
```bash
grep "CANVAS_ENABLED_STEPS\|CANVAS_ONLY_STEPS" src/components/workshop/step-container.tsx | head -2
```
Output:
```
const CANVAS_ENABLED_STEPS = ['stakeholder-mapping', 'sense-making', 'persona', 'journey-mapping', 'concept'];
const CANVAS_ONLY_STEPS = ['stakeholder-mapping', 'sense-making', 'concept'];
```

✅ **Canvas content detection:**
```bash
grep "conceptCards.length" src/components/workshop/step-container.tsx
```
Output: `const canvasHasContent = postIts.length > 0 || conceptCards.length > 0;`

✅ **TypeScript compiles:** `npx tsc --noEmit` (zero errors)

✅ **Build succeeds:** `npm run build` (no errors)

## Self-Check: PASSED

All files created, commits exist, Step 9 added to canvas arrays, concept cards included in content detection, TypeScript compiles, build succeeds.

---

*Completed: 2026-02-12 | Duration: 215s (3m 35s) | Commits: 8f60c67, 0145c30*
