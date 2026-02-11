# Architecture Research: Grid/Swimlane Canvas Integration

**Domain:** ReactFlow canvas whiteboard with structured grid/swimlane layouts
**Researched:** 2026-02-11
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     UI Layer (React Components)                      │
├─────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐  ┌─────────────┐ │
│  │ ChatPanel  │  │ CanvasPanel  │  │ OutputPanel│  │ RightPanel  │ │
│  │            │  │ (wrapper)    │  │            │  │ (tabs)      │ │
│  └─────┬──────┘  └──────┬───────┘  └─────┬──────┘  └──────┬──────┘ │
│        │                │                 │                │         │
├────────┴────────────────┴─────────────────┴────────────────┴─────────┤
│                      Canvas Rendering Layer                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              ReactFlowCanvas (ReactFlowProvider)             │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐    │   │
│  │  │ ReactFlow   │  │  Background  │  │ GridOverlay/     │    │   │
│  │  │ (core)      │  │  (dots/grid) │  │ QuadrantOverlay  │    │   │
│  │  └─────────────┘  └──────────────┘  └──────────────────┘    │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐    │   │
│  │  │ PostItNode  │  │ GroupNode    │  │ GridCellNode(new)│    │   │
│  │  └─────────────┘  └──────────────┘  └──────────────────┘    │   │
│  └──────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                       State Management Layer                         │
├─────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────┐  ┌────────────────────┐                     │
│  │ Canvas Store       │  │ Grid Layout Store  │                     │
│  │ (Zustand+temporal) │  │ (new, optional)    │                     │
│  │ - postIts[]        │  │ - gridConfig       │                     │
│  │ - isDirty          │  │ - swimlanes[]      │                     │
│  │ - actions          │  │ - cells[]          │                     │
│  └────────┬───────────┘  └────────┬───────────┘                     │
│           │                       │                                  │
├───────────┴───────────────────────┴──────────────────────────────────┤
│                    Configuration & Data Layer                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  step-canvas-config.ts (existing + extensions)               │   │
│  │  - hasQuadrants / hasGrid / hasSwimlane (layout type)        │   │
│  │  - quadrantConfig / gridConfig / swimlaneConfig              │   │
│  │  - AI placement rules per step                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Database: stepArtifacts (JSONB column)                      │   │
│  │  - Stores canvas state + grid metadata + cell assignments    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **ReactFlowCanvas** | Core canvas orchestration, node rendering, event handling | ReactFlow wrapper with custom node types, snap-to-grid, pan/zoom |
| **GridOverlay** (new) | Render swimlane labels, grid lines, cell boundaries as SVG | Similar to QuadrantOverlay, viewport-aware SVG positioned absolutely |
| **PostItNode** (existing) | Render individual post-it notes (free-form canvas) | Custom ReactFlow node, 120x120px, editable text, color-coded |
| **GridCellNode** (new) | Render structured content within grid cells | Custom ReactFlow node with cell coordinate metadata, constrained sizing |
| **CanvasToolbar** (existing) | Add post-it, undo/redo, group actions | Fixed position toolbar with action buttons |
| **useCanvasStore** | Manage post-it state, undo/redo (Zustand + zundo) | Temporal store with actions for add/update/delete/group |
| **step-canvas-config.ts** | Define step-specific canvas layouts and AI rules | Configuration object per step ID (quadrant/grid/swimlane/freeform) |
| **canvas-context.ts** | Assemble canvas state for AI prompts | Formats canvas/grid state into AI-readable context strings |

## Integration Architecture for v1.2

### New vs Modified Components

**NEW Components:**
- `src/components/canvas/grid-overlay.tsx` — SVG overlay for swimlane labels and grid lines
- `src/components/canvas/grid-cell-node.tsx` — ReactFlow node for structured grid content
- `src/lib/canvas/grid-layout.ts` — Grid coordinate utilities (cell→position, position→cell)
- `src/lib/canvas/grid-detection.ts` — Detect which cell a position/node belongs to
- `src/lib/canvas/ai-placement-engine.ts` — AI suggest-then-confirm placement logic
- `src/types/grid-canvas.ts` — TypeScript types for grid/swimlane layouts

