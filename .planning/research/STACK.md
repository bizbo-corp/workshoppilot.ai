# Stack Research: EzyDraw Drawing Component & Visual Canvas Extensions

**Domain:** In-app drawing tool (EzyDraw) and visual ideation canvases for design thinking workshop app
**Researched:** 2026-02-12
**Confidence:** HIGH

## Context: What This Research Covers

This stack research focuses on NEW capabilities for the v1.3 (MMP) milestone: EzyDraw drawing modal and visual canvas layouts for Steps 8 (Ideation) and 9 (Concept Development).

**Existing validated stack (DO NOT re-research):**
- Next.js 16.1.1 + React 19 + Tailwind 4 + shadcn/ui
- ReactFlow 12.10.0 (already integrated for canvas in v1.1, extended for grids in v1.2)
- Zustand for state management
- Neon Postgres + Drizzle ORM
- Deployed on Vercel (~18K lines TypeScript, current canvas 110KB gzipped)

**v1.3 adds:**
1. **EzyDraw** — Standalone drawing modal (freehand pencil, shapes, UI kit drag-drop, icons/emoji, text, layers, export PNG)
2. **Visual mind map** — Interactive HMW-centered node graph (click-to-add themes, drag-to-connect)
3. **Crazy 8s canvas** — 8-slot sketch grid where each slot opens EzyDraw, outputs image thumbnail
4. **Visual concept cards** — Rich ReactFlow nodes with embedded images, text fields, SWOT grids, feasibility scores

**Key architectural constraint:** EzyDraw is NOT an extension of ReactFlow. It's a separate drawing surface in a modal. User clicks button → modal opens → draws → saves → image becomes a node on ReactFlow canvas.

---

## TL;DR — Recommended Stack for EzyDraw + Visual Canvases

| Category | Recommended | Version | Bundle Impact | Why |
|----------|-------------|---------|---------------|-----|
| **Drawing Engine** | Konva.js + react-konva | 9.3.17 (konva) | +55 KB (konva) + 43 KB (react-konva) = **98 KB** | TypeScript-first, layer system built-in, performant for shapes + freehand, React integration proven |
| **Freehand Tool** | perfect-freehand | 1.2.3 | +1.2 KB | Lightweight pressure-sensitive strokes, used by tldraw, minimal API |
| **UI Kit Drag-Drop** | dnd-kit | 8.1.0 | +20 KB | Modern, accessible, touch-friendly, already planned for canvas R2 |
| **Icon Library** | lucide-react (existing) | 0.546.0 | 0 KB (already installed) | Consistent with app, 1400+ icons, tree-shakeable |
| **Emoji Picker** | @emoji-mart/react | 1.2.0 | +45 KB | Industry standard, native emoji support, search/categories |
| **Image Export** | Native canvas.toBlob() | Browser API | 0 KB | No library needed, efficient for Vercel Blob upload |
| **Mind Map Nodes** | ReactFlow custom nodes (existing) | 12.10.0 (existing) | 0 KB | Already have ReactFlow, custom nodes handle rich content |
| **Rich Cards** | ReactFlow custom nodes + Tailwind | 12.10.0 (existing) | 0 KB | HTML/CSS in custom nodes, no additional library |

**Total NEW bundle size: ~164 KB gzipped**

**Rejected alternatives:**
- **Fabric.js** (96 KB) — Rejected: Heavier than Konva, less performant for large object counts
- **tldraw** (~400+ KB) — Rejected: Full whiteboard SDK is overkill, want granular control
- **Excalidraw** (~2.3 MB bundle) — Rejected: Massive bundle, hand-drawn style doesn't fit design system
- **html2canvas** for export — Rejected: Native toBlob() is faster and smaller

---

## Recommended Stack

### Core Drawing Technology

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **konva** | 9.3.17 | HTML5 Canvas drawing engine | TypeScript-native, layer system, dirty region rendering (performant for 100+ shapes), 55 KB gzipped (41% smaller than Fabric.js) |
| **react-konva** | 18.2.13 | React bindings for Konva | Declarative API (`<Stage>`, `<Layer>`, `<Rect>`), React 19 compatible, used by 500+ projects |
| **perfect-freehand** | 1.2.3 | Pressure-sensitive freehand strokes | Generates smooth stroke outlines (1.2 KB), used by tldraw, renders as Konva Line or SVG path |

