# Phase 24: Output-to-Canvas Retrofit (Steps 2 & 4) - Research

**Researched:** 2026-02-12
**Domain:** Spatial canvas layouts (concentric rings, empathy map zones), canvas-first data migration, SVG overlay patterns
**Confidence:** HIGH

## Summary

Phase 24 retrofits Steps 2 (Stakeholder Map) and 4 (Empathy Map) from text-based output panels to canvas-first spatial layouts with zone-based organization. Unlike the grid-based Journey Map (Step 6), these steps use semantic spatial layouts: concentric rings for stakeholder importance ranking and a classic 6-zone empathy map for qualitative research clustering.

The research validates that **no new dependencies are needed** — ReactFlow's foreignObject SVG pattern (proven in Phase 22 GridOverlay) extends naturally to circular rings and rectangular zones. The existing "Add to Whiteboard" button pattern from Step 6 translates directly, but with automatic spatial distribution within zones instead of manual cell placement.

The critical architectural insight is the **migration strategy**: existing workshops have structured artifacts (stakeholder lists with power/interest scores, empathy themes with pains/gains) in `stepArtifacts.artifact` but no canvas state. The migration must be **lazy and silent** — when a user opens an existing workshop, derive initial canvas positions from artifact data (stakeholder importance scores → ring assignment, empathy categories → zone assignment), render the layout, and persist canvas state only after the first user interaction.

The dual-format coexistence pattern from v1.1 (where canvas and output panel both existed) is **replaced** in Phase 24 — canvas becomes the single source of truth for Steps 2 & 4, with no fallback text view. The output panel is removed entirely for these steps. This differs from Step 6, where the grid layout was additive. Steps 2 & 4 are simpler use cases (no complex multi-row semantics), making canvas-only viable.

**Primary recommendation:** Build two new overlay components (`ConcentricRingsOverlay` for Step 2, `EmpathyMapOverlay` for Step 4) following the GridOverlay foreignObject pattern. Extend canvas-position.ts with zone-based placement algorithms. Implement lazy migration in step-container.tsx that checks for artifact data without canvas state and seeds initial positions. Update step-canvas-config.ts to declare zone layouts instead of quadrant configs.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Step 2: Stakeholder Map — Concentric Rings Layout**
- Concentric rings layout (not 2x2 grid) — 3 rings with most important stakeholders in center
- Single combined importance axis (not separate power/interest axes) — users drag cards closer to center for greater importance
- Inner ring must be generously sized to fit key player cards comfortably
- Cards distribute evenly around each ring's circumference
- Visible ring boundaries (dashed/solid circles between rings)
- Center label only ("Most Important") — no labels on outer rings
- Color-coded rings with subtle background tints per ring level
- Miro/FigJam visual aesthetic

**Step 4: Empathy Map — Classic 6-Zone Layout**
- 6 zones total: Says, Thinks, Feels, Does (4 quadrants top) + Pains and Gains (2 horizontal strips bottom)
- Classic empathy map spatial arrangement
- Color-coded zones: 4 quadrants share a neutral palette, Pains warm/red-ish, Gains cool/green-ish
- Persistent zone header labels always visible
- Miro/FigJam visual aesthetic

**Card Arrangement**
- Tidy grid arrangement within zones (not organic scatter)
- Auto re-associate zone when card is dragged to a new zone (no confirmation)
- Zones expand to accommodate cards when crowded (canvas scrolls to fit)

**Output Panel Transition**
- Canvas fully replaces output panel for Steps 2 & 4 — no text fallback view
- Same split-screen layout as Step 6: chat left, canvas right
- "Add to Whiteboard" button pattern from Step 6 — AI summarizes in chat, user clicks button to place cards
- Auto-zoom to fit after card placement
- Empty layout template (rings/zones) visible on step entry, before any AI output
- Other steps (1, 3, 5, 7-10) remain as-is with output panels — future phases will address

**Migration**
- Auto-migrate silently when user opens existing workshop with old output-only data
- One-way conversion — no need to preserve old output format
- Persist canvas positions lazily: only write to DB once user interacts (drag, add, etc.)

### Claude's Discretion

- Smart vs default placement strategy for migrated data (use stakeholder scores / empathy categories to determine positions)
- Exact color palette for zones and rings
- Ring boundary line style (dashed vs solid)
- Card sizing within zones
- Animation/transition when cards are placed

### Deferred Ideas (OUT OF SCOPE)

