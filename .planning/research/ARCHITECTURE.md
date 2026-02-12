# Architecture Research: EzyDraw Integration & Visual Ideation Canvases

**Domain:** Drawing tool integration with ReactFlow canvas for design thinking Steps 8 and 9
**Researched:** 2026-02-12
**Confidence:** HIGH

## Executive Summary

Adding EzyDraw (standalone drawing modal) and visual canvas layouts for Steps 8 (Mind Map, Crazy 8s) and 9 (Visual Concept Cards) to an existing ReactFlow-based design thinking application requires careful data modeling to support both editable drawing state AND rendered images as ReactFlow nodes.

**Critical architectural question:** How to store drawing data that supports both re-editing AND display as image nodes on canvas?

**Recommended approach:** Use tldraw SDK for the drawing modal (proven, feature-rich, React-native), store drawing state as JSON in `stepArtifacts.drawings` array, render exported PNG images as custom ReactFlow nodes with `data-drawing-id` linking back to editable state. New Mind Map uses ReactFlow with dagre layout (consistent with existing canvas architecture), Crazy 8s uses CSS Grid overlay with 8 fixed slots, Concept Cards are rich custom ReactFlow nodes with embedded images.

**Key integration patterns:**
1. **EzyDraw Modal → Drawing State → PNG Export → ReactFlow Node** (full cycle with re-edit capability)
2. **Mind Map:** ReactFlow nodes + edges with dagre auto-layout (new node type: `mind-node`)
3. **Crazy 8s:** ReactFlow with 8-slot grid overlay (similar to existing Journey Map grid)
4. **Concept Cards:** Custom ReactFlow node with sections for image, text, SWOT grid, feasibility scores

## System Overview

### Current Architecture (v1.2 — Post-it Canvas)

```
┌──────────────────────────────────────────────────────────────────┐
│                     WORKSHOP LAYOUT                              │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────────────────────────────┐   │
│  │  Sidebar    │  │      Main Area (Split Screen)           │   │
│  │             │  │                                         │   │
│  │  Step 1 ○   │  │  ┌────────────────────────────────────┐ │   │
│  │  Step 2 ●   │  │  │      StepContainer (Client)        │ │   │
│  │  Step 4 ●   │  │  │                                    │ │   │
│  │  Step 6 ●   │  │  │  ┌──────────┐  ┌──────────────┐   │ │   │
│  │  Step 8 ○   │  │  │  │  Chat    │  │  ReactFlow   │   │ │   │
│  │  Step 9 ○   │  │  │  │  Panel   │  │  Canvas      │   │ │   │
│  │    ...      │  │  │  │          │  │  Panel       │   │ │   │
│  │             │  │  │  └──────────┘  └──────────────┘   │ │   │
│  └─────────────┘  │  └────────────────────────────────────┘ │   │
│                   └─────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘

Current ReactFlow Canvas Features:
● = Canvas-enabled step (Steps 2, 4, 6)
  - postit-node (text post-its with colors, drag/drop)
  - Overlays: rings, empathy zones, journey map grid
  - Zustand store: postIts[], gridColumns[]
  - Auto-save to stepArtifacts.artifact._canvas
```

### Target Architecture (v1.3 — EzyDraw + Visual Canvases)

```
┌──────────────────────────────────────────────────────────────────┐
│                     WORKSHOP LAYOUT                              │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────────────────────────────┐   │
│  │  Sidebar    │  │      Main Area (Split Screen)           │   │
│  │             │  │                                         │   │
│  │  Step 8a ◉  │  │  ┌────────────────────────────────────┐ │   │
│  │  Step 8b ◉  │  │  │      StepContainer (Client)        │ │   │
│  │  Step 9  ◉  │  │  │                                    │ │   │
│  │             │  │  │  ┌──────────┐  ┌──────────────┐   │ │   │
│  │             │  │  │  │  Chat    │  │  ReactFlow   │   │ │   │
│  │             │  │  │  │  Panel   │  │  Canvas +    │   │ │   │
│  │             │  │  │  │          │  │  EzyDraw     │   │ │   │
│  │             │  │  │  └──────────┘  └──────────────┘   │ │   │
│  └─────────────┘  │  └────────────────────────────────────┘ │   │
│                   └─────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                                ↑
                    [EzyDraw Modal Overlay]
                    (Fullscreen, tldraw SDK)
```

**New Features:**
- ◉ = Steps with EzyDraw integration (8a, 8b, 9)
- **EzyDraw Modal:** Fullscreen drawing interface (tldraw SDK)
- **Drawing-Image Nodes:** Custom ReactFlow nodes displaying PNG exports with re-edit capability
- **Mind Map Nodes:** Connected graph nodes (ReactFlow + dagre layout)
- **Crazy 8s Grid:** 8-slot grid overlay on ReactFlow canvas
- **Concept Card Nodes:** Rich multi-section custom nodes

## Component Architecture

### EzyDraw Integration Layer

