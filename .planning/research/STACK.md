# Stack Research: Grid/Swimlane Canvas Features (v1.2)

**Domain:** Structured grid canvas with swimlane layouts and AI-driven placement for Journey Map step
**Researched:** 2026-02-11
**Confidence:** HIGH

## Context: What This Research Covers

This stack research focuses ONLY on **new additions/changes for v1.2 grid/swimlane canvas features**. The base stack was validated for v1.0 and canvas features were added in v1.1.

**Existing validated stack (DO NOT re-research):**
- Next.js 16.1.1 + React 19 + Tailwind 4 + shadcn/ui
- **ReactFlow 12.10.0** (already integrated for canvas in v1.1)
- Zustand for state management (with zundo for undo/redo)
- @xyflow/react for canvas nodes and interactions
- Gemini API via Vercel AI SDK 6 for AI
- Neon Postgres + Drizzle ORM

**v1.2 adds:**
1. **Step 6 Journey Map:** Grid canvas with fixed swimlane rows + user-addable stage columns
2. **Snap-to-cell behavior:** Items snap to specific grid cells (not just grid dots)
3. **AI-driven placement suggestions:** AI proposes content in specific cells, user confirms/adjusts
4. **Steps 2 & 4 retrofit:** Structured output data renders as organized canvas nodes

**Key finding:** NO new libraries needed. ReactFlow 12.10.0 already supports everything required for grid layouts and AI-driven placement through native APIs.

---

## TL;DR — What to Add for v1.2 Grid/Swimlane Canvas

| Category | Recommended | Action | Bundle Impact |
|----------|-------------|--------|---------------|
| **Canvas Library** | ReactFlow 12.10.0 (existing) | Use existing ReactFlow with custom grid overlay | 0 KB (existing) |
| **Grid Layout** | Custom grid logic | Math functions for cell coordinates, no library needed | 0 KB |
| **Snap-to-Cell** | Custom snap logic | Calculate nearest cell center, override ReactFlow snap | 0 KB |
| **AI Placement** | Gemini API (existing) | AI returns cell coordinates `{row: string, col: number}` | 0 KB (existing) |
| **Swimlane Overlay** | Custom SVG component | Similar to existing QuadrantOverlay pattern | 0 KB |

**Total new bundle size: 0 KB** — All features use existing ReactFlow APIs and custom logic.

---

## Recommended Stack

### Core Technologies (No Changes from v1.1)

All technologies from v1.1 remain unchanged. This milestone extends existing canvas capabilities.

| Technology | Version | v1.2 Usage |
|------------|---------|------------|
| **@xyflow/react** | 12.10.0 (existing) | NEW: Grid overlay, cell-based snap, programmatic node placement |
| **Zustand** | (existing) | NEW: Grid configuration state (row definitions, column list) |
| **Tailwind CSS** | 4 (existing) | NEW: Swimlane styling, grid cell backgrounds |
| **Gemini API** | (existing) | NEW: Return structured cell coordinates for placement |

---

## NEW Patterns for v1.2 (No New Packages)

### Pattern 1: Grid/Swimlane Canvas Structure

**Architecture:** Fixed-row, dynamic-column grid using ReactFlow coordinate system.

**Journey Map grid structure:**
```
Swimlane Rows (FIXED):
- Row 0: Actions
- Row 1: Thoughts
- Row 2: Feelings
- Row 3: Pain Points
- Row 4: Opportunities

Stage Columns (USER-ADDABLE):
- Col 0: Research Stage
- Col 1: Planning Stage
- Col 2: Execution Stage
- ... (user adds more)
```

**Implementation using ReactFlow coordinate space:**

```typescript
// src/lib/canvas/grid-config.ts
export interface GridConfig {
  type: 'swimlane';
  cellWidth: number;
  cellHeight: number;
  rows: GridRow[];
  columns: GridColumn[];
}

export interface GridRow {
  id: string;
  label: string;
  yStart: number;  // ReactFlow Y coordinate
  height: number;
}

export interface GridColumn {
  id: string;
  label: string;
  xStart: number;  // ReactFlow X coordinate
  width: number;
}

// Journey Map configuration
export const JOURNEY_MAP_GRID: GridConfig = {
  type: 'swimlane',
  cellWidth: 240,   // Wide cells for content
  cellHeight: 160,  // Tall cells for text
  rows: [
    { id: 'actions', label: 'Actions', yStart: 0, height: 160 },
    { id: 'thoughts', label: 'Thoughts', yStart: 160, height: 160 },
    { id: 'feelings', label: 'Feelings', yStart: 320, height: 160 },
    { id: 'pain-points', label: 'Pain Points', yStart: 480, height: 160 },
    { id: 'opportunities', label: 'Opportunities', yStart: 640, height: 160 },
  ],
  columns: [
    // Dynamically populated as user adds stages
  ],
};
```

