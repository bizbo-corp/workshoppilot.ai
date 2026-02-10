---
phase: 17-canvas-core-interactions
plan: 01
subsystem: canvas-store, post-it-node
tags: [undo-redo, color-coding, data-model, edit-ux]
dependency_graph:
  requires:
    - 15-01 (canvas store foundation)
    - 15-02 (post-it creation and editing)
  provides:
    - Extended PostIt type with color, parentId, type fields
    - Zundo temporal middleware for undo/redo
    - COLOR_CLASSES mapping for color rendering
    - Enhanced edit mode with Escape cancel, maxLength, visual feedback
  affects:
    - 17-02 (will use COLOR_CLASSES and temporal API)
    - 17-03 (will use color field for grouping)
tech_stack:
  added:
    - zundo@2.3.0 (temporal state management)
  patterns:
    - Temporal middleware with partialize (postIts-only, 50-state limit)
    - Dynamic color class mapping with Record<PostItColor, string>
    - Edit mode visual feedback with ring variants
key_files:
  created: []
  modified:
    - package.json (added zundo dependency)
    - package-lock.json (zundo lockfile entry)
    - src/stores/canvas-store.ts (extended PostIt type, temporal wrapper, new actions)
    - src/providers/canvas-store-provider.tsx (added useCanvasStoreApi export)
    - src/components/canvas/post-it-node.tsx (COLOR_CLASSES, color rendering, edit enhancements)
    - src/components/canvas/react-flow-canvas.tsx (pass color to PostItNode)
decisions:
  - "PostIt color is optional (defaults to 'yellow') for backward compatibility"
  - "Temporal partialize excludes isDirty to prevent undo/redo on transient UI state"
  - "Edit mode ring (blue-400) differs from selection ring (blue-500) for visual distinction"
  - "maxLength={200} enforced at textarea level for immediate user feedback"
metrics:
  duration: 2m 20s
  completed: 2026-02-10
---

# Phase 17 Plan 01: Canvas Core Interactions - Data Model & Undo/Redo Foundation Summary

**One-liner:** Extended canvas store with Zundo temporal middleware (50-state undo/redo), PostIt color/grouping fields, and enhanced PostItNode with dynamic color rendering, Escape cancel, maxLength enforcement, and edit mode visual feedback.

## What Was Built

### 1. Zundo Temporal Middleware Integration
- Installed `zundo@2.3.0` for undo/redo state management
- Wrapped canvas store with `temporal()` middleware:
  - **Partialize:** Only tracks `postIts` array (excludes `isDirty` transient state)
  - **Limit:** 50-state history to balance memory and usability
  - **Equality:** JSON.stringify comparison for deep state comparison
- Exported `useCanvasStoreApi` hook from provider for Plan 02 to access `store.temporal.undo()` and `store.temporal.redo()`

### 2. Extended PostIt Data Model
**New fields:**
```typescript
export type PostItColor = 'yellow' | 'pink' | 'blue' | 'green' | 'orange';

export type PostIt = {
  // ... existing fields
  color?: PostItColor;    // Optional, defaults to 'yellow'
  parentId?: string;      // Reference to parent group node
  type?: 'postIt' | 'group'; // Node type discriminator
};
```

**New store actions:**
- `updatePostItColor(id, color)`: Update single post-it color
- `batchDeletePostIts(ids)`: Delete multiple post-its (for group deletion)

### 3. Color-Aware PostItNode Rendering
**COLOR_CLASSES mapping:**
```typescript
export const COLOR_CLASSES: Record<PostItColor, string> = {
  yellow: 'bg-amber-100',
  pink: 'bg-pink-100',
  blue: 'bg-blue-100',
  green: 'bg-green-100',
  orange: 'bg-orange-100',
};
```

**Dynamic rendering:**
- Replaced hardcoded `bg-amber-100` with `COLOR_CLASSES[data.color || 'yellow']`
- COLOR_CLASSES exported for reuse in Plan 02 color picker

### 4. Enhanced Edit Mode UX
**Improvements:**
- **Escape key:** Cancel editing without saving (calls `onEditComplete`)
- **maxLength={200}:** Character limit enforced at textarea level
- **Visual feedback:** `ring-2 ring-blue-400` when `isEditing` (distinct from selection ring)
- **Keyboard handler:** `useCallback` with `stopPropagation` to prevent ReactFlow interference

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TypeScript compilation error on post-it creation**
- **Found during:** Task 1, after extending PostIt type with required `color` field
- **Issue:** Existing `react-flow-canvas.tsx` created post-its without color field, causing TypeScript error
- **Fix:** Made `color` field optional in PostIt type (backward compatible with existing code), store defaults to 'yellow'
- **Files modified:** `src/stores/canvas-store.ts`, `src/components/canvas/react-flow-canvas.tsx`
- **Commit:** d33f070 (same commit as Task 1)

