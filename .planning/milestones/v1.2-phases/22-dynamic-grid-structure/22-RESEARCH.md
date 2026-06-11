# Phase 22: Dynamic Grid Structure (Column Management) - Research

**Researched:** 2026-02-11
**Domain:** Dynamic column management for ReactFlow grid canvas, inline editing, card migration UX, drag feedback
**Confidence:** HIGH

## Summary

Phase 22 extends Phase 21's static grid foundation with user-controlled column operations (add, remove, inline-edit) and critical UX polish for post-it interactions. The research confirms this requires managing dynamic GridConfig state (currently static in step-canvas-config.ts), implementing inline editing patterns for column headers, handling card migration when columns are deleted, and improving drag feedback.

The core architectural challenge is that Phase 21 treats gridConfig as **static configuration** loaded from step-canvas-config.ts, but Phase 22 requires **dynamic, user-modifiable state** for columns. The existing canvas store (Zustand + zundo) provides the natural home for this state, maintaining unified undo/redo for both node positions and grid structure changes.

Inline editing of column headers presents two implementation paths: (1) contentEditable divs that preserve text formatting but conflict with React's state management, or (2) controlled input elements that integrate cleanly with React but require manual styling. Research and existing codebase patterns (EditableCell in journey-map-grid.tsx) point to controlled input approach for reliability and state management simplicity.

Card migration on column deletion requires a confirmation dialog (shadcn/ui Dialog already installed) showing which cards will be affected, with migration strategy offering: (a) move to adjacent column (left preferred, then right), (b) move to designated "parking" column, or (c) delete with cards. Enterprise table UX research shows users expect preview + confirmation for destructive operations affecting multiple items.

The additional UX polish items (drag ghost feedback, auto-sizing post-its, larger grid cells) are canvas-level improvements that complement column management. ReactFlow provides cursor customization via CSS classes but no built-in drag ghost—custom implementation via cloned node during drag is standard pattern. Auto-sizing textareas require react-textarea-autosize (already installed at 8.5.9) or custom scrollHeight calculation. Grid cell sizing is pure configuration change in gridConfig.

**Primary recommendation:** Migrate gridConfig.columns from static config to canvas store state, implement controlled input inline editing with Enter/Escape handlers, use shadcn Dialog for delete confirmation with card migration preview, add CSS cursor overrides for drag states, and integrate react-textarea-autosize for post-it auto-height.

## Standard Stack

### Core (All Already Installed)

No new dependencies required. All Phase 22 requirements satisfied by existing packages.

| Library | Version | Purpose | Phase 22 Usage |
|---------|---------|---------|----------------|
| **zustand** | via zundo 2.3.0 | State management | Store dynamic gridConfig.columns with undo/redo support |
| **zundo** | 2.3.0 | Temporal middleware | Undo/redo for column add/remove/edit operations |
| **react-textarea-autosize** | 8.5.9 | Auto-growing textarea | Post-it card auto-height based on content (ALREADY INSTALLED) |
| **shadcn/ui Dialog** | (via Radix UI) | Modal dialogs | Confirmation dialog for column deletion with card migration preview |
| **@xyflow/react** | 12.10.0 | Canvas rendering | Cursor customization, drag events for ghost feedback |

### Existing Patterns to Reuse

| Pattern | Location | Reuse for Phase 22 |
|---------|----------|-------------------|
| **Controlled input editing** | `journey-map-grid.tsx` EditableCell | Column header inline editing (proven React state integration) |
| **Confirmation dialogs** | `reset-step-dialog.tsx` | Column deletion confirmation with card preview |
| **Canvas store actions** | `canvas-store.ts` addPostIt/updatePostIt | Add column/remove column/update column actions |
| **Temporal undo/redo** | `canvas-store.ts` zundo wrapper | Column operations participate in undo/redo history |
| **Grid coordinate transforms** | `grid-layout.ts` getCellBounds | Recalculate positions when columns change width/order |

## Architecture Patterns

### Pattern 1: Dynamic Grid State (Extend Canvas Store)

**What:** Move gridConfig.columns from static configuration to dynamic Zustand state, maintaining gridConfig.rows as static (fixed 7 journey map swimlanes).

**When to use:** When grid structure changes based on user actions (add/remove columns), requiring state persistence and undo/redo.

**Why this pattern:**
- **Unified undo/redo:** Column operations and node movements share temporal history
- **Single persistence path:** Auto-save already serializes entire canvas store to stepArtifacts JSONB
- **No schema changes:** GridConfig already defined, just move columns array to state
- **Backward compatible:** Steps without dynamic columns (quadrant layouts) unaffected

**Implementation:**