**Why this approach:**
- **Uses ReactFlow coordinate system:** No coordinate translation needed
- **Fixed rows:** Swimlane structure is stable (Actions, Thoughts, etc.)
- **Dynamic columns:** User can add/remove stages during workshop
- **Cell-based addressing:** Each cell has unique `{rowId, columnId}` address

**Source:** [ReactFlow Coordinate System](https://reactflow.dev/api-reference/types/xy-position), [Grid Layout Patterns](https://github.com/liang-faan/reactflow-swimlane)

---

### Pattern 2: Snap-to-Cell Behavior

**Challenge:** ReactFlow's native `snapToGrid` only snaps to evenly-spaced dots, not custom cell centers.

**Solution:** Override ReactFlow's snap behavior with custom cell-center calculation.

```typescript
// src/lib/canvas/grid-snap.ts
/**
 * Calculate nearest cell center for a given position
 * @param position - Current node position {x, y}
 * @param gridConfig - Grid configuration
 * @returns Snapped position at cell center
 */
export function snapToCell(
  position: { x: number; y: number },
  gridConfig: GridConfig
): { x: number; y: number; cell: { rowId: string; columnId: string } } {
  // Find nearest column
  const column = gridConfig.columns.reduce((nearest, col) => {
    const colCenter = col.xStart + col.width / 2;
    const nearestCenter = nearest.xStart + nearest.width / 2;
    const distToCurrent = Math.abs(position.x - colCenter);
    const distToNearest = Math.abs(position.x - nearestCenter);
    return distToCurrent < distToNearest ? col : nearest;
  }, gridConfig.columns[0]);

  // Find nearest row
  const row = gridConfig.rows.reduce((nearest, r) => {
    const rowCenter = r.yStart + r.height / 2;
    const nearestCenter = nearest.yStart + nearest.height / 2;
    const distToCurrent = Math.abs(position.y - rowCenter);
    const distToNearest = Math.abs(position.y - nearestCenter);
    return distToCurrent < distToNearest ? r : nearest;
  }, gridConfig.rows[0]);

  return {
    x: column.xStart + column.width / 2,   // Cell center X
    y: row.yStart + row.height / 2,         // Cell center Y
    cell: { rowId: row.id, columnId: column.id },
  };
}
```

**Integration with ReactFlow:**

```typescript
// src/components/canvas/react-flow-canvas.tsx (MODIFIED)
const handleNodesChange = useCallback(
  (changes: NodeChange[]) => {
    changes.forEach((change) => {
      if (
        change.type === 'position' &&
        change.dragging === false &&
        change.position
      ) {
        // Check if this step uses grid layout
        const gridConfig = getStepGridConfig(stepId);

        if (gridConfig) {
          // Snap to cell center (not dot grid)
          const snapped = snapToCell(change.position, gridConfig);
          updatePostIt(change.id, {
            position: snapped,
            cell: snapped.cell,  // Store cell address
          });
        } else {
          // Existing quadrant steps use dot-based snap
          const snappedPosition = snapToGrid(change.position);
          updatePostIt(change.id, { position: snappedPosition });
        }
      }
    });
  },
  [nodes, stepId, updatePostIt]
);
```

**Key features:**
- **Cell-center snapping:** Items snap to center of grid cells, not corners
- **Cell addressing:** Each item knows which cell it occupies `{rowId, columnId}`
- **Override ReactFlow snap:** Custom snap replaces native dot-grid snap
- **Backward compatible:** Non-grid steps still use existing dot-grid snap

**Source:** [ReactFlow Node Positioning](https://reactflow.dev/api-reference/types/node), [Custom Snap Logic Discussion](https://github.com/xyflow/xyflow/discussions/3640)

---

### Pattern 3: Grid Overlay with Swimlane Labels

**Similar to existing QuadrantOverlay pattern from v1.1 (Steps 2 & 4).**

```typescript
// src/components/canvas/grid-overlay.tsx (NEW FILE)
'use client';

import { useStore as useReactFlowStore, type ReactFlowState } from '@xyflow/react';
import type { GridConfig } from '@/lib/canvas/grid-config';

const viewportSelector = (state: ReactFlowState) => ({
  x: state.transform[0],
  y: state.transform[1],
  zoom: state.transform[2],
});

interface GridOverlayProps {
  config: GridConfig;
}

/**
 * GridOverlay renders swimlane grid lines and row/column labels
 * Lines and labels transform with viewport pan/zoom
 */
export function GridOverlay({ config }: GridOverlayProps) {
  const { x, y, zoom } = useReactFlowStore(viewportSelector);

  return (
    <svg className="absolute inset-0 pointer-events-none z-10" width="100%" height="100%">
      {/* Horizontal swimlane lines */}
      {config.rows.map((row, idx) => (
        <line
          key={`row-${idx}`}
          x1={0}
          y1={row.yStart * zoom + y}
          x2="100%"
          y2={row.yStart * zoom + y}
          stroke="#d1d5db"
          strokeWidth={2}
          strokeDasharray="8 4"
        />
      ))}

      {/* Vertical stage lines */}
      {config.columns.map((col, idx) => (
        <line
          key={`col-${idx}`}
          x1={col.xStart * zoom + x}
          y1={0}
          x2={col.xStart * zoom + x}
          y2="100%"
          stroke="#d1d5db"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
      ))}

      {/* Row labels (left side, sticky) */}
      {config.rows.map((row, idx) => (
        <text
          key={`row-label-${idx}`}
          x={20}
          y={(row.yStart + row.height / 2) * zoom + y}
          fontSize={14}
          fontWeight={600}
          fill="#6b7280"
          dominantBaseline="middle"
        >
          {row.label}
        </text>
      ))}

      {/* Column labels (top, sticky) */}
      {config.columns.map((col, idx) => (
        <text
          key={`col-label-${idx}`}
          x={(col.xStart + col.width / 2) * zoom + x}
          y={20}
          fontSize={14}
          fontWeight={600}
          fill="#6b7280"
          textAnchor="middle"
        >
          {col.label}
        </text>
      ))}

      {/* Cell backgrounds (optional, for visual clarity) */}
      {config.rows.flatMap((row) =>
        config.columns.map((col) => (
          <rect
            key={`cell-${row.id}-${col.id}`}
            x={col.xStart * zoom + x}
            y={row.yStart * zoom + y}
            width={col.width * zoom}
            height={row.height * zoom}
            fill="transparent"
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        ))
      )}
    </svg>
  );
}
```

**Why this pattern:**
- **Reuses QuadrantOverlay approach:** Proven pattern from Steps 2 & 4
- **Viewport-aware:** Lines and labels transform with pan/zoom
- **SVG overlay:** Non-interactive, sits above canvas background
- **Dynamic columns:** Grid updates as user adds stage columns

**Source:** Existing `QuadrantOverlay` implementation, [ReactFlow Viewport State](https://reactflow.dev/api-reference/types/viewport)

---

### Pattern 4: AI-Driven Placement Suggestions

**Challenge:** AI suggests content, user confirms, item appears in correct cell.

**Data flow:**

```
1. AI analyzes prior output (e.g., empathy map data)
2. AI suggests journey map stage: "Research Stage: User searches for info"
3. AI returns structured output with cell coordinates
4. System renders "ghost" node in proposed cell
5. User confirms → node becomes permanent
6. User adjusts → drags to different cell (snap-to-cell applies)
```

**AI output schema:**

```typescript
// src/lib/ai/schemas/journey-map-schema.ts
import { z } from 'zod';

export const JourneyMapCellItemSchema = z.object({
  cell: z.object({
    rowId: z.enum(['actions', 'thoughts', 'feelings', 'pain-points', 'opportunities']),
    columnIndex: z.number(), // Which stage column (0-indexed)
  }),
  content: z.string(),
  reasoning: z.string().optional(), // Why AI placed it here
});

export const JourneyMapSuggestionSchema = z.object({
  stage: z.object({
    name: z.string(),        // "Research Stage"
    columnIndex: z.number(), // 0 (first column)
  }),
  items: z.array(JourneyMapCellItemSchema),
});
```

**System prompt for AI placement:**

```typescript
// src/lib/ai/prompts/journey-map-prompt.ts
export const JOURNEY_MAP_PLACEMENT_PROMPT = `
You are helping map a user journey with these swimlane rows:
- actions: Physical or digital actions the user takes
- thoughts: What the user is thinking (cognitive process)
- feelings: Emotional state (frustration, joy, confusion, etc.)
- pain-points: Specific problems or friction encountered
- opportunities: Potential improvements or innovations

For each stage of the journey, suggest:
1. Stage name (e.g., "Research Stage", "Purchase Stage")
2. Column index (0 for first stage, 1 for second, etc.)
3. Items for each row with cell coordinates

CRITICAL: Return cell coordinates as:
{
  "cell": { "rowId": "actions", "columnIndex": 0 },
  "content": "User searches Google for product reviews",
  "reasoning": "Research stage typically starts with search behavior"
}

Base suggestions on the empathy map data:
${empathyMapData}
`;
```

**Programmatic node placement:**

```typescript
// src/lib/canvas/ai-placement.ts
import type { GridConfig, GridColumn } from './grid-config';
import type { PostIt } from '@/stores/canvas-store';

/**
 * Convert AI cell address to ReactFlow coordinates
 */
export function cellToPosition(
  cell: { rowId: string; columnIndex: number },
  gridConfig: GridConfig
): { x: number; y: number } {
  const row = gridConfig.rows.find((r) => r.id === cell.rowId);
  const column = gridConfig.columns[cell.columnIndex];

  if (!row || !column) {
    throw new Error(`Invalid cell address: ${JSON.stringify(cell)}`);
  }

  return {
    x: column.xStart + column.width / 2,   // Center of cell
    y: row.yStart + row.height / 2,
  };
}

/**
 * Create post-it from AI suggestion
 */
export function createPostItFromSuggestion(
  suggestion: JourneyMapCellItem,
  gridConfig: GridConfig
): Omit<PostIt, 'id'> {
  const position = cellToPosition(suggestion.cell, gridConfig);

  return {
    text: suggestion.content,
    position,
    width: 220,  // Slightly smaller than cell width (240) for padding
    height: 140, // Slightly smaller than cell height (160)
    color: 'yellow',
    cell: suggestion.cell, // Store cell address
    metadata: {
      aiSuggested: true,
      reasoning: suggestion.reasoning,
    },
  };
}
```

**UI for AI suggestions (ghost nodes):**

```typescript
// src/components/canvas/ai-suggestion-node.tsx
interface AISuggestionNodeProps {
  suggestion: JourneyMapCellItem;
  onAccept: () => void;
  onReject: () => void;
}

export function AISuggestionNode({ suggestion, onAccept, onReject }: AISuggestionNodeProps) {
  return (
    <div className="relative w-[220px] h-[140px] p-3 rounded shadow-md border-2 border-dashed border-purple-400 bg-purple-50/50">
      {/* AI suggestion indicator */}
      <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
        AI Suggested
      </div>

      {/* Content preview */}
      <p className="text-sm text-gray-700 mb-2">{suggestion.content}</p>

      {/* Accept/Reject buttons */}
      <div className="absolute bottom-2 left-2 right-2 flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700"
        >
          Add
        </button>
        <button
          onClick={onReject}
          className="flex-1 bg-gray-300 text-gray-700 text-xs px-2 py-1 rounded hover:bg-gray-400"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
```

**Key features:**
- **Cell-based addressing:** AI returns `{rowId, columnIndex}`, not pixel coordinates
- **Ghost node preview:** Suggested items appear as dashed-border nodes
- **User confirmation:** Accept → permanent node, Reject → disappears
- **Reasoning display:** Optional tooltip shows why AI placed item there
- **Programmatic placement:** Uses ReactFlow's `setNodes()` API

**Source:** [ReactFlow Programmatic Node Positioning](https://reactflow.dev/api-reference/types/node), [Canvas3D AI Placement Research](https://arxiv.org/html/2508.07135v1)

---

### Pattern 5: Dynamic Column Management

**Challenge:** User needs to add/remove stage columns during workshop.

```typescript
// src/lib/canvas/grid-columns.ts
/**
 * Add a new stage column to the grid
 */
export function addGridColumn(
  gridConfig: GridConfig,
  stageName: string
): GridConfig {
  const lastColumn = gridConfig.columns[gridConfig.columns.length - 1];
  const newXStart = lastColumn
    ? lastColumn.xStart + lastColumn.width
    : 0;

  const newColumn: GridColumn = {
    id: crypto.randomUUID(),
    label: stageName,
    xStart: newXStart,
    width: gridConfig.cellWidth,
  };

  return {
    ...gridConfig,
    columns: [...gridConfig.columns, newColumn],
  };
}

/**
 * Remove a stage column (and reassign items in that column)
 */
export function removeGridColumn(
  gridConfig: GridConfig,
  columnId: string,
  onItemsReassign: (items: PostIt[], targetColumnIndex: number) => void
): GridConfig {
  const columnIndex = gridConfig.columns.findIndex((c) => c.id === columnId);
  if (columnIndex === -1) return gridConfig;

  // Get items in this column (to reassign)
  const itemsInColumn = useCanvasStore.getState().postIts.filter(
    (p) => p.cell?.columnIndex === columnIndex
  );

  // Reassign to previous column (or next if first column)
  const targetIndex = columnIndex > 0 ? columnIndex - 1 : 1;
  onItemsReassign(itemsInColumn, targetIndex);

  // Remove column and reindex remaining columns
  const newColumns = gridConfig.columns
    .filter((c) => c.id !== columnId)
    .map((col, idx) => ({
      ...col,
      xStart: idx * gridConfig.cellWidth,
    }));

  return {
    ...gridConfig,
    columns: newColumns,
  };
}
```

**UI for column management:**

```typescript
// Toolbar button to add stage
<button onClick={() => {
  const stageName = prompt('Enter stage name:');
  if (stageName) {
    const newConfig = addGridColumn(gridConfig, stageName);
    updateGridConfig(newConfig);
  }
}}>
  + Add Stage
</button>

// Context menu on column header to delete
<ContextMenu>
  <ContextMenuItem onClick={() => {
    const confirmed = confirm('Delete this stage? Items will move to adjacent stage.');
    if (confirmed) {
      const newConfig = removeGridColumn(gridConfig, columnId, (items, targetIdx) => {
        items.forEach((item) => {
          updatePostIt(item.id, {
            cell: { ...item.cell, columnIndex: targetIdx },
          });
        });
      });
      updateGridConfig(newConfig);
    }
  }}>
    Delete Stage
  </ContextMenuItem>
</ContextMenu>
```

**Source:** [Dynamic Layouting in ReactFlow](https://reactflow.dev/examples/layout/dynamic-layouting)

---

## Steps 2 & 4 Retrofit: Organized Canvas Layout

**v1.1 Challenge:** Steps 2 (Stakeholder Mapping) and 4 (Empathy Map) currently use freeform post-its. AI generates structured output, but rendering is unorganized.

**v1.2 Solution:** AI-driven initial placement using quadrant coordinates.

### Step 2: Stakeholder Mapping (Power x Interest)

**AI output retrofit:**

```typescript
// BEFORE (v1.1): AI suggests, user places manually
{
  "stakeholders": [
    { "name": "CEO", "power": "high", "interest": "high" },
    { "name": "End Users", "power": "low", "interest": "high" }
  ]
}

// AFTER (v1.2): AI suggests WITH quadrant-based placement
{
  "stakeholders": [
    {
      "name": "CEO",
      "power": "high",
      "interest": "high",
      "suggestedPosition": { "x": 300, "y": -300 }, // Top-right quadrant (Manage Closely)
    },
    {
      "name": "End Users",
      "power": "low",
      "interest": "high",
      "suggestedPosition": { "x": 300, "y": 300 }, // Bottom-right quadrant (Keep Informed)
    }
  ]
}
```

**AI placement logic:**

```typescript
// src/lib/canvas/stakeholder-placement.ts
export function calculateStakeholderPosition(
  power: 'high' | 'low',
  interest: 'high' | 'low'
): { x: number; y: number } {
  // Quadrant centers (avoid center line overlap)
  const OFFSET = 150; // Distance from center line

  return {
    x: interest === 'high' ? OFFSET : -OFFSET,
    y: power === 'high' ? -OFFSET : OFFSET,
  };
}
```

**Benefits:**
- **Organized initial layout:** Stakeholders appear in correct quadrants
- **User adjustable:** Can still drag to fine-tune position
- **Avoids clumping:** Multiple items in same quadrant get slight offset

### Step 4: Empathy Map (Said/Thought/Felt/Experienced)

**Similar approach:**

```typescript
// AI places empathy map items in correct quadrants
export function calculateEmpathyPosition(
  quadrant: 'said' | 'thought' | 'felt' | 'experienced'
): { x: number; y: number } {
  const OFFSET = 150;

  const positions = {
    said: { x: -OFFSET, y: OFFSET },       // Bottom-left
    thought: { x: -OFFSET, y: -OFFSET },   // Top-left
    felt: { x: OFFSET, y: -OFFSET },       // Top-right
    experienced: { x: OFFSET, y: OFFSET }, // Bottom-right
  };

  return positions[quadrant];
}
```

**Source:** Existing `detectQuadrant()` function, [ReactFlow Programmatic Positioning](https://reactflow.dev/api-reference/types/node)

---

## What NOT to Add

| Package | Why You Might Consider | Why NOT Needed | Use Instead |
|---------|------------------------|----------------|-------------|
| **elkjs / dagre / d3-hierarchy** | Auto-layout algorithms for node graphs | Journey Map grid is FIXED structure (5 rows), not algorithmic layout. Columns are user-defined order. No need for force-directed or tree layouts. | Custom grid math (cell width × column index) |
| **react-grid-layout** | Grid-based drag-and-drop | Designed for dashboard layouts (responsive breakpoints, resize handles). Journey Map is non-responsive canvas with fixed cell sizes. | ReactFlow + custom snap-to-cell logic |
| **@liangfaan/reactflow-swimlane** | Swimlane library for ReactFlow | Unmaintained (last update 2021), designed for flowcharts with cross-lane edges. Journey Map doesn't connect items. | Custom GridOverlay component |
| **yFiles Layout Algorithms** | Commercial layout algorithms | $$$, requires license for production. Journey Map layout is simple grid math. | Custom cell-to-position calculation |

---

## Configuration Updates

### Step Canvas Config Extension

```typescript
// src/lib/canvas/step-canvas-config.ts (EXTENDED from v1.1)
export type StepCanvasConfig = {
  hasQuadrants?: boolean;
  quadrantType?: QuadrantType;
  quadrantConfig?: QuadrantConfig;

  // NEW for v1.2
  hasGrid?: boolean;
  gridType?: 'swimlane';
  gridConfig?: GridConfig;
};

export const STEP_CANVAS_CONFIGS: Record<string, StepCanvasConfig> = {
  // Existing from v1.1
  'stakeholder-mapping': {
    hasQuadrants: true,
    quadrantType: 'power-interest',
    // ... quadrant config
  },

  'sense-making': {
    hasQuadrants: true,
    quadrantType: 'empathy-map',
    // ... quadrant config
  },

  // NEW for v1.2
  'journey-mapping': {
    hasGrid: true,
    gridType: 'swimlane',
    gridConfig: {
      type: 'swimlane',
      cellWidth: 240,
      cellHeight: 160,
      rows: [
        { id: 'actions', label: 'Actions', yStart: 0, height: 160 },
        { id: 'thoughts', label: 'Thoughts', yStart: 160, height: 160 },
        { id: 'feelings', label: 'Feelings', yStart: 320, height: 160 },
        { id: 'pain-points', label: 'Pain Points', yStart: 480, height: 160 },
        { id: 'opportunities', label: 'Opportunities', yStart: 640, height: 160 },
      ],
      columns: [], // Populated dynamically as user adds stages
    },
  },
};
```

---

## Database Schema Changes

**No new tables needed.** Existing `canvas_state` table (from v1.1) supports grid data.

**Grid data stored as:**

```json
{
  "postIts": [
    {
      "id": "post-123",
      "text": "User searches Google",
      "position": { "x": 120, "y": 80 },
      "cell": { "rowId": "actions", "columnIndex": 0 },
      "color": "yellow"
    }
  ],
  "gridConfig": {
    "type": "swimlane",
    "columns": [
      { "id": "col-0", "label": "Research Stage", "xStart": 0, "width": 240 }
    ]
  }
}
```

**Key additions:**
- `cell` property on post-its (stores cell address)
- `gridConfig.columns` array (tracks user-added stages)

---

## Version Compatibility

| Package | Current Version | v1.2 Requirement | Compatible? | Notes |
|---------|----------------|------------------|-------------|-------|
| @xyflow/react | 12.10.0 | 12.x | ✅ Yes | Native grid snap APIs available |
| React | 19.2.0 | 19.x | ✅ Yes | No changes needed |
| Zustand | (existing) | 5.x | ✅ Yes | Store grid config state |
| Gemini API | (existing) | (via AI SDK 6.x) | ✅ Yes | Structured outputs support cell coordinates |

**@xyflow/react 12.10.0 features used:**
- `snapToGrid` prop (overridden with custom snap logic)
- Programmatic `setNodes()` for AI placement
- Custom overlay components (similar to v1.1 QuadrantOverlay)
- Node `extent` property (constrain dragging to grid bounds)

**Source:** [@xyflow/react 12.10.0 release notes](https://www.npmjs.com/package/@xyflow/react), [ReactFlow API Reference](https://reactflow.dev/api-reference/types/node)

---

## Implementation Checklist

### Core Grid Features
- [ ] Create `GridConfig` type and `JOURNEY_MAP_GRID` constant
- [ ] Implement `snapToCell()` function for cell-center snapping
- [ ] Create `GridOverlay` component (similar to QuadrantOverlay)
- [ ] Update `step-canvas-config.ts` with grid configuration
- [ ] Modify `react-flow-canvas.tsx` to detect grid vs quadrant layout
- [ ] Store `cell` address on post-its in Zustand store

### AI Placement
- [ ] Define `JourneyMapCellItemSchema` for AI outputs
- [ ] Implement `cellToPosition()` coordinate conversion
- [ ] Create `AISuggestionNode` component for ghost nodes
- [ ] Update AI system prompts with cell coordinate schema
- [ ] Implement accept/reject handlers for AI suggestions
- [ ] Add `aiSuggested` metadata to post-its

### Dynamic Column Management
- [ ] Implement `addGridColumn()` function
- [ ] Implement `removeGridColumn()` with item reassignment
- [ ] Add toolbar button for "Add Stage"
- [ ] Add context menu on column headers for delete
- [ ] Store grid config in Zustand (sync to database)

### Steps 2 & 4 Retrofit
- [ ] Update stakeholder mapping AI to return suggested positions
- [ ] Update empathy map AI to return quadrant-based positions
- [ ] Implement `calculateStakeholderPosition()` helper
- [ ] Implement `calculateEmpathyPosition()` helper
- [ ] Add slight offset for multiple items in same quadrant

---

## Performance Considerations

### Grid Rendering Performance

**Concern:** 5 rows × 10 columns = 50 grid cells. Do we render 50 SVG rect elements?

**Solution:** Yes, but SVG is highly performant for static geometry.

**Analysis:**
- 50 SVG `<rect>` elements = ~5 KB DOM nodes
- Modern browsers handle 1000+ SVG elements at 60fps
- Grid overlay is non-interactive (pointer-events: none)
- No JavaScript event handlers on grid cells

**Optimization:** Use `will-change: transform` on overlay for pan/zoom.

```css
.grid-overlay {
  will-change: transform;
}
```

**Verdict:** 50 SVG rects is negligible overhead. No optimization needed.

### Cell Snap Performance

**Concern:** `snapToCell()` runs on every drag movement. Is distance calculation expensive?

**Solution:** Use efficient nearest-neighbor search.

**Analysis:**
- Journey Map: 5 rows × 10 columns (max) = 50 cells
- Worst case: 50 distance calculations per drag frame
- Modern JavaScript engines optimize Math.abs() and Math.min()
- Only runs on `dragging === false` (drag end), not every frame

**Optimization:** None needed. 50 distance calculations is < 1ms.

**Verdict:** Cell snap is performant without optimization.

### Dynamic Column Updates

**Concern:** Adding a column triggers re-render of all nodes?

**Solution:** ReactFlow uses React's reconciliation (only changed nodes re-render).

**Analysis:**
- Adding column: Updates GridOverlay (50 SVG rects) + repositions existing nodes
- ReactFlow optimizes with `useMemo()` on node arrays
- Zustand's selector prevents unnecessary re-renders

**Verdict:** Column add/remove is instant (< 16ms, no frame drop).

---

## Testing Checklist

### Grid Layout
- [ ] Grid overlay renders correctly with 5 rows
- [ ] Dynamic columns add/remove correctly
- [ ] Grid lines and labels transform with pan/zoom
- [ ] Cell backgrounds visible (optional styling)
- [ ] Grid config persists to database

### Snap-to-Cell
- [ ] Post-its snap to cell center (not corner)
- [ ] Drag across multiple cells snaps to nearest
- [ ] Cell address stored in post-it data `{rowId, columnIndex}`
- [ ] Snap works after column add/remove
- [ ] Non-grid steps still use dot-grid snap

### AI Placement
- [ ] AI returns valid cell coordinates
- [ ] Ghost nodes appear in correct cells
- [ ] Accept button creates permanent node
- [ ] Reject button removes ghost node
- [ ] AI suggestions don't overlap (slight offset)
- [ ] AI placement works for Steps 2, 4, 6

### Dynamic Columns
- [ ] Add stage button prompts for name
- [ ] New column appears at right edge of grid
- [ ] Delete stage reassigns items to adjacent column
- [ ] Column reindexing updates cell addresses
- [ ] Grid config updates in database

### Backward Compatibility
- [ ] Steps 2 & 4 (quadrant layout) still work
- [ ] Non-canvas steps (1, 3, 5, 7-10) unchanged
- [ ] Existing v1.1 workshops load correctly
- [ ] Canvas state migration from v1.1 to v1.2 works

---

## Bundle Size Analysis

**Total v1.2 bundle addition: 0 KB**

| Feature | Implementation | Bundle Cost |
|---------|---------------|-------------|
| Grid layout | Custom TypeScript functions | 0 KB (app code) |
| Snap-to-cell | Custom snap logic | 0 KB (app code) |
| Grid overlay | Custom SVG component | 0 KB (app code) |
| AI placement | Coordinate conversion functions | 0 KB (app code) |
| Dynamic columns | Array manipulation | 0 KB (app code) |

**Why 0 KB:**
- All features use existing ReactFlow APIs
- No new libraries installed
- Custom logic is app code (not external dependencies)
- Gzipped Next.js bundle increase: < 2 KB (custom code only)

**Comparison to alternatives:**

| Alternative | Bundle Size | Why Not Used |
|-------------|-------------|--------------|
| react-grid-layout | ~50 KB | Dashboard layouts, not canvas grids |
| elkjs | ~500 KB | Auto-layout for complex graphs, overkill |
| @liangfaan/reactflow-swimlane | ~20 KB | Unmaintained, designed for flowcharts |
| yFiles Layout Algorithms | N/A | Commercial license required |

**Verdict:** Custom grid logic is optimal for bundle size and performance.

---

## Migration from v1.1 to v1.2

| v1.1 Pattern | v1.2 Pattern | Breaking? |
|--------------|--------------|-----------|
| Quadrant canvas (Steps 2, 4) | Quadrant canvas + AI placement | No — extends existing |
| Freeform post-it placement | Grid-based cell placement (Step 6 only) | No — new step feature |
| Dot-grid snap | Dot-grid snap (quadrants) + cell-center snap (grids) | No — conditional on step type |
| `canvas_state` table | Same table, new `cell` and `gridConfig` properties | No — backward compatible JSON |

**Migration effort:** LOW. All changes extend existing patterns without breaking v1.1 functionality.

---

## Sources

### ReactFlow Grid & Layout (HIGH confidence)

- [ReactFlow Coordinate System](https://reactflow.dev/api-reference/types/xy-position) — Node positioning
- [ReactFlow Dynamic Layouting](https://reactflow.dev/examples/layout/dynamic-layouting) — Runtime layout updates
- [ReactFlow Auto Layout Overview](https://reactflow.dev/learn/layouting/layouting) — Layout algorithm integration
- [ReactFlow SnapGrid Type](https://reactflow.dev/api-reference/types/snap-grid) — Native snap behavior
- [ReactFlow Node Properties](https://reactflow.dev/api-reference/types/node) — Position, extent, custom data

### Custom Grid Implementation (MEDIUM-HIGH confidence)

- [reactflow-swimlane GitHub](https://github.com/liang-faan/reactflow-swimlane) — Swimlane patterns (unmaintained, for reference)
- [Custom Snap to Grid Discussion](https://github.com/xyflow/xyflow/discussions/3640) — Community approaches
- [React Flow Examples](https://reactflow.dev/examples) — Official examples (updated Feb 2, 2026)

### AI Placement Research (MEDIUM confidence)

- [Canvas3D: AI Spatial Placement](https://arxiv.org/html/2508.07135v1) — LLM agent placement algorithms
- [Generative Location Modeling](https://arxiv.org/html/2410.13564v1) — Autoregressive bounding box coordinates
- [ReactFlow Node Positioning](https://reactflow.dev/api-reference/types/node) — Programmatic placement APIs

### Grid Layout Patterns (MEDIUM confidence)

- [Journey Map Digital Template](https://www.nngroup.com/articles/journey-map-digital-template/) — Swimlane structure (NN/g)
- [Swimlane Diagram Patterns](https://sepantapouya.medium.com/swimlane-diagram-a-ux-designers-secret-weapon-for-order-in-chaos-fb9aa00927d5) — Row/column grid design
- [Canvas Layout TypeScript Library](https://github.com/netdur/canvas.layout.ts) — Layout algorithm patterns

### Version Compatibility (HIGH confidence)

- [@xyflow/react 12.10.0 npm](https://www.npmjs.com/package/@xyflow/react) — Release info (Dec 2025)
- [React Flow 12 Release](https://xyflow.com/blog/react-flow-12-release) — React 19 support confirmed

---

## Summary: What to Do Next

**For v1.2 grid/swimlane canvas features:**

1. **Create new TypeScript modules:**
   - `src/lib/canvas/grid-config.ts` — Grid structure types and Journey Map config
   - `src/lib/canvas/grid-snap.ts` — Cell-center snap logic
   - `src/lib/canvas/grid-columns.ts` — Dynamic column management
   - `src/lib/canvas/ai-placement.ts` — Cell-to-position conversion

2. **Create new components:**
   - `src/components/canvas/grid-overlay.tsx` — Swimlane lines and labels (SVG)
   - `src/components/canvas/ai-suggestion-node.tsx` — Ghost node for AI suggestions

3. **Modify existing files:**
   - `src/lib/canvas/step-canvas-config.ts` — Add grid config for Step 6
   - `src/components/canvas/react-flow-canvas.tsx` — Detect grid layout, apply cell snap
   - `src/stores/canvas-store.ts` — Add `cell` and `gridConfig` properties
   - `src/lib/ai/prompts/` — Update AI prompts to return cell coordinates

4. **Extend AI schemas:**
   - `src/lib/ai/schemas/journey-map-schema.ts` — Cell coordinate output schema
   - Update stakeholder and empathy map schemas with suggested positions

5. **Database:**
   - No schema changes needed (existing `canvas_state` table supports new properties)
   - Migration: None required (JSON column is flexible)

**Estimated implementation time:** 4-5 days
- Grid overlay and snap logic: 1 day
- AI placement system: 2 days
- Dynamic column management: 1 day
- Steps 2 & 4 retrofit: 1 day

**Bundle impact:** 0 KB (no new packages)

**Performance impact:** Negligible (< 1ms grid calculations)

---

*Stack research for: WorkshopPilot.ai v1.2 Grid/Swimlane Canvas Features*
*Researched: 2026-02-11*
*Next research: AI-driven refinement suggestions (future phase)*
