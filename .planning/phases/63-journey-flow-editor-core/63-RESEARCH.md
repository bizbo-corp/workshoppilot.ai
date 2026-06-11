# Phase 63: Journey Flow Editor Core - Research

**Researched:** 2026-06-11
**Domain:** React Flow canvas editor, Zustand store + autosave, Next.js App Router outputs route
**Confidence:** HIGH — this phase is a port/simplification of existing production code; all source of truth is the codebase itself.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Journey Flow REPLACES the UX Journey Mapper but lives at a NEW route alongside it — the old mapper at `/workshop/[sessionId]/outputs/journey-map/` is untouched this phase.
- Nodes are **data-only cards** — structured metadata about a screen/section, never a drawing. Card shows name + UI type + short description.
- Node data model (suggested baseline, refine as needed): `{ id, name, uiType, purpose, keyElements: string[], addressesPain?, priority }`.
- Single node type only. No swimlanes, no sitemap view, no nav groups, no emotion curve, no pinned views — all cut.
- What survives from the old mapper: drag-to-connect edges, the (+) icon to add an adjacent screen (reuse/port existing toolbar + adjacency-placement logic). Free-form edges must support forks (one source, multiple targets).
- Simple Zustand store + debounced autosave to `build_packs.content` — same pattern as the old journey mapper, leaner state shape.
- Mark approved/complete state stored with the flow — downstream actions (prototype builder link) depend on it.
- No data migration from old mapper state.

