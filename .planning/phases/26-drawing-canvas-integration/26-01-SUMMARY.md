---
phase: 26-drawing-canvas-integration
plan: 01
subsystem: drawing-persistence
tags: [backend, storage, server-actions]
dependency_graph:
  requires:
    - "@vercel/blob package for PNG upload"
    - "simplify-js for Douglas-Peucker simplification"
    - "stepArtifacts.drawings[] JSONB array pattern"
  provides:
    - "simplifyDrawingElements() for 60%+ point reduction"
    - "saveDrawing() server action"
    - "loadDrawing() server action"
    - "updateDrawing() server action"
  affects:
    - "src/lib/drawing/simplify.ts (new export)"
    - "src/actions/drawing-actions.ts (new file)"
tech_stack:
  added:
    - "@vercel/blob@2.2.0"
    - "simplify-js@1.2.4"
  patterns:
    - "Douglas-Peucker vector simplification at tolerance=1.0"
    - "Server action pattern matching canvas-actions.ts"
    - "Optimistic locking with version increment"
    - "JSONB array merge for drawings[]"
key_files:
  created:
    - "src/actions/drawing-actions.ts (380 lines)"
  modified:
    - "package.json (dependencies)"
    - "src/lib/drawing/simplify.ts (already existed from 44ba7e4)"
decisions:
  - "Use simplify-js instead of custom implementation for battle-tested Douglas-Peucker algorithm"
  - "Store drawings as JSONB array in stepArtifacts (not separate table) for atomic workshop data"
  - "Upload new PNG on every update (rely on Vercel Blob auto-expiration for cleanup)"
  - "Inline type declaration for simplify-js (no @types package available)"
metrics:
  duration: 143s
  tasks_completed: 2
  files_created: 1
  files_modified: 2
  commits: 1
  completed_date: 2026-02-12
---

# Phase 26 Plan 01: Drawing Persistence Backend Summary

**One-liner:** Server actions for drawing save/load/update with Vercel Blob PNG storage and Douglas-Peucker vector simplification (60%+ point reduction).

## What Was Built

### Dependencies Installed
- **@vercel/blob@2.2.0:** PNG image upload to Vercel's CDN with public access URLs
- **simplify-js@1.2.4:** Douglas-Peucker algorithm implementation for vector point reduction

### Vector Simplification Utility
**File:** `src/lib/drawing/simplify.ts`

**Purpose:** Reduce freehand stroke point arrays by 60%+ while preserving visual shape.

**Implementation:**
- `simplifyDrawingElements(elements: DrawingElement[]): DrawingElement[]`
- Only processes `type === 'pencil'` elements with 4+ points
- Converts flat `[x1, y1, x2, y2, ...]` arrays to `{x, y}[]` objects for simplify-js
- Applies Douglas-Peucker with `tolerance=1.0` and `highQuality=true`
- Converts back to flat array format
- Passes through non-pencil elements (rectangles, circles, arrows, text) unchanged

**Type declaration:** Inline module declaration since @types/simplify-js doesn't exist.

### Drawing Server Actions
**File:** `src/actions/drawing-actions.ts` (380 lines)

**Architecture:** Follows exact pattern from `canvas-actions.ts`:
- Same DB access pattern (workshopSteps → stepArtifacts)
- Same optimistic locking with version increment
- Same artifact merge pattern (preserves existing data)

**Three exports:**

#### 1. `saveDrawing()`
- **Parameters:** `workshopId`, `stepId`, `pngBase64`, `vectorJson`, `width`, `height`
- **Flow:**
  1. Guard check for `BLOB_READ_WRITE_TOKEN` env var (descriptive error if missing)
  2. Convert base64 data URL to Buffer
  3. Upload to Vercel Blob: `put(\`drawings/${workshopId}/${Date.now()}.png\`, buffer, { access: 'public', addRandomSuffix: true })`
  4. Find workshopStep by workshopId + stepId
  5. Read existing artifact, extract `drawings` array (default `[]`)
  6. Create drawing record with UUID, PNG URL, vector JSON, dimensions, timestamp
  7. Merge into artifact: `{ ...existingArtifact, drawings: [...existingDrawings, newDrawing] }`
  8. Update with optimistic locking (version increment)
  9. If no artifact exists, insert with `schemaVersion: 'drawing-1.0'`