- Canvas views for Steps 1, 3, 5, 7-10 — future phases
- Text export / copy-as-text for canvas data — not needed now
- Toggle between canvas and list views — canvas only for now

</user_constraints>

## Standard Stack

### Core (No New Dependencies)

All Phase 24 requirements are satisfied by existing dependencies and established patterns.

| Library | Version | Purpose | Already Installed |
|---------|---------|---------|-------------------|
| **@xyflow/react** | 12.10.0 | Canvas rendering, custom overlays via foreignObject SVG | ✓ Phase 15 (v1.1) |
| **zustand** | via zundo 2.3.0 | Canvas state management with temporal undo/redo | ✓ Phase 15 (v1.1) |
| **tailwindcss** | 4 | CSS utilities for zone colors, ring tints, Miro aesthetic | ✓ Phase 1 (v0.5) |
| **drizzle-orm** | 0.37.0 | Database access for artifact read/write during migration | ✓ Phase 4 (v0.5) |

### Existing Patterns to Reuse

| Pattern | Location | Reuse for Phase 24 |
|---------|----------|-------------------|
| **foreignObject SVG overlays** | `grid-overlay.tsx` (Phase 22) | Render zone labels, ring labels, interactive elements on top of ReactFlow canvas |
| **Canvas position computation** | `canvas-position.ts` | Extend with ring-based and empathy-zone distribution algorithms |
| **Canvas state persistence** | `canvas-actions.ts` `saveCanvasState()` | Reuse existing `_canvas` key pattern in stepArtifacts JSONB |
| **Lazy initialization** | `react-flow-canvas.tsx` `useEffect` | Check for artifact without canvas state, seed positions, delay persistence until interaction |
| **"Add to Whiteboard" button** | `chat-panel.tsx` `handleAddToWhiteboard()` | Reuse for Steps 2 & 4 with zone-aware position computation |
| **Auto-fit viewport** | `react-flow-canvas.tsx` `fitView()` | Trigger after adding cards to center layout in viewport |
| **Step canvas configs** | `step-canvas-config.ts` | Extend with `hasRings`, `hasEmpathyZones` alongside existing `hasQuadrants`, `hasGrid` |

## Architecture Patterns

### Pattern 1: SVG Concentric Rings with foreignObject Labels

**What:** Render 3 concentric circles with visible boundaries and radial distribution of post-its using SVG `<circle>` elements and foreignObject for HTML labels/controls.

**When to use:** Step 2 Stakeholder Mapping only.

**Why this pattern:**
- **Reuses GridOverlay technique:** Same foreignObject SVG pattern, just circular instead of rectangular cells
- **Viewport-aware:** Subscribe to ReactFlow viewport transform, apply zoom/pan to SVG elements
- **Semantic spatial meaning:** Distance from center = importance (matches user mental model)
- **Standard SVG primitives:** No custom canvas drawing, leverages browser SVG rendering

**Implementation approach:**

```typescript
// src/lib/canvas/ring-layout.ts (new file)

export type RingConfig = {
  rings: Array<{ id: string; label?: string; radius: number; color: string }>;
  center: { x: number; y: number }; // Canvas center point
  cardRadius: number; // Distance from ring center to card position
};

export function distributeCardsOnRing(
  cardCount: number,
  ring: { radius: number },
  center: { x: number; y: number }
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const angleStep = (2 * Math.PI) / cardCount;

  for (let i = 0; i < cardCount; i++) {
    const angle = i * angleStep;
    positions.push({
      x: center.x + ring.radius * Math.cos(angle),
      y: center.y + ring.radius * Math.sin(angle),
    });
  }

  return positions;
}

export function detectRing(
  position: { x: number; y: number },
  config: RingConfig
): string | null {
  const dx = position.x - config.center.x;
  const dy = position.y - config.center.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Find which ring this distance falls into
  for (let i = 0; i < config.rings.length; i++) {
    const ring = config.rings[i];
    const nextRing = config.rings[i + 1];
    const innerBound = i === 0 ? 0 : config.rings[i - 1].radius;
    const outerBound = nextRing ? nextRing.radius : Infinity;

    if (distance >= innerBound && distance < outerBound) {
      return ring.id;
    }
  }

  return null;
}
```

