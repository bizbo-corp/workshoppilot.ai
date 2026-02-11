# Phase 23: AI Suggest-Then-Confirm Placement - Research

**Researched:** 2026-02-11
**Domain:** AI-suggested canvas placement with preview nodes, suggest-then-confirm UI patterns, ReactFlow temporary nodes
**Confidence:** HIGH

## Summary

Phase 23 implements AI-suggested content placement with explicit user confirmation, extending the existing `[CANVAS_ITEM]` markup pattern from Phase 19 with grid coordinate attributes and preview UI. The current system auto-adds AI-suggested items directly to the canvas, which works for quadrant-based layouts (Steps 2 & 4) but needs user confirmation for precise grid placement (Step 6 Journey Map).

The research confirms three key patterns: **(1)** Extend existing `[CANVAS_ITEM]` markup with `[GRID_ITEM row="..." col="..."]` variant for grid-specific placement suggestions, **(2)** Use ReactFlow's node `data` property with preview flags to render semi-transparent preview nodes with action buttons, and **(3)** Implement cell highlighting via the existing `highlightedCell` prop in GridOverlay with Tailwind's `animate-pulse` utility for yellow border attention.

The critical architectural decision is whether to use separate preview state or extend the existing canvas store with preview nodes. Analysis shows preview nodes should be **real ReactFlow nodes** (not separate state) with `data.isPreview: true` and `draggable: false`, allowing us to reuse existing node rendering, positioning logic, and undo/redo infrastructure. The confirm/reject actions simply toggle `isPreview` or delete the node.

AI context assembly already works (Phase 19) — `assembleJourneyMapCanvasContext()` groups post-its by row and column, providing the AI with current grid state for accurate subsequent suggestions. The suggest-then-confirm pattern matches 2026 UX best practices for AI content generation: surface previews, explain placement reasoning, and provide clear accept/reject controls.

**Primary recommendation:** Extend `[CANVAS_ITEM]` parser to detect `[GRID_ITEM]` variant, add preview nodes to store with metadata, render preview-specific UI in PostItNode component, highlight target cells on suggestion, and provide inline confirm/reject buttons that modify node data or delete nodes.

## Standard Stack

### Core (No New Dependencies)

All Phase 23 requirements are satisfied by existing dependencies. No npm packages needed.

| Library | Version | Purpose | Already Installed |
|---------|---------|---------|-------------------|
| **@xyflow/react** | 12.10.0 | Canvas rendering, custom nodes, node data management | ✓ Phase 15 (v1.1) |
| **ai** (Vercel AI SDK) | 6.0.77 | Chat streaming, structured outputs (via Zod) | ✓ Phase 5 (v1.0) |
| **zod** | 4.3.6 | Schema validation for structured AI outputs | ✓ Phase 9 (v1.0) |
| **zustand** | via zundo 2.3.0 | Canvas state management | ✓ Phase 15 (v1.1) |
| **tailwindcss** | 4 | CSS utilities including `animate-pulse` | ✓ Phase 1 (v0.5) |

### ReactFlow APIs Used

| API | Purpose | Phase 23 Usage |
|-----|---------|----------------|
| **Node `data` property** | Store arbitrary node-specific data | Add `isPreview: boolean`, `onConfirm`, `onReject` callbacks |
| **Node `draggable` property** | Control drag behavior per node | Set `draggable: false` for preview nodes |
| **Node `selectable` property** | Control selection behavior | Set `selectable: false` for preview nodes |
| **Custom node types** | Render different UI for node types | Extend PostItNode to show preview UI when `data.isPreview === true` |
| **setNodes / updateNode** | Modify node state | Convert preview→permanent on confirm, delete on reject |

### Existing Patterns to Reuse

| Pattern | Location | Reuse for Phase 23 |
|---------|----------|-------------------|
| **Canvas item markup parsing** | `chat-panel.tsx` `parseCanvasItems()` | Extend regex to detect `[GRID_ITEM]` variant with row/col attributes |
| **Auto-add canvas items** | `chat-panel.tsx` useEffect | Modify to add preview nodes instead of permanent nodes for grid items |
| **Grid coordinate system** | `grid-layout.ts` | Use `getCellBounds()` for preview positioning, `positionToCell()` for AI context |
| **Cell highlighting** | `grid-overlay.tsx` `highlightedCell` prop | Reuse existing highlight logic, add pulse animation |
| **AI canvas context** | `canvas-context.ts` `assembleJourneyMapCanvasContext()` | Already provides grid state to AI (AIPL-05 complete) |
| **Step-specific system prompts** | `chat-config.ts` `buildStepSystemPrompt()` | Update journey-mapping section to use `[GRID_ITEM]` format |