```
┌──────────────────────────────────────────────────────────────────┐
│                  EZYDRAW ARCHITECTURE                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            EzyDrawModal (Fullscreen Dialog)              │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │         <Tldraw /> Component (tldraw SDK)          │  │   │
│  │  │  - Drawing tools, shapes, UI kit elements         │  │   │
│  │  │  - State: TLDrawStore (internal to tldraw)        │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                          │   │
│  │  [Save] → Export JSON + PNG                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         ↓                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            drawingStore (Zustand)                        │   │
│  │  - drawings: DrawingData[]                               │   │
│  │  - saveDrawing(json, png) → stepArtifacts.drawings      │   │
│  │  - loadDrawing(id) → opens EzyDrawModal with state      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         ↓                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         canvasStore (Existing Zustand)                   │   │
│  │  - postIts: PostIt[] (existing)                          │   │
│  │  - NEW: addDrawingNode(drawingId, pngUrl, position)     │   │
│  │    → Creates image-node referencing drawing             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         ↓                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              ReactFlow Canvas                            │   │
│  │  - Renders drawing-image-node (custom node type)        │   │
│  │  - Double-click → reopens EzyDrawModal for re-edit      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Visual Canvas Layouts (Steps 8 & 9)

```
┌──────────────────────────────────────────────────────────────────┐
│                   VISUAL CANVAS TYPES                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. MIND MAP (Step 8a)                                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ReactFlow + dagre layout                                │   │
│  │  - Node type: mind-node (text + optional image)          │   │
│  │  - Edges: smooth connections                             │   │
│  │  - Layout: auto-positioned via dagre algorithm           │   │
│  │  - User actions: add child, edit text, delete            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  2. CRAZY 8s (Step 8b)                                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ReactFlow + 8-slot grid overlay                         │   │
│  │  - Grid: 2 rows × 4 cols (fixed layout)                  │   │
│  │  - Cell content: DrawingImageNode + title text           │   │
│  │  - Actions: "Draw in Slot 1-8" → opens EzyDraw modal     │   │
│  │  - Cell overlay: slot number, timer countdown (8 min)    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  3. CONCEPT CARDS (Step 9)                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ReactFlow with custom concept-card-node                 │   │
│  │  - Node sections:                                        │   │
│  │    1. Image area (from Step 8 drawing)                   │   │
│  │    2. Name + Elevator Pitch (text)                       │   │
│  │    3. USP (text)                                         │   │
│  │    4. SWOT grid (2×2 mini-grid with bullets)             │   │
│  │    5. Feasibility scores (5 horizontal bars)             │   │
│  │  - Card size: 400px × 600px (large custom node)          │   │
│  │  - Editing: inline text edit + AI auto-fill             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | Implementation Strategy |
|-----------|----------------|------------------------|
| **EzyDrawModal** | Fullscreen drawing interface, save/cancel controls | Dialog with `<Tldraw />` component, export JSON + PNG on save |
| **drawingStore** | Manage drawing state (create, save, load, delete) | NEW Zustand store, persists to `stepArtifacts.drawings[]` |
| **DrawingImageNode** | Custom ReactFlow node displaying PNG with re-edit button | Custom node type, double-click or button → reopens EzyDrawModal |
| **MindMapCanvas** | Step 8a: Interactive node graph with dagre layout | ReactFlow + `mind-node` type + dagre layout hook |
| **Crazy8sCanvas** | Step 8b: 8-slot grid with drawing slots | ReactFlow + CSS Grid overlay (similar to Journey Map) |
| **ConceptCardNode** | Step 9: Rich multi-section card node | Custom ReactFlow node with complex layout (image + text sections + SWOT grid) |
| **canvasStore** | MODIFIED: Add drawing node support alongside post-its | Add `addDrawingNode()`, extend PostIt type to support `drawingId` reference |

## Data Models

### Drawing Data Structure

```typescript
// NEW: Drawing data model
export interface DrawingData {
  id: string;                    // Unique drawing ID
  stepId: string;                // Which step owns this drawing
  createdAt: Date;
  updatedAt: Date;

  // Editable drawing state (tldraw JSON format)
  tldrawState: {
    document: any;               // Shapes, pages, layers
    session: any;                // Camera position, zoom
  };

  // Rendered output for display
  pngUrl: string;                // Data URL or uploaded image URL
  thumbnailUrl?: string;         // Smaller preview (100×100)

  // Metadata
  title?: string;                // Optional title (Crazy 8s slot label)
  slotNumber?: number;           // For Crazy 8s (1-8)
  parentNodeId?: string;         // For Mind Map (which node spawned this drawing)
}
```

### Extended Canvas Store Types

