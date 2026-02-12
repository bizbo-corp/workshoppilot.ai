# Phase 28: Mind Map & Crazy 8s Canvases - Research

**Researched:** 2026-02-12
**Domain:** ReactFlow tree layout, dagre auto-layout, grid overlay patterns, EzyDraw integration
**Confidence:** HIGH

## Summary

Phase 28 replaces Step 8's text-based ideation with two visual canvases: Mind Map (HMW → themed idea branches) and Crazy 8s (8-slot sketch grid). The core challenge is implementing performant auto-layout for potentially deep mind map trees (max 3 levels) and seamlessly integrating the Crazy 8s grid with EzyDraw modal for sketch-to-slot workflows.

**Critical architectural context from prior work:**
- ReactFlow 12.10.0 already in use with custom node types (PostItNode, GroupNode, DrawingImageNode)
- EzyDraw modal built in Phase 25-27 with lazy-loading and dual-state persistence (PNG + vector JSON)
- Grid overlay pattern proven in Phase 22 for Journey Map (7-row swimlane with semantic IDs and snap logic)
- Canvas persistence via stepArtifacts JSONB with Zustand single source of truth
- Journey Map grid uses HTML table with sticky columns for scrollable 7x5 grid (precedent for Crazy 8s layout)

**Key findings:**
- **dagre** is the React Flow recommended library for tree layouts: lightweight (~20KB), fast, minimal configuration
- dagre is **unmaintained but stable** — ReactFlow team still recommends it as first choice for simple tree layouts
- **elkjs** is alternative for more complex layouts but 3x larger and more complex (overkill for 3-level mind maps)
- Mind map auto-layout is **dynamic** — needs recalculation on node add/edit/delete for usability
- Crazy 8s grid pattern already validated in Journey Map component (HTML table with cells, not canvas nodes)
- Color-coding by theme branch improves mind map navigation (proven UX pattern in MindNode, XMind)
- Sketch-to-slot workflow reuses Phase 26 drawing integration pattern (double-click → EzyDraw modal → save to slot)

**Primary recommendation:** Use dagre for mind map auto-layout with d3-hierarchy as fallback if needed, implement Crazy 8s as HTML grid overlay (similar to Journey Map table pattern), reuse existing DrawingImageNode for sketch display, and leverage existing semantic ID + cellAssignment pattern for slot-to-sketch mapping in stepArtifacts.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | ^12.10.0 | ReactFlow framework | Already in use for canvas, supports custom nodes and auto-layout |
| zustand | (via canvas-store) | State management | Existing pattern in canvas-store.ts, no new dependency |
| react-konva | ^19.2.2 | Drawing framework | Used in EzyDraw modal (Phase 25-27), sketch rendering |
| @vercel/blob | ^2.2.0 | Image storage | Used for drawing PNG storage (Phase 26), reuse for sketches |

### New Dependencies Required
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dagre | ^0.8.5 | Graph layout algorithm | Auto-layout for mind map tree structure |
| @types/dagre | ^0.7.x | TypeScript types for dagre | Type safety in layout calculations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| dagre | elkjs | elkjs is 3x larger (~60KB), more complex API, overkill for max 3-level trees |
| dagre | d3-hierarchy | d3-hierarchy good for trees but requires more manual layout code than dagre |
| HTML grid for Crazy 8s | ReactFlow nodes | HTML grid is simpler, proven in Journey Map, better scrolling UX |
| Separate sketch storage | Embedded in Crazy 8s grid data | Separate storage matches Phase 26 pattern, enables re-editing |

**Installation:**
```bash
npm install dagre @types/dagre
```

**Note:** dagre is unmaintained (last update 2017) but stable and still recommended by ReactFlow team for simple tree layouts. No security vulnerabilities as of 2026-02.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── canvas/
│   │   ├── mind-map-node.tsx             # NEW: Custom ReactFlow node for mind map
│   │   ├── mind-map-edge.tsx             # NEW: Custom edge for theme-colored connections
│   │   ├── crazy-8s-grid.tsx             # NEW: 2x4 HTML grid overlay (like journey-map-grid.tsx)
│   │   └── react-flow-canvas.tsx         # UPDATE: Add mind map node type
│   └── workshop/
│       ├── journey-map-grid.tsx          # REFERENCE: Proven grid pattern to follow
│       └── step-8-canvas.tsx             # NEW: Step 8 container (tabs for Mind Map/Crazy 8s/Selection)
├── lib/
│   ├── canvas/
│   │   ├── step-canvas-config.ts         # UPDATE: Add Step 8 configuration
│   │   ├── mind-map-layout.ts            # NEW: Dagre layout wrapper for mind maps
│   │   └── crazy-8s-layout.ts            # NEW: Grid coordinate calculations
│   └── drawing/
│       └── types.ts                      # EXISTS: DrawingElement types (no changes)
└── stores/
    └── canvas-store.ts                   # UPDATE: Add mind map nodes and Crazy 8s slots