## Architecture Patterns

### Pattern 1: Markup Extension for Grid Placement

**What:** Extend the existing `[CANVAS_ITEM]` markup parser to recognize `[GRID_ITEM row="..." col="..."]` variant that signals AI-suggested placement needing confirmation.

**When to use:** Step 6 Journey Mapping only. Other steps continue using `[CANVAS_ITEM]` with auto-add behavior.

**Why this pattern:**
- **Backward compatible:** Existing `[CANVAS_ITEM]` continues to work for quadrant steps
- **Explicit semantics:** `[GRID_ITEM]` signals preview behavior, not auto-add
- **Parser reuse:** Same regex-based attribute extraction, just different tag name

**Implementation:**

```typescript
// src/components/workshop/chat-panel.tsx (extend existing parseCanvasItems)

type CanvasItemParsed = {
  text: string;
  quadrant?: string;
  row?: string;
  col?: string;
  category?: string;
  isGridItem?: boolean; // NEW: signals preview behavior
};

function parseCanvasItems(content: string): { cleanContent: string; canvasItems: CanvasItemParsed[] } {
  const items: CanvasItemParsed[] = [];

  // Match both [CANVAS_ITEM] and [GRID_ITEM]
  const regex = /\[(CANVAS_ITEM|GRID_ITEM)(?:\s+([^\]]*))?\](.*?)\[\/(CANVAS_ITEM|GRID_ITEM)\]/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const tagType = match[1]; // CANVAS_ITEM or GRID_ITEM
    const attrString = match[2] || '';
    const text = match[3].trim();
    if (text.length === 0) continue;

    // Parse attributes like row="value" col="value"
    const attrs: Record<string, string> = {};
    const attrRegex = /(\w+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }

    items.push({
      text,
      quadrant: attrs.quadrant,
      row: attrs.row,
      col: attrs.col,
      category: attrs.category,
      isGridItem: tagType === 'GRID_ITEM', // NEW
    });
  }

  // Remove both tag types from content
  const cleanContent = content
    .replace(/\s*\[(CANVAS_ITEM|GRID_ITEM)(?:\s+[^\]]*?)?\].*?\[\/(CANVAS_ITEM|GRID_ITEM)\]\s*/g, ' ')
    .trim();

  return { cleanContent, canvasItems: items };
}
```

**Trade-offs:**
- **Pro:** Minimal changes to existing parser
- **Pro:** Clear semantic distinction (GRID_ITEM = preview, CANVAS_ITEM = auto-add)
- **Con:** Two tag formats to document for AI prompts

### Pattern 2: Preview Nodes as Real ReactFlow Nodes

**What:** Preview nodes are regular ReactFlow nodes with `data.isPreview: true` flag, not separate UI state.

**When to use:** Any time AI suggests content with specific placement that needs confirmation.

**Why this pattern:**
- **Reuse rendering:** PostItNode component handles both preview and permanent nodes
- **Reuse positioning:** Same coordinate transform logic, no duplicate snap calculations
- **Undo/redo support:** Preview nodes participate in temporal state (can undo AI suggestion)
- **ReactFlow native:** No custom overlay positioning, leverages built-in node management

**Implementation:**

```typescript
// src/stores/canvas-store.ts (extend PostIt type)

export type PostIt = {
  id: string;
  text: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  color?: PostItColor;
  parentId?: string;
  type?: 'postIt' | 'group';
  quadrant?: Quadrant;
  cellAssignment?: {
    row: string;
    col: string;
  };
  // NEW: Preview metadata
  isPreview?: boolean; // If true, show preview UI with confirm/reject buttons
  previewReason?: string; // Optional AI explanation ("Based on Actions row pattern...")
};

// Add preview-specific actions
export type CanvasActions = {
  // ... existing actions
  confirmPreview: (id: string) => void; // Convert preview → permanent
  rejectPreview: (id: string) => void; // Delete preview node
};

// Implementation
confirmPreview: (id) =>
  set((state) => ({
    postIts: state.postIts.map((postIt) =>
      postIt.id === id ? { ...postIt, isPreview: false, previewReason: undefined } : postIt
    ),
    isDirty: true,
  })),

rejectPreview: (id) =>
  set((state) => ({
    postIts: state.postIts.filter((postIt) => postIt.id !== id),
    isDirty: true,
  })),
```