```typescript
// MODIFIED: Extend existing PostIt type
export type PostIt = {
  id: string;
  text: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  color?: PostItColor;
  parentId?: string;
  type?: 'postIt' | 'group' | 'drawing-image' | 'mind-node' | 'concept-card'; // NEW types

  // Existing metadata
  quadrant?: Quadrant;
  cellAssignment?: { row: string; col: string };
  isPreview?: boolean;
  previewReason?: string;

  // NEW: Drawing-specific metadata
  drawingId?: string;            // Links to DrawingData.id (for re-editing)
  imageUrl?: string;             // Direct image URL (for drawing-image nodes)

  // NEW: Mind Map-specific metadata
  mindMapData?: {
    isRoot: boolean;
    depth: number;               // Distance from root (for styling)
    children: string[];          // Child node IDs
  };

  // NEW: Concept Card-specific metadata
  conceptData?: {
    name: string;
    elevatorPitch: string;
    usp: string;
    swot: {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      risks: string[];
    };
    feasibility: {
      technical: number;         // 1-5 score
      operational: number;
      marketPotential: number;
      valueAdd: number;
      attractiveness: number;
    };
  };
};
```

### Step Artifacts Schema Extension

```typescript
// MODIFIED: stepArtifacts.artifact structure
interface StepArtifact {
  // Existing fields (unchanged)
  _canvas: {
    postIts: PostIt[];
    gridColumns: GridColumn[];
  };

  // NEW: Drawing storage
  drawings: DrawingData[];       // All drawings created in this step

  // Step-specific data (unchanged)
  [key: string]: any;
}

// Example: Step 8b (Crazy 8s) artifact
interface Step8bArtifact {
  _canvas: {
    postIts: PostIt[];           // 8 drawing-image nodes in grid
    gridColumns: [];             // Not used for Crazy 8s
  };
  drawings: DrawingData[];       // 8 drawings (one per slot)
  selectedIdeas: string[];       // IDs of drawings selected for Step 9
  completedAt?: string;
}

// Example: Step 9 (Concept Development) artifact
interface Step9Artifact {
  _canvas: {
    postIts: PostIt[];           // concept-card nodes
    gridColumns: [];
  };
  drawings: DrawingData[];       // Inherited from Step 8 + new sketches
  concepts: {
    id: string;
    sourceDrawingId: string;     // Links to Step 8 drawing
    ...conceptData               // From PostIt.conceptData
  }[];
  completedAt?: string;
}
```

## Data Flow: EzyDraw → Canvas → Persistence

### Flow 1: Create Drawing from Scratch

```
1. User clicks "Draw Idea" in Crazy 8s slot 1
   ↓
2. Open EzyDrawModal (fullscreen)
   - <Tldraw /> component initialized with blank canvas
   - User draws wireframe, adds shapes, text
   ↓
3. User clicks "Save" in modal
   ↓
4. Export tldraw state + PNG:
   - const snapshot = editor.getSnapshot()
   - const png = await editor.getSvg()?.toDataURL() // or toBlob
   ↓
5. drawingStore.saveDrawing(snapshot, png, metadata)
   - Generates drawing ID
   - Uploads PNG to storage (or saves as data URL)
   - Persists to stepArtifacts.drawings[]
   ↓
6. canvasStore.addDrawingNode(drawingId, pngUrl, slotPosition)
   - Creates PostIt with type: 'drawing-image'
   - Position calculated from slot number (Crazy 8s grid)
   - drawingId links to DrawingData for re-editing
   ↓
7. ReactFlow canvas re-renders
   - DrawingImageNode displays PNG
   - Shows slot label and timer
   ↓
8. Auto-save triggers
   - Updates stepArtifacts.artifact._canvas.postIts[]
   - Updates stepArtifacts.artifact.drawings[]
```

### Flow 2: Re-Edit Existing Drawing

```
1. User double-clicks DrawingImageNode on canvas
   ↓
2. canvasStore finds PostIt.drawingId
   ↓
3. drawingStore.loadDrawing(drawingId)
   - Retrieves DrawingData from stepArtifacts.drawings[]
   - Extracts tldrawState (JSON snapshot)
   ↓
4. Open EzyDrawModal with existing state
   - editor.loadSnapshot(tldrawState)
   - User sees previous drawing, can edit
   ↓
5. User clicks "Save" after changes
   ↓
6. Export NEW snapshot + PNG
   ↓
7. drawingStore.updateDrawing(drawingId, newSnapshot, newPng)
   - Updates DrawingData.tldrawState
   - Updates DrawingData.pngUrl
   - Increments updatedAt timestamp
   ↓
8. canvasStore.updatePostIt(postItId, { imageUrl: newPngUrl })
   - ReactFlow node updates to show new image
   ↓
9. Auto-save persists changes
```

### Flow 3: Mind Map Node Creation

```
1. User clicks "Add Child Node" on Mind Map root
   ↓
2. canvasStore.addPostIt({ type: 'mind-node', parentId: rootId, ... })
   - Creates new node with empty text
   - mindMapData: { isRoot: false, depth: 1, children: [] }
   ↓
3. dagre layout recalculates positions
   - useLayoutNodes hook runs
   - Updates all node positions to maintain tree structure
   ↓
4. canvasStore.updatePostIt() applies new positions
   ↓
5. ReactFlow edge created automatically
   - Edge connects parent → child
   - Smooth curve styling
   ↓
6. User edits node text inline
   - Direct text editing (like post-it-node)
   ↓
7. Auto-save persists mind map structure
```