**MODIFIED Components:**
- `src/lib/canvas/step-canvas-config.ts` — Add `hasGrid`, `gridConfig`, `swimlaneConfig` fields
- `src/stores/canvas-store.ts` — Add `cellAssignment` field to PostIt type, grid metadata actions
- `src/components/canvas/react-flow-canvas.tsx` — Conditional rendering of GridOverlay, grid-aware snap logic
- `src/lib/workshop/context/canvas-context.ts` — Add grid-aware context assembly for AI
- `src/lib/ai/chat-config.ts` — Add grid placement instructions to system prompt
- `src/components/workshop/journey-map-grid.tsx` — Refactor to render on canvas instead of standalone

### Data Flow: AI-Driven Placement

```
User chats with AI
    ↓
AI suggests content + grid placement
    ↓
[GRID_ITEM row="Emotions" col="Awareness"]Content[/GRID_ITEM]
    ↓
ChatPanel parses markup (new parser function)
    ↓
Renders "Add to canvas" button with placement preview
    ↓
User clicks button (suggest-then-confirm)
    ↓
Canvas store creates node at calculated position
    ↓
Grid detection assigns cellId, validates placement
    ↓
Node snaps to cell boundaries
    ↓
Canvas auto-saves to stepArtifacts JSONB
    ↓
AI reads updated grid state in next message
```

### Data Flow: Output→Canvas Migration (Steps 2 & 4)

```
User completes step (validate phase)
    ↓
AI extracts structured artifact (existing flow)
    ↓
NEW: artifact-to-canvas transformer
    ↓
Maps artifact fields → grid cells or quadrants
    ↓
Batch creates canvas nodes with positions
    ↓
Canvas replaces OutputPanel as primary view
    ↓
User can edit/rearrange nodes on canvas
    ↓
Canvas state syncs back to stepArtifacts JSONB
```

## Recommended Project Structure

```
src/
├── components/
│   ├── canvas/
│   │   ├── react-flow-canvas.tsx       # [MODIFY] Add grid overlay, grid snap
│   │   ├── canvas-wrapper.tsx          # [NO CHANGE] Dynamic import wrapper
│   │   ├── post-it-node.tsx            # [NO CHANGE] Existing post-it node
│   │   ├── group-node.tsx              # [NO CHANGE] Existing group node
│   │   ├── grid-overlay.tsx            # [NEW] SVG swimlane/grid overlay
│   │   ├── grid-cell-node.tsx          # [NEW] Structured grid content node
│   │   ├── quadrant-overlay.tsx        # [NO CHANGE] Existing quadrant overlay
│   │   └── canvas-toolbar.tsx          # [NO CHANGE] Existing toolbar
│   └── workshop/
│       ├── chat-panel.tsx              # [MODIFY] Add grid item parser
│       ├── output-panel.tsx            # [MODIFY] Conditional canvas rendering
│       ├── journey-map-grid.tsx        # [REFACTOR] Render on canvas
│       └── right-panel.tsx             # [NO CHANGE] Tab container
├── lib/
│   ├── canvas/
│   │   ├── step-canvas-config.ts       # [MODIFY] Add grid/swimlane configs
│   │   ├── quadrant-detection.ts       # [NO CHANGE] Existing quadrant logic
│   │   ├── grid-layout.ts              # [NEW] Grid coordinate utilities
│   │   ├── grid-detection.ts           # [NEW] Cell detection logic
│   │   └── ai-placement-engine.ts      # [NEW] Suggest-confirm placement
│   ├── workshop/
│   │   └── context/
│   │       └── canvas-context.ts       # [MODIFY] Grid-aware AI context
│   └── ai/
│       └── chat-config.ts              # [MODIFY] Add grid placement prompts
├── stores/
│   └── canvas-store.ts                 # [MODIFY] Add cellAssignment, grid metadata
└── types/
    └── grid-canvas.ts                  # [NEW] Grid/swimlane types
```

### Structure Rationale

- **canvas/:** All canvas rendering components in one place, grid components alongside existing quadrant/post-it
- **lib/canvas/:** Canvas-specific business logic (layout, detection, AI placement) separate from UI
- **stores/:** Zustand store remains centralized, grid metadata extends existing PostIt type
- **types/:** New types for grid structures without polluting existing files

## Architectural Patterns

### Pattern 1: Layout Configuration Extension

**What:** Extend existing `step-canvas-config.ts` with new layout types (grid, swimlane) while maintaining backward compatibility with quadrant and freeform layouts.

**When to use:** When adding new canvas layout types to step-specific configurations.