```typescript
// src/components/canvas/concentric-rings-overlay.tsx (new file)

import { useStore as useReactFlowStore, type ReactFlowState } from '@xyflow/react';
import type { RingConfig } from '@/lib/canvas/ring-layout';

const viewportSelector = (state: ReactFlowState) => ({
  x: state.transform[0],
  y: state.transform[1],
  zoom: state.transform[2],
});

interface ConcentricRingsOverlayProps {
  config: RingConfig;
}

export function ConcentricRingsOverlay({ config }: ConcentricRingsOverlayProps) {
  const { x, y, zoom } = useReactFlowStore(viewportSelector);

  const toScreen = (canvasX: number, canvasY: number) => ({
    x: canvasX * zoom + x,
    y: canvasY * zoom + y,
  });

  const centerScreen = toScreen(config.center.x, config.center.y);

  return (
    <svg className="absolute inset-0 pointer-events-none z-10" width="100%" height="100%">
      {/* Ring boundaries (concentric circles) */}
      {config.rings.map((ring, index) => (
        <g key={ring.id}>
          {/* Background tint circle */}
          <circle
            cx={centerScreen.x}
            cy={centerScreen.y}
            r={ring.radius * zoom}
            fill={ring.color}
            opacity={0.05}
          />
          {/* Ring boundary line */}
          <circle
            cx={centerScreen.x}
            cy={centerScreen.y}
            r={ring.radius * zoom}
            fill="none"
            stroke="#d1d5db"
            strokeWidth={index === 0 ? 2 : 1}
            strokeDasharray={index === 0 ? "none" : "6 3"}
          />
        </g>
      ))}

      {/* Center label ("Most Important") */}
      <foreignObject
        x={centerScreen.x - 60}
        y={centerScreen.y - 12}
        width={120}
        height={24}
        className="pointer-events-none"
      >
        <div className="flex items-center justify-center">
          <span className="text-xs font-semibold text-gray-600">Most Important</span>
        </div>
      </foreignObject>
    </svg>
  );
}
```

**Trade-offs:**
- **Pro:** Reuses proven foreignObject pattern from Phase 22
- **Pro:** Natural radial distribution matches "importance proximity" mental model
- **Pro:** SVG circles scale cleanly with zoom
- **Con:** Radial layout less space-efficient than grid for many items (mitigated by generous inner ring sizing)

### Pattern 2: Empathy Map 6-Zone Rectangular Layout

**What:** Divide canvas into 6 rectangular zones (4 quadrants top, 2 horizontal strips bottom) with visible boundaries and zone labels.

**When to use:** Step 4 Empathy Map (Sense Making) only.

**Why this pattern:**
- **Classic empathy map structure:** Matches industry-standard layout from NN/g, Figma, Miro
- **Rectangular zones easier than grid:** No dynamic rows/columns, just 6 fixed regions
- **Color-coded semantic grouping:** Warm colors for pains, cool for gains, neutral for observations
- **Tidy grid within zones:** Cards auto-arrange in neat rows/columns inside each zone

**Implementation approach:**

```typescript
// src/lib/canvas/empathy-zones.ts (new file)

export type EmpathyZone = 'says' | 'thinks' | 'feels' | 'does' | 'pains' | 'gains';

export type EmpathyZoneConfig = {
  zones: Record<EmpathyZone, {
    bounds: { x: number; y: number; width: number; height: number };
    label: string;
    color: string;
  }>;
};

export function getZoneForPosition(
  position: { x: number; y: number },
  config: EmpathyZoneConfig
): EmpathyZone | null {
  for (const [zone, { bounds }] of Object.entries(config.zones)) {
    if (
      position.x >= bounds.x &&
      position.x < bounds.x + bounds.width &&
      position.y >= bounds.y &&
      position.y < bounds.y + bounds.height
    ) {
      return zone as EmpathyZone;
    }
  }
  return null;
}

export function distributeCardsInZone(
  cardCount: number,
  zoneBounds: { x: number; y: number; width: number; height: number },
  cardSize: { width: number; height: number },
  padding: number
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const cols = Math.floor((zoneBounds.width - padding) / (cardSize.width + padding));

  for (let i = 0; i < cardCount; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    positions.push({
      x: zoneBounds.x + padding + col * (cardSize.width + padding),
      y: zoneBounds.y + padding + row * (cardSize.height + padding),
    });
  }

  return positions;
}
```

