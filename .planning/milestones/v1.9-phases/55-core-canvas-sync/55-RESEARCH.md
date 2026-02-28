# Phase 55: Core Canvas Sync - Research

**Researched:** 2026-02-26
**Domain:** Liveblocks Zustand middleware, multiplayer workshop creation, dual-store factory, EzyDraw locking
**Confidence:** HIGH (stack decisions), MEDIUM (temporal+liveblocks composition order — blocker noted in STATE.md)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Multiplayer workshop creation flow**: Add multiplayer as an option inside the existing launch modal (not a separate button). Modal presents a choice: Solo AI-led mode vs Multiplayer mode. Only a title is required to create a multiplayer workshop — keep it minimal. After creation, facilitator drops straight into the canvas (no lobby/waiting screen at this phase). Share link will be accessible from within the workshop (but share link generation itself is Phase 57).
- **Dashboard distinction**: Multiplayer workshops display a small badge/icon indicator on their dashboard card. Subtle but clear visual distinction from solo workshops. No separate section or tab needed.

### Claude's Discretion

- Post-it color palette and assignment logic (auto-rotation from a fixed palette)
- EzyDraw "being edited" indicator design and unlock behavior
- Animation/feedback for incoming real-time changes from other participants
- Exact modal layout and copy for the Solo vs Multiplayer choice
- How multiplayer badge looks on dashboard cards

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SESS-01 | Facilitator can create a multiplayer workshop (distinct from solo AI-led mode) | `workshops.workshopType` column already in schema; `createWorkshopSession` server action already handles `formData` — extend with `workshopType` field; `workshopSessions` table already schema-migrated |
| SYNC-01 | All canvas nodes and edges sync in real-time across all connected participants | `@liveblocks/zustand` middleware with `storageMapping: { stickyNotes: true, drawingNodes: true, ... }` syncs named Zustand state slices via Liveblocks Storage CRDT; LiveMap inside the Storage type covers concurrent writes |
| SYNC-02 | Multiple participants can concurrently edit the canvas (add/move/delete nodes) | LiveMap CRDT in Liveblocks Storage handles concurrent writes automatically — no manual conflict resolution needed |
| SYNC-03 | Post-it notes inherit the creating participant's assigned color | `authorId` already in `CanvasElementStorable`; `useSelf()` from `@liveblocks/react` returns `UserMeta.info.color`; `addStickyNote` action can auto-populate `color` from participant identity in multiplayer store |
| SYNC-05 | For shared drawing nodes outside Crazy 8s, EzyDraw is locked to one user at a time | Liveblocks Presence (`useUpdateMyPresence`, `useOthers`) is the correct mechanism — store `editingDrawingNodeId: string \| null` in Presence; check `others` before opening EzyDraw |
</phase_requirements>

---

## Summary

Phase 55 has two plans: (1) multiplayer workshop creation UI + `createMultiplayerCanvasStore` factory, and (2) wiring `CanvasStoreProvider` to use the multiplayer store for multiplayer workshops + disabling auto-save + color inheritance + EzyDraw lock.

The critical discovery is a **dependency version conflict**: `@liveblocks/zustand@3.14.0` requires `zustand@^5.0.1` as a peer dependency, but the project currently runs `zustand@4.5.7` (installed transitively — not in `package.json`). This means Plan 55-01 **must upgrade zustand from v4 to v5** before installing `@liveblocks/zustand`. Zustand v5 is a maintenance release (drops React <18, TypeScript <4.5, ES5) with minimal API changes; `createStore` from `zustand/vanilla` is unchanged in usage, and `zundo@2.3.0` already supports `zustand@^4.3.0 || ^5.0.0`. The upgrade is safe but must be tested.

The `temporal` (zundo) + `liveblocks()` middleware composition order is a flagged blocker in STATE.md. Research indicates: `liveblocks()` must be the **outermost** middleware because it needs to intercept the raw `set()` function to detect when mapped state changes. `temporal` should wrap the inner state creator. The fallback decision (if composition fails) is to disable undo/redo for multiplayer sessions and use two separate store factories. EzyDraw locking uses Liveblocks Presence (ephemeral, not Storage) — no storage mapping needed.

**Primary recommendation:** Install `@liveblocks/zustand@3.14.0` + upgrade `zustand` to `^5.0.1` together in one `npm install` command. Create `createMultiplayerCanvasStore` using `liveblocks()` as outer middleware wrapping `temporal()`. Keep `createSoloCanvasStore` (current `createCanvasStore`) unchanged. `CanvasStoreProvider` branches on `workshopType` prop.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@liveblocks/zustand` | 3.14.0 | Zustand middleware for Liveblocks Storage+Presence sync | Official Liveblocks integration for Zustand; requires installing alongside matching `@liveblocks/client/react/node` |
| `zustand` | ^5.0.1 | State management (already used; must upgrade from 4.x) | Peer dep requirement of `@liveblocks/zustand@3.14.0` |
| `zundo` | ^2.3.0 | Undo/redo via `temporal` middleware | Already installed; supports zustand ^5.0.0 — no upgrade needed |
| `@liveblocks/react` | 3.14.0 | `useSelf()`, `useOthers()`, `useUpdateMyPresence()` hooks | Already installed; provides presence data for color inheritance + EzyDraw lock |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@liveblocks/client` | 3.14.0 | `liveblocksClient` already created in Phase 54 | Already installed; no additional setup |
| `@liveblocks/node` | 3.14.0 | Auth endpoint (already wired in Phase 54) | Already installed; no additional setup |