**Trade-offs:**
- **Pro:** Single source of truth for step canvas behavior
- **Pro:** Backward compatible, no breaking changes to Steps 2 & 4
- **Con:** Config file grows, may need splitting if >10 layout types

**Example:**
```typescript
// step-canvas-config.ts
export type CanvasLayoutType = 'freeform' | 'quadrant' | 'grid' | 'swimlane';

export type GridConfig = {
  type: 'grid';
  rows: GridRow[];  // Fixed rows (e.g., ["Actions", "Goals", "Barriers"])
  columns: GridColumn[];  // Dynamic columns (user can add stages)
  defaultCellWidth: number;
  defaultCellHeight: number;
  allowDynamicColumns: boolean;
};

export type StepCanvasConfig = {
  layoutType: CanvasLayoutType;
  quadrantConfig?: QuadrantConfig;  // Existing
  gridConfig?: GridConfig;  // NEW
  swimlaneConfig?: SwimlaneConfig;  // NEW
};

export const STEP_CANVAS_CONFIGS: Record<string, StepCanvasConfig> = {
  'journey-mapping': {
    layoutType: 'grid',
    gridConfig: {
      type: 'grid',
      rows: [
        { id: 'actions', label: 'Actions', height: 150 },
        { id: 'goals', label: 'Goals', height: 150 },
        { id: 'barriers', label: 'Barriers', height: 150 },
        { id: 'touchpoints', label: 'Touchpoints', height: 150 },
        { id: 'emotions', label: 'Emotions', height: 100 },
        { id: 'moments', label: 'Moments of Truth', height: 120 },
        { id: 'opportunities', label: 'Opportunities', height: 150 },
      ],
      columns: [],  // User adds stages dynamically
      defaultCellWidth: 200,
      defaultCellHeight: 150,
      allowDynamicColumns: true,
    },
  },
  'stakeholder-mapping': {
    layoutType: 'quadrant',  // Existing, no change
    quadrantConfig: { /* existing */ },
  },
};
```

### Pattern 2: Coordinate Transform Layer

**What:** Create utility functions that translate between grid coordinates (row, col) and canvas positions (x, y), with snap-to-cell behavior.

**When to use:** When placing nodes in grid/swimlane layouts, or detecting which cell a dragged node belongs to.

**Trade-offs:**
- **Pro:** Separation of concerns (grid math vs rendering)
- **Pro:** Testable pure functions
- **Con:** Adds indirection layer

**Example:**
```typescript
// grid-layout.ts
export type GridCoordinate = { row: number; col: number };
export type CanvasPosition = { x: number; y: number };

export function gridToPosition(
  coord: GridCoordinate,
  gridConfig: GridConfig,
  viewportOrigin: CanvasPosition = { x: 0, y: 0 }
): CanvasPosition {
  const rowHeight = gridConfig.rows[coord.row]?.height || gridConfig.defaultCellHeight;
  const colWidth = gridConfig.columns[coord.col]?.width || gridConfig.defaultCellWidth;

  const x = viewportOrigin.x + (coord.col * colWidth);
  const y = viewportOrigin.y + (coord.row * rowHeight);

  return { x, y };
}

export function positionToGrid(
  position: CanvasPosition,
  gridConfig: GridConfig,
  viewportOrigin: CanvasPosition = { x: 0, y: 0 }
): GridCoordinate | null {
  const relativeX = position.x - viewportOrigin.x;
  const relativeY = position.y - viewportOrigin.y;

  let accumulatedY = 0;
  let rowIndex = -1;
  for (let i = 0; i < gridConfig.rows.length; i++) {
    const rowHeight = gridConfig.rows[i].height;
    if (relativeY >= accumulatedY && relativeY < accumulatedY + rowHeight) {
      rowIndex = i;
      break;
    }
    accumulatedY += rowHeight;
  }

  if (rowIndex === -1) return null;

  let accumulatedX = 0;
  let colIndex = -1;
  for (let i = 0; i < gridConfig.columns.length; i++) {
    const colWidth = gridConfig.columns[i].width || gridConfig.defaultCellWidth;
    if (relativeX >= accumulatedX && relativeX < accumulatedX + colWidth) {
      colIndex = i;
      break;
    }
    accumulatedX += colWidth;
  }

  if (colIndex === -1) return null;

  return { row: rowIndex, col: colIndex };
}

export function snapToCell(
  position: CanvasPosition,
  gridConfig: GridConfig,
  viewportOrigin: CanvasPosition = { x: 0, y: 0 }
): CanvasPosition {
  const coord = positionToGrid(position, gridConfig, viewportOrigin);
  if (!coord) return position;  // Outside grid, no snap
  return gridToPosition(coord, gridConfig, viewportOrigin);
}
```