### Flow 4: Concept Card Auto-Generation (Step 9)

```
1. User selects 1-3 drawings from Crazy 8s
   ↓
2. AI generates concept sheet per drawing
   - Context: drawing image (vision API), persona, HMW statement
   - Output: name, elevator pitch, USP, SWOT, feasibility scores
   ↓
3. canvasStore.addPostIt({ type: 'concept-card', conceptData: {...}, drawingId })
   - Large node (400×600px)
   - Position: dealing-cards offset
   ↓
4. ConceptCardNode renders sections:
   - Top: Image from drawing (embedded <img>)
   - Middle: Text sections (editable contentEditable)
   - Bottom-left: SWOT 2×2 mini-grid
   - Bottom-right: Feasibility score bars
   ↓
5. User edits inline or clicks "Improve Pitch" → AI assists
   ↓
6. Auto-save persists concept data to stepArtifacts.artifact.concepts[]
```

## Recommended Project Structure

```
src/
├── components/
│   ├── canvas/                        # EXISTING canvas infrastructure
│   │   ├── react-flow-canvas.tsx     # MODIFIED: Add new node types
│   │   ├── post-it-node.tsx          # EXISTING
│   │   ├── drawing-image-node.tsx    # NEW: PNG display with re-edit
│   │   ├── mind-node.tsx             # NEW: Mind map node type
│   │   ├── concept-card-node.tsx     # NEW: Rich concept card
│   │   ├── crazy8s-overlay.tsx       # NEW: 8-slot grid overlay
│   │   └── canvas-toolbar.tsx        # MODIFIED: Add "Draw" button
│   ├── ezydraw/                       # NEW: Drawing components
│   │   ├── ezydraw-modal.tsx         # Fullscreen tldraw dialog
│   │   ├── ezydraw-toolbar.tsx       # Custom toolbar for tldraw
│   │   └── drawing-thumbnail.tsx     # Preview component
│   └── workshop/
│       ├── step-container.tsx        # EXISTING
│       ├── chat-panel.tsx            # EXISTING
│       └── output-panel.tsx          # EXISTING
├── stores/
│   ├── canvas-store.ts               # MODIFIED: Add drawing node support
│   ├── drawing-store.ts              # NEW: Drawing state management
│   └── workshop-store.ts             # EXISTING
├── hooks/
│   ├── use-canvas-autosave.ts        # EXISTING
│   ├── use-layout-nodes.ts           # NEW: dagre layout hook for Mind Map
│   └── use-drawing.ts                # NEW: Drawing create/edit/save hook
├── lib/
│   ├── canvas/
│   │   ├── step-canvas-config.ts     # MODIFIED: Add Step 8a, 8b, 9 configs
│   │   ├── grid-layout.ts            # EXISTING (reuse for Crazy 8s)
│   │   └── mind-map-layout.ts        # NEW: dagre integration
│   ├── drawing/
│   │   ├── tldraw-export.ts          # NEW: Export PNG/JSON helpers
│   │   └── image-upload.ts           # NEW: Upload PNG to storage
│   └── ai/
│       └── context-assembly.ts       # MODIFIED: Include drawings in context
├── app/
│   └── api/
│       ├── canvas/
│       │   └── sync/route.ts         # EXISTING
│       └── drawings/                  # NEW: Drawing persistence
│           ├── save/route.ts         # Save drawing JSON + PNG
│           └── [id]/route.ts         # Load drawing by ID
└── db/
    └── schema/
        └── step-artifacts.ts          # EXISTING (no schema change needed)
```

### Structure Rationale

- **components/ezydraw/:** Isolated drawing UI components, no coupling to canvas logic
- **stores/drawing-store.ts:** Separate domain (drawing lifecycle) from canvas state
- **lib/drawing/:** Drawing-specific utilities (export, upload) separate from canvas
- **api/drawings/:** Dedicated API routes for drawing persistence (separate from canvas sync)
- **Mind Map layout logic:** New `lib/canvas/mind-map-layout.ts` for dagre integration

## Architectural Patterns

### Pattern 1: Drawing as Dual-State (JSON + PNG)

**What:** Store both editable drawing state (tldraw JSON) AND rendered output (PNG) for each drawing.

**When to use:** Applications where users need to re-edit drawings (not just view them).