**Installation (single command — ensures version alignment):**
```bash
npm install @liveblocks/zustand@3.14.0 zustand@5.0.1
```

**Note:** `zustand` is currently a transitive dep at 4.5.7. Adding it explicitly at 5.0.1 pins the version. Confirm no other packages break on the upgrade (check `npm ls zustand` after install).

---

## Architecture Patterns

### Recommended Project Structure

The dual-store factory pattern decided in the v1.9 roadmap:

```
src/
├── stores/
│   ├── canvas-store.ts            # createCanvasStore (solo) — UNCHANGED
│   └── multiplayer-canvas-store.ts  # createMultiplayerCanvasStore — NEW in 55-01
├── providers/
│   └── canvas-store-provider.tsx  # Branch on workshopType — MODIFIED in 55-02
├── components/
│   └── workshop/
│       ├── multiplayer-room-loader.tsx  # Dynamic import wrapper — exists (Phase 54)
│       └── multiplayer-room.tsx          # REPLACE placeholder with actual room — 55-02
├── lib/
│   └── liveblocks/
│       └── config.ts              # Global type augmentation — exists (Phase 54)
└── db/
    └── schema/
        ├── workshops.ts           # workshopType already added — exists (Phase 54)
        └── workshop-sessions.ts   # workshopSessions table — exists (Phase 54)
```

### Pattern 1: `createMultiplayerCanvasStore` Factory

**What:** Creates a Zustand vanilla store with `liveblocks()` as outer middleware and `temporal()` as inner. `storageMapping` maps only durable fields (stickyNotes, drawingNodes, etc.). Ephemeral fields (`isDirty`, `selectedStickyNoteIds`, `highlightedCell`, `pendingFitView`, `pendingHmwChipSelection`) are NOT mapped.

**When to use:** When `workshopType === 'multiplayer'`. The store factory is called per canvas mount, not globally.

```typescript
// Source: https://liveblocks.io/docs/guides/how-to-create-a-collaborative-online-whiteboard-with-react-zustand-and-liveblocks
// src/stores/multiplayer-canvas-store.ts
import { createStore } from 'zustand/vanilla';
import { liveblocks } from '@liveblocks/zustand';
import type { WithLiveblocks } from '@liveblocks/zustand';
import { temporal } from 'zundo';
import { liveblocksClient } from '@/lib/liveblocks/config';
import type { CanvasStore } from './canvas-store';

// Composition order: liveblocks() outermost, temporal() inner.
// liveblocks() needs to intercept the set() call to detect mapped state changes.
// temporal() wraps the base state creator and provides the TemporalState.
//
// IMPORTANT: If temporal + liveblocks composition fails at runtime (middleware conflict),
// fall back to liveblocks-only (remove temporal) for multiplayer sessions — the
// decision to sacrifice local undo/redo is acceptable for v1.9.

export const createMultiplayerCanvasStore = (initState?: /* same as createCanvasStore */) => {
  return createStore<WithLiveblocks<CanvasStore>>()(
    liveblocks(
      temporal(
        (set) => ({
          ...DEFAULT_STATE,
          // ... same actions as createCanvasStore
        }),
        {
          partialize: (state) => ({
            stickyNotes: state.stickyNotes,
            drawingNodes: state.drawingNodes,
            gridColumns: state.gridColumns,
            // NOTE: EXCLUDE isDirty, selectedStickyNoteIds, etc.
            // from temporal — no undo on ephemeral state
          }),
          limit: 50,
        }
      ),
      {
        client: liveblocksClient,
        storageMapping: {
          // ONLY durable fields — no ephemeral state
          stickyNotes: true,
          drawingNodes: true,
          gridColumns: true,
          crazy8sSlots: true,
          mindMapNodes: true,
          mindMapEdges: true,
          conceptCards: true,
          personaTemplates: true,
          hmwCards: true,
          selectedSlotIds: true,
          brainRewritingMatrices: true,
          // NOTE: isDirty, selectedStickyNoteIds, highlightedCell, pendingFitView,
          // pendingHmwChipSelection MUST NOT be in storageMapping — they are ephemeral
        },
        // presenceMapping: omitted here — Presence is managed directly via
        // useUpdateMyPresence() in Phase 56. No Zustand fields map to Presence.
      }
    )
  );
};
```

**Critical storageMapping rules (verified from Liveblocks docs):**
- Fields in `storageMapping` MUST be JSON-serializable (no `Date`, no `undefined` values, no class instances)
- Actions (functions) are automatically excluded by the middleware — only state fields need to be listed
- `isDirty`, `selectedStickyNoteIds`, `highlightedCell`, `pendingFitView`, `pendingHmwChipSelection` must NOT be mapped — these are ephemeral and should not be broadcast
- Mapped fields are initialized from Liveblocks Storage on first load (if room has existing data) or from the local Zustand initial state (if room is new/empty)