```typescript
// src/components/canvas/empathy-map-overlay.tsx (new file)

import { useStore as useReactFlowStore, type ReactFlowState } from '@xyflow/react';
import type { EmpathyZoneConfig } from '@/lib/canvas/empathy-zones';

const viewportSelector = (state: ReactFlowState) => ({
  x: state.transform[0],
  y: state.transform[1],
  zoom: state.transform[2],
});

interface EmpathyMapOverlayProps {
  config: EmpathyZoneConfig;
}

export function EmpathyMapOverlay({ config }: EmpathyMapOverlayProps) {
  const { x, y, zoom } = useReactFlowStore(viewportSelector);

  const toScreen = (canvasX: number, canvasY: number) => ({
    x: canvasX * zoom + x,
    y: canvasY * zoom + y,
  });

  return (
    <svg className="absolute inset-0 pointer-events-none z-10" width="100%" height="100%">
      {Object.entries(config.zones).map(([zone, { bounds, label, color }]) => {
        const topLeft = toScreen(bounds.x, bounds.y);

        return (
          <g key={zone}>
            {/* Zone background tint */}
            <rect
              x={topLeft.x}
              y={topLeft.y}
              width={bounds.width * zoom}
              height={bounds.height * zoom}
              fill={color}
              opacity={0.08}
            />
            {/* Zone boundary */}
            <rect
              x={topLeft.x}
              y={topLeft.y}
              width={bounds.width * zoom}
              height={bounds.height * zoom}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            {/* Zone label header */}
            <foreignObject
              x={topLeft.x + 10}
              y={topLeft.y + 10}
              width={Math.max(100, bounds.width * zoom - 20)}
              height={28}
              className="pointer-events-none"
            >
              <div className="flex items-center">
                <span className="text-sm font-semibold text-gray-700">{label}</span>
              </div>
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
}
```

**Trade-offs:**
- **Pro:** Fixed 6-zone layout simpler than dynamic grid (no column add/remove logic)
- **Pro:** Classic empathy map structure familiar to design thinkers
- **Pro:** Color-coding provides immediate visual grouping
- **Con:** Less flexible than freeform quadrants (acceptable tradeoff for structured thinking)

### Pattern 3: Lazy Migration with Smart Placement

**What:** When a user opens an existing workshop with artifact data but no canvas state, derive initial canvas positions from semantic artifact data and seed the canvas store without persisting to DB until the first user interaction.

**When to use:** Phase 24 migration only, then removed after all workshops migrated.

**Why this pattern:**
- **Silent migration:** No migration scripts, no user-visible conversion
- **Smart placement:** Uses artifact semantics (stakeholder importance scores, empathy categories) to place cards meaningfully
- **Lazy persistence:** Avoids unnecessary DB writes if user just views and leaves
- **One-way conversion:** No need to maintain backward compatibility with old output format

**Implementation approach:**

```typescript
// src/components/workshop/step-container.tsx (extend existing)

React.useEffect(() => {
  // Only run for Steps 2 & 4
  if (!['stakeholder-mapping', 'sense-making'].includes(step.id)) return;

  // Check if we have artifact data but no canvas state
  const hasArtifact = initialArtifact && Object.keys(initialArtifact).length > 0;
  const hasCanvas = postIts.length > 0;

  if (hasArtifact && !hasCanvas) {
    // Migrate artifact data to canvas
    if (step.id === 'stakeholder-mapping') {
      migrateStakeholdersToRings(initialArtifact, addPostIt);
    } else if (step.id === 'sense-making') {
      migrateEmpathyToZones(initialArtifact, addPostIt);
    }
  }
}, [step.id, initialArtifact, postIts.length, addPostIt]);
```