**Trade-offs:**
- **Pro:** Single source of truth (canvas store)
- **Pro:** Undo/redo works automatically (zundo tracks preview nodes)
- **Pro:** No coordinate sync issues
- **Con:** Preview nodes appear in save data (filtered out during AI context assembly)

### Pattern 3: Preview UI in Custom Node Component

**What:** PostItNode component renders different UI based on `data.isPreview` flag.

**When to use:** Rendering any AI-suggested preview node.

**Why this pattern:**
- **Single component:** No duplicate node type, just conditional rendering
- **Consistent sizing:** Preview nodes have same dimensions as permanent nodes
- **Inline actions:** Confirm/reject buttons inside node, no external controls needed

**Implementation:**

```typescript
// src/components/canvas/post-it-node.tsx (extend existing)

export type PostItNodeData = {
  text: string;
  color: PostItColor;
  isEditing: boolean;
  dragging?: boolean;
  // NEW: Preview props
  isPreview?: boolean;
  previewReason?: string;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
  onTextChange?: (id: string, text: string) => void;
  onEditComplete?: (id: string) => void;
};

export const PostItNode = memo(({ data, selected, id }: NodeProps<PostItNode>) => {
  const bgColor = COLOR_CLASSES[data.color || 'yellow'];

  // Preview-specific styling
  if (data.isPreview) {
    return (
      <div
        className={cn(
          bgColor,
          'shadow-md rounded-sm p-3',
          'font-sans text-sm text-gray-800',
          'opacity-60', // Semi-transparent for preview
          'ring-2 ring-blue-400 ring-offset-1', // Always outlined
          'pointer-events-auto' // Allow clicking buttons
        )}
        style={{
          width: '120px',
          minHeight: '120px',
          touchAction: 'none',
        }}
      >
        {/* Preview content */}
        <p className="break-words whitespace-pre-wrap mb-2">{data.text || ''}</p>

        {/* Optional reason */}
        {data.previewReason && (
          <p className="text-xs text-gray-500 italic mb-2">{data.previewReason}</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-1.5 mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onConfirm?.(id);
            }}
            className="nodrag nopan flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Add
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onReject?.(id);
            }}
            className="nodrag nopan flex-1 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  // Regular node rendering (existing code)
  return (
    <div className={cn(/* ... existing ... */)}>
      {/* ... existing node content ... */}
    </div>
  );
});
```

**Trade-offs:**
- **Pro:** All node logic in one component
- **Pro:** Preview and permanent nodes have same sizing/layout
- **Con:** Component grows larger (acceptable for 2 conditional branches)

### Pattern 4: Cell Highlight with Pulse Animation

**What:** Extend existing GridOverlay `highlightedCell` rendering with Tailwind `animate-pulse` class for attention-grabbing yellow border.

**When to use:** AI suggests placement in specific cell, need to draw user attention to target location.

**Why this pattern:**
- **Existing infrastructure:** `highlightedCell` prop already supported in GridOverlay
- **No custom CSS:** Tailwind provides `animate-pulse` utility (built-in keyframes)
- **Performant:** CSS animations are GPU-accelerated
- **Accessibility:** Pulsing indicates "something needs your attention"

**Implementation:**

```typescript
// src/components/canvas/grid-overlay.tsx (modify existing highlight rendering)

export function GridOverlay({ config, highlightedCell, onDeleteColumn }: GridOverlayProps) {
  // ... existing viewport and position calculations ...

  return (
    <svg className="absolute inset-0 pointer-events-none z-10" width="100%" height="100%">
      {/* Cell highlight with pulse animation */}
      {highlightedCell && (() => {
        const bounds = getCellBounds(highlightedCell, { ...config, columns: effectiveColumns });
        const topLeft = toScreen(bounds.x, bounds.y);
        return (
          <g className="animate-pulse"> {/* Tailwind pulse animation */}
            {/* Filled background */}
            <rect
              x={topLeft.x}
              y={topLeft.y}
              width={bounds.width * zoom}
              height={bounds.height * zoom}
              fill="#fef3c7" // Yellow background (amber-100)
              opacity={0.3}
              className="pointer-events-none"
            />
            {/* Pulsing border */}
            <rect
              x={topLeft.x}
              y={topLeft.y}
              width={bounds.width * zoom}
              height={bounds.height * zoom}
              fill="none"
              stroke="#eab308" // Yellow border (yellow-500)
              strokeWidth={3}
              className="pointer-events-none"
            />
          </g>
        );
      })()}

      {/* ... rest of grid rendering ... */}
    </svg>
  );
}
```