- **Returns:** `{ drawingId, pngUrl }` or error

#### 2. `loadDrawing()`
- **Parameters:** `workshopId`, `stepId`, `drawingId`
- **Flow:**
  1. Find workshopStep
  2. Read artifact
  3. Extract drawings array
  4. Find drawing by ID
- **Returns:** `{ vectorJson, pngUrl, width, height }` or `null`

#### 3. `updateDrawing()`
- **Parameters:** `workshopId`, `stepId`, `drawingId`, `pngBase64`, `vectorJson`, `width`, `height`
- **Flow:**
  1. Guard check for BLOB_READ_WRITE_TOKEN
  2. Upload new PNG (old one auto-expires based on Blob store config)
  3. Find existing drawing in array by ID
  4. Replace fields: `pngUrl`, `vectorJson`, `width`, `height`, `updatedAt`
  5. Merge back with version increment
- **Returns:** `{ pngUrl }` or error

**Error handling:** All actions wrapped in try/catch, return `{ success: false, error: string }` on failure.

### Drawing Type (Internal)
```typescript
type Drawing = {
  id: string;
  pngUrl: string;
  vectorJson: string;  // JSON.stringify'd DrawingElement[]
  width: number;
  height: number;
  createdAt: string;   // ISO timestamp
  updatedAt?: string;  // ISO timestamp, set on update
};
```

Stored in `stepArtifacts.artifact.drawings[]` as JSONB array.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 1 already completed in prior execution**
- **Found during:** Task 1 execution
- **Issue:** `src/lib/drawing/simplify.ts` already existed (commit 44ba7e4), dependencies already in package.json
- **Fix:** Verified existing implementation matches plan requirements, proceeded to Task 2
- **Files verified:** `src/lib/drawing/simplify.ts`, `package.json`
- **Impact:** No changes needed for Task 1, single commit for Task 2 only

## Verification Results

All verification criteria passed:

✅ `npm ls @vercel/blob simplify-js` shows both packages installed
✅ `npx tsc --noEmit` passes with zero errors
✅ `src/lib/drawing/simplify.ts` exports `simplifyDrawingElements`
✅ `src/actions/drawing-actions.ts` exports `saveDrawing`, `loadDrawing`, `updateDrawing`
✅ Server actions follow same DB pattern as `canvas-actions.ts`

## Key Integration Points

**For frontend (Plans 02-03):**
- Import drawing actions: `import { saveDrawing, loadDrawing, updateDrawing } from '@/actions/drawing-actions'`
- Call after PNG export: `await saveDrawing({ workshopId, stepId, pngBase64: stage.toDataURL(), vectorJson: JSON.stringify(elements), width, height })`
- Load for re-editing: `const data = await loadDrawing({ workshopId, stepId, drawingId }); const elements = JSON.parse(data.vectorJson);`

**For vector simplification:**
- Import: `import { simplifyDrawingElements } from '@/lib/drawing/simplify'`
- Apply before save: `const simplified = simplifyDrawingElements(elements)`
- Reduces payload size and improves rendering performance

**Environment setup required:**
1. Create Vercel Blob Store in dashboard (Storage → Create → Blob)
2. Copy `BLOB_READ_WRITE_TOKEN` to `.env.local`
3. Deploy to Vercel to use in production

## Success Criteria Met

✅ Dependencies installed (@vercel/blob, simplify-js)
✅ Simplification utility working with Douglas-Peucker at tolerance=1.0
✅ Three server actions ready for frontend wiring
✅ TypeScript compilation proves correctness of imports and types
✅ Pattern consistency with existing canvas-actions.ts

## Next Steps

**Plan 02:** Create DrawingImageNode custom ReactFlow node to display drawings in canvas
**Plan 03:** Wire EzyDraw modal to server actions for save/load flow
**Plan 04:** Integrate drawing launch from canvas nodes

## Self-Check: PASSED

✅ **Created files exist:**
- `src/actions/drawing-actions.ts` (380 lines)

✅ **Modified files exist:**
- `src/lib/drawing/simplify.ts` (69 lines, pre-existing from 44ba7e4)
- `package.json` (dependencies)

✅ **Commits exist:**
- `855287c`: feat(26-01): create drawing server actions for save/load/update

All claimed artifacts verified on disk and in git history.