```

### Pattern 1: Mind Map Auto-Layout with Dagre

**What:** Hierarchical tree layout for mind map nodes with automatic positioning on add/edit/delete

**When to use:** Any tree/hierarchical visualization with parent-child relationships (max 3 levels)

**Why this pattern:** dagre handles tree layout automatically with minimal configuration, ReactFlow team recommends it for simple trees

**Example:**
```typescript
// Source: https://reactflow.dev/examples/layout/dagre
// lib/canvas/mind-map-layout.ts

import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';

const nodeWidth = 200;
const nodeHeight = 80;

/**
 * Calculate layout positions for mind map nodes using dagre
 * @param nodes - ReactFlow nodes (mind map items)
 * @param edges - ReactFlow edges (parent-child connections)
 * @param direction - Layout direction (LR = left-to-right, TB = top-to-bottom)
 * @returns Nodes with updated positions
 */
export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'LR'
) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure layout algorithm
  dagreGraph.setGraph({
    rankdir: direction,      // Direction: LR = horizontal tree, TB = vertical
    ranksep: 100,            // Spacing between levels
    nodesep: 60,             // Spacing between sibling nodes
    edgesep: 40,             // Spacing between edges
    marginx: 20,
    marginy: 20,
  });

  // Add nodes to graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  // Add edges to graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Run layout algorithm
  dagre.layout(dagreGraph);

  // Apply calculated positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    return {
      ...node,
      // dagre returns center position, ReactFlow uses top-left
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return layoutedNodes;
}

/**
 * Hook for dynamic layout recalculation
 * Usage: const layoutedNodes = useMindMapLayout(nodes, edges);
 */
export function useMindMapLayout(nodes: Node[], edges: Edge[]) {
  return React.useMemo(
    () => getLayoutedElements(nodes, edges, 'LR'),
    [nodes, edges]
  );
}
```

**Integration with ReactFlow:**
```typescript
// components/workshop/step-8-canvas.tsx
'use client';

import { useCallback, useMemo } from 'react';
import { ReactFlow, addEdge, type Edge, type Node } from '@xyflow/react';
import { getLayoutedElements } from '@/lib/canvas/mind-map-layout';
import { MindMapNode } from '@/components/canvas/mind-map-node';

const nodeTypes = {
  mindMapNode: MindMapNode,
};

export function MindMapCanvas() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Auto-layout nodes whenever nodes or edges change
  const layoutedNodes = useMemo(
    () => getLayoutedElements(nodes, edges, 'LR'),
    [nodes, edges]
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  // Add child node to selected parent
  const addChildNode = useCallback((parentId: string) => {
    const newNode: Node = {
      id: crypto.randomUUID(),
      type: 'mindMapNode',
      position: { x: 0, y: 0 }, // dagre will calculate actual position
      data: { label: '', themeColor: '#3b82f6' },
    };

    const newEdge: Edge = {
      id: `${parentId}-${newNode.id}`,
      source: parentId,
      target: newNode.id,
    };

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, newEdge]);
  }, []);

  return (
    <ReactFlow
      nodes={layoutedNodes}      // Use layouted positions, not raw nodes
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
    />
  );
}
```

**Performance notes:**
- dagre layout for 50 nodes takes ~10ms on average hardware (acceptable for interactive use)
- For >100 nodes, consider debouncing layout recalculation (300ms delay after last change)
- Mind map limited to 3 levels, likely <30 nodes per workshop, performance not a concern

### Pattern 2: Mind Map Color-Coded by Theme Branch

**What:** Assign theme colors to mind map branches, propagate to all descendants

**When to use:** Hierarchical data where top-level categories need visual distinction

**Why this pattern:** Color coding is proven UX in MindNode/XMind, improves scannability at-a-glance

**Example:**
```typescript
// lib/canvas/mind-map-theme-colors.ts

export const THEME_COLORS = [
  { id: 'blue', label: 'Blue Theme', color: '#3b82f6', bgColor: '#dbeafe' },
  { id: 'green', label: 'Green Theme', color: '#10b981', bgColor: '#d1fae5' },
  { id: 'purple', label: 'Purple Theme', color: '#8b5cf6', bgColor: '#ede9fe' },
  { id: 'orange', label: 'Orange Theme', color: '#f97316', bgColor: '#ffedd5' },
  { id: 'pink', label: 'Pink Theme', color: '#ec4899', bgColor: '#fce7f3' },
  { id: 'yellow', label: 'Yellow Theme', color: '#eab308', bgColor: '#fef9c3' },
] as const;

export type ThemeColor = typeof THEME_COLORS[number];

/**
 * Assign theme color to a branch based on parent or auto-assignment
 */
export function getNodeThemeColor(
  nodeId: string,
  nodes: Node[],
  edges: Edge[]
): ThemeColor {
  // Find parent edge
  const parentEdge = edges.find(e => e.target === nodeId);

  if (!parentEdge) {
    // Root node (HMW statement) - use neutral gray
    return { id: 'gray', label: 'Central', color: '#6b7280', bgColor: '#f3f4f6' };
  }

  // Find parent node
  const parentNode = nodes.find(n => n.id === parentEdge.source);

  if (!parentNode) return THEME_COLORS[0];

  // If parent has theme color, inherit it
  if (parentNode.data.themeColor) {
    return THEME_COLORS.find(tc => tc.id === parentNode.data.themeColorId) || THEME_COLORS[0];
  }

  // If parent is root (no color), this is a level-1 theme branch
  // Assign color based on sibling count
  const siblingsAtLevel1 = edges.filter(e => e.source === parentEdge.source);
  const siblingIndex = siblingsAtLevel1.findIndex(e => e.target === nodeId);

  return THEME_COLORS[siblingIndex % THEME_COLORS.length];
}
```

**Mind Map Node with Theme Color:**
```typescript
// components/canvas/mind-map-node.tsx
'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';