**Tailwind animate-pulse behavior:**
- Fades opacity from 100% → 50% → 100% over 2 seconds
- Repeats infinitely
- Works on SVG `<g>` groups

**Trade-offs:**
- **Pro:** No custom keyframe CSS needed
- **Pro:** Consistent with Tailwind's built-in animations
- **Con:** Fixed animation timing (2s cycle, not configurable without custom CSS)

### Anti-Patterns to Avoid

- **Don't use separate preview state outside canvas store:** Leads to coordinate sync bugs and breaks undo/redo
- **Don't render preview UI in SVG overlay:** Makes button interaction difficult, breaks with zoom transforms
- **Don't auto-confirm after timeout:** User must explicitly confirm placement (UX best practice for AI suggestions)
- **Don't suggest placement without showing target cell:** User needs to see where AI is proposing to place content
- **Don't use structured outputs for grid placement:** Text-based markup is simpler, doesn't require Zod schemas, works with existing parser

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pulse animation CSS | Custom @keyframes | Tailwind `animate-pulse` class | Built-in, tested, accessible |
| Preview node rendering | Custom overlay component | ReactFlow node with `data.isPreview` | Reuses positioning, handles zoom, participates in undo/redo |
| Grid coordinate calculations | Inline math in components | `grid-layout.ts` pure functions | Already implemented, tested, reusable |
| Cell highlighting | Custom SVG component | Extend existing `highlightedCell` logic | Infrastructure exists, just needs pulse animation |

**Key insight:** Phase 21 (grid foundation) and Phase 22 (dynamic columns) already built the coordinate system, cell detection, and highlighting infrastructure. Phase 23 layers preview UI and confirmation workflow on top, not reimplementing positioning logic.

## Common Pitfalls

### Pitfall 1: Preview Nodes Breaking Undo/Redo

**What goes wrong:** If preview nodes are stored separately from canvas state, undo/redo skips them, causing desync.

**Why it happens:** zundo wraps canvas store, only tracks state changes to `postIts` array.

**How to avoid:** Store preview nodes as regular PostIt objects with `isPreview: true` flag. They participate in temporal state automatically.

**Warning signs:** Undo after accepting preview doesn't remove the node, or undo after rejecting brings it back.

### Pitfall 2: Cell Highlight Stays Active After Confirm/Reject

**What goes wrong:** Target cell keeps pulsing yellow after user accepts or rejects preview.

**Why it happens:** `highlightedCell` state not cleared when preview action completes.

**How to avoid:** Clear `highlightedCell` in confirm/reject handlers. Track which preview node corresponds to which highlighted cell.

**Warning signs:** Multiple cells pulsing simultaneously, or cells pulsing with no preview node.

### Pitfall 3: Preview Buttons Don't Work (Click Falls Through)

**What goes wrong:** Clicking "Add" or "Skip" button triggers node drag instead of button action.

**Why it happens:** PostItNode has drag handles, button events propagate.

**How to avoid:**
1. Set preview nodes `draggable: false` and `selectable: false`
2. Add `nodrag nopan` classes to button elements
3. Call `e.stopPropagation()` in button onClick handlers

**Warning signs:** Buttons visually respond to hover but don't fire onClick, or node starts dragging when button clicked.

### Pitfall 4: AI Context Assembly Includes Preview Nodes

**What goes wrong:** AI "sees" preview nodes in canvas state and references them as confirmed content.

**Why it happens:** `assembleJourneyMapCanvasContext()` reads all post-its from store, including preview nodes.

**How to avoid:** Filter out preview nodes in context assembly: `postIts.filter(p => !p.isPreview)`.

**Warning signs:** AI says "I see you already have..." referring to content user hasn't confirmed yet.

### Pitfall 5: Preview Node Position Doesn't Account for Cell Padding

**What goes wrong:** Preview node overlaps cell borders, looks misaligned.