### Pattern 3: AI Suggest-Then-Confirm Placement

**What:** AI proposes content with grid coordinates via markup, UI shows preview button, user confirms to place on canvas.

**When to use:** When AI generates structured content that maps to specific grid cells (Journey Map stages, swimlane tasks).

**Trade-offs:**
- **Pro:** User control, prevents unwanted placements
- **Pro:** Preview before committing to canvas
- **Con:** Extra click compared to automatic placement
- **Con:** Requires new markup parser

**Example:**
```typescript
// ai-placement-engine.ts
export type GridPlacement = {
  content: string;
  row: string;  // Row ID or label
  col: string;  // Column ID or label
  suggestedPosition?: CanvasPosition;  // Pre-calculated
};

export function parseGridItems(aiResponse: string): {
  cleanedText: string;
  placements: GridPlacement[];
} {
  const regex = /\[GRID_ITEM row="([^"]+)" col="([^"]+)"\]([^[]+)\[\/GRID_ITEM\]/g;
  const placements: GridPlacement[] = [];

  let match;
  while ((match = regex.exec(aiResponse)) !== null) {
    placements.push({
      row: match[1],
      col: match[2],
      content: match[3].trim(),
    });
  }

  const cleanedText = aiResponse.replace(regex, '');
  return { cleanedText, placements };
}

export function calculatePlacementPosition(
  placement: GridPlacement,
  gridConfig: GridConfig
): CanvasPosition | null {
  const rowIndex = gridConfig.rows.findIndex(r => r.id === placement.row || r.label === placement.row);
  const colIndex = gridConfig.columns.findIndex(c => c.id === placement.col || c.label === placement.col);

  if (rowIndex === -1 || colIndex === -1) return null;

  return gridToPosition({ row: rowIndex, col: colIndex }, gridConfig);
}
```

### Pattern 4: SVG Grid Overlay (Viewport-Aware)

**What:** Render grid lines, swimlane labels, and cell boundaries as an SVG overlay that transforms with ReactFlow viewport (pan/zoom).

**When to use:** When grid structure is fixed (row labels, column headers) but viewport can pan/zoom.

**Trade-offs:**
- **Pro:** Grid stays aligned with canvas nodes during pan/zoom
- **Pro:** Reuses QuadrantOverlay pattern (proven approach)
- **Con:** SVG performance degrades with >100 grid lines

**Example:**
```typescript
// grid-overlay.tsx
'use client';

import { useStore as useReactFlowStore, type ReactFlowState } from '@xyflow/react';
import type { GridConfig } from '@/lib/canvas/step-canvas-config';

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

  // Calculate accumulated row heights
  let accumulatedHeight = 0;
  const rowPositions = config.rows.map(row => {
    const pos = accumulatedHeight;
    accumulatedHeight += row.height;
    return { ...row, y: pos };
  });

  // Calculate accumulated column widths
  let accumulatedWidth = 0;
  const colPositions = config.columns.map(col => {
    const pos = accumulatedWidth;
    accumulatedWidth += (col.width || config.defaultCellWidth);
    return { ...col, x: pos };
  });

  return (
    <svg className="absolute inset-0 pointer-events-none z-10" width="100%" height="100%">
      {/* Horizontal lines (row separators) */}
      {rowPositions.map((row, idx) => {
        const screenY = row.y * zoom + y;
        return (
          <g key={`row-${idx}`}>
            <line
              x1={0}
              y1={screenY}
              x2="100%"
              y2={screenY}
              stroke="#d1d5db"
              strokeWidth={1.5}
            />
            <text
              x={10}
              y={screenY + 20}
              fontSize={12}
              fontWeight={500}
              fill="#6b7280"
            >
              {row.label}
            </text>
          </g>
        );
      })}

      {/* Vertical lines (column separators) */}
      {colPositions.map((col, idx) => {
        const screenX = col.x * zoom + x;
        return (
          <line
            key={`col-${idx}`}
            x1={screenX}
            y1={0}
            x2={screenX}
            y2="100%"
            stroke="#d1d5db"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        );
      })}
    </svg>
  );
}
```