```typescript
// src/lib/canvas/migration-helpers.ts (new file)

import type { StakeholderArtifact, SenseMakingArtifact } from '@/lib/schemas/step-schemas';
import type { PostIt } from '@/stores/canvas-store';

export function migrateStakeholdersToRings(
  artifact: Record<string, unknown>,
  addPostIt: (postIt: Omit<PostIt, 'id'>) => void
) {
  const stakeholderData = artifact as StakeholderArtifact;

  // Calculate importance score from power + interest
  const stakeholdersWithScore = stakeholderData.stakeholders.map(s => {
    const powerScore = s.power === 'high' ? 3 : s.power === 'medium' ? 2 : 1;
    const interestScore = s.interest === 'high' ? 3 : s.interest === 'medium' ? 2 : 1;
    const importance = powerScore + interestScore; // 2-6 range
    return { ...s, importance };
  });

  // Sort by importance (highest first)
  stakeholdersWithScore.sort((a, b) => b.importance - a.importance);

  // Assign to rings (inner = most important)
  const ringAssignments = { inner: [], middle: [], outer: [] };
  stakeholdersWithScore.forEach((s, i) => {
    if (s.importance >= 5) ringAssignments.inner.push(s);
    else if (s.importance >= 4) ringAssignments.middle.push(s);
    else ringAssignments.outer.push(s);
  });

  // Distribute on rings using radial layout
  const ringConfig = { /* from step-canvas-config.ts */ };
  Object.entries(ringAssignments).forEach(([ring, stakeholders]) => {
    const positions = distributeCardsOnRing(stakeholders.length, ringConfig.rings[ring], ringConfig.center);
    stakeholders.forEach((s, i) => {
      addPostIt({
        text: s.name,
        position: positions[i],
        width: 160,
        height: 100,
        color: 'yellow',
        // Store ring assignment for re-snap on drag
        cellAssignment: { row: ring, col: '' },
      });
    });
  });
}

export function migrateEmpathyToZones(
  artifact: Record<string, unknown>,
  addPostIt: (postIt: Omit<PostIt, 'id'>) => void
) {
  const empathyData = artifact as SenseMakingArtifact;

  // Map themes → Says/Thinks/Feels/Does (distribute evenly)
  empathyData.themes.forEach((theme, i) => {
    const zones = ['says', 'thinks', 'feels', 'does'];
    const zone = zones[i % 4];
    // Add theme card to zone
    const zoneConfig = /* from step-canvas-config.ts */;
    const position = distributeCardsInZone(/* zone-specific logic */);
    addPostIt({ text: theme.name, position, /* ... */ });
  });

  // Map pains → Pains zone
  empathyData.pains.forEach((pain, i) => {
    const position = distributeCardsInZone(/* pains zone logic */);
    addPostIt({ text: pain, position, color: 'pink', /* ... */ });
  });

  // Map gains → Gains zone
  empathyData.gains.forEach((gain, i) => {
    const position = distributeCardsInZone(/* gains zone logic */);
    addPostIt({ text: gain, position, color: 'green', /* ... */ });
  });
}
```

**Trade-offs:**
- **Pro:** Zero-friction migration for existing users
- **Pro:** Smart placement better than random scatter
- **Pro:** Lazy persistence avoids unnecessary DB writes
- **Con:** Migration code becomes tech debt once all workshops migrated (can be removed in future cleanup)

### Pattern 4: Canvas as Single Source of Truth

**What:** Remove output panel entirely for Steps 2 & 4, making canvas the authoritative representation with no text fallback.

**When to use:** Steps 2 & 4 only after Phase 24. Other steps keep output panels.

**Why this pattern:**
- **Simpler mental model:** One view, not two competing representations
- **Canvas advantages:** Spatial proximity, visual clustering, direct manipulation
- **Less UI complexity:** No panel toggle, no sync logic between views
- **Proven in Step 6:** Journey Map already canvas-only, works well

**Implementation approach:**

Update `step-container.tsx` to conditionally render canvas or output panel:

```typescript
// src/components/workshop/step-container.tsx

const CANVAS_ONLY_STEPS = ['stakeholder-mapping', 'sense-making', 'journey-mapping'];

// In render logic:
{CANVAS_ONLY_STEPS.includes(step.id) ? (
  // Canvas-only: no output panel
  <ReactFlowCanvas sessionId={sessionId} stepId={step.id} workshopId={workshopId} />
) : (
  // Other steps: output panel with optional canvas
  <>
    <RightPanel
      stepId={step.id}
      artifact={artifact}
      extractionError={extractionError}
      onExtract={extractArtifact}
      isExtracting={isExtracting}
      hasEnoughMessages={hasEnoughMessages}
      artifactConfirmed={effectiveConfirmed}
      onConfirm={handleConfirm}
    />
    {isCanvasStep && <ReactFlowCanvas {...props} />}
  </>
)}
```

**Trade-offs:**
- **Pro:** Clearer UX, no ambiguity about which view is "real"
- **Pro:** Encourages spatial thinking (core value of design thinking)
- **Con:** No fallback if canvas fails to render (mitigated by React error boundaries)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| **SVG viewport transforms** | Manual zoom/pan calculation | ReactFlow `useStore(viewportSelector)` | ReactFlow manages viewport state, provides reactive subscriptions |
| **Circular position math** | Custom trigonometry bugs | Standard `Math.cos/sin` with angle distribution | Well-tested browser math, no edge cases |
| **Zone boundary detection** | Pixel-perfect hit detection | Simple rect/circle bounds checking | O(1) lookup, no complex geometry |
| **Canvas state persistence** | Custom debounce + conflict resolution | Existing `useCanvasAutosave` hook | Already handles debounce (2s), optimistic locking, retry logic |
| **Migration scripts** | SQL/Drizzle migration | React useEffect lazy check | Runs client-side, no deploy coordination, auto-cleans up after all migrated |