**Why it happens:** Using raw `getCellBounds()` position without adding `cellPadding` offset.

**How to avoid:** Same pattern as Phase 21 — add `config.cellPadding` to x/y after getting cell bounds: `{ x: bounds.x + cellPadding, y: bounds.y + cellPadding }`.

**Warning signs:** Preview nodes touch cell borders (should have 10px padding), permanent nodes added after confirm jump position.

## Code Examples

Verified patterns from official sources and existing codebase:

### AI Prompt Update for Grid Items

```typescript
// src/lib/ai/chat-config.ts (modify journey-mapping section)

// Replace existing [CANVAS_ITEM] format with [GRID_ITEM] for journey mapping:
if (stepId === 'journey-mapping') {
  prompt += `

CANVAS ACTIONS:
When suggesting journey map items, wrap each in [GRID_ITEM row="<row>" col="<col>"]...[/GRID_ITEM] tags.

Format: [GRID_ITEM row="<row>" col="<col>"]Brief item text (max 80 characters)[/GRID_ITEM]
Valid rows: actions, goals, barriers, touchpoints, emotions, moments, opportunities
Valid cols: (use actual column IDs from canvas state, e.g., awareness, consideration, decision)

Items appear as PREVIEWS with "Add to Canvas" and "Skip" buttons. The target cell pulses yellow so users know where you're suggesting placement.

Example: "For the awareness stage: [GRID_ITEM row="actions" col="awareness"]Researches options online[/GRID_ITEM] and [GRID_ITEM row="emotions" col="awareness"]Curious but uncertain[/GRID_ITEM]"

Guidelines:
- Only suggest placement for concrete journey map items
- Reference the current canvas state to avoid duplicate suggestions
- Keep text brief (fits on a post-it note)
- Explain WHY you're suggesting placement in a specific cell (e.g., "This goes in Actions/Awareness because...")
- Limit to 3-5 items per message`;
}
```

### Adding Preview Nodes from AI Suggestions

```typescript
// src/components/workshop/chat-panel.tsx (modify auto-add useEffect)

React.useEffect(() => {
  if (status !== 'ready' || messages.length === 0 || !isCanvasStep) return;

  const lastMsg = messages[messages.length - 1];
  if (lastMsg.role !== 'assistant') return;
  if (lastProcessedMsgId.current === lastMsg.id) return;
  lastProcessedMsgId.current = lastMsg.id;

  const textParts = lastMsg.parts?.filter((p) => p.type === 'text') || [];
  const content = textParts.map((p) => p.text).join('\n');
  const { canvasItems } = parseCanvasItems(content);

  if (canvasItems.length === 0) return;

  let currentPostIts = [...postIts];
  for (const item of canvasItems) {
    const { position, quadrant, cellAssignment } = computeCanvasPosition(
      step.id,
      { quadrant: item.quadrant, row: item.row, col: item.col, category: item.category },
      currentPostIts,
    );

    const color = (item.category && CATEGORY_COLORS[item.category]) || 'yellow';

    const newPostIt = {
      text: item.text,
      position,
      width: POST_IT_WIDTH,
      height: POST_IT_HEIGHT,
      color,
      quadrant,
      cellAssignment,
      // NEW: Add preview flag for grid items
      isPreview: item.isGridItem, // If [GRID_ITEM] tag, mark as preview
    };

    addPostIt(newPostIt);
    currentPostIts = [...currentPostIts, { ...newPostIt, id: 'pending' }];

    // NEW: Highlight target cell for grid items
    if (item.isGridItem && cellAssignment) {
      // Convert semantic IDs to indices for highlightedCell
      const gridConfig = stepConfig.gridConfig;
      if (gridConfig) {
        const rowIndex = gridConfig.rows.findIndex(r => r.id === cellAssignment.row);
        const colIndex = gridConfig.columns.findIndex(c => c.id === cellAssignment.col);
        if (rowIndex !== -1 && colIndex !== -1) {
          setHighlightedCell({ row: rowIndex, col: colIndex });
        }
      }
    }
  }
}, [status, messages, isCanvasStep, step.id, postIts, addPostIt]);
```

### ReactFlow Canvas with Preview Node Handling

