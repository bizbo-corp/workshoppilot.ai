# Phase 21: Grid Foundation & Coordinate System - Research

**Researched:** 2026-02-11
**Domain:** ReactFlow grid/swimlane canvas layouts, coordinate systems, cell-based snapping
**Confidence:** HIGH

## Summary

Phase 21 establishes the foundational grid architecture for Step 6 Journey Map, implementing a 7-row swimlane structure with user-addable stage columns. The research confirms ReactFlow 12.10.0 provides the necessary building blocks (Background component, viewport-aware rendering, custom snap handlers) but requires custom implementation for cell-boundary snapping and coordinate mapping. The existing quadrant system (Steps 2 & 4) provides a proven pattern: viewport-aware SVG overlays using `useReactFlowStore` selectors maintain visual alignment during pan/zoom operations.

Journey mapping methodology (Nielsen Norman Group standard) defines fixed swimlane rows (Actions, Goals, Barriers, Touchpoints, Emotions, Moments of Truth, Opportunities) with user-defined stage columns (Awareness, Consideration, Purchase, etc.). This structure requires bidirectional coordinate transformation: canvas pixel positions ↔ logical grid cells. ReactFlow's built-in `snapGrid` prop snaps to regular intervals but cannot handle dynamic column widths or cell-boundary alignment, requiring custom snap logic in `onNodeDrag` handlers.

The critical architectural decision is extending the existing canvas store's `PostIt` type with optional `cellAssignment: {row, col}` metadata rather than creating separate grid-specific state. This maintains unified undo/redo, auto-save, and AI context assembly while supporting hybrid layouts (some steps use grids, others use quadrants or freeform).

**Primary recommendation:** Build on existing QuadrantOverlay pattern for grid rendering, implement coordinate transform utilities as pure functions (testable, no state coupling), extend canvas store with cell metadata, and reuse existing auto-save infrastructure without schema changes.

## Standard Stack

### Core (No New Dependencies)

All Phase 21 requirements are satisfied by existing dependencies. No npm packages needed.

| Library | Version | Purpose | Already Installed |
|---------|---------|---------|-------------------|
| **@xyflow/react** | 12.10.0 | Canvas rendering with Background, viewport controls, custom nodes | ✓ Phase 15 (v1.1) |
| **zustand** | via zundo 2.3.0 | Canvas state management with undo/redo | ✓ Phase 15 (v1.1) |
| **zundo** | 2.3.0 | Temporal state (undo/redo) wrapping Zustand | ✓ Phase 15 (v1.1) |

### ReactFlow APIs Used