### Pattern 2: `CanvasStoreProvider` Branching

**What:** `CanvasStoreProvider` receives a new `workshopType` prop. When `'multiplayer'`, it creates the multiplayer store (via `createMultiplayerCanvasStore`) and calls `enterRoom`/`leaveRoom` in a `useEffect`. When `'solo'`, it uses the existing `createCanvasStore` — no behavior change.

```typescript
// Source: Based on liveblocks.io whiteboard guide + existing canvas-store-provider.tsx
// src/providers/canvas-store-provider.tsx (modified)
'use client';

export function CanvasStoreProvider({
  children,
  workshopType,    // NEW prop
  workshopId,      // NEW prop (only used when workshopType === 'multiplayer')
  initialStickyNotes,
  // ... other initialX props unchanged
}: CanvasStoreProviderProps) {
  const isMultiplayer = workshopType === 'multiplayer';

  const [store] = useState(() => {
    if (isMultiplayer) {
      return createMultiplayerCanvasStore({ stickyNotes: initialStickyNotes || [], ... });
    }
    return createCanvasStore({ stickyNotes: initialStickyNotes || [], ... });
  });

  // enterRoom / leaveRoom for multiplayer
  useEffect(() => {
    if (!isMultiplayer || !workshopId) return;

    const multiStore = store as ReturnType<typeof createMultiplayerCanvasStore>;
    const enterRoom = multiStore.getState().liveblocks.enterRoom;
    const leaveRoom = multiStore.getState().liveblocks.leaveRoom;

    enterRoom(getRoomId(workshopId));
    return () => {
      leaveRoom();
    };
  }, [isMultiplayer, workshopId, store]);

  return (
    <CanvasStoreContext.Provider value={store}>
      {children}
    </CanvasStoreContext.Provider>
  );
}
```

**Where `workshopType` comes from:** The step page (`step/[stepId]/page.tsx`) already queries the session with workshop data. Add `session.workshop.workshopType` to the props passed to `CanvasStoreProvider`.

### Pattern 3: Disabling Auto-Save in Multiplayer Mode

**What:** The `useCanvasAutosave` hook in `react-flow-canvas.tsx` must be gated. In multiplayer mode, Liveblocks Storage handles persistence via the webhook — the Neon auto-save must not race with it.

**Implementation:** Add a `workshopType` prop to `ReactFlowCanvas` (and the intermediate components that render it). Gate `useCanvasAutosave` behind `!isMultiplayer`:

```typescript
// Source: Existing src/hooks/use-canvas-autosave.ts + project decision in STATE.md
// In react-flow-canvas.tsx:
const { saveStatus } = workshopType !== 'multiplayer'
  ? useCanvasAutosave(workshopId, stepId)
  : { saveStatus: 'idle' as const };
```

**Note:** React hooks cannot be called conditionally. Use a wrapper approach:

```typescript
// Preferred: conditional noop hook
export function useCanvasAutosave(workshopId: string, stepId: string, enabled = true) {
  // Add 'enabled' param; return early from all side effects if !enabled
  if (!enabled) return { saveStatus: 'idle' as const };
  // ... existing code
}
// Usage: useCanvasAutosave(workshopId, stepId, workshopType !== 'multiplayer')
```

Or extract the hook call into a separate component that is only rendered for solo workshops.

### Pattern 4: Post-it Color Inheritance (SYNC-03)

**What:** When a participant creates a sticky note in a multiplayer workshop, the new note automatically gets that participant's assigned color. The participant's color comes from `UserMeta.info.color` set by the auth endpoint.

**Implementation using `useSelf()` from `@liveblocks/react`:**

```typescript
// Source: https://liveblocks.io/docs/api-reference/liveblocks-react
// In multiplayer-room.tsx (or a multiplayer-aware canvas wrapper):
import { useSelf } from '@liveblocks/react';

const self = useSelf();
const myColor = self?.info?.color; // hex from UserMeta

// Pass myColor as 'defaultPostItColor' to addStickyNote action:
// store.getState().addStickyNote({ ..., color: myColor || 'yellow' });
```