```typescript
// src/components/canvas/react-flow-canvas.tsx (add preview handlers)

const confirmPreview = useCanvasStore((s) => s.confirmPreview);
const rejectPreview = useCanvasStore((s) => s.rejectPreview);
const [highlightedCell, setHighlightedCell] = useState<CellCoordinate | null>(null);

// Convert store state to ReactFlow nodes
const reactFlowNodes = useMemo<Node[]>(() => {
  return postIts.map((postIt) => {
    const baseNode = {
      id: postIt.id,
      type: postIt.type === 'group' ? 'group' : 'postIt',
      position: postIt.position,
      data: {
        text: postIt.text,
        color: postIt.color || 'yellow',
        isEditing: editingNodeId === postIt.id,
        onTextChange: handleTextChange,
        onEditComplete: handleEditComplete,
      },
      // Preview-specific props
      draggable: !postIt.isPreview, // Disable drag for preview
      selectable: !postIt.isPreview, // Disable select for preview
      ...(postIt.parentId ? { parentId: postIt.parentId } : {}),
      ...(postIt.isPreview ? {
        data: {
          ...baseNode.data,
          isPreview: true,
          previewReason: postIt.previewReason,
          onConfirm: (id: string) => {
            confirmPreview(id);
            setHighlightedCell(null); // Clear cell highlight
          },
          onReject: (id: string) => {
            rejectPreview(id);
            setHighlightedCell(null); // Clear cell highlight
          },
        },
      } : {}),
    };

    return baseNode as Node;
  });
}, [postIts, editingNodeId, confirmPreview, rejectPreview]);
```

### Filter Preview Nodes from AI Context