**Key insight:** The existing canvas infrastructure from Phases 15-23 handles 90% of Phase 24's needs. Don't rebuild position computation, persistence, undo/redo, or viewport management — extend the proven patterns.

## Common Pitfalls

### Pitfall 1: Overlapping Cards in Dense Rings

**What goes wrong:** When many stakeholders map to the same ring (e.g., 12 "high importance" stakeholders in inner ring), radial distribution creates overlapping cards.

**Why it happens:** Equal angle distribution assumes cards are point-sized. Real cards have width/height.

**How to avoid:**
- **Generous inner ring radius:** User constraint specifies "generously sized" — enforce minimum 300px radius for inner ring
- **Adaptive spacing:** If card count > threshold, expand ring radius automatically or use spiral distribution
- **Visual feedback:** Show collision warning, suggest moving to outer ring

**Warning signs:** Card overlap visible immediately on migration, user unable to read text

### Pitfall 2: Zone Re-assignment Triggering Unwanted Moves

**What goes wrong:** User drags a card slightly outside zone boundary during repositioning, auto-reassignment snaps it to different zone, user loses intended placement.

**Why it happens:** Instant zone detection on drag triggers aggressive re-assignment.

**How to avoid:**
- **Dead zone tolerance:** Only re-assign if card center crosses 50% into new zone (not just edge)
- **No confirmation needed:** User constraint allows silent re-assignment, but make threshold forgiving
- **Visual preview:** Show faint zone highlight when hovering near boundary

**Warning signs:** User reports "cards jumping around" during drag

### Pitfall 3: Migration Performance with Large Artifacts

**What goes wrong:** Workshop with 50+ stakeholders causes 3-second freeze on step load due to synchronous migration + canvas render.

**Why it happens:** Migration adds all post-its synchronously in single React commit.

**How to avoid:**
- **Batch insertion:** Add post-its in chunks of 20 with `requestIdleCallback` between batches
- **Optimistic rendering:** Show loading skeleton for zones while migration runs
- **Early return:** If artifact has >100 items, prompt user to confirm migration (unlikely edge case)

**Warning signs:** Step load time >1s on artifact reload

### Pitfall 4: Color Palette Inconsistency Between Steps

**What goes wrong:** Step 2 ring colors don't match Step 4 zone colors, creating visual dissonance as users progress.

**Why it happens:** Each overlay component defines colors independently.

**How to avoid:**
- **Shared color tokens:** Define `RING_COLORS` and `ZONE_COLORS` in single constants file
- **Miro/FigJam reference:** Match color values to Miro's whiteboard palette (user constraint)
- **Accessibility check:** Ensure 4.5:1 contrast for text on tinted backgrounds

**Warning signs:** User feedback "colors look inconsistent"

### Pitfall 5: Canvas State Sync Race Condition

**What goes wrong:** User adds card via "Add to Whiteboard" while migration is still populating canvas, resulting in duplicate cards or lost state.

**Why it happens:** Migration and AI-add run concurrently without coordination.

**How to avoid:**
- **Migration flag:** Set `isMigrating` state, block "Add to Whiteboard" button until complete
- **Idempotent migration:** Check `postIts.length === 0` before starting, skip if canvas already populated
- **Migration timestamp:** Store `_migrated_at` in canvas state to prevent re-run

**Warning signs:** Double cards, missing cards reported by users

## Code Examples

### Concentric Rings Configuration