```typescript
// canvas-store.ts (EXTEND)
export type GridColumn = {
  id: string;
  label: string;
  width: number;
};

export type CanvasState = {
  postIts: PostIt[];
  isDirty: boolean;
  gridColumns?: GridColumn[]; // NEW - undefined for non-grid steps
};

export type CanvasActions = {
  // ... existing actions
  addGridColumn: (label: string) => void;
  updateGridColumn: (id: string, updates: Partial<GridColumn>) => void;
  removeGridColumn: (id: string) => void;
  reorderGridColumns: (columnIds: string[]) => void;
};

// In createCanvasStore:
addGridColumn: (label) =>
  set((state) => {
    const newColumn: GridColumn = {
      id: crypto.randomUUID(),
      label,
      width: 200, // Default width
    };
    return {
      gridColumns: [...(state.gridColumns || []), newColumn],
      isDirty: true,
    };
  }),

updateGridColumn: (id, updates) =>
  set((state) => ({
    gridColumns: state.gridColumns?.map(col =>
      col.id === id ? { ...col, ...updates } : col
    ),
    isDirty: true,
  })),

removeGridColumn: (id) =>
  set((state) => {
    // Migration logic: move cards to adjacent column
    const colIndex = state.gridColumns?.findIndex(c => c.id === id) ?? -1;
    if (colIndex === -1) return state;

    const adjacentColId =
      state.gridColumns?.[colIndex - 1]?.id || // Left adjacent
      state.gridColumns?.[colIndex + 1]?.id;   // Right adjacent

    const updatedPostIts = state.postIts.map(postIt => {
      if (postIt.cellAssignment?.col === id) {
        if (adjacentColId) {
          // Migrate to adjacent column
          return {
            ...postIt,
            cellAssignment: {
              ...postIt.cellAssignment,
              col: adjacentColId,
            },
            // Recalculate position based on new cell
          };
        } else {
          // No adjacent column - clear cell assignment
          return {
            ...postIt,
            cellAssignment: undefined,
          };
        }
      }
      return postIt;
    });

    return {
      gridColumns: state.gridColumns?.filter(c => c.id !== id),
      postIts: updatedPostIts,
      isDirty: true,
    };
  }),
```

**Trade-offs:**
- **Pro:** Undo reverts column deletions, restoring grid structure
- **Pro:** Auto-save persists column changes to database automatically
- **Con:** Canvas store grows (acceptable - still single source of truth)
- **Con:** Must recalculate node positions when columns change (necessary complexity)

### Pattern 2: Inline Editing with Controlled Input

**What:** Use controlled input element for column header editing, not contentEditable, following EditableCell pattern from journey-map-grid.tsx.

**When to use:** Editing text that requires React state synchronization and simple text-only content (no rich formatting).

**Why this pattern:**
- **React integration:** No conflict between browser DOM and React Virtual DOM
- **State predictability:** Single source of truth in React state
- **Proven in codebase:** EditableCell already uses controlled textarea with same requirements
- **Simpler than contentEditable:** No need for MutationObserver or dangerouslySetInnerHTML

**Implementation:**

```typescript
// components/canvas/editable-column-header.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface EditableColumnHeaderProps {
  label: string;
  onSave: (newLabel: string) => void;
  className?: string;
}

export function EditableColumnHeader({
  label,
  onSave,
  className
}: EditableColumnHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus and select text on edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== label) {
      onSave(trimmed);
    } else if (!trimmed) {
      // Revert to original if empty
      setEditValue(label);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(label);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        maxLength={30}
        className={cn(
          'nodrag nopan', // Prevent ReactFlow drag interference
          'px-2 py-1 text-sm font-semibold',
          'border-b-2 border-blue-500 bg-transparent',
          'outline-none',
          className
        )}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        'px-2 py-1 text-sm font-semibold cursor-pointer',
        'hover:bg-gray-100 hover:rounded transition-colors',
        className
      )}
    >
      {label}
    </div>
  );
}
```