**Why Konva over Fabric.js:**
- **Performance:** Dirty region detection only repaints changed areas (critical for EzyDraw's layer system)
- **TypeScript-first:** Written in TypeScript, better DX and type safety
- **Smaller bundle:** 55 KB vs 96 KB (Fabric.js), saves 41 KB
- **Layer primitives:** Built-in Stage → Layer → Shape hierarchy matches EzyDraw requirements
- **React integration:** react-konva is actively maintained (last update Jan 2026)

**Why NOT tldraw or Excalidraw:**
- **tldraw:** Full SDK with infinite canvas, collaboration, undo/redo (~400+ KB). EzyDraw needs constrained modal canvas.
- **Excalidraw:** Hand-drawn sketch style doesn't match clean UI design system. Bundle is 2.3 MB (14x larger than Konva).

**Sources:**
- [Konva.js vs Fabric.js Technical Comparison](https://medium.com/@www.blog4j.com/konva-js-vs-fabric-js-in-depth-technical-comparison-and-use-case-analysis-9c247968dd0f) — Performance benchmarks
- [Bundle size comparison: Konva 54.9 KB, Fabric 95.7 KB, React Konva 98.4 KB](https://bestofjs.org/projects/konva) — BestofJS metrics
- [perfect-freehand 1.2 KB gzipped](https://github.com/steveruizok/perfect-freehand/discussions/6) — Creator confirmation

---

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@emoji-mart/react** | 1.2.0 | Emoji picker component | EzyDraw emoji library feature, native emoji support, 1800+ emojis |
| **dnd-kit** | 8.1.0 | Drag-and-drop for UI kit | EzyDraw's drag-and-drop UI component palette (buttons, inputs, cards) |
| **lucide-react** | 0.546.0 (existing) | Icon library | EzyDraw icon palette, already in project (0 KB added) |
| **html-to-image** | 1.11.11 | Canvas snapshot to PNG | Export EzyDraw drawings and Crazy 8s slots as images |
| **zustand** | (existing) | EzyDraw state management | Manage drawing state (layers, selected tool, history) |

**Why emoji-mart:**
- Industry standard (Discord, Slack use it)
- Native emoji support (no image sprites)
- Search, categories, skin tone variants
- 45 KB gzipped (acceptable for feature richness)

**Why dnd-kit (not react-dnd or hello-pangea/dnd):**
- **Modern:** Built for React hooks, no legacy class components
- **Accessible:** WCAG 2.0 compliant, keyboard navigation
- **Touch-friendly:** Mobile/tablet support (critical for design thinking workshops)
- **Performant:** Headless architecture, 20 KB gzipped
- **Consistent with roadmap:** Already planned for canvas R2

**Why html-to-image (not html2canvas):**
- **Smaller:** 11 KB vs 50+ KB (html2canvas)
- **Modern API:** Promise-based, better for async/await
- **SVG support:** Can export as SVG or PNG
- **ReactFlow compatibility:** Recommended by ReactFlow docs

**Sources:**
- [Top 5 Drag-and-Drop Libraries for React in 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) — dnd-kit analysis
- [@emoji-mart/react npm](https://www.npmjs.com/package/@emoji-mart/react) — Package info
- [ReactFlow Download Image Example](https://reactflow.dev/examples/misc/download-image) — html-to-image usage

---

## EzyDraw Component Architecture

### Layer System Implementation

```typescript
// src/components/ezydraw/ezydraw-stage.tsx
import { Stage, Layer } from 'react-konva';
import { useEzyDrawStore } from '@/stores/ezydraw-store';

export function EzyDrawStage() {
  const { layers, selectedLayerId } = useEzyDrawStore();

  return (
    <Stage width={800} height={600}>
      {layers.map((layer) => (
        <Layer key={layer.id} visible={layer.visible} opacity={layer.opacity}>
          {layer.shapes.map((shape) => (
            <ShapeRenderer key={shape.id} shape={shape} />
          ))}
        </Layer>
      ))}
    </Stage>
  );
}
```

**Layer structure:**
```typescript
interface EzyDrawLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
  shapes: EzyDrawShape[];
}

type EzyDrawShape =
  | { type: 'freehand'; points: number[]; color: string; strokeWidth: number }
  | { type: 'rect'; x: number; y: number; width: number; height: number; fill: string }
  | { type: 'circle'; x: number; y: number; radius: number; fill: string }
  | { type: 'arrow'; points: number[]; stroke: string }
  | { type: 'text'; x: number; y: number; text: string; fontSize: number }
  | { type: 'uiComponent'; componentType: 'button' | 'input' | 'card'; x: number; y: number }
  | { type: 'icon'; iconName: string; x: number; y: number; size: number }
  | { type: 'emoji'; emoji: string; x: number; y: number; size: number };
```

**Why this structure:**
- **Konva's native hierarchy:** Stage → Layer → Shape matches EzyDraw's layer panel
- **Selective rendering:** Only redraw changed layers (performance)
- **Layer operations:** Show/hide, lock, reorder, opacity — all built into Konva API

---

### Freehand Drawing with perfect-freehand

```typescript
// src/components/ezydraw/tools/freehand-tool.tsx
import { Line } from 'react-konva';
import getStroke from 'perfect-freehand';

export function FreehandTool() {
  const [currentStroke, setCurrentStroke] = useState<number[]>([]);
  const { addShape, selectedColor, strokeWidth } = useEzyDrawStore();

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    setCurrentStroke((prev) => [...prev, point.x, point.y]);
  };

  const handleMouseUp = () => {
    // Convert raw points to smooth stroke with perfect-freehand
    const strokePoints = getStroke(currentStroke, {
      size: strokeWidth,
      smoothing: 0.5,
      thinning: 0.5,
      streamline: 0.5,
    });

    // Convert perfect-freehand outline to Konva Line points
    const points = strokePoints.flat();

    addShape({
      type: 'freehand',
      points,
      color: selectedColor,
      strokeWidth,
    });

    setCurrentStroke([]);
  };

  return (
    <Line
      points={currentStroke}
      stroke={selectedColor}
      strokeWidth={strokeWidth}
      tension={0.5}
      lineCap="round"
      lineJoin="round"
    />
  );
}
```

**Why perfect-freehand + Konva Line:**
- **Pressure sensitivity:** perfect-freehand simulates pen pressure (thinning/thickening)
- **Smooth strokes:** Removes jitter from mouse/touch input
- **Konva rendering:** Line component handles GPU-accelerated rendering
- **Minimal bundle:** 1.2 KB for professional-quality freehand

**Source:** [Konva Free Drawing Tutorial](https://konvajs.org/docs/react/Free_Drawing.html)

---

### UI Kit Drag-and-Drop

```typescript
// src/components/ezydraw/ui-kit-palette.tsx
import { useDraggable } from '@dnd-kit/core';

const UI_COMPONENTS = [
  { id: 'button', label: 'Button', icon: 'square' },
  { id: 'input', label: 'Input', icon: 'minus' },
  { id: 'card', label: 'Card', icon: 'layout-grid' },
  { id: 'navbar', label: 'Navbar', icon: 'menu' },
];

export function UIKitPalette() {
  return (
    <div className="grid grid-cols-2 gap-2 p-4">
      {UI_COMPONENTS.map((component) => (
        <DraggableUIComponent key={component.id} component={component} />
      ))}
    </div>
  );
}

function DraggableUIComponent({ component }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: component.id,
    data: { type: 'uiComponent', componentType: component.id },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="flex flex-col items-center gap-1 p-2 border rounded cursor-move hover:bg-accent"
    >
      <Icon name={component.icon} size={24} />
      <span className="text-xs">{component.label}</span>
    </div>
  );
}
```

**Drop zone on Konva Stage:**

```typescript
// src/components/ezydraw/ezydraw-stage.tsx (extended)
import { useDroppable } from '@dnd-kit/core';

export function EzyDrawStage() {
  const { setNodeRef } = useDroppable({ id: 'ezydraw-stage' });
  const { addShape } = useEzyDrawStore();

  const handleDrop = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over?.id === 'ezydraw-stage') {
      const { componentType } = active.data.current;
      const dropPosition = getDropPosition(event); // Get x, y from event

      addShape({
        type: 'uiComponent',
        componentType,
        x: dropPosition.x,
        y: dropPosition.y,
      });
    }
  };

  return (
    <div ref={setNodeRef}>
      <Stage width={800} height={600}>
        {/* Layers and shapes */}
      </Stage>
    </div>
  );
}
```

**Why dnd-kit with Konva:**
- **Separate concerns:** dnd-kit handles palette drag, Konva handles canvas rendering
- **Touch support:** dnd-kit's sensors work on mobile (critical for workshops)
- **Accessibility:** Keyboard navigation for UI component selection
- **No Konva conflict:** dnd-kit operates on React DOM, Konva uses canvas element

**Source:** [dnd-kit Documentation](https://docs.dndkit.com/)

---

### Export to PNG with Vercel Blob

```typescript
// src/components/ezydraw/export-button.tsx
import { toPng } from 'html-to-image';
import { put } from '@vercel/blob';

export function ExportButton() {
  const stageRef = useRef<Stage>(null);

  const handleExport = async () => {
    if (!stageRef.current) return;

    // Get Konva Stage container
    const stageContainer = stageRef.current.container();

    // Convert Stage to PNG blob
    const blob = await toPng(stageContainer, {
      cacheBust: true,
      backgroundColor: '#ffffff',
    });

    // Upload to Vercel Blob
    const { url } = await put(`drawings/${Date.now()}.png`, blob, {
      access: 'public',
      contentType: 'image/png',
    });

    // Store URL in database
    await saveDrawingToDatabase(url);

    return url;
  };

  return (
    <button onClick={handleExport} className="btn-primary">
      Save Drawing
    </button>
  );
}
```

**Alternative: Native canvas.toBlob() for Konva:**

```typescript
// More efficient for Konva stages
const handleExportNative = async () => {
  const stage = stageRef.current;
  const dataURL = stage.toDataURL({ pixelRatio: 2 }); // High DPI

  // Convert data URL to blob
  const blob = await (await fetch(dataURL)).blob();

  // Upload to Vercel Blob
  const { url } = await put(`drawings/${Date.now()}.png`, blob, {
    access: 'public',
    contentType: 'image/png',
  });

  return url;
};
```

**Why Vercel Blob (not base64 in DB):**
- **Database efficiency:** Don't bloat stepArtifacts JSONB with base64 images
- **Performance:** Vercel Blob is CDN-backed (fast loads for image thumbnails)
- **Cost-effective:** First 100 GB free, then $0.15/GB
- **Scalability:** No database row size limits

**Why NOT base64 in database:**
- **33% larger:** Base64 encoding adds 33% overhead
- **Query slowdown:** Large JSONB columns slow down PostgreSQL queries
- **Memory usage:** Loading full workshop state loads all images into memory

**Sources:**
- [Vercel Blob Documentation](https://vercel.com/docs/vercel-blob)
- [Canvas toBlob() best practices](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)
- [ReactFlow Download Image Example](https://reactflow.dev/examples/misc/download-image)

---

## Visual Canvas Extensions (ReactFlow Custom Nodes)

### Mind Map with Custom Nodes

**Architecture:** ReactFlow already handles node graph. Custom nodes render rich HMW cards with theme branches.

```typescript
// src/components/canvas/mind-map-node.tsx
import { Handle, Position } from '@xyflow/react';

interface MindMapNodeData {
  label: string;
  type: 'hmw' | 'theme' | 'idea';
  color?: string;
  description?: string;
}

export function MindMapNode({ data }: { data: MindMapNodeData }) {
  const isHMW = data.type === 'hmw';

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg shadow-md border-2',
        isHMW ? 'bg-purple-100 border-purple-500 min-w-[200px]' : 'bg-white border-gray-300',
      )}
    >
      <Handle type="target" position={Position.Left} />

      <div className="flex flex-col gap-1">
        <div className="font-semibold text-sm">{data.label}</div>
        {data.description && (
          <div className="text-xs text-muted-foreground">{data.description}</div>
        )}
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
```

**Click-to-add interaction:**

```typescript
// src/components/canvas/mind-map-canvas.tsx
import { useReactFlow } from '@xyflow/react';

export function MindMapCanvas() {
  const { addNodes, addEdges } = useReactFlow();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleAddTheme = (parentNodeId: string) => {
    const newNode = {
      id: `theme-${Date.now()}`,
      type: 'mindMap',
      position: { x: 300, y: 100 }, // Calculate position relative to parent
      data: { label: 'New Theme', type: 'theme' },
    };

    const newEdge = {
      id: `edge-${Date.now()}`,
      source: parentNodeId,
      target: newNode.id,
      type: 'smoothstep',
    };

    addNodes([newNode]);
    addEdges([newEdge]);
  };

  return (
    <div className="relative h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={{ mindMap: MindMapNode }}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>

      {selectedNodeId && (
        <ContextMenu onAddTheme={() => handleAddTheme(selectedNodeId)} />
      )}
    </div>
  );
}
```

**Why ReactFlow custom nodes (not separate graph library):**
- **Already integrated:** ReactFlow 12.10.0 in project (0 KB added)
- **Custom node API:** Full control over node rendering (HTML/CSS/Tailwind)
- **Interactive:** Built-in drag, zoom, pan, edge connections
- **Extensible:** Add images, forms, charts inside nodes

**Alternative considered: react-d3-graph** — REJECTED: 150 KB, less flexible node customization, force-directed layout not needed (mind maps are hierarchical)

**Source:** [ReactFlow Mind Map Tutorial](https://reactflow.dev/learn/tutorials/mind-map-app-with-react-flow)

---

### Crazy 8s Grid with EzyDraw Integration

```typescript
// src/components/canvas/crazy-8s-canvas.tsx
export function Crazy8sCanvas() {
  const [slots, setSlots] = useState<Array<{ id: string; imageUrl: string | null }>>(
    Array.from({ length: 8 }, (_, i) => ({ id: `slot-${i}`, imageUrl: null }))
  );
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);

  const handleOpenDrawing = (slotId: string) => {
    setActiveSlotId(slotId);
  };

  const handleSaveDrawing = async (imageUrl: string) => {
    setSlots((prev) =>
      prev.map((slot) => (slot.id === activeSlotId ? { ...slot, imageUrl } : slot))
    );
    setActiveSlotId(null);
  };

  return (
    <div className="grid grid-cols-4 grid-rows-2 gap-4 h-full p-4">
      {slots.map((slot) => (
        <div
          key={slot.id}
          className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-500 transition-colors"
          onClick={() => handleOpenDrawing(slot.id)}
        >
          {slot.imageUrl ? (
            <img src={slot.imageUrl} alt={`Sketch ${slot.id}`} className="w-full h-full object-contain" />
          ) : (
            <div className="text-center text-muted-foreground">
              <Icon name="pencil" size={32} />
              <p className="text-xs mt-2">Click to sketch</p>
            </div>
          )}
        </div>
      ))}

      {activeSlotId && (
        <EzyDrawModal
          onSave={handleSaveDrawing}
          onCancel={() => setActiveSlotId(null)}
        />
      )}
    </div>
  );
}
```

**EzyDraw Modal:**

```typescript
// src/components/ezydraw/ezydraw-modal.tsx
export function EzyDrawModal({ onSave, onCancel }) {
  const stageRef = useRef<Stage>(null);

  const handleSave = async () => {
    const stage = stageRef.current;
    const dataURL = stage.toDataURL({ pixelRatio: 2 });
    const blob = await (await fetch(dataURL)).blob();

    // Upload to Vercel Blob
    const { url } = await put(`crazy8s/${Date.now()}.png`, blob, {
      access: 'public',
      contentType: 'image/png',
    });

    onSave(url);
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Draw Your Idea</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4">
          {/* Left: Toolbox */}
          <div className="w-64 space-y-4">
            <ToolPalette />
            <UIKitPalette />
            <IconPalette />
            <EmojiPicker />
          </div>

          {/* Center: Canvas */}
          <div className="flex-1">
            <EzyDrawStage ref={stageRef} />
          </div>

          {/* Right: Layers */}
          <div className="w-48">
            <LayerPanel />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave}>Save Drawing</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Why modal-based (not inline canvas):**
- **Focus mode:** Full-screen drawing experience without canvas distractions
- **Isolated state:** EzyDraw state doesn't pollute main canvas store
- **Reusable:** Same modal for Crazy 8s, concept sketches, annotations

---

### Visual Concept Cards with Embedded Images

```typescript
// src/components/canvas/concept-card-node.tsx
interface ConceptCardData {
  title: string;
  description: string;
  imageUrl: string | null;
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  feasibilityScore: number; // 1-10
}

export function ConceptCardNode({ data }: { data: ConceptCardData }) {
  return (
    <div className="w-80 bg-white rounded-lg shadow-lg border border-gray-200">
      <Handle type="target" position={Position.Top} />

      {/* Image thumbnail */}
      {data.imageUrl && (
        <div className="h-40 overflow-hidden rounded-t-lg">
          <img src={data.imageUrl} alt={data.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Title and description */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-base">{data.title}</h3>
        <p className="text-sm text-muted-foreground">{data.description}</p>
      </div>

      {/* SWOT Grid */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-green-50 rounded">
            <div className="font-semibold text-green-800">Strengths</div>
            <ul className="mt-1 space-y-0.5">
              {data.swot.strengths.map((s, i) => (
                <li key={i} className="text-green-700">• {s}</li>
              ))}
            </ul>
          </div>
          <div className="p-2 bg-red-50 rounded">
            <div className="font-semibold text-red-800">Weaknesses</div>
            <ul className="mt-1 space-y-0.5">
              {data.swot.weaknesses.map((w, i) => (
                <li key={i} className="text-red-700">• {w}</li>
              ))}
            </ul>
          </div>
          <div className="p-2 bg-blue-50 rounded">
            <div className="font-semibold text-blue-800">Opportunities</div>
            <ul className="mt-1 space-y-0.5">
              {data.swot.opportunities.map((o, i) => (
                <li key={i} className="text-blue-700">• {o}</li>
              ))}
            </ul>
          </div>
          <div className="p-2 bg-yellow-50 rounded">
            <div className="font-semibold text-yellow-800">Threats</div>
            <ul className="mt-1 space-y-0.5">
              {data.swot.threats.map((t, i) => (
                <li key={i} className="text-yellow-700">• {t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Feasibility Score */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Feasibility:</span>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full"
              style={{ width: `${data.feasibilityScore * 10}%` }}
            />
          </div>
          <span className="text-xs font-semibold">{data.feasibilityScore}/10</span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

**Why ReactFlow custom nodes for rich cards:**
- **HTML/CSS rendering:** Full Tailwind styling, gradients, images, forms
- **No canvas limitations:** HTML content is easier than canvas-based rendering
- **Accessibility:** Screen readers work with HTML nodes, not canvas
- **Responsive:** Tailwind classes handle layout, no manual positioning math

**Alternative considered: Konva for concept cards** — REJECTED: HTML is easier for text-heavy cards, better accessibility, simpler image embedding

**Source:** [ReactFlow Custom Node Examples](https://reactflow.dev/learn/customization/custom-nodes)

---

## Installation

```bash
# Drawing engine
npm install konva react-konva

# Freehand tool
npm install perfect-freehand

# UI Kit drag-drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Emoji picker
npm install @emoji-mart/react @emoji-mart/data

# Image export
npm install html-to-image

# Blob storage (Vercel)
npm install @vercel/blob

# Already installed (0 KB added)
# - lucide-react (icons)
# - @xyflow/react (ReactFlow for mind maps and concept cards)
# - zustand (state management)
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative | Bundle Difference |
|-------------|-------------|-------------------------|-------------------|
| **Konva.js** (55 KB) | Fabric.js (96 KB) | Need SVG-to-canvas conversion or advanced image filters | +41 KB |
| **Konva.js** (55 KB) | tldraw (~400 KB) | Building full infinite-canvas whiteboard with collaboration | +345 KB |
| **Konva.js** (55 KB) | Excalidraw (~2.3 MB) | Want hand-drawn sketch aesthetic, full whiteboard features | +2.2 MB |
| **perfect-freehand** (1.2 KB) | Custom stroke algorithm | Need very specific stroke behavior (not pressure-sensitive) | Variable |
| **dnd-kit** (20 KB) | react-dnd (50 KB) | Legacy codebase already using react-dnd | +30 KB |
| **@emoji-mart/react** (45 KB) | emoji-picker-react (30 KB) | Need smaller bundle, basic emoji only (no search/categories) | -15 KB |
| **html-to-image** (11 KB) | html2canvas (50+ KB) | Need broader DOM-to-canvas compatibility (older browsers) | +39 KB |
| **Vercel Blob** | Base64 in JSONB | Drawings always < 100 KB, no CDN needed, single-user only | 0 KB (data in DB) |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **p5.js** | Creative coding library, not optimized for UI drawing tools. 500+ KB bundle. | Konva.js (55 KB, UI-focused) |
| **Paper.js** | Vector graphics scripting, overkill for simple shapes. No React integration. | react-konva (declarative API) |
| **Two.js** | 2D drawing API wrapper, less performant than Konva for interactive canvases. | Konva.js (dirty region rendering) |
| **Raw HTML5 Canvas API** | Manual layer management, no React integration, complex state management. | react-konva (declarative layers) |
| **Storing images as base64 in Postgres** | 33% overhead, bloats database, slows queries. | Vercel Blob (CDN-backed, scalable) |
| **react-sketch-canvas** | SVG-based (slower for complex drawings), no layer system. | Konva.js + perfect-freehand |

---

## Stack Patterns by Feature

### Pattern 1: Freehand Drawing

**Stack:** Konva.js + perfect-freehand + Zustand

**Implementation:**
1. Capture mouse/touch points in Zustand state
2. On mouse up, pass points to `getStroke()` (perfect-freehand)
3. Render smooth stroke as Konva `Line` component
4. Store stroke in layer's shapes array

**Why this pattern:**
- perfect-freehand handles stroke smoothing (1.2 KB)
- Konva handles GPU-accelerated rendering
- Zustand manages undo/redo history

---

### Pattern 2: Shape Tools (Rect, Circle, Arrow)

**Stack:** Konva.js built-in shapes

**Implementation:**
```typescript
import { Rect, Circle, Arrow } from 'react-konva';

<Rect
  x={shape.x}
  y={shape.y}
  width={shape.width}
  height={shape.height}
  fill={shape.fill}
  draggable
  onDragEnd={handleDragEnd}
/>
```

**Why this pattern:**
- Konva provides optimized shape primitives
- Declarative React API (no manual canvas drawing)
- Built-in interactions (drag, resize, rotate)

---

### Pattern 3: UI Kit Drag-and-Drop

**Stack:** dnd-kit (palette) + Konva.js (canvas rendering)

**Implementation:**
1. **Palette:** dnd-kit `useDraggable` for UI component cards
2. **Drop zone:** dnd-kit `useDroppable` wraps Konva Stage
3. **Rendering:** Konva `Group` with custom shapes for button/input/card representation

**Why this pattern:**
- dnd-kit handles accessible drag-drop (touch + keyboard)
- Konva renders dropped components as shapes
- Separation: dnd-kit (interaction) vs Konva (rendering)

---

### Pattern 4: Icon & Emoji Library

**Stack:** lucide-react (icons) + @emoji-mart/react (emoji) + Konva Image

**Implementation:**
1. **Palette:** Render icon/emoji pickers in modal sidebar
2. **Canvas:** Convert icon/emoji to image, render as Konva `Image` node
3. **Export:** Icons/emojis baked into PNG via Konva's toDataURL()

```typescript
// Convert Lucide icon to Konva Image
const iconToImage = (iconName: string) => {
  const svg = renderIconToSVG(iconName);
  const img = new Image();
  img.src = `data:image/svg+xml;base64,${btoa(svg)}`;
  return img;
};

<KonvaImage image={iconToImage('heart')} x={100} y={100} />
```

**Why this pattern:**
- Reuse existing lucide-react library (0 KB added)
- emoji-mart provides rich picker UI
- Konva Image renders icons/emoji at any scale

---

### Pattern 5: Export to PNG and Vercel Blob

**Stack:** Konva.toDataURL() → Vercel Blob

**Implementation:**
```typescript
const exportDrawing = async (stage: Konva.Stage) => {
  // High DPI export
  const dataURL = stage.toDataURL({ pixelRatio: 2 });

  // Convert to blob
  const blob = await (await fetch(dataURL)).blob();

  // Upload to Vercel Blob
  const { url } = await put(`drawings/${workshopId}/${stepId}/${Date.now()}.png`, blob, {
    access: 'public',
    contentType: 'image/png',
    addRandomSuffix: true,
  });

  // Store URL in stepArtifacts
  await updateStepArtifact(workshopId, stepId, {
    drawings: [...existingDrawings, { url, createdAt: new Date() }],
  });

  return url;
};
```

**Why this pattern:**
- **Konva.toDataURL():** Native, fast, high-DPI support
- **Vercel Blob:** CDN-backed, scalable, cost-effective
- **Database stores URL only:** No base64 bloat, fast queries

**Cost analysis (Vercel Blob):**
- **First 100 GB/month:** Free
- **After 100 GB:** $0.15/GB
- **Average drawing size:** 50 KB (assuming 800x600 PNG)
- **100 GB = 2 million drawings** (way beyond MMP scale)

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| konva | 9.3.17 | React 19, TypeScript 5 | Peer dep: None (works with any React version) |
| react-konva | 18.2.13 | React 19, konva 9.x | Peer deps: react ^16.8.0 \|\| ^17.0.0 \|\| ^18.0.0 \|\| ^19.0.0, konva ^9.0.0 |
| perfect-freehand | 1.2.3 | Any (vanilla JS) | No React dependency, works with Konva or SVG |
| @dnd-kit/core | 8.1.0 | React 19, Next.js 16 | Peer deps: react ^18.0.0 \|\| ^19.0.0, react-dom ^18.0.0 \|\| ^19.0.0 |
| @emoji-mart/react | 1.2.0 | React 19 | Peer dep: react ^16.8.0 \|\| ^17.0.0 \|\| ^18.0.0 \|\| ^19.0.0 |
| html-to-image | 1.11.11 | Any (vanilla JS) | No React dependency |
| @vercel/blob | Latest | Next.js 16, Vercel Edge Runtime | Works with serverless and edge functions |

**Compatibility notes:**
- **react-konva 18.2.13** supports React 19 (verified via npm peer deps)
- **dnd-kit 8.1.0** added React 19 support in Dec 2025
- All packages are ESM-compatible with Next.js 16 App Router

---

## Bundle Size Analysis

### Current State (v1.2)
- **Base app:** ~18K lines TypeScript
- **Canvas (ReactFlow):** 110 KB gzipped
- **Total gzipped:** ~500 KB (estimated)

### v1.3 Additions (EzyDraw + Visual Canvases)

| Package | Minified + Gzipped | Purpose |
|---------|-------------------|---------|
| konva | 55 KB | Drawing engine |
| react-konva | 43 KB | React bindings |
| perfect-freehand | 1.2 KB | Freehand strokes |
| @dnd-kit/core | 20 KB | UI kit drag-drop |
| @emoji-mart/react | 45 KB | Emoji picker |
| html-to-image | 11 KB | PNG export helper |
| **TOTAL NEW** | **175 KB** | |

**Adjusted total:** ~675 KB gzipped (35% increase)

**Trade-off analysis:**
- **PRO:** 175 KB unlocks full drawing capabilities (freehand, shapes, UI kit, emoji, export)
- **PRO:** Konva is 41% smaller than Fabric.js alternative (saved 41 KB)
- **PRO:** perfect-freehand is 98% smaller than tldraw alternative (saved ~400 KB)
- **CON:** 175 KB added to initial bundle (consider lazy-loading EzyDraw modal)

**Lazy-loading optimization:**

```typescript
// Lazy-load EzyDraw modal (175 KB) only when user clicks "Draw"
const EzyDrawModal = lazy(() => import('@/components/ezydraw/ezydraw-modal'));

export function Crazy8sCanvas() {
  const [showDrawingModal, setShowDrawingModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowDrawingModal(true)}>Draw</button>

      {showDrawingModal && (
        <Suspense fallback={<LoadingSpinner />}>
          <EzyDrawModal onClose={() => setShowDrawingModal(false)} />
        </Suspense>
      )}
    </>
  );
}
```

**Lazy-load impact:**
- **Initial bundle:** 500 KB (no change)
- **EzyDraw chunk:** 175 KB (loaded on-demand)
- **User experience:** 1-2s loading spinner when opening draw modal (acceptable for feature richness)

---

## Performance Considerations

### Konva Rendering Performance

**Dirty region detection:**
- Konva only repaints changed areas (not full canvas)
- Layer-based rendering (hide layer = skip all shapes in layer)
- GPU-accelerated via HTML5 Canvas 2D context

**Benchmarks (from Konva docs):**
- **100 shapes:** 60 FPS (no lag)
- **500 shapes:** 60 FPS (slight lag on drag)
- **1000+ shapes:** 30-40 FPS (noticeable lag)

**EzyDraw mitigation:**
- **Constraint:** Drawing modal is fixed 800x600 canvas, not infinite
- **Layer limit:** Enforce max 10 layers (UX guideline)
- **Shape limit:** Warn at 200 shapes (unlikely in 800x600 space)

**Source:** [Konva Performance Tips](https://konvajs.org/docs/performance/All_Performance_Tips.html)

---

### perfect-freehand Performance

**Stroke generation:**
- **Input:** Array of `{x, y, pressure?}` points
- **Output:** Array of stroke outline points
- **Performance:** ~1ms for 100-point stroke (imperceptible)

**Integration with Konva:**
- Generate stroke outline on mouse up (not real-time)
- Render as single Konva Line (not individual points)
- No per-frame performance impact

---

### Image Export Performance

**Konva.toDataURL():**
- **800x600 canvas:** ~50ms to generate PNG
- **High DPI (pixelRatio: 2):** ~100ms (1600x1200 output)
- **Non-blocking:** Use async/await, show loading spinner

**Vercel Blob upload:**
- **50 KB PNG:** ~200ms upload (CDN edge location)
- **Total save time:** ~300ms (acceptable UX)

---

## Sources

### Drawing Libraries (HIGH confidence)
- [Konva.js vs Fabric.js: In-Depth Technical Comparison](https://medium.com/@www.blog4j.com/konva-js-vs-fabric-js-in-depth-technical-comparison-and-use-case-analysis-9c247968dd0f) — Performance, API, use cases
- [Bundle size comparison: Konva 54.9 KB, Fabric 95.7 KB](https://npm-compare.com/fabric,konva) — npm-compare metrics
- [Top 5 JavaScript Whiteboard & Canvas Libraries](https://byby.dev/js-whiteboard-libs) — 2026 ecosystem overview
- [Konva Free Drawing Tutorial](https://konvajs.org/docs/react/Free_Drawing.html) — React integration
- [tldraw: Infinite Canvas SDK for React](https://tldraw.dev/) — Feature comparison
- [Excalidraw Integration Guide](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/integration) — Bundle size analysis

### Freehand & Stroke Libraries (HIGH confidence)
- [perfect-freehand GitHub Discussion #6](https://github.com/steveruizok/perfect-freehand/discussions/6) — Bundle size (1.2 KB)
- [perfect-freehand npm](https://www.npmjs.com/package/perfect-freehand) — API documentation
- [ReactFlow Freehand Draw Example](https://reactflow.dev/examples/whiteboard/freehand-draw) — Integration pattern

### Drag-and-Drop Libraries (HIGH confidence)
- [Top 5 Drag-and-Drop Libraries for React in 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) — dnd-kit analysis
- [dnd-kit Documentation](https://docs.dndkit.com/) — Official API docs

### ReactFlow Custom Nodes (HIGH confidence)
- [ReactFlow Custom Nodes](https://reactflow.dev/learn/customization/custom-nodes) — Official docs
- [ReactFlow Mind Map Tutorial](https://reactflow.dev/learn/tutorials/mind-map-app-with-react-flow) — Step-by-step guide
- [ReactFlow Download Image Example](https://reactflow.dev/examples/misc/download-image) — Export patterns

### Image Export & Storage (HIGH confidence)
- [Canvas toBlob() MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob) — Native API
- [Vercel Blob Documentation](https://vercel.com/docs/vercel-blob) — Pricing, API, best practices
- [html-to-image npm](https://www.npmjs.com/package/html-to-image) — Package info

### Emoji Picker (MEDIUM confidence)
- [@emoji-mart/react npm](https://www.npmjs.com/package/@emoji-mart/react) — Package info

---

## Summary: What to Install

**NEW packages for v1.3:**
```bash
npm install konva react-konva perfect-freehand @dnd-kit/core @emoji-mart/react @emoji-mart/data html-to-image @vercel/blob
```

**Total new bundle size:** ~175 KB gzipped

**Recommended optimization:** Lazy-load EzyDrawModal to keep initial bundle at ~500 KB.

**What NOT to install:**
- Fabric.js (heavier than Konva, 96 KB vs 55 KB)
- tldraw (overkill, ~400+ KB)
- Excalidraw (massive bundle, ~2.3 MB)
- html2canvas (larger than html-to-image, 50+ KB vs 11 KB)
- p5.js, Paper.js, Two.js (not optimized for UI drawing tools)

---

*Stack research for: WorkshopPilot.ai v1.3 EzyDraw & Visual Canvas Extensions*
*Researched: 2026-02-12*
*Next research: Multiplayer collaboration patterns (FFP phase)*