```typescript
// src/lib/canvas/step-canvas-config.ts (extend)

import type { RingConfig } from './ring-layout';

export type StepCanvasConfig = {
  hasQuadrants: boolean;
  hasGrid?: boolean;
  hasRings?: boolean; // NEW
  hasEmpathyZones?: boolean; // NEW
  gridConfig?: GridConfig;
  ringConfig?: RingConfig; // NEW
  empathyZoneConfig?: EmpathyZoneConfig; // NEW
};

export const STEP_CANVAS_CONFIGS: Record<string, StepCanvasConfig> = {
  // Step 2: Stakeholder Mapping - Concentric Rings
  'stakeholder-mapping': {
    hasQuadrants: false,
    hasRings: true,
    ringConfig: {
      rings: [
        { id: 'inner', radius: 320, color: '#3b82f6' }, // Blue tint, generous radius
        { id: 'middle', radius: 520, color: '#8b5cf6' }, // Purple tint
        { id: 'outer', radius: 720, color: '#6366f1' }, // Indigo tint
      ],
      center: { x: 0, y: 0 }, // Canvas origin
      cardRadius: 160, // Half card width for radial placement
    },
  },

  // Step 4: Sense Making - Empathy Map 6 Zones
  'sense-making': {
    hasQuadrants: false,
    hasEmpathyZones: true,
    empathyZoneConfig: {
      zones: {
        says: {
          bounds: { x: -500, y: 100, width: 400, height: 300 },
          label: 'Says',
          color: '#9ca3af', // Neutral gray
        },
        thinks: {
          bounds: { x: -500, y: -400, width: 400, height: 300 },
          label: 'Thinks',
          color: '#9ca3af',
        },
        feels: {
          bounds: { x: 100, y: -400, width: 400, height: 300 },
          label: 'Feels',
          color: '#9ca3af',
        },
        does: {
          bounds: { x: 100, y: 100, width: 400, height: 300 },
          label: 'Does',
          color: '#9ca3af',
        },
        pains: {
          bounds: { x: -500, y: 450, width: 1000, height: 200 },
          label: 'Pains',
          color: '#f87171', // Warm red
        },
        gains: {
          bounds: { x: -500, y: 700, width: 1000, height: 200 },
          label: 'Gains',
          color: '#34d399', // Cool green
        },
      },
    },
  },

  // Step 6: Journey Mapping - Grid (unchanged)
  'journey-mapping': { /* existing grid config */ },
};
```

### "Add to Whiteboard" with Zone Distribution

```typescript
// src/components/workshop/chat-panel.tsx (extend handleAddToWhiteboard)

const handleAddToWhiteboard = React.useCallback((messageId: string, canvasItems: CanvasItemParsed[]) => {
  const stepConfig = getStepCanvasConfig(step.id);

  // For rings (Step 2)
  if (stepConfig.hasRings && stepConfig.ringConfig) {
    canvasItems.forEach(item => {
      // AI specifies ring in metadata: quadrant="inner" (reuse quadrant field)
      const ring = item.quadrant || 'outer'; // Default to outer if not specified
      const ringData = stepConfig.ringConfig.rings.find(r => r.id === ring);
      const cardsInRing = postIts.filter(p => p.cellAssignment?.row === ring);
      const positions = distributeCardsOnRing(cardsInRing.length + 1, ringData, stepConfig.ringConfig.center);
      const newPosition = positions[positions.length - 1];

      addPostIt({
        text: item.text,
        position: newPosition,
        width: POST_IT_WIDTH,
        height: POST_IT_HEIGHT,
        color: 'yellow',
        cellAssignment: { row: ring, col: '' }, // Store ring for re-snap
      });
    });
  }

  // For empathy zones (Step 4)
  if (stepConfig.hasEmpathyZones && stepConfig.empathyZoneConfig) {
    canvasItems.forEach(item => {
      // AI specifies zone: quadrant="pains" (reuse quadrant field)
      const zone = (item.quadrant || 'says') as EmpathyZone;
      const zoneData = stepConfig.empathyZoneConfig.zones[zone];
      const cardsInZone = postIts.filter(p => p.cellAssignment?.row === zone);
      const positions = distributeCardsInZone(cardsInZone.length + 1, zoneData.bounds, POST_IT_SIZE, 15);
      const newPosition = positions[positions.length - 1];

      addPostIt({
        text: item.text,
        position: newPosition,
        width: POST_IT_WIDTH,
        height: POST_IT_HEIGHT,
        color: zone === 'pains' ? 'pink' : zone === 'gains' ? 'green' : 'yellow',
        cellAssignment: { row: zone, col: '' },
      });
    });
  }

  setAddedMessageIds(prev => new Set(prev).add(messageId));
  setPendingFitView(true); // Auto-zoom to fit new cards
}, [/* deps */]);
```

## State of the Art

### Layout Evolution

| Old Approach | Current Approach (Phase 24) | When Changed | Impact |
|--------------|------------------------------|--------------|--------|
| **Quadrant overlays (v1.1)** | Zone-based overlays (rings, empathy zones) | Phase 24 | More semantic layouts than generic 2x2 grids |
| **Dual output/canvas** | Canvas-only for spatial steps | Phase 24 | Simpler mental model, encourages spatial thinking |
| **Output panel artifacts** | Canvas as source of truth | Phase 24 | Post-its ARE the data, not a view of data |
| **Manual grid setup** | Lazy migration from artifacts | Phase 24 | Zero-friction conversion for existing workshops |