**Trade-offs:**
- **Pro:** No contentEditable edge cases (paste formatting, caret position bugs)
- **Pro:** Works with React DevTools, state inspection straightforward
- **Con:** Requires manual Enter/Escape handling (acceptable - clear UX)
- **Con:** Single-line only (acceptable - column headers shouldn't wrap)

**Sources:**
- [How to build an inline editable UI in React - LogRocket Blog](https://blog.logrocket.com/build-inline-editable-ui-react/)
- [Using Content Editable Elements in JavaScript (React) | Tania Rascia's Website](https://www.taniarascia.com/content-editable-elements-in-javascript-react/)
- Existing codebase: `src/components/workshop/journey-map-grid.tsx` EditableCell component

### Pattern 3: Confirmation Dialog with Migration Preview

**What:** Show confirmation dialog before column deletion, displaying count of affected cards and migration strategy.

**When to use:** Destructive operations affecting multiple items require preview + confirmation per enterprise UX best practices.

**Why this pattern:**
- **User control:** Preview before commit prevents accidental data loss
- **Transparency:** Shows exactly which cards will move and where
- **Standard UX:** Follows shadcn/ui Dialog pattern already used in reset-step-dialog.tsx
- **Undo safety:** Even with confirmation, undo still available via temporal store

**Implementation:**

```typescript
// components/dialogs/delete-column-dialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeleteColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  columnLabel: string;
  affectedCardCount: number;
  migrationTarget: string | null; // Adjacent column label or null
}

export function DeleteColumnDialog({
  open,
  onOpenChange,
  onConfirm,
  columnLabel,
  affectedCardCount,
  migrationTarget,
}: DeleteColumnDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete "{columnLabel}" column?</DialogTitle>
          <DialogDescription>
            {affectedCardCount > 0 ? (
              <>
                This column contains {affectedCardCount} card
                {affectedCardCount === 1 ? '' : 's'}.{' '}
                {migrationTarget ? (
                  <>
                    Cards will be moved to <strong>{migrationTarget}</strong>.
                  </>
                ) : (
                  <>
                    Cards will lose their column assignment and need manual repositioning.
                  </>
                )}
              </>
            ) : (
              'This column is empty and can be safely deleted.'
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Delete Column
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Usage in grid overlay:**

```typescript
// In GridOverlay or column header UI:
const handleDeleteColumn = (columnId: string) => {
  const column = gridColumns.find(c => c.id === columnId);
  const affectedCards = postIts.filter(
    p => p.cellAssignment?.col === columnId
  );

  setDeleteDialog({
    open: true,
    columnId,
    columnLabel: column.label,
    affectedCardCount: affectedCards.length,
    migrationTarget: /* calculate adjacent column label */,
  });
};

const confirmDelete = () => {
  removeGridColumn(deleteDialog.columnId);
  // Undo available via Cmd+Z if needed
};
```

**Trade-offs:**
- **Pro:** Prevents accidental deletion of columns with cards
- **Pro:** Clear communication of migration strategy
- **Con:** Extra click for deletion (necessary for safety)

**Sources:**
- [A better user experience for deleting records](https://www.leemunroe.com/best-practice-deleting-records/)
- [Data Table Design UX Patterns & Best Practices - Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- Existing codebase: `src/components/dialogs/reset-step-dialog.tsx`

### Pattern 4: Drag Ghost Feedback (CSS + Clone Pattern)

**What:** Show visual drag feedback via cursor change + optional ghost/trail effect during post-it node drag.

**When to use:** Improving drag affordance and target preview during drag operations.

**Why this pattern:**
- **Cursor change:** Simple CSS override, immediate visual feedback
- **Ghost clone:** Standard drag-and-drop pattern for "picking up" objects
- **ReactFlow support:** Cursor customization via className overrides, ghost via custom rendering

**Implementation:**

**Approach A: Cursor-only (Simplest):**

```css
/* globals.css or canvas-specific styles */
.react-flow__node:hover {
  cursor: pointer; /* Not grab - user requested pointer */
}

.react-flow__node.dragging {
  cursor: grabbing;
  opacity: 0.6; /* Visual feedback during drag */
}
```

```typescript
// In PostItNode component:
<div
  className={cn(
    bgColor,
    'shadow-md rounded-sm p-3',
    'hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150',
    selected && 'ring-2 ring-blue-500 ring-offset-1',
    data.isEditing && 'ring-2 ring-blue-400 ring-offset-1',
    'cursor-pointer', // NEW: Pointer cursor on hover
  )}
  style={{
    width: '120px',
    minHeight: '120px',
    touchAction: 'none',
    opacity: /* detect if dragging */ ? 0.6 : 1, // NEW: Reduce opacity while dragging
  }}
>
```

**Approach B: Ghost/Trail (More Visual Feedback):**

```typescript
// react-flow-canvas.tsx
const [dragGhost, setDragGhost] = useState<{
  position: { x: number; y: number };
  nodeId: string;
} | null>(null);

const handleNodeDragStart = useCallback(
  (event: React.MouseEvent, node: Node) => {
    setDragGhost({
      position: node.position,
      nodeId: node.id,
    });
  },
  []
);

const handleNodeDrag = useCallback(
  (event: React.MouseEvent, node: Node) => {
    // Update ghost position
    setDragGhost(prev => prev ? { ...prev, position: node.position } : null);

    // Existing cell highlighting logic
    if (stepConfig.hasGrid && stepConfig.gridConfig) {
      const cell = positionToCell(node.position, stepConfig.gridConfig);
      setHighlightedCell(cell);
    }
  },
  [stepConfig]
);

const handleNodeDragStop = useCallback(() => {
  setDragGhost(null); // Clear ghost
  setHighlightedCell(null); // Clear highlight
}, []);

// In render:
<ReactFlow
  onNodeDragStart={handleNodeDragStart} // NEW
  onNodeDrag={handleNodeDrag}
  onNodeDragStop={handleNodeDragStop} // MODIFIED
  // ... other props
>
  {/* Render faint ghost at original position */}
  {dragGhost && (
    <div
      className="absolute pointer-events-none"
      style={{
        left: dragGhost.position.x,
        top: dragGhost.position.y,
        opacity: 0.3,
        width: 120,
        height: 120,
        // Copy post-it styling
      }}
    >
      Ghost outline
    </div>
  )}
</ReactFlow>
```

**Trade-offs:**
- **Cursor-only (A):** Simple, low overhead, clear affordance (RECOMMENDED for Phase 22)
- **Ghost (B):** More visual feedback, but adds complexity and potential performance cost
- **Recommendation:** Start with Approach A (cursor + opacity), defer ghost to future polish phase

**Sources:**
- [Changing the cursor when hovering the react-flow pane · xyflow/xyflow · Discussion #3216](https://github.com/xyflow/xyflow/discussions/3216)
- [Custom drag ghost in react: The way that actually works | by Nazmul Hasan Shajib | Medium](https://medium.com/@shojib116/custom-drag-ghost-in-react-the-way-that-actually-works-c802e4ec7128)

### Pattern 5: Auto-Sizing Post-It Cards

**What:** Replace fixed-height post-its (120px) with auto-growing height based on text content, disable scroll, use react-textarea-autosize.

**When to use:** Post-it cards with variable text length where scroll creates poor UX (user complaint: limited editing area).

**Why this pattern:**
- **Better UX:** All text visible without scrolling
- **Library available:** react-textarea-autosize 8.5.9 already installed
- **Proven approach:** Material UI, shadcn-chat, and other enterprise libraries use same technique
- **Grid compatibility:** Auto-height works with grid snapping if position-based (not height-based)

**Implementation:**

```typescript
// post-it-node.tsx (MODIFY)
import TextareaAutosize from 'react-textarea-autosize';

export const PostItNode = memo(({ data, selected, id }: NodeProps<PostItNode>) => {
  const bgColor = COLOR_CLASSES[data.color || 'yellow'];

  return (
    <div
      className={cn(
        bgColor,
        'shadow-md rounded-sm p-3',
        'font-sans text-sm text-gray-800',
        'hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150',
        selected && 'ring-2 ring-blue-500 ring-offset-1',
        data.isEditing && 'ring-2 ring-blue-400 ring-offset-1',
        'cursor-pointer',
      )}
      style={{
        width: '120px',
        minHeight: '120px', // NEW: minHeight instead of fixed height
        touchAction: 'none',
      }}
    >
      {/* Hidden handles */}
      <Handle type="target" position={Position.Top} className="!opacity-0 !w-0 !h-0" />

      {data.isEditing ? (
        <TextareaAutosize
          autoFocus
          maxLength={200}
          minRows={3}
          maxRows={10}
          className="nodrag nopan bg-transparent border-none outline-none resize-none w-full"
          defaultValue={data.text}
          onBlur={() => data.onEditComplete?.(id)}
          onChange={(e) => data.onTextChange?.(id, e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type here..."
          style={{
            overflow: 'hidden', // NEW: Disable scroll
          }}
        />
      ) : (
        <p className="break-words whitespace-pre-wrap">{data.text || ''}</p>
      )}

      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0" />
    </div>
  );
});
```

**Trade-offs:**
- **Pro:** All text visible, no scroll frustration
- **Pro:** Library handles scrollHeight calculation and resize events
- **Con:** Taller cards may overlap adjacent grid cells (acceptable - position is flexible)
- **Con:** ReactFlow node height changes trigger re-layout (minimal performance impact for ~20 nodes)

**Sources:**
- [react-textarea-autosize - npm](https://www.npmjs.com/package/react-textarea-autosize) (version 8.5.9 installed)
- [Textarea Autosize React component - Material UI](https://mui.com/material-ui/react-textarea-autosize/)
- [Building an Autosizing Textarea in React (Code Included) - Upmostly](https://upmostly.com/tutorials/autosizing-textarea-react)

### Pattern 6: Larger Grid Cells (Configuration Change)

**What:** Increase grid cell dimensions to provide more comfortable spacing for post-it cards with margins.

**When to use:** User feedback indicates canvas feels cramped, cards too close to cell boundaries.

**Why this pattern:**
- **Pure configuration:** No code changes, just update gridConfig values
- **Tested in Phase 21:** cellPadding already implemented (10px keeps nodes from touching borders)
- **Responsive:** Larger cells reduce perceived density, improve visual hierarchy

**Implementation:**

```typescript
// step-canvas-config.ts (MODIFY Journey Mapping grid)
'journey-mapping': {
  hasQuadrants: false,
  hasGrid: true,
  gridConfig: {
    rows: [
      { id: 'actions', label: 'Actions', height: 150 },      // +30px from 120
      { id: 'goals', label: 'Goals', height: 150 },          // +30px
      { id: 'barriers', label: 'Barriers', height: 150 },    // +30px
      { id: 'touchpoints', label: 'Touchpoints', height: 150 }, // +30px
      { id: 'emotions', label: 'Emotions', height: 120 },    // +20px from 100
      { id: 'moments', label: 'Moments of Truth', height: 150 }, // +30px
      { id: 'opportunities', label: 'Opportunities', height: 150 }, // +30px
    ],
    columns: [
      { id: 'awareness', label: 'Awareness', width: 240 },      // +40px from 200
      { id: 'consideration', label: 'Consideration', width: 240 }, // +40px
      { id: 'decision', label: 'Decision', width: 240 },        // +40px
      { id: 'purchase', label: 'Purchase', width: 240 },        // +40px
      { id: 'onboarding', label: 'Onboarding', width: 240 },    // +40px
    ],
    origin: { x: 140, y: 60 }, // +10px y for header breathing room
    cellPadding: 15, // +5px padding (was 10px)
  },
},
```

**Calculation rationale:**
- **Post-it width:** 120px
- **Cell padding:** 15px × 2 = 30px horizontal space
- **Total cell width needed:** 120 + 30 = 150px minimum
- **Generous spacing:** 240px cell width = 120px card + 120px margin (50% breathing room)
- **Row height:** 150px allows 120px min card + 30px vertical margin + auto-height expansion

**Trade-offs:**
- **Pro:** Zero code changes, instant visual improvement
- **Pro:** More room for auto-height post-its to expand
- **Con:** Larger canvas requires more panning (acceptable with viewport controls)
- **Con:** Fewer cells visible at default zoom (acceptable - zoom out available)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Auto-growing textarea** | Custom scrollHeight calculation with useEffect | `react-textarea-autosize` (already installed) | Handles resize events, window resize, maxRows limits, font size changes. Custom implementations break on font load, zoom, or dynamic content injection. |
| **Dialog component** | Custom modal with backdrop, focus trap, ESC handling | shadcn/ui Dialog (already installed) | Accessibility (ARIA, focus management), keyboard navigation, scroll lock, portal rendering. Custom modals miss 15+ edge cases. |
| **Inline editing state** | contentEditable with dangerouslySetInnerHTML | Controlled input with useState | contentEditable conflicts with React Virtual DOM, retains paste formatting, has caret position bugs. Controlled input is predictable and debuggable. |
| **Column reordering** | Custom drag-and-drop with mouse events | React DnD or ReactFlow node ordering | Multi-touch, pointer events, scroll-during-drag, drop target highlighting. Custom implementations break on touch devices. |
| **Undo/redo for column ops** | Custom history stack with array push/pop | Zundo temporal middleware (already wraps store) | Column add/remove/edit automatically participate in existing undo/redo. Custom stack requires duplicate logic and breaks unified history. |

**Key insight:** Phase 22 leverages existing libraries (react-textarea-autosize, shadcn Dialog, zundo) that already solve the hard edge cases. Building custom versions introduces bugs around touch events, accessibility, undo/redo integration, and font rendering variations.

## Common Pitfalls

### Pitfall 1: Mutating gridConfig Directly Instead of Through Store Actions

**What goes wrong:** Directly modifying `stepConfig.gridConfig.columns` array breaks undo/redo and doesn't trigger auto-save.

**Why it happens:** gridConfig starts as static config in step-canvas-config.ts, tempting to mutate in place.

**How to avoid:** Treat gridColumns as immutable state managed by Zustand actions. Never mutate arrays directly:

```typescript
// BAD: Direct mutation
stepConfig.gridConfig.columns.push(newColumn); // Breaks undo, no auto-save

// GOOD: Store action
addGridColumn(newColumn.label); // Participates in undo, triggers auto-save
```

**Warning signs:**
- Undo doesn't revert column additions
- Column changes don't persist to database
- Multiple users see different column states (stale cache)

### Pitfall 2: Not Recalculating Node Positions After Column Width Changes

**What goes wrong:** Changing column width leaves nodes at old pixel positions, misaligned with new cell boundaries.

**Why it happens:** Node positions are absolute pixels, not automatically updated when grid config changes.

**How to avoid:** When column width/order changes, recalculate affected node positions using grid coordinate transforms:

```typescript
const updateGridColumn = (id: string, updates: Partial<GridColumn>) =>
  set((state) => {
    const updatedColumns = state.gridColumns?.map(col =>
      col.id === id ? { ...col, ...updates } : col
    );

    // Recalculate positions for ALL nodes in affected columns
    const updatedPostIts = state.postIts.map(postIt => {
      if (postIt.cellAssignment) {
        const cell = getCellCoordinateFromAssignment(
          postIt.cellAssignment,
          updatedColumns
        );
        if (cell) {
          const newBounds = getCellBounds(cell, {
            ...gridConfig,
            columns: updatedColumns,
          });
          return {
            ...postIt,
            position: {
              x: newBounds.x + gridConfig.cellPadding,
              y: newBounds.y + gridConfig.cellPadding,
            },
          };
        }
      }
      return postIt;
    });

    return {
      gridColumns: updatedColumns,
      postIts: updatedPostIts,
      isDirty: true,
    };
  });
```

**Warning signs:**
- Nodes drift away from cell boundaries after column edits
- Snapping breaks after column resize
- Cell highlighting misaligns with node positions

### Pitfall 3: Using contentEditable for Column Headers

**What goes wrong:** contentEditable retains paste formatting (bold, italic, font-family from clipboard), creates caret position bugs, conflicts with React state.

**Why it happens:** contentEditable looks simpler at first (no input element styling), but edge cases accumulate.

**How to avoid:** Use controlled input element with styled placeholder and blur/Enter handlers:

```typescript
// BAD: contentEditable
<div
  contentEditable
  suppressContentEditableWarning
  onBlur={(e) => onSave(e.currentTarget.textContent || '')}
>
  {label}
</div>
// Issues: Paste retains formatting, caret jumps, React warnings

// GOOD: Controlled input
<input
  type="text"
  value={editValue}
  onChange={(e) => setEditValue(e.target.value)}
  onBlur={handleSave}
  onKeyDown={handleKeyDown}
  maxLength={30}
/>
// Benefits: Plain text only, predictable state, no React warnings
```

**Warning signs:**
- Pasted text has different font/color than typed text
- Caret jumps to end when typing in middle
- React console warnings about uncontrolled components

### Pitfall 4: Deleting Columns Without Confirmation Dialog

**What goes wrong:** User accidentally deletes column with cards, loses data, no undo awareness.

**Why it happens:** Delete button triggers immediate removal for perceived speed.

**How to avoid:** Always show confirmation dialog for column deletion when cards exist in that column:

```typescript
const handleDeleteClick = (columnId: string) => {
  const affectedCards = postIts.filter(p => p.cellAssignment?.col === columnId);

  if (affectedCards.length > 0) {
    // Show confirmation dialog with migration preview
    setDeleteDialog({ open: true, columnId, affectedCardCount: affectedCards.length });
  } else {
    // Empty column - can delete immediately
    removeGridColumn(columnId);
  }
};
```

**Warning signs:**
- User complaints about accidental deletions
- Support requests to recover deleted columns
- Undo usage spikes after column deletions

### Pitfall 5: Fixed-Height Post-Its with Auto-Size Content

**What goes wrong:** Auto-sizing textarea grows content, but post-it node has fixed height, content overflows or gets cut off.

**Why it happens:** ReactFlow node style sets `height: '120px'`, but textarea expands beyond that.

**How to avoid:** Use `minHeight` instead of `height` on node wrapper, let content determine actual height:

```typescript
// BAD: Fixed height
<div style={{ width: '120px', height: '120px' }}>
  <TextareaAutosize /> {/* Overflows parent */}
</div>

// GOOD: Minimum height, flexible expansion
<div style={{ width: '120px', minHeight: '120px' }}>
  <TextareaAutosize minRows={3} maxRows={10} />
</div>
```

**Warning signs:**
- Text gets cut off despite auto-size library
- Scrollbar appears inside post-it (defeats purpose)
- Node height doesn't match content height

### Pitfall 6: Forgetting to Update GridOverlay When Columns Change

**What goes wrong:** GridOverlay reads initial gridConfig from props, doesn't re-render when columns added/removed from store.

**Why it happens:** GridOverlay subscribes to viewport transform, not gridColumns state.

**How to avoid:** Make GridOverlay reactive to gridColumns changes via canvas store selector:

```typescript
// grid-overlay.tsx
export function GridOverlay({ config }: GridOverlayProps) {
  const { x, y, zoom } = useReactFlowStore(viewportSelector);

  // Subscribe to dynamic columns from canvas store
  const gridColumns = useCanvasStore((s) => s.gridColumns || config.columns);

  // Use gridColumns instead of config.columns for rendering
  const colPositions = gridColumns.map(/* ... */);

  return <svg>{/* ... */}</svg>;
}
```

**Warning signs:**
- Adding column via UI doesn't show new column line in overlay
- Column headers don't update after inline edit
- Overlay shows stale column labels

## Code Examples

### Example 1: Add Column Button with Input Dialog

```typescript
// components/canvas/add-column-button.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useCanvasStore } from '@/providers/canvas-store-provider';

export function AddColumnButton() {
  const [isAdding, setIsAdding] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState('');
  const addGridColumn = useCanvasStore((s) => s.addGridColumn);

  const handleAdd = () => {
    if (newColumnLabel.trim()) {
      addGridColumn(newColumnLabel.trim());
      setNewColumnLabel('');
      setIsAdding(false);
    }
  };

  if (isAdding) {
    return (
      <div className="flex items-center gap-2 bg-white rounded-lg shadow-md p-2">
        <input
          autoFocus
          type="text"
          value={newColumnLabel}
          onChange={(e) => setNewColumnLabel(e.target.value)}
          onBlur={handleAdd}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
            if (e.key === 'Escape') {
              setNewColumnLabel('');
              setIsAdding(false);
            }
          }}
          placeholder="Stage name..."
          maxLength={30}
          className="px-2 py-1 border-b-2 border-blue-500 outline-none text-sm"
        />
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setIsAdding(true)}
      className="flex items-center gap-1"
    >
      <PlusCircle className="h-4 w-4" />
      Add Stage
    </Button>
  );
}
```

### Example 2: Column Header with Inline Edit and Delete

```typescript
// Integrated into GridOverlay column header rendering
{config.columns.map((col, index) => {
  const colLeft = colXPositions[index];
  const colRight = colXPositions[index + 1];
  const colWidth = colRight - colLeft;
  const colMidpoint = colLeft + colWidth / 2;

  const headerPos = toScreen(colMidpoint, config.origin.y - 30);

  return (
    <g key={col.id}>
      <foreignObject
        x={headerPos.x - 60}
        y={headerPos.y - 15}
        width={120}
        height={30}
      >
        <div className="flex items-center justify-center gap-1">
          <EditableColumnHeader
            label={col.label}
            onSave={(newLabel) => updateGridColumn(col.id, { label: newLabel })}
          />

          {/* Delete button (only show on hover) */}
          <button
            onClick={() => handleDeleteColumn(col.id)}
            className="opacity-0 hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
          >
            <X className="h-3 w-3 text-red-600" />
          </button>
        </div>
      </foreignObject>

      {/* Vertical column line */}
      <line
        x1={topEdge.x}
        y1={topEdge.y}
        x2={bottomEdge.x}
        y2={bottomEdge.y}
        stroke="#e5e7eb"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
    </g>
  );
})}
```

### Example 3: Card Migration on Column Delete

```typescript
// canvas-store.ts removeGridColumn action
removeGridColumn: (id) =>
  set((state) => {
    const colIndex = state.gridColumns?.findIndex(c => c.id === id) ?? -1;
    if (colIndex === -1) return state;

    const deletedColumn = state.gridColumns![colIndex];
    const leftAdjacentCol = state.gridColumns![colIndex - 1];
    const rightAdjacentCol = state.gridColumns![colIndex + 1];
    const targetCol = leftAdjacentCol || rightAdjacentCol;

    // Find all cards in deleted column
    const affectedPostIts = state.postIts.filter(
      p => p.cellAssignment?.col === id
    );

    // Recalculate positions for affected cards
    const updatedPostIts = state.postIts.map(postIt => {
      if (postIt.cellAssignment?.col === id) {
        if (targetCol) {
          // Migrate to adjacent column
          const targetColIndex = colIndex > 0 ? colIndex - 1 : colIndex;
          const cell: CellCoordinate = {
            row: /* find row index from cellAssignment.row */,
            col: targetColIndex,
          };

          const newBounds = getCellBounds(cell, {
            ...state.gridConfig,
            columns: state.gridColumns!.filter(c => c.id !== id),
          });

          return {
            ...postIt,
            position: {
              x: newBounds.x + state.gridConfig.cellPadding,
              y: newBounds.y + state.gridConfig.cellPadding,
            },
            cellAssignment: {
              row: postIt.cellAssignment.row,
              col: targetCol.id,
            },
          };
        } else {
          // No adjacent column - clear cell assignment
          return {
            ...postIt,
            cellAssignment: undefined,
          };
        }
      }
      return postIt;
    });

    return {
      gridColumns: state.gridColumns?.filter(c => c.id !== id),
      postIts: updatedPostIts,
      isDirty: true,
    };
  }),
```

## State of the Art

| Feature | Miro | FigJam | Lucidspark | WorkshopPilot Phase 22 |
|---------|------|--------|------------|------------------------|
| **Dynamic columns** | Manual swimlane creation, no structure | Table component with add column | Template-based, no runtime add | User can add/remove columns with +Add Stage button |
| **Inline editing** | Double-click label, contentEditable | Click header, input field | Click to edit, auto-save | Controlled input with Enter/Escape, follows shadcn patterns |
| **Column deletion** | Delete without confirmation, manual card move | Confirmation if cells populated | Deletes column + contents | Confirmation dialog with migration preview, auto-move to adjacent |
| **Card auto-size** | Manual resize handles | Auto-height text boxes | Fixed-height sticky notes | Auto-height via react-textarea-autosize, min/max rows |
| **Drag feedback** | Cursor change + shadow | Ghost outline at source | Translucent card drag | Cursor pointer→grabbing + opacity reduction (simple, performant) |

**Key differentiator:** WorkshopPilot combines Miro's structural flexibility with FigJam's confirmation UX and Lucidspark's auto-sizing, providing:
1. **Smart migration:** Cards automatically move to adjacent column on delete (Miro requires manual)
2. **Undo-aware:** Column operations participate in temporal undo (Miro/FigJam/Lucidspark don't expose undo for structure changes)
3. **AI context preservation:** Cell assignments update but maintain semantic meaning for AI prompts

## Open Questions

1. **Column width resize:** Should users be able to resize column width via drag handles? **Recommendation:** Defer to Phase 23 (Column Resize). Phase 22 uses fixed 240px width for all columns. Resize adds drag handle complexity and position recalculation.

2. **Column reordering:** Should users drag column headers to reorder stages? **Recommendation:** Defer to Phase 23. Reordering requires drag-and-drop library integration and affects all card positions. Phase 22 uses fixed order (insertion order).

3. **Default column count:** Should Journey Map start with 5 columns (Awareness, Consideration, Decision, Purchase, Onboarding) or empty grid requiring user to add stages? **Recommendation:** Start with 5 default columns from step-canvas-config.ts. User can delete unwanted columns or add more. Empty grid creates activation energy barrier.

4. **Card migration UX:** When column deleted, should cards stack in target column or maintain vertical spacing? **Recommendation:** Maintain row assignment (horizontal migration only). Cards stay in same row, move to adjacent column, preserving swimlane structure.

5. **Max column limit:** Should there be a maximum number of columns (e.g., 10 stages)? **Recommendation:** Yes, 12 column maximum. Beyond 12, horizontal scrolling becomes painful, and journey maps lose coherence. Show warning at 10 columns: "Consider combining stages for clarity."

6. **Undo granularity:** Should column label edit participate in undo history (can undo typo fix) or only structural changes (add/remove column)? **Recommendation:** Label edits should NOT trigger undo snapshots (too granular, pollutes history). Only add/remove/reorder operations. Match text editor behavior (typing doesn't create undo steps, but delete paragraph does).

## Sources

### Primary (HIGH confidence)

**React Component Libraries:**
- [react-textarea-autosize - npm](https://www.npmjs.com/package/react-textarea-autosize) - Auto-growing textarea (version 8.5.9 installed in package.json)
- [Textarea Autosize React component - Material UI](https://mui.com/material-ui/react-textarea-autosize/) - Material UI implementation patterns
- shadcn/ui Dialog component (installed) - `src/components/ui/dialog.tsx` and `src/components/dialogs/reset-step-dialog.tsx`

**Existing Codebase:**
- `src/components/workshop/journey-map-grid.tsx` - EditableCell pattern (controlled textarea, Enter/Escape handling)
- `src/stores/canvas-store.ts` - Zustand store with zundo temporal middleware
- `src/components/canvas/grid-overlay.tsx` - SVG overlay rendering with viewport transform
- `src/lib/canvas/grid-layout.ts` - Coordinate transform utilities (getCellBounds, positionToCell)
- `src/lib/canvas/step-canvas-config.ts` - Static grid configuration for Journey Mapping
- `package.json` - Confirms react-textarea-autosize 8.5.9, zundo 2.3.0 installed

**ReactFlow Documentation:**
- [Changing the cursor when hovering the react-flow pane · xyflow/xyflow · Discussion #3216](https://github.com/xyflow/xyflow/discussions/3216) - Cursor customization via CSS
- [Theming - React Flow](https://reactflow.dev/learn/customization/theming) - CSS class overrides

### Secondary (MEDIUM confidence)

**Inline Editing UX Patterns:**
- [How to build an inline editable UI in React - LogRocket Blog](https://blog.logrocket.com/build-inline-editable-ui-react/) - Inline editing best practices (contentEditable vs controlled input)
- [Using Content Editable Elements in JavaScript (React) | Tania Rascia's Website](https://www.taniarascia.com/content-editable-elements-in-javascript-react/) - contentEditable challenges with React
- [Inline edit - Cloudscape Design System](https://cloudscape.design/patterns/resource-management/edit/inline-edit/) - AWS design system inline edit patterns

**Table/Column Management UX:**
- [Data Table Design UX Patterns & Best Practices - Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables) - Column customization, inline editing patterns
- [Designing table column customization | By Andrew Coyle | Medium](https://coyleandrew.medium.com/customize-columns-table-ui-pattern-b3a5a8d49701) - Column add/remove/reorder UX patterns
- [A better user experience for deleting records](https://www.leemunroe.com/best-practice-deleting-records/) - Confirmation dialog best practices
- [Ultimate guide to table UI patterns](http://designingwebinterfaces.com/ultimate-guide-to-table-ui-patterns) - Table interaction patterns

**Drag Interaction Patterns:**
- [Custom drag ghost in react: The way that actually works | by Nazmul Hasan Shajib | Medium](https://medium.com/@shojib116/custom-drag-ghost-in-react-the-way-that-actually-works-c802e4ec7128) - Drag ghost implementation in React

**Auto-Sizing Textareas:**
- [Building an Autosizing Textarea in React (Code Included) - Upmostly](https://upmostly.com/tutorials/autosizing-textarea-react) - Custom auto-size implementation (reference for understanding library internals)
- [Creating a Textarea with dynamic height using React and Typescript | by Owen Herterich | Medium](https://medium.com/@oherterich/creating-a-textarea-with-dynamic-height-using-react-and-typescript-5ed2d78d9848) - TypeScript patterns

## Metadata

**Confidence breakdown:**
- **Dynamic grid state:** HIGH - Canvas store extension follows existing patterns (quadrant → cellAssignment precedent)
- **Inline editing:** HIGH - Controlled input approach proven in journey-map-grid.tsx EditableCell
- **Confirmation dialog:** HIGH - reset-step-dialog.tsx provides exact shadcn Dialog pattern to follow
- **Card migration:** MEDIUM - Logic is straightforward (find adjacent column), but UX testing needed for stacking behavior
- **Auto-size post-its:** HIGH - react-textarea-autosize 8.5.9 installed and widely used (Material UI, shadcn-chat)
- **Drag feedback:** MEDIUM - Cursor change is straightforward, ghost effect requires testing for performance
- **Grid cell sizing:** HIGH - Pure configuration change, no implementation risk

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable domain, React patterns mature)

**No new dependencies required:** All features satisfied by existing packages (react-textarea-autosize, shadcn/ui Dialog, zundo, @xyflow/react).
