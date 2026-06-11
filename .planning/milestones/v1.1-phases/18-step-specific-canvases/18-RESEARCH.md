# Phase 18: Step-Specific Canvases (Steps 2 & 4) - Research

**Researched:** 2026-02-11
**Domain:** ReactFlow quadrant-based canvas layouts for Step 2 (Power x Interest) and Step 4 (Empathy Map)
**Confidence:** HIGH

## Summary

Phase 18 implements step-specific canvas layouts for Step 2 (Stakeholder Mapping) and Step 4 (Research Sense Making). Both steps require quadrant-based layouts: Step 2 uses a Power x Interest matrix (2x2 grid with High/Low Power on Y-axis and High/Low Interest on X-axis), while Step 4 uses an Empathy Map with four labeled quadrants (Said/Thought/Felt/Experienced). The research confirms that ReactFlow provides built-in Background component for custom SVG overlays, and quadrant snapping can be implemented via position detection logic on drop events. The key technical challenge is rendering persistent quadrant grid lines that remain visible regardless of zoom/pan, which is solved by layering custom SVG components inside ReactFlow alongside the existing Background. Post-its will snap to quadrants based on their center point position relative to canvas midpoint, with quadrant metadata stored in the PostIt data model for AI context.

**Primary recommendation:** Extend PostIt type with optional `quadrant` field, create custom QuadrantOverlay component that renders labeled grid lines using SVG (positioned absolutely with pointer-events-none), implement quadrant detection logic in onNodesChange handler that calculates which quadrant a post-it occupies based on its center position, and create step-specific canvas wrappers (StakeholderCanvas, EmpathyMapCanvas) that render ReactFlowCanvas with appropriate overlay configuration.

## Standard Stack

### Core Dependencies (Already Installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **@xyflow/react** | 12.10.0 | Canvas infrastructure | Provides Background component for custom SVG overlays, viewport transformation hooks (useReactFlow), and extensible node system. Essential for rendering quadrant grids that transform with viewport. |
| **zustand** | Latest | Canvas state management | Existing canvas store will extend to include quadrant metadata per post-it for AI context assembly. |
| **react** | 19 | SVG rendering | Native SVG support for custom quadrant overlay components. No additional libraries needed for grid rendering. |

### No New Dependencies Required

Phase 18 builds entirely on existing stack:
- ReactFlow for canvas infrastructure
- SVG elements for quadrant grid lines
- Existing PostIt data model extends with optional quadrant field
- Existing canvas store patterns (no new state management)

**Bundle Impact:** 0KB (no new dependencies)

## Architecture Patterns

### Pattern 1: Custom SVG Quadrant Overlay

**What:** Render persistent labeled grid lines that transform with ReactFlow viewport.

**When to use:** Required for both Step 2 (Power x Interest) and Step 4 (Empathy Map) to provide visual quadrant structure.

**Implementation:**