**Trade-offs:**
- PRO: Re-editable drawings (click to open in EzyDraw modal, modify, save)
- PRO: Fast rendering on canvas (display PNG, don't re-render tldraw)
- PRO: Fallback if tldraw schema changes (PNG is stable)
- CON: Storage overhead (~50-200KB JSON + 20-100KB PNG per drawing)
- CON: Must keep JSON and PNG in sync (update both on save)

**Example:**
```typescript
// Save drawing with both states
async function saveDrawing(editor: Editor, metadata: Partial<DrawingData>) {
  const snapshot = editor.getSnapshot(); // Editable JSON state
  const svg = await editor.getSvg();
  const png = await svgToDataURL(svg);   // Rendered PNG

  const drawing: DrawingData = {
    id: crypto.randomUUID(),
    tldrawState: snapshot,               // For re-editing
    pngUrl: png,                          // For display
    ...metadata,
  };

  await fetch('/api/drawings/save', {
    method: 'POST',
    body: JSON.stringify(drawing),
  });
}
```

### Pattern 2: ReactFlow Node as Proxy to Drawing State

**What:** ReactFlow nodes store only `drawingId` reference, not full drawing data. Full data lives in `stepArtifacts.drawings[]`.

**When to use:** Large embedded objects (drawings, images) that shouldn't duplicate in canvas node array.

**Trade-offs:**
- PRO: Smaller canvas state (PostIt array doesn't bloat with drawing data)
- PRO: Single source of truth for drawing state
- PRO: Easy to sync drawing updates (update drawings[], canvas nodes re-render)
- CON: Requires lookup to render (node → drawingId → drawings[])
- CON: Slightly more complex data loading on canvas mount

**Example:**
```typescript
// Drawing-image node stores only ID and URL
const drawingImageNode: PostIt = {
  id: 'node-123',
  type: 'drawing-image',
  drawingId: 'drawing-456',              // Reference to DrawingData
  imageUrl: drawingData.pngUrl,          // Cached for fast render
  position: { x: 100, y: 100 },
  width: 200,
  height: 200,
};

// To re-edit: lookup full state
function handleEditDrawing(nodeId: string) {
  const node = canvasStore.postIts.find(p => p.id === nodeId);
  const drawing = artifact.drawings.find(d => d.id === node.drawingId);
  openEzyDrawModal(drawing.tldrawState);
}
```

### Pattern 3: Modal-Based Drawing Editor (Not Inline)

**What:** Drawing happens in fullscreen modal overlay, not embedded in canvas panel.

**When to use:** Complex editing interfaces (drawing tools) that need full screen real estate.

**Trade-offs:**
- PRO: Dedicated focus (no distractions from chat panel, canvas clutter)
- PRO: Larger canvas for detailed drawing
- PRO: Clear save/cancel workflow (modal controls)
- CON: Context switching (user leaves canvas view temporarily)
- CON: Mobile UX challenge (fullscreen modals on small screens)

**Example:**
```typescript
// EzyDrawModal is a Dialog component
<Dialog open={isDrawing} onOpenChange={setIsDrawing} modal>
  <DialogContent className="max-w-[100vw] max-h-[100vh] p-0">
    <Tldraw
      persistenceKey={`drawing-${drawingId}`}
      onMount={(editor) => {
        if (existingDrawing) {
          editor.loadSnapshot(existingDrawing.tldrawState);
        }
      }}
    />
    <DialogFooter>
      <Button onClick={handleSave}>Save</Button>
      <Button onClick={handleCancel}>Cancel</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Pattern 4: Auto-Layout with dagre for Mind Maps

**What:** Use dagre algorithm to automatically position mind map nodes in tree structure.

**When to use:** Node graphs with hierarchical parent-child relationships (mind maps, org charts).

**Trade-offs:**
- PRO: Automatic spacing and alignment (no manual positioning)
- PRO: Scales to large graphs (dagre handles 100+ nodes)
- PRO: Maintains tree structure on add/delete
- CON: Limited control over exact placement (algorithm decides)
- CON: Animations can be jarring if many nodes re-position

**Example:**
```typescript
// useLayoutNodes hook (auto-run on node/edge changes)
import dagre from '@dagrejs/dagre';

function useLayoutNodes(nodes: Node[], edges: Edge[]) {
  return useMemo(() => {
    const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'TB' }); // Top-to-bottom

    nodes.forEach(node => g.setNode(node.id, { width: 150, height: 50 }));
    edges.forEach(edge => g.setEdge(edge.source, edge.target));

    dagre.layout(g);

    return nodes.map(node => {
      const { x, y } = g.node(node.id);
      return { ...node, position: { x: x - 75, y: y - 25 } };
    });
  }, [nodes, edges]);
}
```

### Pattern 5: Grid Overlay for Fixed Layouts (Crazy 8s)

**What:** Render CSS Grid overlay on ReactFlow canvas with fixed cells, constrain nodes to cells.

**When to use:** Fixed-slot layouts (Crazy 8s, Bingo grids, calendar views).

**Trade-offs:**
- PRO: Familiar pattern (already used in Journey Map)
- PRO: Visual guidance for users (clear slot boundaries)
- PRO: Snap-to-cell positioning
- CON: Not truly freeform canvas (locked to grid)
- CON: Responsive challenges (grid resizing on small screens)

**Example:**
```typescript
// Crazy8sCanvas with 8-slot grid overlay
const CRAZY8S_GRID = {
  rows: [
    { id: 'row-1', label: 'Row 1', height: 300 },
    { id: 'row-2', label: 'Row 2', height: 300 },
  ],
  columns: [
    { id: 'col-1', label: 'Slot 1', width: 300 },
    { id: 'col-2', label: 'Slot 2', width: 300 },
    { id: 'col-3', label: 'Slot 3', width: 300 },
    { id: 'col-4', label: 'Slot 4', width: 300 },
  ],
};