### Pattern 5: Hybrid Canvas State (Freeform + Structured)

**What:** PostIt type supports both freeform positioning (x, y) and structured cell assignment (row, col), allowing mixed layouts.

**When to use:** When same step might have both grid regions and freeform regions (e.g., Journey Map with annotations).

**Trade-offs:**
- **Pro:** Flexibility for complex layouts
- **Pro:** No need for separate node types
- **Con:** More complex validation (position vs cell conflict)

**Example:**
```typescript
// canvas-store.ts (MODIFIED)
export type PostIt = {
  id: string;
  text: string;
  position: { x: number; y: number };  // Absolute position (always required)
  width: number;
  height: number;
  color?: PostItColor;
  parentId?: string;
  type?: 'postIt' | 'group';
  quadrant?: Quadrant;  // Existing (Steps 2 & 4)
  cellAssignment?: {    // NEW (Step 6+)
    row: string;        // Row ID
    col: string;        // Column ID
  };
};

// When adding post-it to grid cell:
addPostIt({
  text: 'User feels frustrated',
  position: gridToPosition({ row: 2, col: 1 }, gridConfig),  // Calculate position
  cellAssignment: { row: 'barriers', col: 'awareness' },     // Assign to cell
  width: 180,
  height: 100,
});

// Validation logic in store:
if (postIt.cellAssignment && gridConfig) {
  const calculatedPos = gridToPosition(
    positionToGrid(postIt.position, gridConfig)!,
    gridConfig
  );
  // Snap position to match cell assignment
  postIt.position = calculatedPos;
}
```

## Data Flow

### Canvas State to AI Context (Grid-Aware)

```
Canvas Store (postIts with cellAssignments)
    ↓
canvas-context.ts: assembleGridCanvasContext()
    ↓
Group by cellAssignment.row + cellAssignment.col
    ↓
Format as markdown grid:
    "**Awareness Stage:**
     - Actions: [item1], [item2]
     - Emotions: [item3]"
    ↓
Inject into AI system prompt as Tier 4 context
    ↓
AI reads grid state, suggests new items with row/col
```

### AI Response to Canvas Placement

```
AI generates response with [GRID_ITEM] markup
    ↓
parseGridItems(message.content)
    ↓
{ cleanedText, placements: [{ row, col, content }] }
    ↓
Render "Add to canvas" buttons with placement preview
    ↓
User clicks button
    ↓
calculatePlacementPosition(placement, gridConfig)
    ↓
addPostIt({ position, cellAssignment, text })
    ↓
Canvas store creates node, snaps to grid
    ↓
Auto-save to stepArtifacts JSONB
```

### Output→Canvas Migration Flow

```
User completes Step 2 (Stakeholder Mapping)
    ↓
Artifact extracted: { stakeholders: [...quadrant data] }
    ↓
NEW: migrateArtifactToCanvas(artifact, stepId)
    ↓
For each stakeholder, create PostIt with:
    - position: calculated from quadrant
    - quadrant: existing field
    - text: stakeholder name + notes
    ↓
Batch add to canvas store
    ↓
Canvas becomes primary view, OutputPanel hides
    ↓
User edits/rearranges on canvas
    ↓
Canvas state saves back to stepArtifacts
```

## Integration Points

### Existing Integration Points (DO NOT BREAK)

| Integration Point | Current Behavior | v1.2 Changes |
|-------------------|------------------|--------------|
| **Canvas Store → Database** | Auto-save postIts[] to stepArtifacts JSONB every 2s | Add cellAssignment to serialization, no schema change |
| **AI Prompt → Canvas State** | Quadrant-grouped context in Tier 4 | Add grid-grouped context for grid layouts |
| **[CANVAS_ITEM] Markup** | ChatPanel parses, creates post-its | Add [GRID_ITEM] parser alongside existing parser |
| **QuadrantOverlay SVG** | Renders quadrant lines on Steps 2 & 4 | Add conditional GridOverlay on Step 6 |
| **stepCanvasConfig** | Returns quadrant config or freeform | Add grid/swimlane config options |

### New Integration Points