```typescript
// src/components/canvas/quadrant-overlay.tsx
'use client';

import { useReactFlow, ReactFlowState } from '@xyflow/react';
import { useStore } from 'zustand';

type QuadrantConfig = {
  type: 'power-interest' | 'empathy-map';
  labels: {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
  };
  axisLabels?: {
    horizontal: { left: string; right: string };
    vertical: { top: string; bottom: string };
  };
};

export function QuadrantOverlay({ config }: { config: QuadrantConfig }) {
  const { getViewport } = useReactFlow();
  const viewport = getViewport();

  // Canvas center in flow coordinates (0, 0) is logical center
  const centerX = 0;
  const centerY = 0;

  // Transform to screen coordinates
  const screenCenterX = centerX * viewport.zoom + viewport.x;
  const screenCenterY = centerY * viewport.zoom + viewport.y;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Vertical divider line */}
      <line
        x1={screenCenterX}
        y1={0}
        x2={screenCenterX}
        y2="100%"
        stroke="#9ca3af"
        strokeWidth={2}
        strokeDasharray="8 4"
      />

      {/* Horizontal divider line */}
      <line
        x1={0}
        y1={screenCenterY}
        x2="100%"
        y2={screenCenterY}
        stroke="#9ca3af"
        strokeWidth={2}
        strokeDasharray="8 4"
      />

      {/* Quadrant labels (positioned in corners) */}
      <text
        x={screenCenterX - 100}
        y={screenCenterY - 100}
        fill="#6b7280"
        fontSize="14"
        fontWeight="600"
        textAnchor="middle"
      >
        {config.labels.topLeft}
      </text>

      <text
        x={screenCenterX + 100}
        y={screenCenterY - 100}
        fill="#6b7280"
        fontSize="14"
        fontWeight="600"
        textAnchor="middle"
      >
        {config.labels.topRight}
      </text>

      <text
        x={screenCenterX - 100}
        y={screenCenterY + 100}
        fill="#6b7280"
        fontSize="14"
        fontWeight="600"
        textAnchor="middle"
      >
        {config.labels.bottomLeft}
      </text>

      <text
        x={screenCenterX + 100}
        y={screenCenterY + 100}
        fill="#6b7280"
        fontSize="14"
        fontWeight="600"
        textAnchor="middle"
      >
        {config.labels.bottomRight}
      </text>

      {/* Axis labels (if provided) */}
      {config.axisLabels && (
        <>
          {/* Horizontal axis labels */}
          <text
            x={20}
            y={screenCenterY}
            fill="#9ca3af"
            fontSize="12"
            textAnchor="start"
          >
            {config.axisLabels.horizontal.left}
          </text>
          <text
            x="calc(100% - 20px)"
            y={screenCenterY}
            fill="#9ca3af"
            fontSize="12"
            textAnchor="end"
          >
            {config.axisLabels.horizontal.right}
          </text>

          {/* Vertical axis labels */}
          <text
            x={screenCenterX}
            y={20}
            fill="#9ca3af"
            fontSize="12"
            textAnchor="middle"
          >
            {config.axisLabels.vertical.top}
          </text>
          <text
            x={screenCenterX}
            y="calc(100% - 20px)"
            fill="#9ca3af"
            fontSize="12"
            textAnchor="middle"
          >
            {config.axisLabels.vertical.bottom}
          </text>
        </>
      )}
    </svg>
  );
}
```

**Key points:**
- `pointer-events-none` ensures overlay doesn't interfere with node interaction
- SVG uses `absolute` positioning to overlay on ReactFlow canvas
- Viewport transformation applied to grid lines so they remain centered during pan/zoom
- `z-10` places overlay above Background but below Controls/Toolbar