**Color palette for auto-rotation (Claude's discretion):** Use a deterministic 6-color palette rotated by participant slot index. Assign colors in `liveblocks-auth` route when creating the session participant record (Phase 55 wires the participant creation):

```typescript
const PARTICIPANT_COLORS = [
  '#6366f1', // indigo (facilitator/owner default)
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#84cc16', // lime
  '#8b5cf6', // violet
];

// Assigned by: PARTICIPANT_COLORS[participantIndex % PARTICIPANT_COLORS.length]
```

**Note:** The `liveblocks-auth` route currently hardcodes `color: '#6366f1'`. Phase 55-02 needs to assign colors by participant slot from the `session_participants` table.

### Pattern 5: EzyDraw Single-Editor Lock (SYNC-05)

**What:** Only one participant can have EzyDraw open on a given drawing node at a time. Liveblocks Presence is the correct mechanism — it is ephemeral (not stored in Liveblocks Storage) and automatically cleared when a user disconnects.

**How Presence locking works:**
1. Add `editingDrawingNodeId: string | null` to the Presence type (already in `config.ts` as part of Phase 55's scope — update the global `interface Liveblocks` Presence definition)
2. When a participant opens EzyDraw: `updateMyPresence({ editingDrawingNodeId: drawingNodeId })`
3. When EzyDraw closes: `updateMyPresence({ editingDrawingNodeId: null })`
4. Before allowing another participant to open EzyDraw: check `others.some(o => o.presence.editingDrawingNodeId === drawingNodeId)`
5. If locked: show "being edited" overlay on the drawing node

```typescript
// Source: https://liveblocks.io/docs/api-reference/liveblocks-react (useOthers, useUpdateMyPresence)
// In EzyDraw trigger component (multiplayer mode only):
import { useOthers, useUpdateMyPresence } from '@liveblocks/react';

const others = useOthers();
const updatePresence = useUpdateMyPresence();

const isLockedByOther = others.some(
  (o) => o.presence.editingDrawingNodeId === drawingNodeId
);
const lockingUser = others.find(
  (o) => o.presence.editingDrawingNodeId === drawingNodeId
);

// Before opening EzyDraw:
if (isLockedByOther) {
  // Show: "[lockingUser.info.name] is editing this drawing"
  return;
}

// When opening:
updatePresence({ editingDrawingNodeId: drawingNodeId });

// When closing (EzyDraw onClose callback):
updatePresence({ editingDrawingNodeId: null });
```

**Required: Add `editingDrawingNodeId` to Presence type in `config.ts`:**

```typescript
// Update src/lib/liveblocks/config.ts Presence type:
Presence: {
  cursor: { x: number; y: number } | null;
  color: string;
  displayName: string;
  editingDrawingNodeId: string | null;  // ADD this field
};
```

**Unlock behavior (Claude's discretion):** Lock is automatically released when:
- Participant closes EzyDraw (calls `updatePresence({ editingDrawingNodeId: null })`)
- Participant disconnects (Liveblocks clears their Presence automatically after disconnect grace period)

No explicit "steal lock" mechanism needed in this phase — just show "being edited" and prevent opening.

### Pattern 6: Multiplayer Workshop Creation

**What:** The existing `NewWorkshopButton` / `NewWorkshopDialog` needs a mode selection step (Solo vs Multiplayer). The `createWorkshopSession` server action must accept `workshopType` from `formData`.

**Current flow:**
```
Dashboard → NewWorkshopButton → NewWorkshopDialog → createWorkshopSession(formData)
  → creates workshop (workshopType defaults to 'solo')
  → creates session
  → initializes 10 workshopSteps
  → redirect to /workshop/{sessionId}/step/1
```

**Modified flow for multiplayer:**
```
NewWorkshopDialog → [new] mode toggle (Solo AI / Multiplayer)
  → if Multiplayer: formData includes workshopType='multiplayer'
  → createWorkshopSession creates workshop with workshopType='multiplayer'
  → ALSO creates workshopSessions record (liveblocks room registration)
  → redirect to /workshop/{sessionId}/step/1 (same as solo)
```

**Server action change:**
```typescript
// In createWorkshopSession (src/actions/workshop-actions.ts):
const workshopType = (formData?.get('workshopType') as string) === 'multiplayer'
  ? 'multiplayer' as const
  : 'solo' as const;

// Insert workshop with workshopType field:
const [workshop] = await db.insert(workshops).values({
  // ... existing fields
  workshopType,
  maxParticipants: workshopType === 'multiplayer' ? 5 : null,
}).returning();

// If multiplayer: also create workshop_sessions record
if (workshopType === 'multiplayer') {
  await db.insert(workshopSessions).values({
    workshopId: workshop.id,
    liveblocksRoomId: getRoomId(workshop.id),
    shareToken: nanoid(24), // or createPrefixedId — needs unique token
    status: 'waiting',
    maxParticipants: 5,
  });
}
```

**shareToken generation:** `workshopSessions.shareToken` is `UNIQUE NOT NULL`. Use `nanoid` (already available in the project via Clerk's crypto utilities) or `createPrefixedId`. Check existing imports in `src/lib/ids.ts`.

### Pattern 7: Dashboard Badge for Multiplayer Workshops

**What:** `WorkshopCard` needs a visual indicator when the workshop is multiplayer. A `workshopType` prop is passed from `WorkshopGrid` → `WorkshopCard`.

**Data flow:**
- `dashboard/page.tsx` queries workshops with `workshopType` in the select
- Pass `workshopType` through the `workshopsWithProgress` map
- `WorkshopGrid` passes it to `WorkshopCard`
- `WorkshopCard` renders a badge (e.g., a `Users` icon from lucide-react with a subtle color)

### Anti-Patterns to Avoid

- **Putting ephemeral state in `storageMapping`**: `isDirty`, `selectedStickyNoteIds`, `highlightedCell`, `pendingFitView`, `pendingHmwChipSelection` must NOT be mapped. They are per-client and would cause thrashing between participants.
- **Calling `enterRoom` outside of a `useEffect`**: Results in multiple subscriptions if not cleaned up with `leaveRoom` on unmount.
- **Leaving auto-save enabled in multiplayer mode**: Neon auto-save writes on every debounced change; in multiplayer mode Liveblocks Storage is authoritative. Two writers would conflict and the Neon write would overwrite live Liveblocks state.
- **Using `useSelf()` / `useOthers()` outside RoomProvider**: These hooks throw. They are only valid inside a Liveblocks RoomProvider tree. Since the multiplayer store uses `liveblocks()` middleware instead of an explicit `RoomProvider`, these hooks need to be accessed from a component that has access to the Liveblocks room context. Use `store.getState().liveblocks.room` for imperative access, or use the `@liveblocks/react` `RoomProvider` pattern.

**Critical note on `@liveblocks/react` hooks with Zustand middleware:** The `@liveblocks/zustand` middleware does NOT automatically provide a React context for `useOthers()`, `useSelf()`, etc. To use those hooks, the component tree still needs to be wrapped in a `RoomProvider` from `@liveblocks/react`. However, when using the Zustand middleware, the `RoomProvider` is not used for state — only the store is. The `RoomProvider` from `@liveblocks/react` must still wrap the canvas component tree to enable presence hooks.

**Alternative approach (simpler):** Use the `liveblocks.room` object from the Zustand store state to read `others` directly without React hooks:
```typescript
const others = useCanvasStore((s) => (s as any).liveblocks?.others ?? []);
```
Or use `@liveblocks/react`'s `RoomProvider` alongside the Zustand middleware.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Real-time state sync | Custom WebSocket + message protocol | `@liveblocks/zustand` middleware + `storageMapping` | CRDT conflict resolution, automatic reconnect, presence protocol — weeks of work to hand-roll |
| Concurrent write conflict resolution | Custom merge logic | Liveblocks LiveMap CRDT | Handles concurrent adds/deletes correctly across any number of participants |
| EzyDraw lock mechanism | Custom lock table in Neon | Liveblocks Presence (`editingDrawingNodeId`) | Presence is ephemeral and auto-cleared on disconnect — a DB lock would leak if participant disconnects without releasing |
| Participant color assignment | UI color picker per participant | Deterministic rotation from fixed palette | Simple, consistent, no UI overhead; colors are set at room join time |
| Post-it color per creator | Passing color through all create actions | Read `useSelf().info.color` in the multiplayer canvas wrapper | Single source of truth for participant identity; already in UserMeta |

**Key insight:** The Liveblocks Zustand middleware handles the entire sync problem — the application only provides a storageMapping of which state slices to synchronize.

---

## Common Pitfalls

### Pitfall 1: Zustand v4 / @liveblocks/zustand v3 Peer Dependency Mismatch

**What goes wrong:** `npm install @liveblocks/zustand@3.14.0` fails or installs with peer dep warnings; or installs correctly but throws runtime type errors because `@liveblocks/zustand@3.14.0` was built against Zustand v5 APIs.

**Why it happens:** `@liveblocks/zustand@3.14.0` has `"peerDependencies": { "zustand": "^5.0.1" }`. The project currently uses `zustand@4.5.7` (transitive dep, not explicitly listed in `package.json`).

**How to avoid:** Install both in one command:
```bash
npm install @liveblocks/zustand@3.14.0 zustand@5.0.1
```
Then verify `npm ls zustand` shows a single version (5.0.1). Check if any other packages declare `zustand` as a peer dep — particularly check if other Zustand-dependent packages break.

**Warning signs:** TypeScript errors on `WithLiveblocks` import; `liveblocks()` middleware type signature mismatch; runtime "Cannot read properties of undefined (reading 'getState')" errors.

### Pitfall 2: `temporal` + `liveblocks()` Middleware Composition Order

**What goes wrong:** If `temporal()` wraps `liveblocks()` (outer), it captures the liveblocks-injected state properties (`liveblocks.others`, `liveblocks.enterRoom`, etc.) in undo history — causing broken undo behavior and potential infinite loops.

**Why it happens:** `temporal` records snapshots of the full state object at each `set()` call. If the liveblocks middleware's injected `liveblocks` object is in the tracked state, history entries include connection state.

**How to avoid:** `liveblocks()` MUST be the outermost middleware. `temporal()` wraps only the base state creator. The `temporal` `partialize` function already filters which fields enter undo history — use it to exclude any fields that shouldn't be in history.

**Fallback:** If empirical testing shows composition fails even with correct order, remove `temporal` from the multiplayer store only. Solo store retains undo/redo. This is the explicitly noted fallback in STATE.md.

**Warning signs:** TypeScript error on `createStore<WithLiveblocks<TemporalState<CanvasStore>>>` type parameter; runtime errors when calling `undo()` after Liveblocks syncs state.

### Pitfall 3: Auto-Save Writing During Multiplayer Session

**What goes wrong:** `useCanvasAutosave` fires a Neon write while Liveblocks Storage is the authoritative source. On the next page load, the step page reads from Neon (not Liveblocks), overwriting live edits from other participants.

**Why it happens:** `react-flow-canvas.tsx` unconditionally calls `useCanvasAutosave(workshopId, stepId)`. It has no awareness of `workshopType`.

**How to avoid:** Gate the hook behind `workshopType !== 'multiplayer'`. Simplest pattern: add an `enabled` parameter to `useCanvasAutosave` that short-circuits all effects when `false`.

**Warning signs:** Participants see each other's edits vanish after page reload; Neon `step_artifacts` shows data that doesn't match Liveblocks room storage.

### Pitfall 4: `useSelf()` / `useOthers()` Without Room Context

**What goes wrong:** `useSelf()` or `useOthers()` throws "No LiveblocksContext found" when called outside a `RoomProvider` from `@liveblocks/react`.

**Why it happens:** `@liveblocks/zustand` provides the store sync, but NOT the React context tree that `useOthers()` and `useSelf()` require.

**How to avoid:** Wrap the multiplayer canvas component tree with `<RoomProvider>` from `@liveblocks/react`, configured to use the same room as the Zustand store. The `RoomProvider` and the Zustand store both connect to the same Liveblocks room; state from the room is accessed via the Zustand store, while presence data (`useOthers`, `useSelf`) is accessed via React hooks.

```typescript
// In multiplayer-room.tsx:
import { RoomProvider } from '@liveblocks/react';
import { getRoomId } from '@/lib/liveblocks/config';

export default function MultiplayerRoom({ workshopId }: { workshopId: string }) {
  return (
    <RoomProvider id={getRoomId(workshopId)} initialPresence={{ cursor: null, color: '#6366f1', displayName: '', editingDrawingNodeId: null }}>
      {/* Canvas and presence components here */}
    </RoomProvider>
  );
}
```

**Alternative (Zustand-only approach):** Read `others` from the Zustand store via `store.getState().liveblocks.others` — this avoids the React context requirement but loses the reactive subscription. Use for imperative checks (e.g., inside action handlers). Use `useCanvasStore(s => (s as WithLiveblocks<CanvasStore>).liveblocks.others)` for reactive use.

### Pitfall 5: `shareToken` Generation for `workshopSessions`

**What goes wrong:** `workshopSessions.shareToken` is `UNIQUE NOT NULL` but `createWorkshopSession` doesn't currently create a `workshopSessions` record. Inserting with a NULL or duplicate token fails.

**Why it happens:** `workshopSessions` table was added in Phase 54 schema but no server action populates it yet.

**How to avoid:** Generate a URL-safe random token in the server action. Check if `nanoid` is available in the project (it's likely available via Clerk's `@clerk/nextjs` transitive dep, or use `crypto.randomBytes(18).toString('base64url')` which is available in Node.js 18+).

**Warning signs:** `null value in column "share_token" of relation "workshop_sessions" violates not-null constraint` error when creating a multiplayer workshop.

### Pitfall 6: Zustand v5 Breaking Change — `persist` middleware behavior

**What goes wrong:** The Zustand `persist` middleware changed behavior in v4.5.5+/v5 — it no longer stores initial state at creation time.

**Why it happens:** WorkshopPilot does NOT use the `persist` middleware (uses custom Neon-based persistence). This pitfall is NOT applicable to this project, but worth verifying.

**How to avoid:** Confirm `canvas-store.ts` does not use `persist` middleware (verified — it uses `temporal` only).

---

## Code Examples

Verified patterns from official sources:

### createMultiplayerCanvasStore with Dual Middleware

```typescript
// Source: https://liveblocks.io/docs/guides/how-to-create-a-collaborative-online-whiteboard-with-react-zustand-and-liveblocks
// src/stores/multiplayer-canvas-store.ts
import { createStore } from 'zustand/vanilla';
import { liveblocks, type WithLiveblocks } from '@liveblocks/zustand';
import { temporal } from 'zundo';
import { liveblocksClient } from '@/lib/liveblocks/config';
import type { CanvasStore } from './canvas-store';

export const createMultiplayerCanvasStore = (initState?: { stickyNotes: StickyNote[]; /* ... */ }) => {
  return createStore<WithLiveblocks<CanvasStore>>()(
    liveblocks(
      temporal(
        (set) => ({
          ...DEFAULT_STATE,
          // Same actions as createCanvasStore — but markClean/markDirty become no-ops
          // or are omitted entirely since isDirty is not relevant in multiplayer mode
        }),
        {
          partialize: (state) => ({
            stickyNotes: state.stickyNotes,
            drawingNodes: state.drawingNodes,
            gridColumns: state.gridColumns,
            crazy8sSlots: state.crazy8sSlots,
            mindMapNodes: state.mindMapNodes,
            mindMapEdges: state.mindMapEdges,
            conceptCards: state.conceptCards,
            personaTemplates: state.personaTemplates,
            hmwCards: state.hmwCards,
            selectedSlotIds: state.selectedSlotIds,
            brainRewritingMatrices: state.brainRewritingMatrices,
          }),
          limit: 50,
        }
      ),
      {
        client: liveblocksClient,
        storageMapping: {
          stickyNotes: true,
          drawingNodes: true,
          gridColumns: true,
          crazy8sSlots: true,
          mindMapNodes: true,
          mindMapEdges: true,
          conceptCards: true,
          personaTemplates: true,
          hmwCards: true,
          selectedSlotIds: true,
          brainRewritingMatrices: true,
        },
      }
    )
  );
};
```

### enterRoom / leaveRoom in CanvasStoreProvider

```typescript
// Source: https://liveblocks.io/docs/guides/how-to-create-a-collaborative-online-whiteboard-with-react-zustand-and-liveblocks
// In canvas-store-provider.tsx useEffect:
useEffect(() => {
  if (!isMultiplayer || !workshopId) return;
  const state = (store as ReturnType<typeof createMultiplayerCanvasStore>).getState();
  const { enterRoom, leaveRoom } = state.liveblocks;
  enterRoom(getRoomId(workshopId));
  return () => { leaveRoom(); };
}, [isMultiplayer, workshopId, store]);
```

### EzyDraw Lock Check via Presence

```typescript
// Source: https://liveblocks.io/docs/api-reference/liveblocks-react (useOthers)
// Requires RoomProvider wrapper in multiplayer-room.tsx
import { useOthers, useUpdateMyPresence } from '@liveblocks/react';

function DrawingNodeWithLock({ drawingNodeId }: { drawingNodeId: string }) {
  const others = useOthers();
  const updatePresence = useUpdateMyPresence();

  const lockingParticipant = others.find(
    o => o.presence.editingDrawingNodeId === drawingNodeId
  );
  const isLocked = !!lockingParticipant;

  const handleOpenEzyDraw = () => {
    if (isLocked) return; // Show indicator, block open
    updatePresence({ editingDrawingNodeId: drawingNodeId });
    // ... open EzyDraw
  };

  const handleCloseEzyDraw = () => {
    updatePresence({ editingDrawingNodeId: null });
    // ... close EzyDraw
  };

  return (
    <>
      {isLocked && (
        <div className="...">
          {lockingParticipant.info.name} is editing this drawing
        </div>
      )}
      <button onClick={handleOpenEzyDraw} disabled={isLocked}>
        Open EzyDraw
      </button>
    </>
  );
}
```

### NewWorkshopDialog Mode Toggle

```typescript
// In new-workshop-dialog.tsx — add mode state:
const [workshopType, setWorkshopType] = useState<'solo' | 'multiplayer'>('solo');

// In form body — add toggle between solo/multiplayer:
<div className="flex gap-2">
  <button
    type="button"
    onClick={() => setWorkshopType('solo')}
    className={cn('...', workshopType === 'solo' && 'ring-2 ring-primary')}
  >
    <MessageSquare /> Solo AI-led
  </button>
  <button
    type="button"
    onClick={() => setWorkshopType('multiplayer')}
    className={cn('...', workshopType === 'multiplayer' && 'ring-2 ring-primary')}
  >
    <Users /> Multiplayer
  </button>
</div>

// Hidden input:
<input type="hidden" name="workshopType" value={workshopType} />
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `create()` with zustand v4 | `createStore()` from `zustand/vanilla` (unchanged API) | v5 is backward compat for vanilla | No change needed to `createStore` usage |
| `createRoomContext()` factory | Global `interface Liveblocks` augmentation | Liveblocks v2.0 | Already using v3 pattern from Phase 54 |
| `@liveblocks/zustand` peerDep: zustand v4 | peerDep: zustand v5.0.1 | Liveblocks v3.x | Requires upgrading zustand from 4.5.7 to 5.0.1 |
| Manual webhook debounce | Liveblocks native 60s throttle on StorageUpdated | Always | Phase 55's webhook TODO becomes the Neon upsert in the existing webhook route |

**Deprecated/outdated:**
- `createRoomContext()`: Removed in Liveblocks v2.0. NOT applicable — already using global augmentation.
- Zustand `create()` default export: Removed in v5. NOT applicable — project uses `createStore` from `zustand/vanilla`.

---

## Open Questions

1. **temporal + liveblocks composition: empirical verification needed**
   - What we know: Composition order `liveblocks(temporal(...))` is theoretically correct (liveblocks outer, temporal inner). Neither official doc confirms this works with vanilla `createStore`.
   - What's unclear: Whether `WithLiveblocks<CanvasStore>` type satisfies the generic constraints when `temporal` is in the chain (TypeScript may reject the composition).
   - Recommendation: Attempt composition in 55-01. If TypeScript rejects or runtime throws on `enterRoom`, fall back to `liveblocks()` only (remove `temporal`) for the multiplayer store. State in STATE.md as a known deviation.

2. **RoomProvider requirement for `useSelf()` / `useOthers()`**
   - What we know: `@liveblocks/zustand` does not provide a React context tree. `useOthers()` / `useSelf()` require `RoomProvider` from `@liveblocks/react`.
   - What's unclear: Whether using `RoomProvider` alongside the Zustand middleware causes double-connection to the same Liveblocks room, or whether they correctly share the same connection.
   - Recommendation: Wrap `multiplayer-room.tsx` with `RoomProvider` from `@liveblocks/react` with the same room ID. Test by checking the Network tab — only one WebSocket connection should be established.

3. **`shareToken` generation function**
   - What we know: `workshopSessions.shareToken` is `UNIQUE NOT NULL`. No current token generator is used in this project for this purpose.
   - What's unclear: Whether `nanoid` is available or needs installing.
   - Recommendation: Use `crypto.randomBytes(18).toString('base64url')` — available in Node.js 18+ (confirmed by Next.js 16.1.1 base), produces a 24-character URL-safe token, no additional package needed.

4. **Webhook TODO: `storageUpdated` → Neon upsert**
   - What we know: The webhook handler in Phase 54 has a clear TODO comment. Phase 55 needs to wire the actual Drizzle upsert into `step_artifacts`.
   - What's unclear: Which `workshopStepId` to use — the webhook knows the workshop but not the current step.
   - Recommendation: Query `workshop_sessions` by `liveblocksRoomId` to get `workshopId`, then query `worksheet_steps` for the `in_progress` step. Upsert the storage snapshot JSON into `step_artifacts.artifact` under a `_canvas` key (consistent with how `loadCanvasState` reads it).

---

## Implementation Plan Mapping

Based on the phase description, two plans cover Phase 55:

### Plan 55-01: Multiplayer Workshop Creation + `createMultiplayerCanvasStore`

**Files:**
- `src/stores/multiplayer-canvas-store.ts` — NEW: `createMultiplayerCanvasStore` factory
- `src/components/dialogs/new-workshop-dialog.tsx` — MODIFY: add mode toggle
- `src/actions/workshop-actions.ts` — MODIFY: accept `workshopType` from formData, create `workshopSessions` record
- `src/components/dashboard/workshop-card.tsx` — MODIFY: add multiplayer badge
- `src/app/dashboard/page.tsx` — MODIFY: pass `workshopType` to WorkshopCard
- `package.json` — MODIFY: install `@liveblocks/zustand@3.14.0 zustand@5.0.1`

### Plan 55-02: Wire CanvasStoreProvider + Disable Auto-Save + Color Inheritance + EzyDraw Lock

**Files:**
- `src/providers/canvas-store-provider.tsx` — MODIFY: add `workshopType`/`workshopId` props, branch store creation, call `enterRoom`/`leaveRoom`
- `src/components/workshop/multiplayer-room.tsx` — REPLACE placeholder with `RoomProvider` + canvas wire-up
- `src/hooks/use-canvas-autosave.ts` — MODIFY: add `enabled` parameter
- `src/components/canvas/react-flow-canvas.tsx` — MODIFY: pass `workshopType`, gate auto-save
- `src/app/workshop/[sessionId]/step/[stepId]/page.tsx` — MODIFY: pass `workshopType` to `CanvasStoreProvider`
- `src/app/api/webhooks/liveblocks/route.ts` — MODIFY: wire actual Drizzle upsert for storageUpdated
- `src/lib/liveblocks/config.ts` — MODIFY: add `editingDrawingNodeId: string | null` to Presence type

---

## Sources

### Primary (HIGH confidence)
- [Liveblocks @liveblocks/zustand API Reference](https://liveblocks.io/docs/api-reference/liveblocks-zustand) — middleware signature, storageMapping, presenceMapping, enterRoom/leaveRoom
- [Liveblocks collaborative whiteboard with Zustand](https://liveblocks.io/docs/guides/how-to-create-a-collaborative-online-whiteboard-with-react-zustand-and-liveblocks) — full store setup with storageMapping + presenceMapping
- [Liveblocks Storage with Zustand guide](https://liveblocks.io/docs/guides/how-to-use-liveblocks-storage-with-zustand) — storageMapping initialization behavior
- [npm: @liveblocks/zustand@3.14.0](https://www.npmjs.com/package/@liveblocks/zustand) — verified peer dep: `zustand: ^5.0.1`
- Phase 54 research + summaries (internal) — confirmed stack, type definitions, lazy init patterns, existing file locations
- `src/lib/liveblocks/config.ts` (project) — actual CanvasElementStorable type, UserMeta shape
- `src/stores/canvas-store.ts` (project) — full CanvasState and CanvasActions types for storageMapping list
- `src/components/dialogs/new-workshop-dialog.tsx` (project) — existing creation dialog pattern
- `src/hooks/use-canvas-autosave.ts` (project) — existing auto-save that must be gated

### Secondary (MEDIUM confidence)
- [Liveblocks multiplayer undo/redo with Zustand](https://liveblocks.io/docs/guides/how-to-use-liveblocks-multiplayer-undo-redo-with-zustand) — confirms History API works per-client in memory; store shape doesn't need special structure
- [npm: zundo@2.3.0](https://www.npmjs.com/package/zundo) — peerDeps: `zustand@^4.3.0 || ^5.0.0` — confirmed safe with Zustand v5 upgrade

### Tertiary (LOW confidence)
- Middleware composition order (temporal outermost vs liveblocks outermost): inferred from how each middleware intercepts `set()` — not explicitly documented in either library. Empirical verification required in Plan 55-01.
- `RoomProvider` + Zustand middleware co-existence (shared vs separate WebSocket): not explicitly documented. Single WebSocket assumed — verify in Plan 55-02.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — packages verified on npm; peer dep conflict identified and resolution confirmed
- Architecture (storageMapping, presenceMapping): HIGH — official docs verified patterns
- Middleware composition order: LOW — inferred, requires empirical testing
- EzyDraw lock via Presence: HIGH — standard Liveblocks Presence pattern, well documented
- Dashboard badge + modal changes: HIGH — straightforward UI additions to existing patterns

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (Liveblocks stable; Zustand v5 APIs stable)