// Overlay component (similar to GridOverlay)
<ReactFlow nodes={nodes} edges={[]}>
  <Crazy8sGridOverlay config={CRAZY8S_GRID} />
</ReactFlow>
```

## Integration Points

### New vs Modified Components

| Component | Status | Changes |
|-----------|--------|---------|
| **react-flow-canvas.tsx** | MODIFIED | Add node types: `drawing-image`, `mind-node`, `concept-card` |
| **canvas-store.ts** | MODIFIED | Extend PostIt type, add `addDrawingNode()` method |
| **step-canvas-config.ts** | MODIFIED | Add configs for Steps 8a (mind map), 8b (Crazy 8s), 9 (concept cards) |
| **canvas-toolbar.tsx** | MODIFIED | Add "Draw" button (opens EzyDrawModal) |
| **context-assembly.ts** | MODIFIED | Include drawings in AI context (vision API for concept analysis) |
| **EzyDrawModal** | NEW | Fullscreen tldraw dialog |
| **drawingStore** | NEW | Zustand store for drawing lifecycle |
| **DrawingImageNode** | NEW | Custom ReactFlow node for PNG display |
| **MindNode** | NEW | Custom ReactFlow node for mind map |
| **ConceptCardNode** | NEW | Custom ReactFlow node for concept sheets |
| **Crazy8sGridOverlay** | NEW | CSS Grid overlay for 8 slots |
| **useLayoutNodes** | NEW | Hook for dagre auto-layout |
| **/api/drawings/save** | NEW | Persist drawing JSON + PNG |

### External Dependencies

| Dependency | Purpose | Integration Notes |
|------------|---------|-------------------|
| **tldraw SDK** | Drawing canvas, tools, export | Install `tldraw` package (~500KB bundle), use `<Tldraw />` component |
| **@dagrejs/dagre** | Mind map layout algorithm | Install `@dagrejs/dagre`, integrate with ReactFlow layout hook |
| **ReactFlow** | EXISTING | Add new custom node types (no version change needed) |
| **Zustand** | EXISTING | Add drawingStore (same pattern as canvasStore) |
| **shadcn/ui Dialog** | EXISTING | Use for EzyDrawModal wrapper |

### Build Order (Dependency Graph)

```
Phase 1: EzyDraw Foundation
1. Install tldraw SDK
2. drawingStore (Zustand)
   └─> Drawing lifecycle (create, save, load, update, delete)
3. EzyDrawModal component
   └─> Fullscreen Dialog + <Tldraw /> integration
4. /api/drawings/save API route
   └─> Persist drawing JSON + PNG to stepArtifacts.drawings[]

Phase 2: Drawing → Canvas Integration
5. DrawingImageNode (custom ReactFlow node)
   └─> Display PNG, double-click to re-edit
6. canvasStore modifications
   └─> addDrawingNode(), extend PostIt type
7. canvas-toolbar.tsx modification
   └─> Add "Draw" button
8. End-to-end test: Draw → Save → Display → Re-edit

Phase 3: Mind Map Canvas (Step 8a)
9. Install @dagrejs/dagre
10. MindNode (custom ReactFlow node)
    └─> Text node with parent/child metadata
11. useLayoutNodes hook
    └─> dagre integration for auto-positioning
12. step-canvas-config.ts: Add Step 8a config
13. Mind map interactions: add child, edit text, delete node

Phase 4: Crazy 8s Canvas (Step 8b)
14. Crazy8sGridOverlay component
    └─> 2×4 grid with slot labels
15. step-canvas-config.ts: Add Step 8b config
16. "Draw in Slot X" workflow
    └─> Opens EzyDrawModal with slot metadata
17. Timer integration (8 minutes countdown)

Phase 5: Concept Cards (Step 9)
18. ConceptCardNode (custom ReactFlow node)
    └─> Complex multi-section layout
19. SWOT mini-grid component
20. Feasibility score bars component
21. AI auto-generation integration
    └─> Generate concept data from drawing + context
22. Inline editing for concept fields
```

**Total estimated effort:** 15-20 plans across 5 phases

**Critical path:** Phase 1 → Phase 2 (drawing foundation must exist before canvas integration)

**Parallel work opportunities:**
- Phase 3, 4, 5 can overlap once Phase 2 complete (different canvas types)

## Data Flow Diagrams

### Drawing Creation Flow

```
User Action                Drawing State              Canvas State              Database
───────────                ──────────────             ────────────              ────────