| Integration Point | Communication | Notes |
|-------------------|---------------|-------|
| **GridOverlay ↔ ReactFlow Viewport** | Subscribes to viewport transform, renders SVG | Same pattern as QuadrantOverlay |
| **AI Chat ↔ Grid Parser** | [GRID_ITEM] markup → placements[] | New parser function in chat-panel.tsx |
| **Grid Layout Utils ↔ Canvas Store** | Calculate positions, validate cells | Pure functions, no state coupling |
| **JourneyMapGrid ↔ Canvas** | Refactor to render as canvas nodes | Replace HTML table with ReactFlow nodes |

## Build Order (Dependency-Aware)

**Phase 1: Foundation (No Dependencies)**
1. Create types/grid-canvas.ts (grid types)
2. Create lib/canvas/grid-layout.ts (coordinate transform utilities)
3. Extend step-canvas-config.ts with gridConfig for Step 6

**Phase 2: Rendering (Depends on Phase 1)**
4. Create components/canvas/grid-overlay.tsx (SVG grid lines)
5. Modify react-flow-canvas.tsx to conditionally render GridOverlay
6. Create components/canvas/grid-cell-node.tsx (optional, for structured content)

**Phase 3: State Integration (Depends on Phase 1)**
7. Modify canvas-store.ts to add cellAssignment field to PostIt
8. Create lib/canvas/grid-detection.ts (position → cell detection)
9. Update canvas-context.ts to format grid state for AI

**Phase 4: AI Integration (Depends on Phase 2 & 3)**
10. Create lib/canvas/ai-placement-engine.ts (parseGridItems, calculatePlacement)
11. Modify chat-panel.tsx to parse [GRID_ITEM] markup and render buttons
12. Modify chat-config.ts to add grid placement instructions to Step 6 prompt

**Phase 5: Journey Map Migration (Depends on Phase 2-4)**
13. Refactor journey-map-grid.tsx to render on canvas
14. Add dynamic column management (add/remove stages)
15. Test end-to-end: AI suggests → user confirms → grid placement

**Phase 6: Steps 2 & 4 Retrofit (Depends on all phases)**
16. Create artifact-to-canvas migration utilities
17. Modify output-panel.tsx to conditionally hide when canvas is primary view
18. Add "Migrate to Canvas" button for existing artifacts

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-10 steps** | Current architecture handles this well. Grid configs scale linearly. |
| **10-50 grid cells** | SVG overlay performance is fine. No optimization needed. |
| **50-200 grid cells** | Consider virtualization for GridOverlay (only render visible cells). May need canvas-based rendering instead of SVG. |
| **Dynamic columns** | Step 6 allows user to add stages. Limit to ~20 columns to prevent horizontal scroll hell. Add column collapse/expand UI. |

### Scaling Priorities

1. **First bottleneck:** Too many grid cells (>100) → SVG rendering lag. **Fix:** Switch to HTML Canvas API for grid lines, or virtualize rendering.
2. **Second bottleneck:** Complex grid structures → config becomes unmanageable. **Fix:** Consider grid builder UI instead of hardcoded configs.

## Anti-Patterns

### Anti-Pattern 1: Grid Logic in ReactFlow Nodes

**What people do:** Put grid coordinate calculations inside PostItNode or GridCellNode components.

**Why it's wrong:** Nodes re-render frequently (drag, zoom, select). Recalculating grid positions on every render causes jank.

**Do this instead:** Calculate positions once in utility layer (grid-layout.ts), pass pre-calculated positions to nodes. Nodes should be pure presentational components.

### Anti-Pattern 2: Separate State for Grid and Freeform

**What people do:** Create separate Zustand stores for grid nodes vs freeform nodes.

**Why it's wrong:** Canvas needs unified undo/redo, auto-save, and AI context. Separate stores break these features and require complex sync logic.

**Do this instead:** Use single canvas store with optional cellAssignment field. Grid nodes are just post-its with cell metadata. Undo/redo, save, and AI context work uniformly.

### Anti-Pattern 3: Automatic AI Placement

**What people do:** AI response → automatically creates canvas nodes without user confirmation.

**Why it's wrong:** Users lose control, unwanted nodes clutter canvas, no preview before placement. Trust in AI decreases.

**Do this instead:** Suggest-then-confirm pattern. AI proposes placement via markup, UI shows preview button, user clicks to confirm. Maintains user agency.

### Anti-Pattern 4: Hardcoding Grid Dimensions

**What people do:** Use fixed pixel values for grid cell sizes (e.g., always 200x150px).

**Why it's wrong:** Content doesn't fit, grid looks broken on mobile, inflexible for different step needs.