```typescript
// src/lib/workshop/context/canvas-context.ts (modify assembleJourneyMapCanvasContext)

export function assembleJourneyMapCanvasContext(postIts: PostIt[]): string {
  // Filter out group nodes AND preview nodes
  const items = postIts.filter(p => (!p.type || p.type === 'postIt') && !p.isPreview);

  if (items.length === 0) return '';

  // ... rest of assembly logic unchanged ...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Auto-add all AI suggestions | Preview + confirm for precise placement | Phase 23 (Feb 2026) | User control over grid layout, prevents misplaced content |
| Chat-based "add this to X cell" | Visual preview with cell highlight | Phase 23 (Feb 2026) | Spatial awareness, reduces errors |
| Generic `[CANVAS_ITEM]` for all steps | Step-specific `[GRID_ITEM]` for grids | Phase 23 (Feb 2026) | Clear semantic distinction between auto-add and preview |

**2026 UX Patterns:**
- **Delegative UI over Conversational UI:** User manages AI suggestions rather than chatting back-and-forth ([Jakob Nielsen 2026 predictions](https://jakobnielsenphd.substack.com/p/2026-predictions))
- **Accept/Reject over Silent Automation:** Surface previews with clear controls ([AI UX patterns](https://thedesignsystem.guide/blog/ai-ux-patterns-for-design-systems-(part-1)))
- **Explain Reasoning:** Show why AI suggests placement ("Based on your Actions row pattern...") ([10 UX Design Patterns That Improve AI Accuracy](https://www.cmswire.com/digital-experience/10-ux-design-patterns-that-improve-ai-accuracy-and-customer-trust/))

**Deprecated/outdated:**
- **ReactFlow `snapGrid` prop with multi-select:** Has known bug (issue #1579), use custom snap logic (Phase 21 decision)
- **Structured outputs for canvas placement:** Text-based markup is simpler, more flexible

## Open Questions

### 1. Should preview nodes persist across page reloads?

**What we know:** Preview nodes are stored in canvas store, which syncs to database via auto-save. They would persist by default.

**What's unclear:** Is this desirable? Should previews be session-only?

**Recommendation:** **Yes, persist preview nodes.** Rationale:
- User might reload page mid-session (accidental refresh, network error)
- Losing previews mid-decision is frustrating
- Can add "Reject All Previews" button if user wants to clear stale suggestions
- Auto-save already handles it (no extra work)

### 2. How many simultaneous preview nodes to allow?

**What we know:** AI can suggest 3-5 items per message (prompt guideline). Each becomes a preview node.

**What's unclear:** Should we limit total preview count (e.g., max 10 active previews)?

**Recommendation:** **No hard limit initially, monitor in testing.** Rationale:
- User can reject previews they don't want (self-regulating)
- Hard limit adds complexity (queue? discard oldest?)
- If problem emerges, can add limit in refinement

### 3. Should AI re-suggest rejected items?

**What we know:** Rejected preview nodes are deleted, AI sees them gone in next context assembly.

**What's unclear:** Should we track rejection history and tell AI "user rejected X, don't suggest again"?

**Recommendation:** **Not in Phase 23, defer to future iteration.** Rationale:
- Adds complexity (rejection tracking, context injection)
- User might reject timing (wrong moment) not content (wrong item)
- Can implement as enhancement if users report duplicate suggestions

## Sources

### Primary (HIGH confidence)

- **ReactFlow 12.10.0 Official Docs:**
  - [Custom Nodes](https://reactflow.dev/learn/customization/custom-nodes) - Custom node types, data prop, styling patterns
  - [Node API Reference](https://reactflow.dev/api-reference/types/node) - draggable, selectable, data, className properties
  - [Drag and Drop Examples](https://reactflow.dev/examples/interaction/drag-and-drop) - Node interaction patterns

- **Project Codebase (Existing Implementations):**
  - `src/stores/canvas-store.ts` - PostIt type, canvas actions, temporal state with zundo
  - `src/lib/canvas/grid-layout.ts` - Pure coordinate transform functions (Phase 21)
  - `src/components/canvas/grid-overlay.tsx` - Cell highlighting with `highlightedCell` prop (Phase 21-22)
  - `src/components/canvas/post-it-node.tsx` - Custom node component with color classes, edit mode
  - `src/components/workshop/chat-panel.tsx` - `parseCanvasItems()` markup parser, auto-add logic
  - `src/lib/workshop/context/canvas-context.ts` - `assembleJourneyMapCanvasContext()` groups by cell (Phase 19)
  - `src/lib/ai/chat-config.ts` - Step-specific system prompts, `[CANVAS_ITEM]` format instructions

### Secondary (MEDIUM confidence)

- **Tailwind CSS Official Docs:**
  - [Animation Utilities](https://tailwindcss.com/docs/animation) - Built-in `animate-pulse` class, keyframes documentation
  - [animate-pulse class](https://shuffle.dev/tailwind/classes/animations/animate-pulse) - Behavior specs (2s fade cycle, infinite repeat)

- **2026 AI UX Best Practices:**
  - [AI UX patterns for design systems](https://thedesignsystem.guide/blog/ai-ux-patterns-for-design-systems-(part-1)) - Accept/reject pattern, partnership over automation
  - [10 UX Design Patterns That Improve AI Accuracy](https://www.cmswire.com/digital-experience/10-ux-design-patterns-that-improve-ai-accuracy-and-customer-trust/) - Feedback tools, inline controls, preview surfaces
  - [AI usability principles](https://www.eleken.co/blog-posts/ai-usability-principles) - Control options (undo, accept, reject), explain reasoning

- **CSS Visual Patterns:**
  - [CSS Pulse Effect Tutorials](https://markodenic.com/css-pulse-animation/) - @keyframes patterns for attention-grabbing animations
  - [Ghost Button Design](https://www.mockplus.com/blog/post/ghost-button-design) - Semi-transparent buttons, overlay usage patterns

### Tertiary (LOW confidence - general context only)

- [ReactFlow 12 release notes](https://xyflow.com/blog/react-flow-12-release) - useConnection hook, dark mode (not directly used in Phase 23)
- [Semi-Transparent Button Design](https://www.webfx.com/blog/web-design/semi-transparent-buttons/) - Visual design principles (general guidance)

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - All libraries already installed, versions confirmed in package.json
- Architecture patterns: **HIGH** - Built on proven Phase 21/22 foundations, ReactFlow node API documented
- AI integration: **HIGH** - Extends working Phase 19 pattern, Vercel AI SDK text-based outputs well-understood
- UX patterns: **MEDIUM** - 2026 best practices verified across multiple sources, preview/confirm pattern common in AI tools
- Pitfalls: **HIGH** - Identified from ReactFlow limitations (snapGrid bug), existing codebase patterns (cell padding), UX anti-patterns (auto-confirm)

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable APIs, established UX patterns)

**Critical dependencies:**
- Phase 21 (Grid Foundation) complete ✓ — Coordinate system, `positionToCell`, `getCellBounds`
- Phase 22 (Dynamic Grid) complete ✓ — Dynamic columns, semantic IDs, `highlightedCell` prop
- Phase 19 (AI Canvas Integration) complete ✓ — Canvas context assembly, AI reads grid state