"Draw Idea"
    ↓
Open EzyDrawModal
    ↓
Draw wireframe
    ↓
Click "Save"
    ↓
Export JSON + PNG
    ↓                           ↓
                    drawingStore.saveDrawing()
                                ↓                         ↓
                    POST /api/drawings/save    →  stepArtifacts.drawings[]
                                ↓
                    return drawingId
                                ↓                         ↓
                    canvasStore.addDrawingNode()  →  stepArtifacts._canvas.postIts[]
                                                          ↓
Canvas renders
DrawingImageNode
```

### Re-Edit Flow

```
Double-click node
    ↓
Get node.drawingId
    ↓                           ↓
                    drawingStore.loadDrawing(id)
                                ↓                                     ↓
                    Read stepArtifacts.drawings[id]  ←────  Database query
                                ↓
                    Load tldrawState
                                ↓
Open EzyDrawModal
with existing state
    ↓
Edit drawing
    ↓
Click "Save"
    ↓
Export NEW JSON + PNG
    ↓                           ↓
                    drawingStore.updateDrawing(id)
                                ↓                                     ↓
                    Update stepArtifacts.drawings[id]  ─→  Database update
                                ↓                         ↓
                    canvasStore.updatePostIt(nodeId)  →  Update imageUrl
                                                          ↓
Canvas re-renders
with new image
```

### Mind Map Node Addition

```
Click "Add Child"
on root node
    ↓
canvasStore.addPostIt()
    ↓
New mind-node created
    ↓
useLayoutNodes() runs
    ↓
dagre calculates positions
    ↓
canvasStore.updatePostIt()
for ALL nodes (new positions)
    ↓
ReactFlow updates nodes + edges
    ↓
Auto-save triggers
    ↓                                                                 ↓
stepArtifacts._canvas.postIts[]  ─────────────────────→  Database update
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-100 users (v1.3 MVP)** | Current architecture sufficient. tldraw in-memory, PNG as data URLs, dagre client-side. |
| **100-1k users (MMP)** | Upload PNGs to object storage (S3/Cloudflare R2) instead of data URLs. Add image optimization (resize, compress). Consider drawing state compression (gzip JSON before storing). |
| **1k-10k users (FFP)** | Separate drawings table (not in stepArtifacts JSONB). Add versioning (keep drawing history). Implement lazy loading (load drawings on-demand, not all at once). Consider serverless image processing. |

### Scaling Priorities

1. **First bottleneck: PNG data URL size in artifacts**
   - **Symptom:** stepArtifacts exceeds reasonable JSONB size (> 1MB)
   - **Fix:** Upload PNG to object storage, store URL instead of data URL

2. **Second bottleneck: tldraw bundle size (500KB)**
   - **Symptom:** Slow page load on Steps 8 & 9
   - **Fix:** Dynamic import EzyDrawModal only when needed, code split tldraw SDK

3. **Third bottleneck: dagre layout performance with 100+ nodes**
   - **Symptom:** Lag when adding/removing mind map nodes
   - **Fix:** Debounce layout recalculation, use web worker for dagre computation

## Anti-Patterns

### Anti-Pattern 1: Embedding tldraw Directly in ReactFlow Node

**What people do:** Render `<Tldraw />` component inside a custom ReactFlow node for inline editing.

**Why it's wrong:**
- tldraw requires significant screen space (not practical in 200×200px node)
- Multiple tldraw instances = memory bloat (each has its own editor state)
- Coordinate system conflicts (ReactFlow zoom vs tldraw zoom)

**Do this instead:** Use modal overlay for drawing (fullscreen), display PNG in ReactFlow node.

### Anti-Pattern 2: Storing Only PNG (No Editable State)

**What people do:** Export drawing to PNG, discard tldraw JSON, save only image.