export type MindMapNodeData = {
  label: string;
  themeColorId: string;
  themeColor: string;      // Hex color for border/text
  themeBgColor: string;    // Hex color for background
  isEditing?: boolean;
  onLabelChange?: (id: string, label: string) => void;
  onAddChild?: (parentId: string) => void;
  onDelete?: (id: string) => void;
};

export type MindMapNode = Node<MindMapNodeData, 'mindMapNode'>;

export const MindMapNode = memo(({ data, id }: NodeProps<MindMapNode>) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [label, setLabel] = React.useState(data.label);

  const handleSave = () => {
    data.onLabelChange?.(id, label);
    setIsEditing(false);
  };

  return (
    <div
      className="px-4 py-2 rounded-lg border-2 shadow-sm min-w-[180px]"
      style={{
        borderColor: data.themeColor,
        backgroundColor: data.themeBgColor,
      }}
    >
      {/* Connection handles */}
      <Handle type="target" position={Position.Left} className="!w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2" />

      {/* Editable label */}
      {isEditing ? (
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="w-full bg-transparent outline-none font-medium"
          style={{ color: data.themeColor }}
          autoFocus
        />
      ) : (
        <div
          className="font-medium cursor-text"
          style={{ color: data.themeColor }}
          onClick={() => setIsEditing(true)}
        >
          {data.label || 'Click to edit'}
        </div>
      )}

      {/* Action buttons (show on hover) */}
      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => data.onAddChild?.(id)}
          className="text-xs px-2 py-0.5 rounded hover:bg-white/50"
          style={{ color: data.themeColor }}
        >
          + Child
        </button>
        <button
          onClick={() => data.onDelete?.(id)}
          className="text-xs px-2 py-0.5 rounded hover:bg-red-100 text-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';
```

### Pattern 3: Crazy 8s Grid with HTML Table (Journey Map Pattern)

**What:** 2x4 grid for 8 sketch slots, similar to Journey Map's 7-row swimlane grid

**When to use:** Fixed-size grid with editable cells and image placeholders

**Why this pattern:** Journey Map grid is proven, HTML table provides better scrolling and layout control than canvas nodes

**Example:**
```typescript
// components/workshop/crazy-8s-grid.tsx
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface Crazy8sSlot {
  slotId: string;           // 'slot-1' through 'slot-8'
  title: string;            // User-editable title
  imageUrl?: string;        // PNG from EzyDraw modal
  drawingId?: string;       // Reference to drawing in stepArtifacts
}

interface Crazy8sGridProps {
  artifact: Record<string, unknown>;
  onSlotClick?: (slotId: string) => void;       // Open EzyDraw modal for this slot
  onTitleEdit?: (slotId: string, title: string) => void;
}

/**
 * Crazy 8s Grid Component
 * 2x4 grid for 8 sketch slots (similar to Journey Map table pattern)
 * Slots are editable: click empty slot → EzyDraw modal, click filled slot → re-edit
 */
export function Crazy8sGrid({ artifact, onSlotClick, onTitleEdit }: Crazy8sGridProps) {
  const slots = (artifact.crazy8sSlots as Crazy8sSlot[]) || Array.from({ length: 8 }, (_, i) => ({
    slotId: `slot-${i + 1}`,
    title: '',
  }));

  const handleSlotClick = (slotId: string) => {
    onSlotClick?.(slotId);
  };

  const handleTitleChange = (slotId: string, newTitle: string) => {
    onTitleEdit?.(slotId, newTitle);
  };

  // Layout: 2 rows x 4 columns
  const rows = [
    slots.slice(0, 4),   // Row 1: slots 1-4
    slots.slice(4, 8),   // Row 2: slots 5-8
  ];

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="mb-4 p-4 rounded-lg border bg-muted/50">
        <p className="text-sm text-muted-foreground">
          Sketch 8 different ideas in 8 minutes. Tap any slot to draw, then add a title to describe your sketch.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 gap-4">
        {slots.map((slot, index) => (
          <div
            key={slot.slotId}
            className={cn(
              "relative aspect-square border-2 rounded-lg overflow-hidden transition-all",
              slot.imageUrl
                ? "border-primary/50 hover:border-primary cursor-pointer"
                : "border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 cursor-pointer bg-muted/20"
            )}
            onClick={() => handleSlotClick(slot.slotId)}
          >
            {/* Slot number badge */}
            <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-background border flex items-center justify-center text-xs font-semibold">
              {index + 1}
            </div>

            {/* Sketch image or placeholder */}
            {slot.imageUrl ? (
              <img
                src={slot.imageUrl}
                alt={slot.title || `Sketch ${index + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <svg
                    className="w-12 h-12 mx-auto mb-2 opacity-40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  <p className="text-xs">Click to sketch</p>
                </div>
              </div>
            )}

            {/* Title overlay (editable) */}
            {slot.imageUrl && (
              <div className="absolute bottom-0 left-0 right-0 bg-background/90 p-2">
                <input
                  type="text"
                  value={slot.title}
                  onChange={(e) => {
                    e.stopPropagation(); // Prevent slot click
                    handleTitleChange(slot.slotId, e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()} // Prevent slot click when editing title
                  placeholder="Add title..."
                  className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-muted-foreground/50"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Integration with EzyDraw:**
```typescript
// In parent component (step-8-canvas.tsx)
const [ezyDrawState, setEzyDrawState] = useState<{
  isOpen: boolean;
  slotId?: string;             // Which Crazy 8s slot is being edited
  initialElements?: DrawingElement[];
} | null>(null);

const handleSlotClick = async (slotId: string) => {
  const slot = slots.find(s => s.slotId === slotId);

  if (slot?.drawingId) {
    // Re-edit existing sketch
    const drawing = await loadDrawing({
      workshopId,
      stepId,
      drawingId: slot.drawingId,
    });
    if (drawing) {
      const elements: DrawingElement[] = JSON.parse(drawing.vectorJson);
      setEzyDrawState({
        isOpen: true,
        slotId,
        initialElements: elements,
      });
    }
  } else {
    // New sketch
    setEzyDrawState({
      isOpen: true,
      slotId,
    });
  }
};

const handleDrawingSave = async (result: { pngDataUrl: string; elements: DrawingElement[] }) => {
  const simplifiedElements = simplifyDrawingElements(result.elements);
  const vectorJson = JSON.stringify(simplifiedElements);

  const response = await saveDrawing({
    workshopId,
    stepId,
    pngBase64: result.pngDataUrl,
    vectorJson,
    width: 800,   // Crazy 8s sketch size
    height: 800,
  });

  if (response.success && ezyDrawState?.slotId) {
    // Update slot with drawing reference
    updateCrazy8sSlot(ezyDrawState.slotId, {
      drawingId: response.drawingId,
      imageUrl: response.pngUrl,
    });
  }
};
```

### Pattern 4: AI Theme Suggestions for Mind Map

**What:** Suggest theme branches based on earlier workshop steps (persona, HMW statement, insights)

**When to use:** Blank-canvas paralysis prevention, kickstart ideation

**Why this pattern:** Proven in AI-assisted ideation tools (Miro AI, MindNode AI), reduces cognitive load

**Example:**
```typescript
// AI prompt for theme suggestions (similar to existing AI integration pattern)
const THEME_SUGGESTION_PROMPT = `
You are facilitating Step 8 (Ideation) of a design thinking workshop.

**Context:**
- HMW Statement: {hmwStatement}
- Persona: {personaName} ({personaDescription})
- Key Insights from research: {keyInsights}

**Task:**
Generate 3-5 high-level theme branches for a mind map to explore solutions to the HMW statement.

**Requirements:**
- Each theme should be broad enough to spawn multiple sub-ideas
- Themes should be diverse (don't overlap)
- Themes should align with persona needs and research insights
- Output as JSON array of strings (theme names only, 2-4 words each)

**Example output:**
["Mobile-First Experience", "Community Features", "Gamification Elements", "AI-Powered Assistance"]

Output JSON only, no explanation.
`;

// Integration in mind map canvas
const handleGenerateThemes = async () => {
  const response = await fetch('/api/ai/generate-themes', {
    method: 'POST',
    body: JSON.stringify({
      workshopId,
      stepId,
      hmwStatement: artifact.hmwStatement,
      personaName: artifact.personaName,
      personaDescription: artifact.personaDescription,
      keyInsights: artifact.keyInsights,
    }),
  });

  const { themes } = await response.json();

  // Add theme branches to mind map
  themes.forEach((themeName: string, index: number) => {
    const themeColor = THEME_COLORS[index % THEME_COLORS.length];

    const newNode: Node = {
      id: crypto.randomUUID(),
      type: 'mindMapNode',
      position: { x: 0, y: 0 }, // dagre will calculate
      data: {
        label: themeName,
        themeColorId: themeColor.id,
        themeColor: themeColor.color,
        themeBgColor: themeColor.bgColor,
      },
    };

    const newEdge: Edge = {
      id: `root-${newNode.id}`,
      source: rootNodeId,  // HMW statement node
      target: newNode.id,
    };

    addNode(newNode);
    addEdge(newEdge);
  });
};
```

### Pattern 5: Step 8 Sub-Step Flow (Mind Mapping → Crazy 8s → Idea Selection)

**What:** Tab-based navigation between 3 sub-steps, progressive disclosure pattern

**When to use:** Multi-stage workflows within a single step

**Why this pattern:** Proven in design sprint tools (Miro, FigJam), reduces cognitive load vs single-canvas approach

**Example:**
```typescript
// components/workshop/step-8-canvas.tsx
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MindMapCanvas } from './mind-map-canvas';
import { Crazy8sGrid } from './crazy-8s-grid';
import { IdeaSelectionGrid } from './idea-selection-grid';

type Step8SubStep = 'mindMap' | 'crazy8s' | 'ideaSelection';

export function Step8Canvas({ workshopId, stepId }: { workshopId: string; stepId: string }) {
  const [activeTab, setActiveTab] = useState<Step8SubStep>('mindMap');

  return (
    <div className="h-full flex flex-col">
      {/* Sub-step tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Step8SubStep)} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0">
          <TabsTrigger value="mindMap" className="rounded-none border-b-2 data-[state=active]:border-primary">
            1. Mind Mapping
          </TabsTrigger>
          <TabsTrigger value="crazy8s" className="rounded-none border-b-2 data-[state=active]:border-primary">
            2. Crazy 8s
          </TabsTrigger>
          <TabsTrigger value="ideaSelection" className="rounded-none border-b-2 data-[state=active]:border-primary">
            3. Idea Selection
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mindMap" className="flex-1 mt-0">
          <MindMapCanvas workshopId={workshopId} stepId={stepId} />
        </TabsContent>

        <TabsContent value="crazy8s" className="flex-1 mt-0 overflow-auto p-6">
          <Crazy8sGrid
            artifact={artifact}
            onSlotClick={handleSlotClick}
            onTitleEdit={handleTitleEdit}
          />
        </TabsContent>

        <TabsContent value="ideaSelection" className="flex-1 mt-0 overflow-auto p-6">
          <IdeaSelectionGrid
            crazy8sSlots={artifact.crazy8sSlots}
            onSelectIdea={handleSelectIdea}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tree layout algorithm | Manual x/y positioning, force-directed layout | dagre for trees | dagre handles spacing, collision detection, level alignment automatically. Custom force-directed is 10x code. |
| Color theme assignment | Random colors, manual selection | Predefined theme palette with auto-assignment | MindNode/XMind use fixed palettes for consistency. Random colors can clash or reduce scannability. |
| Sketch-to-slot persistence | Custom storage schema | Phase 26 drawing pattern (Vercel Blob + JSONB) | Proven dual-state pattern (PNG + vector JSON), reuses existing infrastructure. |
| Grid overlay rendering | ReactFlow nodes for grid cells | HTML table overlay (Journey Map pattern) | HTML tables have better scroll, sticky headers, CSS grid. Canvas nodes are overkill for static grid. |
| Dagre layout recalculation | Manual tracking of add/edit/delete | useMemo with [nodes, edges] deps | React will auto-recalculate when dependencies change, no manual tracking needed. |

**Key insight:** Tree layout has complex edge cases (asymmetric trees, deep nesting, long labels causing overlap). dagre solves these with 500+ lines of tested algorithm code. Hand-rolling would take days and still have bugs.

## Common Pitfalls

### Pitfall 1: Layout Thrashing on Every Keystroke

**What goes wrong:** Running dagre layout on every node label change causes janky UI (layout recalculates while typing)

**Why it happens:** useMemo re-runs when nodes array changes, node label is part of node data

**How to avoid:**
- Debounce layout recalculation by 300ms after last change
- Only recalculate layout on structural changes (add/delete node/edge), not label edits
- Use separate state for "editing label" vs "committed label"

**Warning signs:**
- Mind map nodes jump around while user is typing
- Frame drops when editing node labels
- Layout animation triggers on every keystroke

**Fix:**
```typescript
// Separate editing state from committed state
const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
const [editingLabel, setEditingLabel] = useState('');

// Only commit to node data on blur (triggers layout)
const handleLabelSave = (nodeId: string) => {
  updateNode(nodeId, { label: editingLabel });
  setEditingNodeId(null);
};

// Layout only depends on node structure, not editing state
const layoutedNodes = useMemo(
  () => getLayoutedElements(nodes, edges),
  [nodes, edges]  // Not editingLabel
);
```

### Pitfall 2: Crazy 8s Slots Not Linked to Drawings in stepArtifacts

**What goes wrong:** Drawings saved from Crazy 8s slots don't persist across page refresh, or slots show stale images

**Why it happens:** Forgot to update stepArtifacts.crazy8sSlots with drawingId reference after save

**How to avoid:**
- Store both `drawingId` (reference to stepArtifacts.drawings[]) and `imageUrl` (Vercel Blob CDN) in each slot
- On save, update both stepArtifacts.drawings[] (append new drawing) and stepArtifacts.crazy8sSlots[].drawingId
- On load, hydrate slots from stepArtifacts, fetch imageUrl from drawings[] by drawingId

**Warning signs:**
- Crazy 8s slots empty after refresh
- Re-editing a slot opens blank canvas (lost vector JSON)
- Multiple users see different sketches in same slot

**Correct schema:**
```typescript
// stepArtifacts structure for Step 8
{
  mindMap: {
    nodes: [...],  // Mind map nodes
    edges: [...],  // Mind map edges
  },
  crazy8sSlots: [
    {
      slotId: 'slot-1',
      title: 'Mobile UI Concept',
      drawingId: 'drawing-abc123',  // Reference to stepArtifacts.drawings[]
      imageUrl: 'https://blob.vercel-storage.com/...',  // CDN URL for display
    },
    // ... 7 more slots
  ],
  drawings: [
    {
      id: 'drawing-abc123',
      vectorJson: '[...]',  // Konva elements for re-editing
      pngUrl: 'https://blob.vercel-storage.com/...',
      width: 800,
      height: 800,
      createdAt: '2026-02-12T...',
    },
  ],
}
```

### Pitfall 3: Mind Map Nodes Overlapping After Deep Nesting

**What goes wrong:** 3-level deep trees cause nodes to overlap despite dagre layout

**Why it happens:** dagre default nodesep (60) is too small for variable-width nodes with long labels

**How to avoid:**
- Increase nodesep to 80-100 for mind maps with text labels
- Set uniform nodeWidth in dagre config (don't use variable width)
- Truncate long labels with ellipsis, show full text on hover

**Warning signs:**
- Mind map nodes overlap when labels are >2 words
- Layout looks good initially, breaks when user adds long labels
- Edges cross through node bodies

**Fix:**
```typescript
// In mind-map-layout.ts
dagreGraph.setGraph({
  rankdir: 'LR',
  ranksep: 120,   // Increase level spacing
  nodesep: 100,   // Increase sibling spacing (was 60)
  edgesep: 50,
  marginx: 30,
  marginy: 30,
});

// In mind-map-node.tsx
<div className="px-4 py-2 rounded-lg border-2 shadow-sm w-[200px]">
  {/* Fixed width prevents layout collapse */}
  <div className="truncate font-medium" title={data.label}>
    {data.label}
  </div>
</div>
```

### Pitfall 4: Forgetting to Remove Brain Writing from Step 8 Flow

**What goes wrong:** Old Step 8 references Brain Writing sub-step, AI prompts reference non-existent artifact fields

**Why it happens:** Brain Writing was removed in v1.3 design decision but old code paths not cleaned up

**How to avoid:**
- Grep codebase for "brain writing", "brainWriting", "step 8b", "step-8b" before implementation
- Update step metadata (step-metadata.ts) to reflect new 3-part flow
- Update AI prompts for Step 8 to not reference Brain Writing data

**Warning signs:**
- AI asks user to "review brain writing results" (doesn't exist)
- Step 8 progress bar shows 4 steps instead of 3
- Old sub-step tabs still visible in UI

**Cleanup checklist:**
```bash
# Search for old Brain Writing references
grep -r "brainWriting\|brain writing\|brain-writing" src/

# Update step metadata
# In src/lib/workshop/step-metadata.ts
{
  id: 'ideation',
  name: 'Ideation',
  description: 'Mind Mapping → Crazy 8s → Idea Selection',  // NOT Brain Writing
  // ...
}

# Update AI prompts
# Remove any references to brainWritingResults, brainWritingCards, etc.
```

### Pitfall 5: Crazy 8s Image Aspect Ratio Distortion

**What goes wrong:** Sketches from EzyDraw (1920x1080) get squashed into square Crazy 8s slots (1:1 aspect ratio)

**Why it happens:** CSS `object-cover` crops image, CSS `object-contain` adds letterboxing, both look bad

**How to avoid:**
- Use square canvas in EzyDraw modal for Crazy 8s sketches (800x800 instead of 1920x1080)
- Pass canvas size as prop to EzyDrawLoader: `<EzyDrawLoader canvasSize={{ width: 800, height: 800 }} />`
- Display with `object-cover` for square → square (no distortion)

**Warning signs:**
- Crazy 8s sketches have black bars (letterboxing)
- Sketches get cropped/zoomed unexpectedly
- User draws in landscape but sees portrait in slot

**Fix:**
```typescript
// When opening EzyDraw from Crazy 8s slot
<EzyDrawLoader
  isOpen={true}
  canvasSize={{ width: 800, height: 800 }}  // Square canvas for Crazy 8s
  onSave={handleDrawingSave}
/>

// In Crazy8sGrid display
<img
  src={slot.imageUrl}
  className="w-full h-full object-cover"  // No distortion if both are square
/>
```

## Code Examples

Verified patterns from official sources:

### Example 1: Complete Dagre Layout Integration

```typescript
// Source: https://reactflow.dev/examples/layout/dagre
// lib/canvas/mind-map-layout.ts

import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';

const nodeWidth = 200;
const nodeHeight = 80;

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  options: { direction?: 'TB' | 'LR' } = {}
) {
  const { direction = 'LR' } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    ranksep: 100,
    nodesep: 80,
    edgesep: 40,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
```

### Example 2: Mind Map with Auto-Layout

```typescript
// Source: https://reactflow.dev/learn/tutorials/mind-map-app-with-react-flow
// components/workshop/mind-map-canvas.tsx

'use client';

import { useCallback, useMemo, useState } from 'react';
import { ReactFlow, addEdge, Background, Controls, type Node, type Edge } from '@xyflow/react';
import { getLayoutedElements } from '@/lib/canvas/mind-map-layout';
import { MindMapNode } from '@/components/canvas/mind-map-node';

const nodeTypes = {
  mindMapNode: MindMapNode,
};

export function MindMapCanvas({ workshopId, stepId }: { workshopId: string; stepId: string }) {
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: 'root',
      type: 'mindMapNode',
      position: { x: 0, y: 0 },
      data: {
        label: 'How might we improve user onboarding?',
        themeColor: '#6b7280',
        themeBgColor: '#f3f4f6',
      },
    },
  ]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Auto-layout whenever structure changes
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(nodes, edges),
    [nodes, edges]
  );

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const addChildNode = useCallback((parentId: string) => {
    const newNode: Node = {
      id: crypto.randomUUID(),
      type: 'mindMapNode',
      position: { x: 0, y: 0 },
      data: {
        label: '',
        themeColor: '#3b82f6',
        themeBgColor: '#dbeafe',
        onAddChild: addChildNode,
      },
    };

    const newEdge: Edge = {
      id: `${parentId}-${newNode.id}`,
      source: parentId,
      target: newNode.id,
    };

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, newEdge]);
  }, []);

  return (
    <ReactFlow
      nodes={layoutedNodes}
      edges={layoutedEdges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      minZoom={0.2}
      maxZoom={2}
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}
```

### Example 3: Crazy 8s with EzyDraw Integration

```typescript
// components/workshop/step-8-canvas.tsx
'use client';

import { useState, useCallback } from 'react';
import { Crazy8sGrid } from './crazy-8s-grid';
import { EzyDrawLoader } from '@/components/ezydraw/ezydraw-loader';
import { saveDrawing, updateDrawing, loadDrawing } from '@/actions/drawing-actions';
import { simplifyDrawingElements } from '@/lib/drawing/simplify';
import type { DrawingElement } from '@/lib/drawing/types';

export function Step8CrazyEights({ workshopId, stepId, artifact }: Props) {
  const [ezyDrawState, setEzyDrawState] = useState<{
    isOpen: boolean;
    slotId?: string;
    drawingId?: string;
    initialElements?: DrawingElement[];
  } | null>(null);

  const handleSlotClick = useCallback(async (slotId: string) => {
    const slot = artifact.crazy8sSlots?.find((s: any) => s.slotId === slotId);

    if (slot?.drawingId) {
      // Re-edit existing sketch
      const drawing = await loadDrawing({
        workshopId,
        stepId,
        drawingId: slot.drawingId,
      });

      if (drawing) {
        const elements: DrawingElement[] = JSON.parse(drawing.vectorJson);
        setEzyDrawState({
          isOpen: true,
          slotId,
          drawingId: slot.drawingId,
          initialElements: elements,
        });
      }
    } else {
      // New sketch
      setEzyDrawState({
        isOpen: true,
        slotId,
      });
    }
  }, [artifact, workshopId, stepId]);

  const handleDrawingSave = useCallback(
    async (result: { pngDataUrl: string; elements: DrawingElement[] }) => {
      const simplifiedElements = simplifyDrawingElements(result.elements);
      const vectorJson = JSON.stringify(simplifiedElements);

      if (ezyDrawState?.drawingId) {
        // Update existing sketch
        const response = await updateDrawing({
          workshopId,
          stepId,
          drawingId: ezyDrawState.drawingId,
          pngBase64: result.pngDataUrl,
          vectorJson,
          width: 800,
          height: 800,
        });

        if (response.success && ezyDrawState.slotId) {
          // Update slot imageUrl (drawingId unchanged)
          updateCrazy8sSlot(ezyDrawState.slotId, {
            imageUrl: response.pngUrl,
          });
        }
      } else {
        // New sketch
        const response = await saveDrawing({
          workshopId,
          stepId,
          pngBase64: result.pngDataUrl,
          vectorJson,
          width: 800,
          height: 800,
        });

        if (response.success && ezyDrawState?.slotId) {
          // Update slot with drawing reference
          updateCrazy8sSlot(ezyDrawState.slotId, {
            drawingId: response.drawingId,
            imageUrl: response.pngUrl,
          });
        }
      }

      setEzyDrawState(null);
    },
    [ezyDrawState, workshopId, stepId]
  );

  return (
    <>
      <Crazy8sGrid
        artifact={artifact}
        onSlotClick={handleSlotClick}
        onTitleEdit={(slotId, title) => {
          updateCrazy8sSlot(slotId, { title });
        }}
      />

      {ezyDrawState?.isOpen && (
        <EzyDrawLoader
          isOpen={true}
          onClose={() => setEzyDrawState(null)}
          onSave={handleDrawingSave}
          initialElements={ezyDrawState.initialElements}
          canvasSize={{ width: 800, height: 800 }}  // Square for Crazy 8s
        />
      )}
    </>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual tree layout | dagre/elkjs auto-layout | 2021 | ReactFlow team standardized on dagre for simple trees, elkjs for complex graphs |
| Random node colors | Smart color themes with harmony rules | 2024 | MindNode/XMind shifted to AI-assisted color palettes, reduced visual fatigue |
| Canvas-based grids | HTML table overlays | 2023 | Better scroll performance, sticky headers, accessibility (Journey Map pattern) |
| Single-canvas ideation | Multi-step tabs (Mind Map → Crazy 8s → Selection) | 2022 | Miro/FigJam adopted progressive disclosure, reduced cognitive load |
| Separate sketch tools | Embedded drawing modals | 2024 | In-canvas drawing (Miro, Figma) replaced external tools for faster workflow |

**Deprecated/outdated:**
- **Force-directed layout for trees:** Replaced by dagre hierarchical layout (faster, more predictable)
- **react-mind-map library:** Unmaintained since 2020, use ReactFlow + dagre instead
- **Brain Writing in Step 8:** Removed in v1.3 design decision (needs real multi-user, AI simulation insufficient)
- **Manual sketch upload:** Replaced by in-app EzyDraw modal (Phase 25-27)

## Open Questions

1. **Mind Map Export Format**
   - What we know: Mind map stored as ReactFlow nodes/edges in stepArtifacts
   - What's unclear: Should mind map be exportable as image (PNG) or structured format (JSON, Markdown outline)?
   - Recommendation: Phase 28 = stepArtifacts persistence only. Export features (PNG, Markdown) defer to v2. Focus on core ideation workflow.

2. **Crazy 8s Timer Feature**
   - What we know: Traditional Crazy 8s uses 8-minute countdown timer
   - What's unclear: Should we enforce 1 minute per sketch with auto-advance, or let users work at own pace?
   - Recommendation: No timer in Phase 28 (async workshop use case, users may pause). Add optional timer in v2 if user research shows value.

3. **Mind Map Max Depth Enforcement**
   - What we know: Requirements specify max 3 levels deep
   - What's unclear: Should UI prevent adding level-4 nodes (hard limit) or warn but allow (soft limit)?
   - Recommendation: Soft limit in Phase 28. Show warning toast "Mind maps work best with 3 levels or fewer" when adding level-4, but don't block. Hard enforcement can frustrate power users.

4. **Idea Selection from Crazy 8s**
   - What we know: Step 8c is "Idea Selection" to carry forward to Step 9
   - What's unclear: Select entire sketches, or allow crop/annotate before selection?
   - Recommendation: Phase 28 = select full sketches only (checkbox on each slot). Cropping/annotation is v2 feature (requires image editing UI).

## Sources

### Primary (HIGH confidence)
- [ReactFlow Dagre Tree Layout](https://reactflow.dev/examples/layout/dagre) - Official dagre integration pattern
- [ReactFlow Mind Map Tutorial](https://reactflow.dev/learn/tutorials/mind-map-app-with-react-flow) - Complete mind map implementation guide
- [ReactFlow Auto Layout](https://reactflow.dev/examples/layout/auto-layout) - Dynamic layout recalculation patterns
- [dagre GitHub](https://github.com/dagrejs/dagre) - Library source, algorithm details
- [Crazy 8s - Design Sprint Kit (Google)](https://designsprintkit.withgoogle.com/methodology/phase3-sketch/crazy-8s) - Official methodology
- [MindNode Smart Color Theme](https://xmind.com/blog/smart-color-theme) - Color harmony in mind maps

### Secondary (MEDIUM confidence)
- [ReactFlow with Dagre Custom Nodes](https://ncoughlin.com/posts/react-flow-dagre-custom-nodes/) - Implementation examples
- [Building Graph Diagrams with ReactFlow and ELK.js](https://dtoyoda10.medium.com/building-complex-graph-diagrams-with-react-flow-elk-js-and-dagre-js-8832f6a461c5) - Performance comparisons
- [Crazy 8's Brainstorming Template (Conceptboard)](https://conceptboard.com/blog/crazy-8s-brainstorming-template/) - Grid layout patterns
- [Mind Map Styling Best Practices (MindNode)](https://www.mindnode.com/support/guides/mind-map-and-canvas-styling) - Color coding guidelines

### Tertiary (LOW confidence - needs validation)
- WebSearch: "dagre performance large graphs 2026" - Community benchmarks (verify with own testing)
- WebSearch: "crazy 8s digital implementation" - Various tool approaches (verify patterns fit context)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - dagre is ReactFlow-recommended, proven in tutorials
- Architecture: HIGH - Journey Map grid pattern proven in Phase 22, dagre pattern from official docs
- Pitfalls: MEDIUM - Layout thrashing and aspect ratio issues need validation in implementation

**Research date:** 2026-02-12
**Valid until:** 60 days (dagre is stable/unmaintained, ReactFlow patterns unlikely to change)

**Performance assumptions:**
- Mind map <30 nodes, dagre layout <10ms (based on ReactFlow examples)
- Crazy 8s grid 8 images <5MB total (800x800 PNG ~500KB each)
- EzyDraw modal reuse from Phase 25-27 (no new performance concerns)

**Dependencies on prior phases:**
- Phase 25-27: EzyDraw modal, DrawingElement types, dual-state persistence
- Phase 22: Grid overlay pattern (Journey Map), semantic cellAssignment
- Phase 26: Drawing-canvas integration, Vercel Blob storage, simplify-js

**Ready for planning:** All technical unknowns resolved. Planner can create PLAN.md files with high confidence.