| API | Purpose | Phase 21 Usage |
|-----|---------|----------------|
| **Background component** | Render grid dots/lines | Add `variant="lines"` for swimlane grid (existing: dots for freeform) |
| **useReactFlowStore** | Subscribe to viewport transform | Grid overlay SVG positioning (same pattern as QuadrantOverlay) |
| **onNodeDrag / onNodeDragStop** | Custom drag handling | Detect target cell during drag, snap to cell boundaries on drop |
| **screenToFlowPosition** | Convert screen coords to canvas coords | Calculate position when creating nodes (already used for post-its) |
| **snapToGrid / snapGrid props** | Built-in grid snapping | NOT USED - has multi-select bug (issue #1579), implement custom snap |

### Existing Patterns to Reuse

| Pattern | Location | Reuse for Phase 21 |
|---------|----------|-------------------|
| **Viewport-aware SVG overlay** | `quadrant-overlay.tsx` | Grid swimlane labels + row separators |
| **Position ↔ layout detection** | `quadrant-detection.ts` | Grid cell detection (position → row/col) |
| **Step-specific canvas config** | `step-canvas-config.ts` | Add `gridConfig` alongside `quadrantConfig` |
| **Canvas auto-save** | `use-canvas-autosave.ts` | Persist grid metadata in existing JSONB artifact |
| **Optional layout metadata** | `canvas-store.ts` PostIt type | Add `cellAssignment?: {row, col}` field |

## Architecture Patterns

### Pattern 1: Coordinate Transform Layer (Pure Functions)

**What:** Utility functions translate between grid coordinates (row index, column index) and canvas pixel positions, with support for variable column widths.

**When to use:** Placing nodes in grid cells, detecting which cell a dragged node overlaps, snapping positions to cell boundaries.

**Why this pattern:**
- **Separation of concerns:** Grid math isolated from rendering/state
- **Testable:** Pure functions with no React/Zustand coupling
- **Reusable:** Same transforms for AI placement, user drag, cell highlighting

**Implementation:**

```typescript
// lib/canvas/grid-layout.ts
export type GridConfig = {
  rows: Array<{ id: string; label: string; height: number }>;
  columns: Array<{ id: string; label: string; width: number }>;
  origin: { x: number; y: number }; // Grid top-left in canvas coordinates
};

export type CellCoordinate = { row: number; col: number };
export type CellBounds = { x: number; y: number; width: number; height: number };

/**
 * Get pixel bounds for a cell
 */
export function getCellBounds(
  coord: CellCoordinate,
  config: GridConfig
): CellBounds {
  // Calculate x by summing column widths
  let x = config.origin.x;
  for (let i = 0; i < coord.col; i++) {
    x += config.columns[i].width;
  }

  // Calculate y by summing row heights
  let y = config.origin.y;
  for (let i = 0; i < coord.row; i++) {
    y += config.rows[i].height;
  }

  return {
    x,
    y,
    width: config.columns[coord.col].width,
    height: config.rows[coord.row].height,
  };
}

/**
 * Detect which cell a position belongs to
 * Returns null if outside grid
 */
export function positionToCell(
  position: { x: number; y: number },
  config: GridConfig
): CellCoordinate | null {
  const relX = position.x - config.origin.x;
  const relY = position.y - config.origin.y;

  // Find row
  let accumulatedY = 0;
  let row = -1;
  for (let i = 0; i < config.rows.length; i++) {
    if (relY >= accumulatedY && relY < accumulatedY + config.rows[i].height) {
      row = i;
      break;
    }
    accumulatedY += config.rows[i].height;
  }

  // Find column
  let accumulatedX = 0;
  let col = -1;
  for (let i = 0; i < config.columns.length; i++) {
    if (relX >= accumulatedX && relX < accumulatedX + config.columns[i].width) {
      col = i;
      break;
    }
    accumulatedX += config.columns[i].width;
  }

  if (row === -1 || col === -1) return null;
  return { row, col };
}

/**
 * Snap position to nearest cell's top-left corner (boundary snap, not center)
 */
export function snapToCell(
  position: { x: number; y: number },
  config: GridConfig
): { x: number; y: number } {
  const cell = positionToCell(position, config);
  if (!cell) return position; // Outside grid, no snap

  const bounds = getCellBounds(cell, config);
  return { x: bounds.x, y: bounds.y };
}
```

**Trade-offs:**
- **Pro:** No React re-renders, fast calculations
- **Pro:** Easy to unit test without mocking ReactFlow
- **Con:** Need to pass `gridConfig` to functions (not global state)

### Pattern 2: SVG Grid Overlay (Viewport-Aware)

**What:** Render swimlane row labels and column headers as SVG that transforms with ReactFlow viewport (pan/zoom).

**When to use:** Displaying fixed grid structure that stays aligned with canvas nodes during navigation.

**Why this pattern:**
- **Proven approach:** QuadrantOverlay (Steps 2 & 4) uses same technique
- **Performance:** SVG transforms are GPU-accelerated
- **Alignment:** No drift between overlay and nodes during zoom

**Implementation:**

```typescript
// components/canvas/grid-overlay.tsx
'use client';

import { useStore as useReactFlowStore, type ReactFlowState } from '@xyflow/react';
import type { GridConfig } from '@/lib/canvas/grid-layout';

const viewportSelector = (state: ReactFlowState) => ({
  x: state.transform[0],
  y: state.transform[1],
  zoom: state.transform[2],
});

interface GridOverlayProps {
  config: GridConfig;
}

export function GridOverlay({ config }: GridOverlayProps) {
  const { x, y, zoom } = useReactFlowStore(viewportSelector);

  // Calculate screen positions for rows
  let accumulatedY = config.origin.y;
  const rowPositions = config.rows.map(row => {
    const screenY = accumulatedY * zoom + y;
    accumulatedY += row.height;
    return { ...row, screenY };
  });

  // Calculate screen positions for columns
  let accumulatedX = config.origin.x;
  const colPositions = config.columns.map(col => {
    const screenX = accumulatedX * zoom + x;
    accumulatedX += col.width;
    return { ...col, screenX };
  });

  return (
    <svg className="absolute inset-0 pointer-events-none z-10" width="100%" height="100%">
      {/* Horizontal swimlane separators */}
      {rowPositions.map((row, idx) => (
        <g key={`row-${idx}`}>
          <line
            x1={0}
            y1={row.screenY}
            x2="100%"
            y2={row.screenY}
            stroke="#d1d5db"
            strokeWidth={2}
          />
          <text
            x={10}
            y={row.screenY + 20}
            fontSize={13}
            fontWeight={600}
            fill="#374151"
          >
            {row.label}
          </text>
        </g>
      ))}

      {/* Vertical column separators */}
      {colPositions.map((col, idx) => (
        <g key={`col-${idx}`}>
          <line
            x1={col.screenX}
            y1={0}
            x2={col.screenX}
            y2="100%"
            stroke="#e5e7eb"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <text
            x={col.screenX + 10}
            y={config.origin.y * zoom + y - 10}
            fontSize={12}
            fontWeight={500}
            fill="#6b7280"
          >
            {col.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
```

**Trade-offs:**
- **Pro:** Stays aligned with nodes at all zoom levels (50%-250%)
- **Pro:** No layout shift during pan/zoom (GPU rendering)
- **Con:** SVG text doesn't wrap (use fixed label length)

### Pattern 3: Hybrid Canvas State (Optional Cell Metadata)

**What:** Extend existing `PostIt` type with optional `cellAssignment` field rather than creating separate grid node type.

**When to use:** Supporting multiple layout types (freeform, quadrant, grid) in single canvas store.

**Why this pattern:**
- **Unified undo/redo:** Temporal store works across all node types
- **Shared auto-save:** Single persistence path to stepArtifacts JSONB
- **AI context assembly:** Single function formats all nodes (gridded or not)

**Implementation:**

```typescript
// stores/canvas-store.ts (EXTEND, don't replace)
export type PostIt = {
  id: string;
  text: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  color?: PostItColor;
  parentId?: string;
  type?: 'postIt' | 'group';
  quadrant?: Quadrant;  // EXISTING (Steps 2 & 4)
  cellAssignment?: {    // NEW (Step 6)
    row: string;        // Row ID (e.g., 'actions', 'goals')
    col: string;        // Column ID (user-defined stage)
  };
};

// When adding post-it to grid cell:
const cellCoord = positionToCell(position, gridConfig);
if (cellCoord) {
  addPostIt({
    text: 'User feels frustrated',
    position: snapToCell(position, gridConfig),
    cellAssignment: {
      row: gridConfig.rows[cellCoord.row].id,
      col: gridConfig.columns[cellCoord.col].id,
    },
    width: 180,
    height: 100,
  });
}
```

**Trade-offs:**
- **Pro:** No breaking changes to existing Steps 2-5 canvas usage
- **Pro:** Single store = simpler state management
- **Con:** PostIt type grows (but still type-safe)

### Pattern 4: Step-Specific Layout Configuration

**What:** Extend `step-canvas-config.ts` with grid configuration alongside existing quadrant configs.

**When to use:** Defining per-step canvas layouts (Step 6 uses grid, Steps 2 & 4 use quadrants, others freeform).

**Why this pattern:**
- **Single source of truth:** All step canvas behavior configured in one file
- **Type safety:** TypeScript discriminated union for layout types
- **Backward compatible:** Existing steps unaffected

**Implementation:**

```typescript
// lib/canvas/step-canvas-config.ts (EXTEND)
export type GridConfig = {
  rows: Array<{ id: string; label: string; height: number }>;
  columns: Array<{ id: string; label: string; width: number }>;
  origin: { x: number; y: number };
  allowDynamicColumns: boolean;
};

export type StepCanvasConfig = {
  hasQuadrants?: boolean;
  quadrantType?: QuadrantType;
  quadrantConfig?: QuadrantConfig;
  hasGrid?: boolean;           // NEW
  gridConfig?: GridConfig;     // NEW
};

export const STEP_CANVAS_CONFIGS: Record<string, StepCanvasConfig> = {
  // Step 6: Journey Mapping - 7-row swimlane grid
  'journey-mapping': {
    hasGrid: true,
    gridConfig: {
      rows: [
        { id: 'actions', label: 'Actions', height: 120 },
        { id: 'goals', label: 'Goals', height: 120 },
        { id: 'barriers', label: 'Barriers', height: 120 },
        { id: 'touchpoints', label: 'Touchpoints', height: 120 },
        { id: 'emotions', label: 'Emotions', height: 100 },
        { id: 'moments', label: 'Moments of Truth', height: 120 },
        { id: 'opportunities', label: 'Opportunities', height: 120 },
      ],
      columns: [], // User adds stages dynamically
      origin: { x: 100, y: 50 }, // Leave space for row labels
      allowDynamicColumns: true,
    },
  },
  // Existing configs unchanged
  'stakeholder-mapping': { /* quadrant config */ },
  'sense-making': { /* quadrant config */ },
};
```

**Trade-offs:**
- **Pro:** Easy to add grid to other steps later (Steps 2 & 4 retrofit)
- **Pro:** Config-driven = no conditional logic scattered in components
- **Con:** Config file grows (acceptable for ~10 steps)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Viewport coordinate transforms** | Manual `canvas.getBoundingClientRect()` math | ReactFlow `screenToFlowPosition()` | Handles zoom, pan, scroll offset automatically. Custom transforms break on viewport changes. |
| **Drag state management** | `onMouseDown` + `onMouseMove` + `onMouseUp` event listeners | ReactFlow `onNodeDrag` + `onNodeDragStop` | Handles pointer events (mouse + touch), multi-select, viewport scrolling during drag. Edge case hell. |
| **Undo/redo state** | Custom history stack with array push/pop | Zundo temporal middleware (already installed) | Handles circular references, deep equality, memory limits. Custom stacks leak memory. |
| **Grid line rendering** | HTML divs with borders or CSS grid | SVG lines in viewport-aware overlay | Divs don't transform with zoom, CSS grid conflicts with ReactFlow absolute positioning. SVG is GPU-accelerated. |
| **Auto-save debouncing** | `setTimeout` + manual cleanup | `useDebouncedCallback` from use-debounce (already installed) | Handles component unmount, maxWait parameter, cleanup edge cases. setTimeout leaks on fast component remounting. |

**Key insight:** ReactFlow provides cursor-to-canvas coordinate transforms, drag lifecycle, and viewport state. Building these from scratch introduces bugs around zoomed/panned viewports, touch events, and multi-select.

## Common Pitfalls

### Pitfall 1: Using ReactFlow's Built-in snapGrid for Cell Boundaries

**What goes wrong:** Setting `snapToGrid={true}` and `snapGrid={[cellWidth, cellHeight]}` doesn't snap to cell boundaries when columns have different widths or when multi-selecting nodes.

**Why it happens:** ReactFlow's `snapGrid` is a fixed tuple `[x, y]` for uniform grid spacing. It snaps node centers, not edges. Multi-select drag has known bug (issue #1579) where snap breaks at zoom levels ≠ 1.0.

**How to avoid:** Implement custom snap logic in `onNodeDragStop` handler:
```typescript
const handleNodeDragStop = useCallback((event, node) => {
  const snappedPos = snapToCell(node.position, gridConfig);
  updatePostIt(node.id, { position: snappedPos });
}, [gridConfig, updatePostIt]);
```

**Warning signs:**
- Nodes snap to wrong positions when zoomed in/out
- Multi-selected nodes drift apart after drag
- Nodes snap to cell centers instead of corners

### Pitfall 2: Hardcoding Grid Dimensions in SVG Overlay

**What goes wrong:** SVG overlay uses fixed pixel coordinates (e.g., `y={150}` for row 2) instead of calculating from gridConfig. Breaks when row heights change or columns are added.

**Why it happens:** Copy-pasting QuadrantOverlay code without adapting to dynamic grid structure.

**How to avoid:** Calculate positions dynamically in render loop:
```typescript
let accumulatedY = config.origin.y;
const rowPositions = config.rows.map(row => {
  const y = accumulatedY;
  accumulatedY += row.height;
  return { ...row, y };
});
```

**Warning signs:**
- Adding columns breaks visual alignment
- Changing row heights in config doesn't update overlay
- Labels render in wrong positions after zoom

### Pitfall 3: Cell Detection on Every Render

**What goes wrong:** Calling `positionToCell()` inside component render function for every node causes performance jank (35 cells × 20 nodes = 700 calculations per render).

**Why it happens:** Treating coordinate transforms like React hooks instead of lazy calculations.

**How to avoid:** Calculate cell assignment only during drag stop (user action), store result in node metadata:
```typescript
// BAD: Recalculates every render
const cell = positionToCell(node.position, gridConfig);

// GOOD: Calculate once on drop, store in cellAssignment
const handleDragStop = useCallback((event, node) => {
  const cell = positionToCell(node.position, gridConfig);
  if (cell) {
    updatePostIt(node.id, {
      cellAssignment: {
        row: gridConfig.rows[cell.row].id,
        col: gridConfig.columns[cell.col].id,
      },
    });
  }
}, []);
```

**Warning signs:**
- Canvas stutters during pan/zoom
- React DevTools Profiler shows high render count for canvas
- CPU spikes when dragging nodes

### Pitfall 4: Separate State for Grid Structure vs Nodes

**What goes wrong:** Creating separate Zustand store for grid columns/rows that's not synchronized with canvas node state.

**Why it happens:** Treating grid structure as separate concern from nodes.

**How to avoid:** Grid structure is configuration (step-canvas-config.ts), not state. Nodes reference grid cells by ID. Grid changes require node position recalculation:
```typescript
// When column deleted, update affected nodes:
const deleteColumn = (colId: string) => {
  const affectedNodes = postIts.filter(p => p.cellAssignment?.col === colId);
  // Shift nodes to adjacent column or delete based on UX decision
  affectedNodes.forEach(node => {
    // Decision point for Phase 22 (Column Management)
  });
};
```

**Warning signs:**
- Grid changes don't update node positions
- Undo/redo doesn't restore grid structure
- Node cellAssignment references non-existent columns

### Pitfall 5: Mixing Absolute and Relative Positioning

**What goes wrong:** Some nodes use canvas absolute positioning (`{x: 100, y: 200}`), others use cell-relative positioning (`{row: 2, col: 3}`). Leads to inconsistent drag behavior.

**Why it happens:** Unclear decision on whether position or cellAssignment is source of truth.

**How to avoid:** **Position is always source of truth.** `cellAssignment` is derived metadata for AI context and cell highlighting:
```typescript
// Position determines location, cellAssignment is metadata
type PostIt = {
  position: { x: number; y: number };  // SOURCE OF TRUTH
  cellAssignment?: { row: string; col: string };  // DERIVED for context
};

// On drag stop:
const position = snapToCell(draggedPos, gridConfig);
const cell = positionToCell(position, gridConfig);
updatePostIt(id, {
  position,  // Canvas rendering uses this
  cellAssignment: cell ? { row: rows[cell.row].id, col: cols[cell.col].id } : undefined,
});
```

**Warning signs:**
- Nodes jump when switching between grid and freeform layouts
- Position and cellAssignment become out of sync
- Undo/redo breaks node positions

## Code Examples

### Example 1: Grid Cell Highlighting on Drag

```typescript
// react-flow-canvas.tsx
const [highlightedCell, setHighlightedCell] = useState<CellCoordinate | null>(null);

const handleNodeDrag = useCallback((event: React.MouseEvent, node: Node) => {
  if (!gridConfig) return;

  const cell = positionToCell(node.position, gridConfig);
  setHighlightedCell(cell);
}, [gridConfig]);

const handleNodeDragStop = useCallback(() => {
  setHighlightedCell(null); // Clear highlight on drop
}, []);

// In render:
<GridOverlay config={gridConfig} highlightedCell={highlightedCell} />
```

```typescript
// grid-overlay.tsx
interface GridOverlayProps {
  config: GridConfig;
  highlightedCell?: CellCoordinate | null;
}

export function GridOverlay({ config, highlightedCell }: GridOverlayProps) {
  // ... viewport transform logic

  return (
    <svg>
      {/* Grid lines */}

      {/* Highlighted cell background */}
      {highlightedCell && (
        <rect
          x={getCellBounds(highlightedCell, config).x * zoom + x}
          y={getCellBounds(highlightedCell, config).y * zoom + y}
          width={getCellBounds(highlightedCell, config).width * zoom}
          height={getCellBounds(highlightedCell, config).height * zoom}
          fill="#dbeafe"
          opacity={0.3}
        />
      )}
    </svg>
  );
}
```

### Example 2: Conditional Grid vs Quadrant Rendering

```typescript
// react-flow-canvas.tsx
const stepConfig = getStepCanvasConfig(stepId);

return (
  <ReactFlow {...props}>
    <Background variant={BackgroundVariant.Dots} gap={20} />
    <Controls />

    {/* Conditional overlay based on step config */}
    {stepConfig.hasQuadrants && stepConfig.quadrantConfig && (
      <QuadrantOverlay config={stepConfig.quadrantConfig} />
    )}

    {stepConfig.hasGrid && stepConfig.gridConfig && (
      <GridOverlay config={stepConfig.gridConfig} />
    )}
  </ReactFlow>
);
```

### Example 3: Persisting Grid State to Database

```typescript
// canvas-actions.ts (NO CHANGES NEEDED - existing auto-save works)
export async function saveCanvasState(
  workshopId: string,
  stepId: string,
  canvasState: { postIts: PostIt[] }
) {
  // EXISTING CODE - cellAssignment field serializes automatically
  await db.update(stepArtifacts)
    .set({
      artifact: canvasState,  // JSONB column stores cellAssignment
      version: sql`${stepArtifacts.version} + 1`,
    })
    .where(eq(stepArtifacts.stepId, stepId));
}

// Loading canvas state (no changes)
const artifact = await db.select().from(stepArtifacts).where(...);
const postIts = artifact.postIts; // cellAssignment field present if gridded step
```

## State of the Art

| Approach | Tools Using It | WorkshopPilot v1.2 |
|----------|---------------|-------------------|
| **Swimlane rendering** | Miro: HTML table, FigJam: Figma frames, Lucidspark: SVG layers | **ReactFlow SVG overlay** (viewport-aware, GPU-accelerated) |
| **Cell snapping** | Miro: Snap to cell center (user complaint), FigJam: No snap, Lucidspark: Alignment guides | **Custom cell-boundary snap** (addresses Miro pain point) |
| **Grid structure** | Miro: Freeform with manual swimlanes, FigJam: Table component, Lucidspark: Template-based | **Configuration-driven per step** (7 fixed rows, dynamic columns) |
| **Coordinate system** | Miro: Pixel-only, FigJam: Frame-relative, Lucidspark: Layer-relative | **Hybrid: absolute pixels + cell metadata** (dual representation) |

**Key innovation:** WorkshopPilot stores both absolute position (rendering) and cell assignment (AI context) in single node. Miro/FigJam/Lucidspark use one or the other. Dual representation enables AI to reason about grid structure ("add to Barriers × Awareness cell") while maintaining pixel-perfect node positioning for visual alignment.

## Open Questions

1. **Row height strategy:** Fixed pixel heights (120px per row) or percentage-based (14.3% of viewport for 7 rows)? **Recommendation:** Fixed pixels for predictable node sizing, viewport too variable on mobile.

2. **Column width defaults:** Equal widths (200px each) or first column wider (300px for "Awareness" stage context)? **Recommendation:** Equal widths initially, defer resize to Phase 22.

3. **Cell highlight timing:** Instant on drag-over or 100ms delay to reduce flicker? **Recommendation:** Instant (0ms) - user needs immediate feedback on drop target.

4. **Empty grid origin:** Place grid at canvas (0,0) or offset (100, 50) to leave space for future navigation? **Recommendation:** Offset (100, 50) - allows room for row labels and future stage timeline above grid.

5. **Cell boundary padding:** Snap nodes flush to cell edge or add 10px padding? **Recommendation:** 10px padding for visual breathing room, prevents nodes touching cell borders.

6. **Column delete behavior:** When user deletes a stage column, do items move to adjacent column or get deleted? **Decision deferred to Phase 22** (Column Management UX).

## Sources

### Primary (HIGH confidence)

**ReactFlow Official Documentation:**
- [SnapGrid - React Flow](https://reactflow.dev/api-reference/types/snap-grid) - Snap-to-grid API (built-in limitations confirmed)
- [Custom Nodes - React Flow](https://reactflow.dev/learn/customization/custom-nodes) - Custom node creation patterns
- [Drag and Drop - React Flow](https://reactflow.dev/examples/interaction/drag-and-drop) - Drag lifecycle and event handlers
- [OnNodeDrag - React Flow](https://reactflow.dev/api-reference/types/on-node-drag) - Drag event types
- [The Background component - React Flow](https://reactflow.dev/api-reference/components/background) - Grid line rendering

**ReactFlow Known Issues:**
- [MultiSelection-Drag breaks Snap-To-Grid · Issue #1579](https://github.com/wbkd/react-flow/issues/1579) - Confirmed multi-select snap bug (opened Oct 2021, still present in 12.10.0)

**Existing Codebase:**
- `src/components/canvas/quadrant-overlay.tsx` - Viewport-aware SVG pattern (verified working)
- `src/lib/canvas/quadrant-detection.ts` - Position → layout detection pattern
- `src/lib/canvas/step-canvas-config.ts` - Step-specific configuration architecture
- `src/stores/canvas-store.ts` - Zustand + Zundo temporal store structure
- `src/hooks/use-canvas-autosave.ts` - Auto-save with 2s debounce, 10s maxWait

### Secondary (MEDIUM confidence)

**Journey Mapping Methodology:**
- [Service Blueprinting FAQ - NN/G](https://www.nngroup.com/articles/service-blueprinting-faq/) - Swimlane structure in service design
- [Journey Mapping for Remote Teams: A Digital Template - NN/G](https://www.nngroup.com/articles/journey-map-digital-template/) - Digital journey map structure
- [NN/g Journey Mapping Template | Figma](https://www.figma.com/community/file/1302086227127092852/nn-g-journey-mapping-template) - Official NN/G template with swimlane rows

**Swimlane Implementation Patterns:**
- [GitHub - liang-faan/reactflow-swimlane](https://github.com/liang-faan/reactflow-swimlane) - ReactFlow swimlane implementation (uses Dagre layout, not applicable for fixed rows)
- [Swim lane in React Diagram Component | Syncfusion](https://ej2.syncfusion.com/react/documentation/diagram/swim-lane) - Alternative framework approach (not ReactFlow-based)

**Prior Phase Research:**
- `.planning/research/FEATURES_V1.2_GRID_SWIMLANE.md` - Feature landscape analysis (table stakes vs differentiators)
- `.planning/research/ARCHITECTURE_V1.2_GRID_SWIMLANE.md` - Integration architecture patterns
- `.planning/phases/20-bundle-optimization-mobile-refinement/20-RESEARCH.md` - Mobile touch handling patterns

## Metadata

**Confidence breakdown:**
- **ReactFlow APIs:** HIGH - Official docs verified, existing codebase uses same patterns (QuadrantOverlay proof)
- **Coordinate transforms:** HIGH - Math is straightforward, similar to quadrant-detection.ts
- **Grid structure:** HIGH - NN/G journey mapping standard well-documented, matches user research
- **Performance:** MEDIUM - 7 rows × ~5 columns = 35 cells, low complexity, but mobile testing needed

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable domain, ReactFlow 12.x is mature)

**Architecture decisions locked in:**
- ReactFlow 12.10.0 as canvas foundation (no alternative evaluation)
- Zustand + Zundo for state management (existing v1.1 choice)
- JSONB stepArtifacts for persistence (existing schema)
- Viewport-aware SVG overlay pattern (proven in QuadrantOverlay)

**No new dependencies:** All requirements satisfied by existing stack.