## Verification Results

### TypeScript Compilation
```bash
npx tsc --noEmit
# PASSED: No errors
```

### Dependency Installation
```bash
npm list zundo
# PASSED: zundo@2.3.0 installed
```

### Feature Verification
- [x] `temporal()` wrapper present in canvas-store.ts
- [x] `PostItColor` type exported
- [x] `useCanvasStoreApi` hook exported from provider
- [x] `COLOR_CLASSES` exported from post-it-node.tsx
- [x] `maxLength={200}` on textarea
- [x] Escape key handler in onKeyDown
- [x] Edit mode ring styling (`ring-2 ring-blue-400`)

## Self-Check

### Created Files
None - all modifications to existing files.

### Modified Files
```bash
[ -f "src/stores/canvas-store.ts" ] && echo "FOUND: src/stores/canvas-store.ts" || echo "MISSING"
# FOUND: src/stores/canvas-store.ts

[ -f "src/providers/canvas-store-provider.tsx" ] && echo "FOUND: src/providers/canvas-store-provider.tsx" || echo "MISSING"
# FOUND: src/providers/canvas-store-provider.tsx

[ -f "src/components/canvas/post-it-node.tsx" ] && echo "FOUND: src/components/canvas/post-it-node.tsx" || echo "MISSING"
# FOUND: src/components/canvas/post-it-node.tsx
```

### Commits Exist
```bash
git log --oneline --all | grep -q "d33f070" && echo "FOUND: d33f070" || echo "MISSING"
# FOUND: d33f070

git log --oneline --all | grep -q "50cd774" && echo "FOUND: 50cd774" || echo "MISSING"
# FOUND: 50cd774
```

## Self-Check: PASSED

All files modified as expected, all commits present, all verification commands pass.

## What's Next

### Immediate Dependencies (Plan 02)
- **Color picker toolbar:** Use COLOR_CLASSES for consistent color rendering
- **Undo/Redo buttons:** Access temporal API via useCanvasStoreApi
- **Multi-select:** Use batchDeletePostIts for group deletion

### Phase 17 Completion Path
- Plan 02: Toolbar controls (color picker, undo/redo, delete)
- Plan 03: Grouping and hierarchy (uses parentId field)

### Known Limitations
- Undo/redo UI not yet implemented (Plan 02 dependency)
- Color selection UI not yet implemented (Plan 02 dependency)
- Keyboard shortcuts (Cmd+Z, Cmd+Shift+Z) not yet wired (Plan 02 dependency)

## Testing Notes

### Manual Testing Checklist
When testing Plan 02:
1. Create post-its → verify default yellow color renders
2. Change post-it color → verify COLOR_CLASSES renders correctly
3. Edit post-it → verify blue-400 ring appears
4. Press Escape → verify edit cancels without saving
5. Type 200 characters → verify maxLength prevents more input
6. Undo/redo actions → verify temporal history works (postIts only, not isDirty)

### Edge Cases to Verify
- Loading post-its from DB without color field → should default to 'yellow'
- Undo after setPostIts (DB load) → should not undo DB load
- Redo after reaching 50-state limit → oldest state should be discarded

## Technical Notes

### Why Color is Optional
Made `color` optional (not required) to maintain backward compatibility with existing post-its in DB and avoid breaking existing creation code. The store's `addPostIt` function defaults missing color to 'yellow', ensuring consistency.

### Why Partialize Excludes isDirty
`isDirty` is transient UI state that tracks whether changes need saving. Including it in temporal history would cause undo/redo to incorrectly manipulate save state. Only `postIts` array represents user-actionable history.

### Edit Ring vs Selection Ring
- **Selection ring:** `ring-blue-500` (darker blue) — shows which post-it is selected
- **Edit ring:** `ring-blue-400` (lighter blue) — shows which post-it is in edit mode
- Both can be active simultaneously (selected while editing)

---

**Plan execution:** 2m 20s
**Commits:** d33f070, 50cd774
**Status:** COMPLETE - Ready for Plan 02 (toolbar controls)