### Best Practices (2026)

**Concentric layouts:**
- Industry standard for importance/priority visualization (Miro, FigJam, Figma all use concentric patterns)
- Radial distribution with `2π / n` angle stepping is proven pattern

**Empathy maps:**
- 6-zone layout (4 quadrants + pains/gains strips) is current best practice per [NN/g Empathy Mapping guide](https://www.nngroup.com/articles/empathy-mapping/)
- Original 4-quadrant version deprecated in 2017 update
- Color coding by emotional valence (warm=negative, cool=positive) aids quick scanning

**React + SVG patterns:**
- foreignObject is standard for mixing HTML UI with SVG graphics ([React Flow docs reference](https://reactflow.dev/examples/edges/edge-label-renderer))
- Viewport-aware transforms via ReactFlow `useStore(viewportSelector)` is canonical pattern

## Open Questions

1. **Ring transition thresholds**
   - What we know: User can drag cards between rings
   - What's unclear: Should we snap to nearest ring on drop, or require 50% overlap?
   - Recommendation: 50% overlap threshold (less aggressive snapping, user retains more control)

2. **Empty state messaging**
   - What we know: Layout template visible before AI output
   - What's unclear: Should we show placeholder text ("Drag stakeholders here...") or just empty zones?
   - Recommendation: Show zone labels only, no placeholder text (reduces visual clutter)

3. **Maximum card density per zone**
   - What we know: Zones expand to accommodate cards, canvas scrolls
   - What's unclear: Should we warn at N cards per zone, or let it grow unbounded?
   - Recommendation: No hard limit, but show "Consider splitting themes" hint at 15+ cards in one zone

## Sources

### Primary (HIGH confidence)

- **ReactFlow v12 Documentation** - Custom overlays, foreignObject pattern, viewport transforms: https://reactflow.dev/examples/edges/edge-label-renderer
- **Existing codebase** - GridOverlay implementation (Phase 22), canvas-position.ts (Phase 19), step-canvas-config.ts (Phase 15)
- **User Context (CONTEXT.md)** - Locked design decisions, concentric rings requirement, empathy map 6-zone layout
- **Schema definitions** - `src/lib/schemas/step-schemas.ts` (stakeholderArtifactSchema, senseMakingArtifactSchema)
- **Canvas persistence** - `src/actions/canvas-actions.ts` (saveCanvasState, loadCanvasState with `_canvas` key pattern)

### Secondary (MEDIUM confidence)

- [NN/g: Empathy Mapping](https://www.nngroup.com/articles/empathy-mapping/) - 2017 update to 6-zone layout
- [Figma Resource Library: Empathy Map](https://www.figma.com/resource-library/empathy-map/) - Best practices for empathy map design
- [Parallel HQ: What Is an Empathy Map? Guide (2026)](https://www.parallelhq.com/blog/what-empathy-map) - Current empathy mapping practices
- [React Flow Custom Edges Docs](https://reactflow.dev/learn/customization/custom-edges) - SVG-based edge paths, BaseEdge component
- [Smashing Magazine: Generating SVG With React (2015)](https://www.smashingmagazine.com/2015/12/generating-svg-with-react/) - Still relevant for SVG-in-React patterns

### Tertiary (LOW confidence - patterns verified via codebase)

- General SVG concentric circles patterns - Verified via existing browser APIs (`Math.cos/sin`)
- Radial distribution algorithms - Standard computer graphics approach

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - No new dependencies, all existing tools proven
- Architecture patterns: **HIGH** - Direct extensions of Phase 22 GridOverlay pattern, Phase 19 canvas-position logic
- Migration strategy: **HIGH** - Lazy migration proven in Phase 15 (canvas autosave), artifact schema well-defined
- Pitfalls: **MEDIUM** - Edge cases (card overlap, zone transitions) require UX testing to validate thresholds

**Research date:** 2026-02-12
**Valid until:** 2026-03-15 (30 days - stable domain, React/ReactFlow/SVG patterns mature)

**Note on dependencies:** ReactFlow 12.10.0 stable, no breaking changes expected. Tailwind 4 stable. Empathy map best practices unchanged since 2017 NN/g update.