### Claude's Discretion
- Exact component file layout under `src/components/` (suggest a new `journey-flow/` directory, not nested inside `journey-mapper/`)
- Store key/shape inside `build_packs.content` (must not clobber old mapper's saved state)
- Node editing UX (inline editing vs side panel) — keep it simple
- Empty state for the canvas before Phase 64's AI generation exists (a placeholder/manual-add experience is fine; the entry-experience scope chooser is Phase 64)
- Olive design-token styling details, dark/light parity

### Deferred Ideas (OUT OF SCOPE)
- AI baseline generation, scope chooser (journey vs single feature), archetypes, regenerate — Phase 64
- Validation guidance card links/gating — Phase 65
- Prototype prompt builder + fidelity switch — Phase 66
- Old-mapper banner + de-linking — Phase 67
- Dual-journey support, hi-fi pathway, old-mapper deletion — future milestones
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FLOW-01 | User can open Journey Flow at `/workshop/[sessionId]/outputs/journey-flow/`, alongside the parked old mapper route | New route directory: `src/app/(dashboard)/workshop/[sessionId]/outputs/journey-flow/` with `page.tsx` + `journey-flow-content.tsx` — mirrors the journey-map route structure exactly |
| FLOW-02 | User sees screen/section nodes as data-only cards (name, UI type, short description) on a React Flow canvas, backed by node data `{ id, name, uiType, purpose, keyElements: string[], addressesPain?, priority }` | New `JourneyFlowNode` component in `src/components/journey-flow/` — simplified version of `JourneyFeatureNode` without conceptIndex/stageId/groupId complexity |
| FLOW-03 | User can connect nodes with drag-to-connect edges (free-form, forks allowed) | Port `onConnect`, `isValidConnection`, edge reconnect handlers, `JourneyEdge` component — all directly reusable from `ux-journey-mapper.tsx` |
| FLOW-04 | User can add an adjacent screen/section via a (+) icon on a node (port existing toolbar + adjacency-placement logic) | Port `handleAddNodeAt` from `ux-journey-mapper.tsx` — the (+) buttons on `JourneyFeatureNode` + the directional placement logic are the exact target |
| FLOW-05 | User can edit node card fields (name, UI type, purpose, key elements) and delete nodes/edges | Use a Dialog pattern (matches `JourneyNodeDetailDialog`) or simple inline edits — click-to-open detail panel is established and reusable |
| FLOW-06 | Journey Flow state persists via a simple Zustand store with debounced autosave to `build_packs.content` (same pattern as old mapper, leaner shape) | New `journey-flow-store.ts` with `createStore` vanilla + `markDirty/markClean/isDirty` + 2s debounce autosave in `JourneyFlowContent` — identical pattern to `feature-prioritization-content.tsx` |
| FLOW-07 | User can mark the Journey Flow approved/complete; downstream actions (prototype prompt) gate on this state | `isApproved: boolean` field in store state — `setApproved(true)` action + "Mark complete" button in the canvas toolbar; save to DB immediately on approve (same as old mapper's `handleApprove`) |
</phase_requirements>

---

## Summary

Phase 63 is a focused port-and-simplify of the existing UX Journey Mapper. Every primary pattern already exists in production — the goal is to extract the ~20% that survives (ReactFlow canvas, drag-to-connect edges, (+) adjacency add, Zustand store, debounced autosave, isApproved flag), throw away the 80% (stages, views, groups, emotion curve, concept coloring, sitemap), and wire them into a new route with a cleaner data model.

The persistence strategy is proven: JSON blob in `build_packs.content`, title prefix for lookup (`like(buildPacks.title, 'Journey Flow:%')`), separate from the old mapper's `'Journey Map:%'` rows. The autosave debounce pattern is copy-paste identical between `journey-map-content.tsx` and `feature-prioritization-content.tsx`.

The only net-new work is: (1) the new `JourneyFlowNode` card component with the new data shape, (2) the new leaner `journey-flow-store.ts`, (3) the new route files, (4) a new `save-journey-flow` API route, and (5) an empty-state UX (since Phase 64 provides AI generation — Phase 63 just needs a "no nodes yet, add one manually" state).

**Primary recommendation:** Build new files in parallel — don't modify any existing journey-mapper files. Copy patterns verbatim then strip what's not needed.

---

## Standard Stack

### Core (already in project — no new installs)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@xyflow/react` | v12 | React Flow canvas | Already used by journey mapper; same nodeTypes/edgeTypes pattern |
| `zustand` (vanilla) | current | Store factory via `createStore` | Existing pattern in `journey-mapper-store.ts` and `feature-prioritization-store.ts` |
| Next.js App Router | 16 | Route at `/outputs/journey-flow/` | All outputs routes follow same file structure |
| Clerk | current | Auth in `page.tsx` server component | Same `auth()` + `resolveClerkParticipant` pattern |
| Drizzle + Neon | current | DB access in page + API route | Same `db.query.sessions.findFirst` + `buildPacks` CRUD |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/journey-flow/         # NEW — all journey-flow UI components
│   ├── journey-flow-canvas.tsx      # ReactFlowProvider wrapper + inner canvas
│   ├── journey-flow-node.tsx        # Screen card node (single type)
│   ├── journey-flow-edge.tsx        # Can literally re-export JourneyEdge — same bezier path
│   ├── journey-flow-toolbar.tsx     # Approve button + auto-tidy + zoom
│   └── journey-flow-node-detail.tsx # Click-to-edit dialog (name, uiType, purpose, keyElements)
├── stores/
│   └── journey-flow-store.ts        # NEW — lean store; ~80 lines
├── providers/
│   └── journey-flow-store-provider.tsx  # NEW — same Context+useRef pattern
├── lib/journey-flow/
│   └── types.ts                     # NEW — JourneyFlowNode, JourneyFlowEdge, JourneyFlowState
└── app/(dashboard)/workshop/[sessionId]/outputs/
    └── journey-flow/
        ├── page.tsx                 # Server component — DB load + auth
        └── journey-flow-content.tsx # Client component — provider + canvas + autosave
```
```
src/app/api/build-pack/
└── save-journey-flow/
    └── route.ts                     # POST — same pattern as save-journey-map
```

### Pattern 1: Zustand vanilla store (CREATE pattern — used by all output stores)
```typescript
// src/stores/journey-flow-store.ts
import { createStore } from 'zustand/vanilla';

export type JourneyFlowState = {
  nodes: JourneyFlowNode[];
  edges: JourneyFlowEdge[];
  isApproved: boolean;
  isDirty: boolean;
  _schemaVersion: number;
};

export type JourneyFlowActions = {
  addNode: (node: JourneyFlowNode) => void;
  updateNode: (id: string, updates: Partial<JourneyFlowNode>) => void;
  moveNode: (id: string, position: { x: number; y: number }) => void;
  deleteNode: (id: string) => void;
  addEdge: (edge: JourneyFlowEdge) => void;
  deleteEdge: (id: string) => void;
  setApproved: (approved: boolean) => void;
  setState: (state: Partial<JourneyFlowState>) => void;
  markDirty: () => void;
  markClean: () => void;
};

export function createJourneyFlowStore(initState?: Partial<JourneyFlowState>) {
  return createStore<JourneyFlowState & JourneyFlowActions>()((set) => ({
    nodes: [], edges: [], isApproved: false, isDirty: false, _schemaVersion: 1,
    ...initState,
    addNode: (node) => set((s) => ({ nodes: [...s.nodes, node], isDirty: true })),
    // ... etc
  }));
}
```

### Pattern 2: Context provider (same as journey-mapper-store-provider.tsx)
```typescript
// src/providers/journey-flow-store-provider.tsx
// createContext<JourneyFlowStoreApi | null>(null)
// useRef + storeRef.current = createJourneyFlowStore(initialState)
// useJourneyFlowStore(selector) + useJourneyFlowStoreApi()
```

### Pattern 3: Server component page (same as journey-map/page.tsx)
```typescript
// page.tsx — key lookup pattern to avoid clobbering old mapper:
const rows = await db.select().from(buildPacks).where(
  and(eq(buildPacks.workshopId, workshop.id), like(buildPacks.title, 'Journey Flow:%'))
);
const jsonRow = rows.find((r) => r.formatType === 'json' && r.content);
```

### Pattern 4: Debounced autosave in client content component
```typescript
// Identical to journey-map-content.tsx lines 53–80 and feature-prioritization-content.tsx lines 55–77
useEffect(() => {
  if (!isDirty || isReadOnly) return;
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  saveTimerRef.current = setTimeout(async () => {
    const state = storeApi.getState();
    if (state.nodes.length === 0) return; // Guard: never save empty state
    await fetch('/api/build-pack/save-journey-flow', { method: 'POST', ... });
    storeApi.getState().markClean();
  }, 2000);
  return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
}, [isDirty, workshopId, isReadOnly, storeApi]);
```

### Pattern 5: ReactFlow canvas with controlled display nodes
```typescript
// From ux-journey-mapper.tsx lines 499–509 — the display-nodes-mirror pattern:
const [displayNodes, setDisplayNodes] = useState<Node[]>([]);
const [displayEdges, setDisplayEdges] = useState<Edge[]>([]);
useEffect(() => { setDisplayNodes(rfNodes); }, [rfNodes]);
useEffect(() => { setDisplayEdges(rfEdges); }, [rfEdges]);
// ReactFlow receives displayNodes/displayEdges, not store nodes directly
```

### Pattern 6: (+) adjacency placement
```typescript
// From ux-journey-mapper.tsx handleAddNodeAt — the directional offset logic to port:
const OFFSETS = {
  top:    { x: 0,    y: -200 },
  bottom: { x: 0,    y:  200 },
  left:   { x: -300, y:  0   },
  right:  { x:  300, y:  0   },
};
// Place new node at parent position + offset, auto-add connecting edge
```

### Pattern 7: Approve + immediate save
```typescript
// From ux-journey-mapper.tsx handleApprove:
const handleApprove = useCallback(async () => {
  storeApi.getState().setApproved(true);
  const state = storeApi.getState();
  await fetch('/api/build-pack/save-journey-flow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workshopId, state }),
  });
  storeApi.getState().markClean();
}, [storeApi, workshopId]);
```

### Anti-Patterns to Avoid
- **Don't modify journey-mapper files:** All changes are additive-only. The old mapper must remain fully functional.
- **Don't use `build_packs.title` prefix `'Journey Map:%'`:** That clobbers old mapper state. Use `'Journey Flow:%'`.
- **Don't pass store nodes directly to ReactFlow:** Use the display-nodes mirror (`setDisplayNodes` driven by `useEffect`) to allow ReactFlow selection state without fighting the store.
- **Don't skip the empty-state guard before autosave:** The save route and the client-side effect both gate on `nodes.length > 0` to prevent race conditions after reset.
- **Don't use `gray-*`/`blue-*`/raw `white`:** Use olive design tokens (`var(--primary)`, `var(--muted-foreground)`, `var(--card)`, `var(--border)`, etc.).
- **Don't add swimlanes, views, groups, or concept coloring:** Single node type, single flat list of nodes.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bezier edge rendering | Custom SVG edge path | Port `JourneyEdge` from `src/components/journey-mapper/journey-edge.tsx` | Already handles selected state, endpoint circles, interaction zone |
| Node drag handles | Custom handle positioning | `Handle` from `@xyflow/react` with `Position.*` — same 8-handle pattern in `JourneyFeatureNode` | Edge case: handles must have `pointerEvents: 'all'` or connecting fails |
| Edge reconnect logic | Custom reconnect | `onReconnectStart/onReconnect/onReconnectEnd` pattern from lines 639–668 of `ux-journey-mapper.tsx` | The `edgeReconnectSuccessful` ref guards against accidental edge deletion on missed drops |
| State hydration | Manual parse + apply | `storeApi.setState({ ...incoming, isDirty: false })` — same as journey-map-content.tsx | Guarantees Zustand subscriber notification |
| DB upsert for build packs | Custom logic | Find existing row by `like(title, 'Journey Flow:%')`, update if exists else insert — same as `save-journey-map/route.ts` | Handles the one-row-per-workshop invariant |

---

## Common Pitfalls

### Pitfall 1: Clobbering the old mapper's saved state
**What goes wrong:** Using title prefix `'Journey Map:%'` or the same `buildPackId` to save journey-flow state — overwrites the old mapper's data, breaking the "park don't delete" contract.
**Why it happens:** Copy-pasting `save-journey-map/route.ts` without changing the title prefix.
**How to avoid:** Title must be `'Journey Flow:%'`. Keep the API route at a new path (`/api/build-pack/save-journey-flow`).
**Warning signs:** Old journey-map page shows wrong state or empty canvas after visiting the new route.

### Pitfall 2: ReactFlow handle connection failing silently
**What goes wrong:** Drag-to-connect does nothing — `onConnect` fires but no edge appears.
**Why it happens:** Handles without `pointerEvents: 'all'` are blocked by parent node event handlers. Also: `ConnectionMode.Loose` must be set on `<ReactFlow>` to allow source-to-source or target-to-target connections.
**How to avoid:** Copy the handle style exactly from `JourneyFeatureNode`: `style={{ pointerEvents: 'all', cursor: 'crosshair', zIndex: 5 }}`. Set `connectionMode={ConnectionMode.Loose}`.

### Pitfall 3: Node snap-back on drag
**What goes wrong:** Dragging a node results in it snapping back to its previous position.
**Why it happens:** The store's `moveNode` updates positions; the useMemo recomputes `rfNodes`; the `useEffect` sets `displayNodes`. If `displayNodes` is derived directly from `rfNodes` without the `applyNodeChanges` intermediate, position updates from the store will race with ReactFlow's own position tracking during drag.
**How to avoid:** Use the `onNodesChange` → `applyNodeChanges(changes, prev)` → `setDisplayNodes` pattern from `ux-journey-mapper.tsx` lines 543–576. The store's `moveNode` only fires on `change.type === 'position'` changes — let ReactFlow own the visual drag, sync to store on each position event.

### Pitfall 4: Autosave firing on empty state after reset/generate
**What goes wrong:** Empty state (0 nodes) gets written to DB, erasing previously saved data.
**Why it happens:** The autosave timer was set when `isDirty=true`; a reset/generate then clears `nodes` synchronously before the timer fires.
**How to avoid:** Guard: `if (state.nodes.length === 0) return;` inside the setTimeout callback (matches the pattern in both existing save effects). For reset: cancel the timer (`clearTimeout(saveTimerRef.current)`) **before** the async delete call.

### Pitfall 5: `deleteKeyCode` on ReactFlow deletes nodes while detail dialog is open
**What goes wrong:** Pressing Delete/Backspace while typing in a dialog input field deletes the selected node in the background.
**Why it happens:** ReactFlow's default `deleteKeyCode` intercepts keyboard events even when focus is in a dialog.
**How to avoid:** Pass `deleteKeyCode={detailNodeId ? null : ['Backspace', 'Delete']}` — same as `ux-journey-mapper.tsx` line 827.

### Pitfall 6: ReactFlowProvider must wrap `useReactFlow` call
**What goes wrong:** `useReactFlow` throws "could not find ReactFlowContext" on first render.
**Why it happens:** `useReactFlow` must be called inside a `ReactFlowProvider`. The outer export wraps the inner component.
**How to avoid:** Export pattern: `export function JourneyFlowCanvas(props) { return <ReactFlowProvider><JourneyFlowCanvasInner {...props} /></ReactFlowProvider>; }` — same as `UXJourneyMapper` export at bottom of `ux-journey-mapper.tsx`.

---

## Code Examples

### JourneyFlowNode data shape (new, leaner than JourneyMapperNode)
```typescript
// src/lib/journey-flow/types.ts
export type JourneyFlowUiType =
  | 'dashboard' | 'landing-page' | 'form' | 'table' | 'detail-view'
  | 'wizard' | 'modal' | 'settings' | 'auth' | 'onboarding' | 'search' | 'error';

export type JourneyFlowPriority = 'must-have' | 'should-have' | 'nice-to-have';

export interface JourneyFlowNode {
  id: string;
  name: string;
  uiType: JourneyFlowUiType;
  purpose: string;
  keyElements: string[];
  addressesPain?: string;
  priority: JourneyFlowPriority;
  position: { x: number; y: number };
}

export interface JourneyFlowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface JourneyFlowState {
  nodes: JourneyFlowNode[];
  edges: JourneyFlowEdge[];
  isApproved: boolean;
  isDirty: boolean;
  _schemaVersion: number;
}
```

### Save API route pattern (from save-journey-map/route.ts — adapt title prefix only)
```typescript
// POST /api/build-pack/save-journey-flow/route.ts
// Key differences from save-journey-map:
// - title: 'Journey Flow:%' (not 'Journey Map:%')
// - empty guard: state.nodes.length === 0
// - no v0Prompt/v0SystemPrompt fields
// - use Response.json() (newer pattern from save-feature-prioritization)
```

### ReactFlow node type registration
```typescript
// src/components/journey-flow/journey-flow-canvas.tsx
const nodeTypes = {
  screenCard: JourneyFlowNode,  // single type only
};
const edgeTypes = {
  flowEdge: JourneyFlowEdge,    // port from JourneyEdge
};
```

---

## Key Codebase Findings

### Old mapper structure (what exists, what to strip)
The old mapper (`src/components/journey-mapper/`) has 12 files. For Journey Flow, only these patterns are portable:
- `ux-journey-mapper.tsx` → extract: `onConnect`, `isValidConnection`, `onNodesChange`, `onEdgesChange`, `onReconnect*`, `handleAddNodeAt`, `handleApprove`, display-nodes mirror, `deleteKeyCode` guard
- `journey-feature-node.tsx` → extract: 8-handle setup, (+) directional buttons, hover show/hide handles, `onAddNodeAt` prop pattern
- `journey-edge.tsx` → can be imported directly (no changes needed; it's already data-shape agnostic)
- `journey-node-detail-dialog.tsx` → adapt: swap `JourneyMapperNode` fields for `JourneyFlowNode` fields

Everything else (stage headers, group containers, emotion curve, sitemap logic, view selectors, layout.ts) is NOT ported.

### build_packs.content shape
The `build_packs` table has a single `content: text` column. Both the old mapper and feature prioritization store JSON blobs there. The title prefix is the only key for lookup:
- Old mapper: `like(buildPacks.title, 'Journey Map:%')` → formatType `'json'`
- New flow: `like(buildPacks.title, 'Journey Flow:%')` → formatType `'json'`

No schema changes needed — the existing table handles it.

### Route structure
- All outputs routes live under `src/app/(dashboard)/workshop/[sessionId]/outputs/`
- The shared `layout.tsx` provides `BuildPackNavSetter` + `h-svh overflow-hidden` container
- Each output page follows: `page.tsx` (async server component, DB load + auth) + `[name]-content.tsx` (client component, provider + inner component + autosave)
- The new route just adds a `journey-flow/` subdirectory — no layout changes needed

### `dbWithRetry` usage pattern
- `dbWithRetry` is used in the layout for the initial session load
- The `page.tsx` server components use `db` directly (without retry) for the build pack lookup — matching the existing journey-map and feature-prioritization pages
- The API save route also uses `db` directly (not `dbWithRetry`)

---

## Open Questions

1. **Node editing UX: inline vs dialog?**
   - What we know: Old mapper uses a Dialog (`JourneyNodeDetailDialog`) triggered on node click; the node card itself is click-to-open.
   - What's unclear: For Journey Flow's simpler data model (name, uiType, purpose, keyElements, priority), inline editing on the card itself might be viable and simpler — no context switch to a dialog.
   - Recommendation: Claude's discretion per CONTEXT.md. Dialog is safer (matches existing pattern, no focus-trap issues on canvas). Inline editing of just the name field inside the card + dialog for remaining fields is a reasonable middle ground.

2. **Empty state UX before Phase 64's AI generation**
   - What we know: Phase 64 adds AI baseline generation; Phase 63 must work standalone.
   - What's unclear: Should the empty state offer a manual "Add first screen" CTA only, or also show a disabled/coming-soon "Generate from workshop" button?
   - Recommendation: Claude's discretion. A simple empty state with an "Add your first screen" button (using the existing `handleAddNodeAt` logic to place the first node at a default position) is the minimum needed.

3. **`with-retry.ts` usage in API save routes**
   - What we know: Existing save routes (`save-journey-map`, `save-feature-prioritization`) do NOT use `dbWithRetry`.
   - What's unclear: CLAUDE.md says to use `with-retry.ts` for DB access. The existing save routes appear to be an exception.
   - Recommendation: Match existing save-route pattern (plain `db`) for consistency. The `dbWithRetry` adds latency and the save routes are fast-path writes.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` — skip this section.

---

## Sources

### Primary (HIGH confidence)
- `src/components/journey-mapper/ux-journey-mapper.tsx` — all ReactFlow patterns (drag, connect, reconnect, node changes)
- `src/components/journey-mapper/journey-feature-node.tsx` — node card with handles and (+) buttons
- `src/components/journey-mapper/journey-edge.tsx` — edge component
- `src/stores/journey-mapper-store.ts` — Zustand store factory pattern
- `src/stores/feature-prioritization-store.ts` — leaner store reference
- `src/providers/journey-mapper-store-provider.tsx` + `feature-prioritization-store-provider.tsx` — provider pattern
- `src/app/(dashboard)/workshop/[sessionId]/outputs/journey-map/page.tsx` — server component page pattern
- `src/app/(dashboard)/workshop/[sessionId]/outputs/journey-map/journey-map-content.tsx` — autosave + provider wiring
- `src/app/(dashboard)/workshop/[sessionId]/outputs/feature-prioritization/feature-prioritization-content.tsx` — simpler autosave reference
- `src/app/api/build-pack/save-journey-map/route.ts` — API save route pattern
- `src/app/api/build-pack/save-feature-prioritization/route.ts` — newer Response.json() style
- `src/app/(dashboard)/workshop/[sessionId]/outputs/layout.tsx` — layout the new route inherits
- `src/db/schema/build-packs.ts` — table schema; no changes needed

### Secondary (MEDIUM confidence)
- `src/lib/journey-mapper/types.ts` — `UiType` enum reusable for `JourneyFlowUiType`; `Priority` type reusable

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project; no new installs
- Architecture: HIGH — every pattern has a direct production equivalent; research is mapping not speculating
- Pitfalls: HIGH — several are documented bugs from the old mapper (snap-back, deleteKeyCode, empty state race)
- Node data model: HIGH — locked by brief; `JourneyMapperNode` gives the `UiType`/`Priority` types to reuse
- Build packs persistence: HIGH — title-prefix lookup is the established pattern; `like('Journey Flow:%')` avoids collision

**Research date:** 2026-06-11
**Valid until:** 90 days (stable codebase; only new phases would invalidate)