**Why it's wrong:**
- Loses re-edit capability (can't modify drawing after creation)
- Forces users to redraw from scratch if changes needed
- Misses key product value (iterative design)

**Do this instead:** Store BOTH tldraw JSON (for re-editing) AND PNG (for display). Accept storage overhead.

### Anti-Pattern 3: Real-Time Mind Map Collaboration in MVP

**What people do:** Implement WebSocket sync for mind map node updates before multiplayer needed.

**Why it's wrong:**
- MVP is single-user (no concurrent editing)
- Adds complexity (conflict resolution, presence indicators)
- dagre layout conflicts (two users moving same nodes)

**Do this instead:** Use debounced auto-save (same as post-it canvas). Defer real-time to FFP.

### Anti-Pattern 4: Complex Custom Drawing Tools

**What people do:** Build custom drawing tools from scratch instead of using tldraw SDK.

**Why it's wrong:**
- Months of dev time (drawing tools are complex: undo/redo, layers, selection, transforms)
- Missing features (tldraw has 100+ tools, shapes, keyboard shortcuts)
- Maintenance burden (every new feature = custom implementation)

**Do this instead:** Use tldraw SDK. It's production-ready, well-maintained, and extensible.

### Anti-Pattern 5: Forcing Nodes into Crazy 8s Grid

**What people do:** Prevent users from placing nodes outside grid cells (strict cell locking).

**Why it's wrong:**
- Removes flexibility (what if user wants annotation outside grid?)
- Frustrating UX (drag gets blocked at cell boundary)
- Breaks freeform ideation spirit

**Do this instead:** Grid is visual guide, not hard constraint. Snap to cell on drop, but allow override.

## Responsive Considerations

### Mobile Layout Challenges

| Feature | Desktop | Mobile (< 768px) |
|---------|---------|------------------|
| **EzyDrawModal** | Fullscreen (1920×1080) | Fullscreen (390×844), larger touch targets |
| **Drawing Tools** | Mouse/trackpad | Touch gestures (pinch-zoom, two-finger pan) |
| **Mind Map** | Dagre layout optimized for wide view | Vertical orientation (rankdir: 'TB' → 'LR') |
| **Crazy 8s Grid** | 2 rows × 4 cols | Stack to 4 rows × 2 cols (portrait) |
| **Concept Cards** | 400×600px nodes | 300×450px nodes (smaller, scrollable) |

### Mobile-Specific Adjustments

```typescript
// EzyDrawModal: Increase touch target size
const isMobile = useMediaQuery('(max-width: 768px)');

<Tldraw
  components={{
    Toolbar: isMobile ? MobileToolbar : DesktopToolbar,
  }}
  options={{
    // Increase minimum touch target size
    minimumNodeSize: isMobile ? 48 : 24,
  }}
/>

// Crazy 8s: Responsive grid
const crazy8sConfig = useMemo(() => ({
  rows: isMobile
    ? [{ id: 'r1', height: 200 }, { id: 'r2', height: 200 }, ...]  // 4 rows
    : [{ id: 'r1', height: 300 }, { id: 'r2', height: 300 }],      // 2 rows
  columns: isMobile
    ? [{ id: 'c1', width: 180 }, { id: 'c2', width: 180 }]         // 2 cols
    : [{ id: 'c1', width: 300 }, ..., { id: 'c4', width: 300 }],  // 4 cols
}), [isMobile]);
```

## Sources

### Drawing Libraries (HIGH confidence)
- [tldraw: Infinite Canvas SDK for React](https://tldraw.dev/)
- [tldraw Persistence Documentation](https://tldraw.dev/docs/persistence)
- [tldraw Save and Load Snapshots](https://tldraw.dev/examples/snapshots)
- [Embedding Excalidraw in ReactFlow Node Discussion](https://github.com/xyflow/xyflow/discussions/4778)
- [Top 5 JavaScript Whiteboard & Canvas Libraries](https://byby.dev/js-whiteboard-libs)
- [Excalidraw vs tldraw Comparison](https://slashdot.org/software/comparison/Excalidraw-vs-tldraw/)

### ReactFlow Integration (HIGH confidence)
- [ReactFlow Custom Nodes Documentation](https://reactflow.dev/learn/customization/custom-nodes)
- [ReactFlow Mind Map Tutorial](https://reactflow.dev/learn/tutorials/mind-map-app-with-react-flow)
- [ReactFlow Dagre Layout Example](https://reactflow.dev/examples/layout/dagre)
- [Drawing on ReactFlow Canvas Discussion](https://github.com/xyflow/xyflow/discussions/1492)

### Layout Algorithms (HIGH confidence)
- [dagre.js Graph Layout Library](https://github.com/dagrejs/dagre)
- [ReactFlow Auto Layout Examples](https://reactflow.dev/examples/layout/auto-layout)
- [Building Complex Diagrams with ReactFlow and dagre](https://dtoyoda10.medium.com/building-complex-graph-diagrams-with-react-flow-elk-js-and-dagre-js-8832f6a461c5)

### State Management & Persistence (MEDIUM confidence)
- [Konva Save and Load Best Practices](https://konvajs.org/docs/data_and_serialization/Best_Practices.html)
- [Canvas Export with react-konva](https://konvajs.org/docs/react/Canvas_Export.html)
- [React Canvas State Persistence Guide](https://www.dhiwise.com/post/designing-stunning-artwork-with-react-canvas-draw)

### Design Patterns (MEDIUM confidence)
- [SWOT Analysis Grid Templates 2026](https://www.superside.com/blog/swot-analysis-templates)
- [Crazy 8s Ideation Technique](https://miro.com/templates/crazy-eights/)
- [React Modal Dialog Best Practices](https://www.developerway.com/posts/hard-react-questions-and-modal-dialog)

---

**Last updated:** 2026-02-12
**Confidence:** HIGH on drawing integration architecture, HIGH on ReactFlow patterns, MEDIUM on mobile touch optimization