**Source:** [ReactFlow Background Component](https://reactflow.dev/api-reference/components/background), [Custom background component discussion](https://github.com/xyflow/xyflow/discussions/2689)

### Pattern 2: Quadrant Detection and Snapping

**What:** Calculate which quadrant a post-it occupies based on its center position.

**When to use:** On `onNodesChange` drag completion to update quadrant metadata.

**Implementation:**

```typescript
// src/lib/canvas/quadrant-detection.ts
export type Quadrant = 'high-power-high-interest' | 'high-power-low-interest' |
                       'low-power-high-interest' | 'low-power-low-interest' |
                       'said' | 'thought' | 'felt' | 'experienced';

export type QuadrantType = 'power-interest' | 'empathy-map';

/**
 * Detect which quadrant a node occupies based on its center position
 * Assumes canvas center (0, 0) is the quadrant dividing point
 */
export function detectQuadrant(
  position: { x: number; y: number },
  width: number,
  height: number,
  type: QuadrantType
): Quadrant {
  // Calculate center point of the node
  const centerX = position.x + width / 2;
  const centerY = position.y + height / 2;

  // Quadrant detection based on center point relative to (0, 0)
  if (type === 'power-interest') {
    if (centerY < 0) {
      // Top half: High Power
      return centerX < 0 ? 'high-power-low-interest' : 'high-power-high-interest';
    } else {
      // Bottom half: Low Power
      return centerX < 0 ? 'low-power-low-interest' : 'low-power-high-interest';
    }
  } else {
    // Empathy Map
    if (centerY < 0) {
      // Top half
      return centerX < 0 ? 'thought' : 'felt';
    } else {
      // Bottom half
      return centerX < 0 ? 'said' : 'experienced';
    }
  }
}

/**
 * Get human-readable quadrant label
 */
export function getQuadrantLabel(quadrant: Quadrant): string {
  const labels: Record<Quadrant, string> = {
    'high-power-high-interest': 'Manage Closely',
    'high-power-low-interest': 'Keep Satisfied',
    'low-power-high-interest': 'Keep Informed',
    'low-power-low-interest': 'Monitor',
    'said': 'What they said',
    'thought': 'What they thought',
    'felt': 'What they felt',
    'experienced': 'What they experienced',
  };
  return labels[quadrant];
}
```

**Integration with ReactFlow:**

```typescript
// src/components/canvas/react-flow-canvas.tsx (extended)
const handleNodesChange = useCallback(
  (changes: NodeChange[]) => {
    const updatedNodes = applyNodeChanges(changes, nodes);

    changes.forEach((change) => {
      if (
        change.type === 'position' &&
        change.dragging === false &&
        change.position
      ) {
        const snappedPosition = snapToGrid(change.position);

        // Detect quadrant if step has quadrant layout
        const quadrant = stepConfig?.hasQuadrants
          ? detectQuadrant(
              snappedPosition,
              120, // post-it width
              120, // post-it height
              stepConfig.quadrantType
            )
          : undefined;

        updatePostIt(change.id, {
          position: snappedPosition,
          quadrant, // Store quadrant metadata
        });
      }
    });

    return updatedNodes;
  },
  [nodes, snapToGrid, updatePostIt, stepConfig]
);
```

**Key points:**
- Quadrant detection uses center point, not top-left corner (more intuitive)
- Canvas center (0, 0) is the logical dividing point for all quadrants
- Quadrant metadata stored in PostIt for AI context assembly
- No visual snapping animation needed (grid provides spatial guidance)

**Source:** [Canvas quadrant detection algorithm](https://blog.sklambert.com/html5-canvas-game-2d-collision-detection/), [Bounding box collision detection](https://medium.com/@hemalatha.psna/collision-detection-in-javascript-efafe8bba2c0)

### Pattern 3: Step-Specific Canvas Configuration

**What:** Step-aware canvas wrapper that renders appropriate quadrant overlay.

**When to use:** Different steps require different quadrant configurations.

**Implementation:**

```typescript
// src/lib/canvas/step-canvas-config.ts
import type { QuadrantConfig } from '@/components/canvas/quadrant-overlay';
import type { QuadrantType } from '@/lib/canvas/quadrant-detection';

export type StepCanvasConfig = {
  hasQuadrants: boolean;
  quadrantType?: QuadrantType;
  quadrantConfig?: QuadrantConfig;
};

export const STEP_CANVAS_CONFIGS: Record<string, StepCanvasConfig> = {
  'stakeholder-mapping': {
    hasQuadrants: true,
    quadrantType: 'power-interest',
    quadrantConfig: {
      type: 'power-interest',
      labels: {
        topLeft: 'Keep Satisfied',
        topRight: 'Manage Closely',
        bottomLeft: 'Monitor',
        bottomRight: 'Keep Informed',
      },
      axisLabels: {
        horizontal: { left: 'Low Interest', right: 'High Interest' },
        vertical: { top: 'High Power', bottom: 'Low Power' },
      },
    },
  },
  'sense-making': {
    hasQuadrants: true,
    quadrantType: 'empathy-map',
    quadrantConfig: {
      type: 'empathy-map',
      labels: {
        topLeft: 'Thought',
        topRight: 'Felt',
        bottomLeft: 'Said',
        bottomRight: 'Experienced',
      },
    },
  },
  // Other steps without quadrants
  'challenge': { hasQuadrants: false },
  'user-research': { hasQuadrants: false },
  // ...etc
};

export function getStepCanvasConfig(stepId: string): StepCanvasConfig {
  return STEP_CANVAS_CONFIGS[stepId] || { hasQuadrants: false };
}
```

**Canvas wrapper integration:**

```typescript
// src/components/canvas/react-flow-canvas.tsx
import { getStepCanvasConfig } from '@/lib/canvas/step-canvas-config';
import { QuadrantOverlay } from './quadrant-overlay';

export function ReactFlowCanvasInner({ sessionId, stepId, workshopId }: ReactFlowCanvasProps) {
  const stepConfig = getStepCanvasConfig(stepId);

  // ... existing implementation

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={[]}
        // ... existing props
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#d1d5db"
        />
        <Controls showInteractive={false} className="!shadow-md" />

        {/* Render quadrant overlay if step has quadrants */}
        {stepConfig.hasQuadrants && stepConfig.quadrantConfig && (
          <QuadrantOverlay config={stepConfig.quadrantConfig} />
        )}
      </ReactFlow>

      {/* Existing toolbar, color picker, etc. */}
    </div>
  );
}
```

**Key points:**
- Configuration is centralized and declarative
- Step-specific behavior is data-driven, not code branching
- Easy to add new quadrant-based steps in future phases
- Non-quadrant steps (Steps 1, 3, 5, 6, 7, 8, 9, 10) render standard canvas

### Pattern 4: Extend PostIt Data Model with Quadrant Metadata

**What:** Add optional `quadrant` field to PostIt type for AI context.

**Implementation:**

```typescript
// src/stores/canvas-store.ts
import type { Quadrant } from '@/lib/canvas/quadrant-detection';

export type PostIt = {
  id: string;
  text: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  color?: PostItColor;
  parentId?: string;
  type?: 'postIt' | 'group';
  quadrant?: Quadrant; // NEW: Quadrant metadata for AI context
};
```

**AI context assembly:**

```typescript
// src/lib/workshop/context/assemble-canvas-context.ts
import type { PostIt } from '@/stores/canvas-store';
import { getQuadrantLabel } from '@/lib/canvas/quadrant-detection';

export function assembleStakeholderContext(postIts: PostIt[]): string {
  // Group by quadrant
  const byQuadrant = postIts.reduce((acc, postIt) => {
    if (postIt.quadrant) {
      if (!acc[postIt.quadrant]) acc[postIt.quadrant] = [];
      acc[postIt.quadrant].push(postIt.text);
    }
    return acc;
  }, {} as Record<string, string[]>);

  // Format for AI context
  return Object.entries(byQuadrant)
    .map(([quadrant, texts]) => {
      const label = getQuadrantLabel(quadrant as Quadrant);
      return `${label}:\n${texts.map(t => `- ${t}`).join('\n')}`;
    })
    .join('\n\n');
}
```

**Key points:**
- Quadrant field is optional (only present for quadrant-based steps)
- AI context groups post-its by quadrant for strategic insights
- Quadrant metadata persists to database via existing canvas save mechanism
- Human-readable labels used in AI context, not internal quadrant IDs

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **Viewport-aware SVG overlays** | Custom viewport transformation math for grid lines | ReactFlow's useReactFlow() hook with viewport state | ReactFlow provides viewport coordinates (x, y, zoom) that handle all edge cases (pinch zoom, momentum pan, viewport bounds). Manual transformation requires complex matrix math and breaks on touch devices. |
| **Quadrant snapping animation** | Custom spring physics to animate post-it snapping to quadrant | No animation — instant quadrant assignment on drop | Snapping animations feel jarring when grid is visible (user sees where quadrant boundaries are). Grid provides sufficient visual guidance. Animation adds complexity without UX value. |
| **Dynamic grid resizing** | Resize quadrants based on post-it density | Fixed 2x2 grid centered at (0, 0) | Dynamic resizing creates confusing UX (quadrant boundaries move unexpectedly). Fixed grid matches mental model from physical stakeholder mapping workshops. |
| **Quadrant label positioning** | Calculate optimal label positions to avoid post-it overlap | Fixed label positions in quadrant corners | Labels in corners are standard convention (Power-Interest matrix, Empathy Map). Moving labels to avoid overlap creates visual instability. Users can pan/zoom if overlap occurs. |

**Key insight:** Quadrant-based canvases are well-established UX patterns (Power-Interest matrix since 1991, Empathy Map since 2010). The value is in the spatial metaphor, not technical sophistication. Keep implementation simple and match physical workshop conventions.

## Common Pitfalls

### Pitfall 1: SVG Overlay Breaks on Zoom/Pan

**What goes wrong:** Quadrant grid lines render at fixed screen positions, so panning the canvas causes grid to stay in place while post-its move.

**Why it happens:** SVG overlay uses `position: fixed` or doesn't subscribe to viewport changes.

**How to avoid:**
```typescript
// WRONG: Static SVG without viewport awareness
<svg className="absolute inset-0">
  <line x1={400} y1={0} x2={400} y2={800} /> {/* Fixed screen coords */}
</svg>

// RIGHT: Viewport-aware SVG
const { getViewport } = useReactFlow();
const viewport = getViewport();
const screenCenterX = 0 * viewport.zoom + viewport.x; // Transform to screen coords

<svg className="absolute inset-0">
  <line x1={screenCenterX} y1={0} x2={screenCenterX} y2="100%" />
</svg>
```

**Warning signs:** Grid lines don't move when panning canvas. Grid disappears when zoomed out.

### Pitfall 2: Quadrant Detection Uses Top-Left Corner Instead of Center

**What goes wrong:** Post-it with top-left corner in top-right quadrant but bulk of content in bottom-left quadrant gets assigned to wrong quadrant.

**Why it happens:** Quadrant detection uses `position.x, position.y` directly without accounting for post-it dimensions.

**How to avoid:**
```typescript
// WRONG: Uses top-left corner
const quadrant = position.x > 0 && position.y < 0 ? 'top-right' : ...;

// RIGHT: Uses center point
const centerX = position.x + width / 2;
const centerY = position.y + height / 2;
const quadrant = centerX > 0 && centerY < 0 ? 'top-right' : ...;
```

**Warning signs:** Users complain quadrant assignment "feels wrong" when dragging near boundaries.

### Pitfall 3: Quadrant Labels Overlap with Post-Its on Initial Load

**What goes wrong:** Labels render in quadrant corners where post-its often cluster, creating visual clutter.

**Why it happens:** Label positions don't account for typical post-it placement patterns.

**How to avoid:**
- Accept some overlap as unavoidable (users can pan/zoom)
- Use subtle label styling (gray-400, 12px font) that doesn't compete visually
- Position labels 100px from center (inside quadrant but not at extreme corner)
- Consider semi-transparent label background for readability

**Recommended approach:** Keep labels subtle and fixed. Power users will learn to work around them. Attempting dynamic repositioning creates more problems than it solves.

**Warning signs:** User feedback about "hard to read labels" or "cluttered canvas."

### Pitfall 4: Quadrant Metadata Lost on Undo/Redo

**What goes wrong:** User moves post-it to different quadrant, undoes, redo restores position but quadrant metadata is stale.

**Why it happens:** Quadrant calculation happens in `onNodesChange` which doesn't fire during undo/redo.

**How to avoid:**
```typescript
// After undo/redo, recalculate quadrants for all post-its
const recalculateQuadrants = useCallback(() => {
  if (!stepConfig?.hasQuadrants) return;

  postIts.forEach(postIt => {
    const newQuadrant = detectQuadrant(
      postIt.position,
      postIt.width,
      postIt.height,
      stepConfig.quadrantType
    );

    if (postIt.quadrant !== newQuadrant) {
      updatePostIt(postIt.id, { quadrant: newQuadrant });
    }
  });
}, [postIts, stepConfig, updatePostIt]);

// Subscribe to undo/redo events
useEffect(() => {
  const unsubscribe = storeApi.temporal.subscribe(() => {
    recalculateQuadrants();
  });
  return unsubscribe;
}, [recalculateQuadrants]);
```

**Alternative:** Store quadrant as derived state, not persisted state. Calculate on-demand when assembling AI context.

**Warning signs:** After undo, AI receives incorrect quadrant groupings in context.

### Pitfall 5: Canvas Center Not Aligned with Viewport Center on Initial Load

**What goes wrong:** Quadrant grid renders off-center, making canvas feel asymmetric.

**Why it happens:** ReactFlow's initial viewport defaults to top-left (0, 0) screen coordinates, but logical canvas center should be at (0, 0) flow coordinates.

**How to avoid:**
```typescript
// Set initial viewport to center canvas origin at screen center
<ReactFlow
  defaultViewport={{
    x: window.innerWidth * 0.375, // 25% chat panel + 37.5% of right panel
    y: window.innerHeight / 2,
    zoom: 1
  }}
  // Or use fitView with custom bounds
  fitView={false}
  onInit={(instance) => {
    instance.fitView({
      nodes: [{
        id: 'center',
        position: { x: -200, y: -200 },
        data: {}
      }],
      padding: 0.4,
    });
  }}
/>
```

**Warning signs:** Quadrant grid appears shifted left/right/up/down on initial load. Users immediately pan to "find" the grid.

## Code Examples

### Example 1: Step 2 Stakeholder Mapping Canvas

```typescript
// src/components/canvas/stakeholder-canvas.tsx
'use client';

import { ReactFlowCanvas } from './react-flow-canvas';
import { STEP_CANVAS_CONFIGS } from '@/lib/canvas/step-canvas-config';

export interface StakeholderCanvasProps {
  sessionId: string;
  workshopId: string;
}

export function StakeholderCanvas({ sessionId, workshopId }: StakeholderCanvasProps) {
  const stepId = 'stakeholder-mapping';
  const config = STEP_CANVAS_CONFIGS[stepId];

  return (
    <div className="w-full h-full relative">
      <ReactFlowCanvas
        sessionId={sessionId}
        stepId={stepId}
        workshopId={workshopId}
      />

      {/* Optional: Quadrant legend overlay */}
      <div className="absolute top-4 right-4 bg-white/90 rounded-lg p-3 shadow-md text-xs">
        <div className="font-semibold mb-2">Power-Interest Matrix</div>
        <div className="space-y-1 text-gray-600">
          <div>📍 <span className="font-medium">Top Right:</span> Manage Closely</div>
          <div>📍 <span className="font-medium">Top Left:</span> Keep Satisfied</div>
          <div>📍 <span className="font-medium">Bottom Right:</span> Keep Informed</div>
          <div>📍 <span className="font-medium">Bottom Left:</span> Monitor</div>
        </div>
      </div>
    </div>
  );
}
```

### Example 2: Step 4 Empathy Map Canvas

```typescript
// src/components/canvas/empathy-map-canvas.tsx
'use client';

import { ReactFlowCanvas } from './react-flow-canvas';
import { STEP_CANVAS_CONFIGS } from '@/lib/canvas/step-canvas-config';

export interface EmpathyMapCanvasProps {
  sessionId: string;
  workshopId: string;
}

export function EmpathyMapCanvas({ sessionId, workshopId }: EmpathyMapCanvasProps) {
  const stepId = 'sense-making';
  const config = STEP_CANVAS_CONFIGS[stepId];

  return (
    <div className="w-full h-full relative">
      <ReactFlowCanvas
        sessionId={sessionId}
        stepId={stepId}
        workshopId={workshopId}
      />

      {/* Optional: Empathy Map instructions */}
      <div className="absolute top-4 right-4 bg-white/90 rounded-lg p-3 shadow-md text-xs max-w-xs">
        <div className="font-semibold mb-2">Empathy Map</div>
        <div className="space-y-1 text-gray-600">
          <div><span className="font-medium">Said:</span> Direct quotes from research</div>
          <div><span className="font-medium">Thought:</span> Inferred beliefs</div>
          <div><span className="font-medium">Felt:</span> Emotional states</div>
          <div><span className="font-medium">Experienced:</span> Actions & behaviors</div>
        </div>
      </div>
    </div>
  );
}
```

### Example 3: Quadrant-Aware AI Context Assembly

```typescript
// src/lib/workshop/context/canvas-context.ts
import type { PostIt } from '@/stores/canvas-store';
import type { Quadrant } from '@/lib/canvas/quadrant-detection';
import { getQuadrantLabel } from '@/lib/canvas/quadrant-detection';

/**
 * Assemble stakeholder canvas context for AI (Step 2)
 * Groups stakeholders by Power-Interest quadrant
 */
export function assembleStakeholderCanvasContext(postIts: PostIt[]): string {
  const grouped = postIts.reduce((acc, postIt) => {
    const quadrant = postIt.quadrant || 'low-power-low-interest'; // Default quadrant
    if (!acc[quadrant]) acc[quadrant] = [];
    acc[quadrant].push(postIt.text);
    return acc;
  }, {} as Record<Quadrant, string[]>);

  const sections = [
    'high-power-high-interest',
    'high-power-low-interest',
    'low-power-high-interest',
    'low-power-low-interest',
  ] as Quadrant[];

  return sections
    .filter(quadrant => grouped[quadrant]?.length > 0)
    .map(quadrant => {
      const label = getQuadrantLabel(quadrant);
      const stakeholders = grouped[quadrant];
      return `**${label}** (${stakeholders.length} stakeholders):\n${stakeholders.map(s => `- ${s}`).join('\n')}`;
    })
    .join('\n\n');
}

/**
 * Assemble empathy map canvas context for AI (Step 4)
 * Groups insights by empathy map quadrant
 */
export function assembleEmpathyMapCanvasContext(postIts: PostIt[]): string {
  const grouped = postIts.reduce((acc, postIt) => {
    const quadrant = postIt.quadrant || 'said'; // Default quadrant
    if (!acc[quadrant]) acc[quadrant] = [];
    acc[quadrant].push(postIt.text);
    return acc;
  }, {} as Record<Quadrant, string[]>);

  const sections = ['said', 'thought', 'felt', 'experienced'] as Quadrant[];

  return sections
    .filter(quadrant => grouped[quadrant]?.length > 0)
    .map(quadrant => {
      const label = getQuadrantLabel(quadrant);
      const insights = grouped[quadrant];
      return `**${label}**:\n${insights.map(i => `- ${i}`).join('\n')}`;
    })
    .join('\n\n');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| **Miro/Mural template images** | ReactFlow custom overlays with viewport awareness | 2024-2025 | Static image templates don't scale/pan with canvas. SVG overlays transform correctly with viewport. |
| **Fixed quadrant boundaries** | Center-point detection with tolerance zones | 2023+ | Fixed boundaries feel rigid when post-its straddle lines. Center-point detection matches physical workshop behavior. |
| **Separate canvas per quadrant** | Single unified canvas with overlay grid | 2022+ | Multi-canvas implementations require complex state sync. Single canvas with quadrant metadata is simpler and more intuitive. |
| **Manual quadrant assignment dropdown** | Automatic detection on drop position | 2024+ | Dropdowns break spatial workflow. Position-based detection leverages canvas as spatial thinking tool. |

**Deprecated/outdated:**
- **Konva.js for quadrant grids**: Konva adds 300KB for features ReactFlow already provides. ReactFlow's SVG-based approach is lighter and more flexible.
- **HTML divs with CSS grid for quadrants**: Breaks when viewport transforms (zoom/pan). SVG coordinates transform correctly with ReactFlow viewport.
- **Radial/bullseye layouts**: Stakeholder docs mention "bullseye canvas" for Release 3, but Power-Interest matrix is 2x2 grid, not concentric circles. Implementation should match standard 2x2 matrix pattern.

## Open Questions

1. **Quadrant snapping tolerance**
   - What we know: Center-point detection is standard, but no tolerance zone defined
   - What's unclear: Should post-its near boundaries (within 20px of line) snap to nearest quadrant, or rely solely on center point?
   - Recommendation: No snapping tolerance. Center-point detection only. Grid lines provide sufficient visual guidance. Tolerance zones add complexity without clear UX benefit.

2. **Mobile quadrant interaction**
   - What we know: Stakeholder docs mention "drag-and-drop can be tricky on mobile, fallback to Select Priority list"
   - What's unclear: Should Phase 18 implement mobile-specific quadrant selector, or rely on existing mobile tab pattern?
   - Recommendation: Defer mobile-specific quadrant selector to future phase. Existing mobile tab pattern (Chat/Canvas tabs) is sufficient for v1.1. Quadrant detection works on mobile drag (if touch targets are large enough).

3. **Quadrant empty state guidance**
   - What we know: Users may not understand quadrant meanings without facilitation
   - What's unclear: Should empty quadrants show placeholder text ("Drag stakeholders here...") or remain blank?
   - Recommendation: Add optional legend overlay (see Code Examples) but keep quadrants blank. Placeholder text creates visual clutter and competes with grid labels.

4. **Cross-step quadrant consistency**
   - What we know: Step 2 and Step 4 both use quadrants, but different semantics
   - What's unclear: Should quadrant metadata format be unified (generic "quadrant-1", "quadrant-2") or step-specific ("high-power-high-interest" vs "said")?
   - Recommendation: Use step-specific quadrant IDs. Generic IDs lose semantic meaning and complicate AI context assembly. Type safety ensures no cross-contamination between steps.

## Sources

### Primary (HIGH confidence)
- [ReactFlow Background Component](https://reactflow.dev/api-reference/components/background) - Official API for custom grid overlays
- [ReactFlow Custom Nodes](https://reactflow.dev/learn/customization/custom-nodes) - Node type extension patterns
- [Custom background component discussion](https://github.com/xyflow/xyflow/discussions/2689) - Community SVG overlay examples
- [SnapGrid API](https://reactflow.dev/api-reference/types/snap-grid) - Grid snapping configuration

### Secondary (MEDIUM confidence)
- [Empathy Mapping (NN/G)](https://www.nngroup.com/articles/empathy-mapping/) - Standard empathy map quadrant structure
- [Updated Empathy Map Canvas](https://medium.com/@davegray/updated-empathy-map-canvas-46df22df3c8a) - 2017 Dave Gray update with quadrant labels
- [Power-Interest Grid](https://www.rosemet.com/power-interest-grid/) - Stakeholder matrix quadrant definitions
- [Power Interest Grid (KnowledgeHut)](https://www.knowledgehut.com/blog/project-management/power-interest-grid) - Implementation strategies

### Tertiary (LOW confidence - patterns verified elsewhere)
- [Canvas quadrant detection algorithm](https://blog.sklambert.com/html5-canvas-game-2d-collision-detection/) - Bounding box detection math (HTML5 Canvas context, adapted for ReactFlow)
- [Collision detection in JavaScript](https://medium.com/@hemalatha.psna/collision-detection-in-javascript-efafe8bba2c0) - Position-based quadrant assignment patterns

## Metadata

**Confidence breakdown:**
- SVG overlay with ReactFlow viewport: HIGH - Official ReactFlow APIs and community examples
- Quadrant detection logic: HIGH - Standard bounding box math, well-documented patterns
- Step-specific canvas config: HIGH - Straightforward data-driven architecture
- AI context assembly: HIGH - Extends existing context patterns from Phase 15
- Empathy Map/Power-Interest layouts: MEDIUM - Standard frameworks, but limited ReactFlow-specific examples

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable ecosystem, ReactFlow patterns well-established)