**Do this instead:** Configurable cell sizes in gridConfig, responsive sizing based on viewport, allow cell resize/expand for overflow content.

### Anti-Pattern 5: Mixing HTML and ReactFlow Rendering

**What people do:** Render journey-map-grid.tsx as HTML table alongside ReactFlow canvas, trying to keep them in sync.

**Why it's wrong:** Two rendering systems = double complexity, sync bugs, no unified drag/drop, confusing UX.

**Do this instead:** Render everything on ReactFlow canvas. Use custom nodes for grid cells. Single rendering system, consistent interactions.

## Migration Strategy: JourneyMapGrid → Canvas

**Current State (v1.1):**
- `journey-map-grid.tsx` renders HTML table with editable cells
- Lives in OutputPanel, separate from canvas
- No drag/drop, no visual rearrangement

**Target State (v1.2):**
- Grid structure rendered as canvas overlay (SVG swimlane labels)
- Journey stages rendered as ReactFlow nodes in grid cells
- Editable on canvas, drag to reorder, unified with canvas tools

**Migration Approach:**

1. **Keep existing JourneyMapGrid component as fallback**
   - Add feature flag: `useCanvasJourneyMap`
   - Default to HTML table for v1.2.0, switch to canvas in v1.2.1

2. **Parallel implementation strategy:**
   ```typescript
   // output-panel.tsx
   if (stepOrder === 6) {
     const useCanvasJourneyMap = true;  // Feature flag

     if (useCanvasJourneyMap) {
       // NEW: Switch to canvas tab, render grid overlay + nodes
       return <CanvasPanel />;
     } else {
       // EXISTING: Render HTML table in output panel
       return <JourneyMapGrid artifact={artifact} />;
     }
   }
   ```

3. **Data transformation layer:**
   ```typescript
   // Transform artifact → canvas nodes
   function journeyMapToCanvasNodes(
     artifact: JourneyMapArtifact,
     gridConfig: GridConfig
   ): PostIt[] {
     const nodes: PostIt[] = [];

     artifact.stages.forEach((stage, colIdx) => {
       gridConfig.rows.forEach((row, rowIdx) => {
         const cellContent = stage[row.id];
         if (cellContent) {
           nodes.push({
             id: crypto.randomUUID(),
             text: cellContent,
             position: gridToPosition({ row: rowIdx, col: colIdx }, gridConfig),
             cellAssignment: { row: row.id, col: stage.name },
             width: gridConfig.defaultCellWidth - 20,  // Padding
             height: row.height - 20,
           });
         }
       });
     });

     return nodes;
   }
   ```

## Sources

**ReactFlow Documentation:**
- [SnapGrid - React Flow](https://reactflow.dev/api-reference/types/snap-grid) — Grid snapping functionality
- [Custom Nodes - React Flow](https://reactflow.dev/learn/customization/custom-nodes) — Building custom node types
- [The Background component - React Flow](https://reactflow.dev/api-reference/components/background) — Background patterns and overlays
- [Overview - React Flow](https://reactflow.dev/learn/layouting/layouting) — Layout algorithms (dagre, d3-hierarchy, elk)
- [Dynamic Layouting - React Flow](https://reactflow.dev/examples/layout/dynamic-layouting) — Programmatic node positioning

**Swimlane Libraries:**
- [GitHub - liang-faan/reactflow-swimlane](https://github.com/liang-faan/reactflow-swimlane) — ReactFlow swimlane implementation with dagre
- [Swim lane in React Diagram Component | Syncfusion](https://ej2.syncfusion.com/react/documentation/diagram/swim-lane) — Alternative swimlane approach

**Grid Layout:**
- [GitHub - react-grid-layout/react-grid-layout](https://github.com/react-grid-layout/react-grid-layout) — Draggable/resizable grid layout (alternative approach, not ReactFlow-based)

**AI Workflow Patterns:**
- [How do AI content generation tools handle content approval workflows? | Storyteq](https://storyteq.com/blog/how-do-ai-content-generation-tools-handle-content-approval-workflows/) — Suggest-confirm patterns in AI tools
- [AI Workflow Automation Trends for 2026 | cflowapps](https://www.cflowapps.com/ai-workflow-automation-trends/) — Early-stage checkpoints, approval workflows

---
*Architecture research for: Grid/Swimlane Canvas Integration*
*Researched: 2026-02-11*
