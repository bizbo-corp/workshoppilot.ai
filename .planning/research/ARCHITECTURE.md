# Architecture Research: v1.9 Multiplayer Collaboration

**Domain:** Real-time multiplayer design thinking workshop with live canvas sync
**Researched:** 2026-02-26
**Confidence:** HIGH (Liveblocks docs), MEDIUM (integration patterns from examples), HIGH (Vercel constraint confirmed)

---

## The Core Constraint: No Persistent WebSocket Servers on Vercel

Vercel serverless functions cannot maintain persistent connections. This is a fundamental architectural constraint, not a configuration option. The maximum execution timeout prevents WebSocket server-side handlers.

**Source:** [Vercel KB: Do Serverless Functions support WebSocket connections?](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections) — confirmed as hard constraint.

**Consequence:** A dedicated external real-time provider is required. WorkshopPilot.ai cannot self-host WebSocket infrastructure while deployed on Vercel.

**Chosen provider:** **Liveblocks** — the only provider with a documented, working example combining ReactFlow + Zustand + Next.js multiplayer, which exactly matches the existing stack.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (All Participants)                    │
├──────────────────────────────┬──────────────────────────────────────┤
│    Facilitator Client        │     Participant Clients (1-14)        │
│  ┌────────────────────────┐  │  ┌────────────────────────────────┐  │
│  │  ReactFlow Canvas      │  │  │  ReactFlow Canvas (same data)  │  │
│  │  + Cursor Overlay      │  │  │  + Cursor Overlay              │  │
│  │  + Presence Bar        │  │  │  + Presence Bar                │  │
│  │  + Step Controls       │  │  │  + AI Chat (read-only)         │  │
│  │  + AI Chat (writable)  │  │  │  + Guest Auth Modal on join    │  │
│  └─────────┬──────────────┘  │  └─────────────┬──────────────────┘  │
│            │                 │                │                      │
└────────────┼─────────────────┴────────────────┼──────────────────────┘
             │                                  │
             ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Liveblocks Cloud                               │
│                  (External Real-Time Provider)                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Room: "workshop:{workshopId}"                                │   │
│  │  ┌─────────────────────┐  ┌──────────────────────────────┐  │   │
│  │  │  Presence (ephemeral)│  │  Storage (durable CRDT)      │  │   │
│  │  │  - cursor: {x,y}    │  │  - stickyNotes: LiveList     │  │   │
│  │  │  - userId/guestName │  │  - mindMapNodes: LiveList    │  │   │
│  │  │  - color: string    │  │  - gridColumns: LiveList     │  │   │
│  │  └─────────────────────┘  │  - conceptCards: LiveList    │  │   │
│  │                            │  - [all other canvas state]  │  │   │
│  │  Events (broadcast)        └──────────────────────────────┘  │   │
│  │  - STEP_CHANGED            | StorageUpdated webhook (60s)    │   │
│  │  - AI_CHAT_UPDATE          | fires to Next.js API route      │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
             │                                  │
             ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Next.js (Vercel Serverless)                     │
├────────────────────┬────────────────────┬────────────────────────────┤
│  /api/liveblocks-  │  /api/webhooks/    │   Server Actions /          │
│  auth route.ts     │  liveblocks        │   DB (Neon Postgres)         │
│                    │  route.ts          │                              │
│  - Clerk auth OR   │                    │  - stepArtifacts (JSONB)     │
│    guest session   │  - StorageUpdated  │  - chatMessages              │
│  - prepareSession  │    write to        │  - workshopSteps             │
│  - allow room      │    stepArtifacts   │  - workshopMembers (guests)  │
│    by workshopId   │    in Neon         │                              │
└────────────────────┴────────────────────┴────────────────────────────┘
```

---

## Recommended Architecture: Liveblocks + Zustand Middleware

### Why Liveblocks Over Alternatives

| Provider | Verdict | Key Reason |
|----------|---------|------------|
| **Liveblocks** | **Recommended** | Only provider with working ReactFlow + Zustand + Next.js example. CRDT storage. Presence built-in. Free tier covers early users. |
| PartyKit | Viable but extra | Requires deploying separate PartyKit server. More flexibility, more ops. No pre-built ReactFlow integration. |
| Pusher | Not suitable | Pub/sub only, no CRDT storage. Would require building conflict resolution manually. |
| Ably | Not suitable | Same as Pusher — transport layer only, no shared state management. |
| Supabase Realtime | Not suitable | Not CRDT-based. Canvas conflict resolution would be complex to implement. |
| Yjs (self-hosted) | Not viable | Requires persistent server (WebSocket/PartyKit). Cannot self-host on Vercel. |

**Source confidence:** HIGH — ReactFlow explicitly lists Liveblocks as a recommended provider with a Zustand example available at liveblocks.io/examples.

### Liveblocks Plan Decision

**Use Free tier to ship, upgrade to Pro ($30/month) when revenue justifies.**

Free tier limits (verified from liveblocks.io/pricing):
- 500 monthly active rooms (sufficient for early adopter workshops)
- 10 simultaneous connections per room (covers 5-10 participant workshops; > 10 requires Pro)
- 256 MB realtime data storage
- 200 monthly active users

**Note:** If a facilitator expects 10-15 participants, the Pro plan ($30/month + $0.03/room overage) will be needed. Design the upgrade prompt into the UI from the start.

---

## Standard Architecture

### Component Responsibilities

| Component | Responsibility | New or Modified |
|-----------|---------------|----------------|
| `LiveblocksProvider` | WebSocket connection, room lifecycle | NEW — wraps multiplayer workshop page |
| `liveblocks-auth` API route | Issues access tokens (Clerk users + guests) | NEW — single auth endpoint |
| `liveblocks-webhook` API route | Syncs StorageUpdated to Neon stepArtifacts | NEW — write-back from Liveblocks to DB |
| `canvas-store.ts` (Zustand) | Canvas state with Liveblocks middleware added | MODIFIED — add `liveblocks()` middleware |
| `CanvasStoreProvider` | Per-workshop store scoped to Liveblocks room | MODIFIED — add `enterRoom/leaveRoom` calls |
| `react-flow-canvas.tsx` | Canvas rendering + live cursor overlay | MODIFIED — add cursor presence rendering |
| `LiveCursors` component | Renders other users' cursors via ViewportPortal | NEW |
| `PresenceBar` component | Participant list with avatars and names | NEW |
| `GuestJoinModal` component | Name-only entry flow for participants | NEW |
| `WorkshopTypeSelector` | Facilitator chooses solo vs multiplayer at creation | NEW/MODIFIED |
| `StepProgressionControl` | Facilitator-only next/back step buttons for live session | NEW |
| Share-link route (`/join/[token]`) | Validates share token, redirects to workshop | NEW |

---

## Recommended Project Structure

New files for v1.9 multiplayer:

```
src/
├── app/
│   ├── api/
│   │   ├── liveblocks-auth/
│   │   │   └── route.ts          # Auth endpoint: Clerk users + guest sessions
│   │   └── webhooks/
│   │       └── liveblocks/
│   │           └── route.ts      # StorageUpdated -> write to Neon stepArtifacts
│   └── join/
│       └── [token]/
│           └── page.tsx          # Share-link entry -> guest name -> redirect
│
├── components/
│   ├── canvas/
│   │   ├── live-cursors.tsx       # Renders other users' cursors via ViewportPortal
│   │   └── react-flow-canvas.tsx  # MODIFIED: cursor presence hooks added
│   ├── multiplayer/
│   │   ├── presence-bar.tsx       # Participant list with online indicators
│   │   ├── guest-join-modal.tsx   # Name-only entry modal for participants
│   │   └── step-progression-control.tsx  # Facilitator-only next/back
│   └── workshop/
│       └── workshop-type-selector.tsx    # Solo vs Multiplayer choice
│
├── lib/
│   └── liveblocks/
│       ├── client.ts              # createClient() with authEndpoint
│       ├── config.ts              # Type definitions for Presence, Storage, RoomEvent
│       └── room-id.ts             # Convention: "workshop:{workshopId}"
│
├── providers/
│   └── canvas-store-provider.tsx  # MODIFIED: adds liveblocks middleware + enterRoom
│
└── stores/
    └── canvas-store.ts            # MODIFIED: liveblocks() middleware wrapping
```

---

## Architectural Patterns

### Pattern 1: Zustand + Liveblocks Middleware (Primary Sync)

**What:** The `@liveblocks/zustand` middleware intercepts Zustand `set()` calls and syncs declared keys to Liveblocks Storage (CRDT) and Presence. Other clients receive changes via WebSocket and their local Zustand stores update automatically.

**When to use:** All canvas durable state (sticky notes, mind map nodes, grid columns, concept cards, etc.) that all participants should see.

**How it works:**

```typescript
// stores/canvas-store.ts — MODIFIED
import { liveblocks } from '@liveblocks/zustand';
import { client } from '@/lib/liveblocks/client';

export const createMultiplayerCanvasStore = (initState?) => {
  return createStore<CanvasStore>()(
    temporal(  // existing undo/redo — wraps outermost
      liveblocks(
        (set) => ({
          ...DEFAULT_STATE,
          // all existing actions unchanged
        }),
        {
          client,
          storageMapping: {
            stickyNotes: true,
            drawingNodes: true,
            mindMapNodes: true,
            mindMapEdges: true,
            gridColumns: true,
            conceptCards: true,
            personaTemplates: true,
            hmwCards: true,
            crazy8sSlots: true,
          },
          presenceMapping: {
            cursor: true,  // { x: number; y: number } | null
          },
        }
      )
    )
  );
};

// Solo store (unchanged existing function)
export const createSoloCanvasStore = createCanvasStore;
```

The `storageMapping` keys map to Liveblocks `LiveList` (for arrays) and `LiveObject` (for objects) automatically. Conflicts are resolved by the CRDT engine at the field level.

**Trade-off:** Two store factory functions are required. Solo workshops must NOT use the Liveblocks middleware — it always tries to connect to a room on mount, wasting free tier monthly active room quota.

### Pattern 2: Liveblocks Presence for Live Cursors

**What:** Ephemeral per-user data (cursor position, display name, color) stored in Presence. Auto-discarded on disconnect. Other users' cursors retrieved via `useOthers`.

**When to use:** Cursor position, user name/color display, any UI state that should vanish when a user leaves.

**Canvas coordinate handling — critical detail:** ReactFlow's viewport has its own coordinate system independent of screen pixels. Cursor positions must be stored in **flow coordinates** (not screen pixels) so they render correctly regardless of each viewer's zoom/pan state.

```typescript
// Inside react-flow-canvas.tsx — MODIFIED
const { screenToFlowPosition } = useReactFlow();
const updateMyPresence = useUpdateMyPresence();

const handleMouseMove = useCallback((event: React.MouseEvent) => {
  const flowPosition = screenToFlowPosition({
    x: event.clientX,
    y: event.clientY,
  });
  updateMyPresence({ cursor: flowPosition });
}, [screenToFlowPosition, updateMyPresence]);

const handleMouseLeave = useCallback(() => {
  updateMyPresence({ cursor: null });
}, [updateMyPresence]);
```

**Cursor rendering (live-cursors.tsx):**

```typescript
// components/canvas/live-cursors.tsx — NEW
import { ViewportPortal } from '@xyflow/react';
import { useOthers } from '@liveblocks/react';

export function LiveCursors() {
  const others = useOthers();

  return (
    <ViewportPortal>
      {others.map((user) => {
        if (!user.presence.cursor) return null;
        return (
          <div
            key={user.connectionId}
            style={{
              position: 'absolute',
              left: user.presence.cursor.x,
              top: user.presence.cursor.y,
              pointerEvents: 'none',
            }}
          >
            <CursorIcon color={user.presence.color} />
            <span>{user.presence.name}</span>
          </div>
        );
      })}
    </ViewportPortal>
  );
}
```

`ViewportPortal` is the correct placement because cursors must move with the canvas when users pan/zoom. Cursors placed in the DOM outside `ViewportPortal` would drift from actual node positions.

### Pattern 3: Broadcast Events for Facilitator Controls

**What:** One-way ephemeral messages sent to all connected users in a room. Not stored, not replayed on reconnect. Useful for events that do not need to survive disconnection.

**When to use:** Step progression commands (facilitator advances to Step 3), AI chat notifications.

```typescript
// Facilitator (sends):
const broadcast = useBroadcastEvent<RoomEvent>();
const handleNextStep = () => {
  broadcast({ type: 'STEP_CHANGED', stepNumber: currentStep + 1 });
  advanceWorkshopStep(workshopId, currentStep + 1); // also write to Neon
};

// All participants (receives):
useEventListener<RoomEvent>(({ event }) => {
  if (event.type === 'STEP_CHANGED') {
    router.refresh();
  }
});
```

**Important:** Broadcast events are ephemeral. A participant who joins AFTER the step change will NOT receive it. Step state must ALSO be written to Neon so late-joiners load the correct step on page load.

The ReactFlow docs explicitly cite "next/previous slide buttons in presentations" as the canonical use case for broadcast events. Step progression is the same pattern.

### Pattern 4: Dual-Mode Workshop (Solo vs Multiplayer)

**What:** The `workshops` table gains a `workshopType` column. Solo workshops use the existing Zustand store with no Liveblocks middleware. Multiplayer workshops use the Liveblocks-wrapped store.

**Implementation approach:**

```typescript
// providers/canvas-store-provider.tsx — MODIFIED
const [store] = useState(() => {
  if (isMultiplayer) {
    return createMultiplayerCanvasStore(initialState);
  }
  return createSoloCanvasStore(initialState); // existing behavior, untouched
});

useEffect(() => {
  if (!isMultiplayer) return;
  const lb = store.getState().liveblocks;
  lb.enterRoom(`workshop:${workshopId}`);
  return () => lb.leaveRoom(`workshop:${workshopId}`);
}, [isMultiplayer, workshopId, store]);
```

Room naming convention: `workshop:{workshopId}` (e.g., `workshop:ws_abc123`). The colon separator follows the Liveblocks recommended pattern for wildcard access grants.

### Pattern 5: Guest Authentication (Name-Only Join)

**What:** Participants join via share link, enter their name, receive a Liveblocks access token without a Clerk account. The split auth endpoint handles both Clerk users and guest cookies.

**Flow:**
```
1. Facilitator shares /join/[shareToken]
2. Participant visits link -> GuestJoinModal shows (no workshop content visible)
3. Participant types name, clicks "Join Workshop"
4. POST /api/guest-join with { shareToken, guestName }
5. Server: validates shareToken -> looks up workshopId
6. Server: creates workshopMembers record { clerkUserId: null, guestName, role: 'participant' }
7. Server: sets HttpOnly signed cookie { workshopId, guestId, guestName, color }
8. Redirect to /workshop/[workshopId] (participant view)
9. On mount: LiveblocksProvider calls /api/liveblocks-auth
10. Auth endpoint: no Clerk session -> reads cookie -> issues guest access token
11. Liveblocks room joined -> canvas state loaded
```

**Auth endpoint (handles both Clerk + guest):**

```typescript
// app/api/liveblocks-auth/route.ts — NEW
export async function POST(req: Request) {
  const { roomId } = await req.json();
  const workshopId = roomId.replace('workshop:', '');

  // Path A: Authenticated Clerk user (facilitator or invited member)
  const { userId } = await auth();
  if (userId) {
    const workshop = await getWorkshopForUser(workshopId, userId);
    if (!workshop) return new Response('Not authorized', { status: 401 });
    const session = liveblocks.prepareSession(userId, {
      userInfo: { name: fullName, avatar: imageUrl, color: FACILITATOR_COLOR, role: 'facilitator' },
    });
    session.allow(roomId, session.FULL_ACCESS);
    const { status, body } = await session.authorize();
    return new Response(body, { status });
  }

  // Path B: Guest participant (HttpOnly signed cookie)
  const guestSession = getGuestSession(await cookies(), workshopId);
  if (!guestSession) return new Response('Not authorized', { status: 401 });
  const session = liveblocks.prepareSession(`guest:${guestSession.guestId}`, {
    userInfo: { name: guestSession.guestName, avatar: null, color: guestSession.color, role: 'participant' },
  });
  session.allow(roomId, session.FULL_ACCESS);
  const { status, body } = await session.authorize();
  return new Response(body, { status });
}
```

### Pattern 6: Liveblocks to Neon Sync (Write-Back)

**What:** The `StorageUpdated` webhook fires (throttled to once per 60 seconds) and writes the current Liveblocks Storage snapshot to `stepArtifacts` in Neon. This bridges the real-time layer back to the existing persistence layer.

**Purpose:** Liveblocks Storage IS the authoritative canvas state during an active multiplayer session. When the session ends, or when participants later load the workshop in solo mode, they read from Neon — so Neon must stay reasonably current.

```typescript
// app/api/webhooks/liveblocks/route.ts — NEW
export async function POST(req: Request) {
  const rawBody = await req.text();
  const event = webhookHandler.verifyRequest({
    headers: Object.fromEntries(req.headers.entries()),
    rawBody,
  });

  if (event.type === 'storageUpdated') {
    const workshopId = event.data.roomId.replace('workshop:', '');
    const storage = await liveblocks.getStorageDocument(event.data.roomId, 'json');
    await syncLiveblocksStorageToNeon(workshopId, storage);
  }

  return new Response('OK', { status: 200 });
}
```

**60-second throttle implication:** Neon can be up to 60 seconds stale during an active session. This is acceptable — the active canvas is Liveblocks. On "End Session", trigger a manual sync via the Liveblocks REST API to write the final state to Neon before the room is archived.

**Auto-save must be disabled in multiplayer mode:** The existing `useCanvasAutosave` hook must skip all writes when `isMultiplayer: true`. Both mechanisms writing to Neon simultaneously creates races.

```typescript
// hooks/use-canvas-autosave.ts — MODIFIED
export function useCanvasAutosave(workshopId: string, stepId: string, options?: { disabled?: boolean }) {
  if (options?.disabled) return { saveStatus: 'idle' as const };
  // ... existing logic unchanged
}
```

---

## Data Flow

### Multiplayer Canvas State Flow

```
Participant A drags sticky note
    |
    v
updateStickyNote(id, { position }) in local Zustand store
    |
    v
liveblocks middleware intercepts set()
    |
    v
Sends delta to Liveblocks Cloud via WebSocket
    |
    v
Liveblocks merges into LiveList (CRDT conflict resolution)
    |
    v
Pushes update to all other connected clients via WebSocket
    |
    v
Other clients' liveblocks middleware receives delta
    |
    v
Patches their local Zustand stickyNotes array
    |
    v
React re-renders ReactFlow canvas with updated node position

    (every 60s, throttled)
    v
StorageUpdated webhook fires -> Neon stepArtifacts updated
```

### Guest Join Flow

```
Facilitator: shares /join/[shareToken]
    |
    v
Participant visits URL
    |
    v
GuestJoinModal renders (blocks workshop content)
    |
    v
Participant enters name -> POST /api/guest-join
    |
    v
Server: validates shareToken, creates workshopMembers record
    |
    v
Server: sets HttpOnly cookie { guestId, guestName, workshopId, color }
    |
    v
Redirect to /workshop/[workshopId]
    |
    v
LiveblocksProvider mounts -> calls /api/liveblocks-auth
    |
    v
Auth endpoint: no Clerk session -> reads cookie -> issues guest token
    |
    v
Liveblocks room joined -> canvas state loaded -> participant sees live session
```

### Step Progression Flow (Facilitator-Only)

```
Facilitator clicks "Next Step"
    |
    v
StepProgressionControl (role check: facilitator only)
    |
    v (two parallel)
broadcast({ type: 'STEP_CHANGED', stepNumber: n })
advanceWorkshopStep(workshopId, n) -> writes to Neon
    |
    v
All connected clients receive broadcast via useEventListener
    |
    v
router.refresh() on participant clients
    |
    (late-joiner path)
    v
New participant loads workshop -> reads currentStepNumber from Neon
```

---

## Scaling Considerations

| Scale | Architecture Adjustment |
|-------|------------------------|
| 0-500 rooms/month | Free tier sufficient |
| 500+ rooms/month | Upgrade to Liveblocks Pro ($30/month + $0.03/room) |
| 10+ simultaneous per room | Pro plan required (free tier limit is 10 connections per room) |
| 100k+ MAU | Liveblocks Team plan ($600/month); reassess at this scale |

### First Bottleneck: Room Connection Limit

The free tier caps at 10 simultaneous connections per room. A 15-person workshop requires the Pro plan. **The UI should show a "Workshop Full" message when the room is at capacity** — Liveblocks returns a 4001 error code on the connection attempt that can be caught client-side.

### Second Bottleneck: StorageUpdated Webhook Throttle

The 60-second write-back throttle means Neon can be stale during active sessions. Acceptable for read-after-write lag, unacceptable for "End Session" finalization. Mitigate with a manual Liveblocks REST API call on session end.

---

## Anti-Patterns

### Anti-Pattern 1: Running Liveblocks in Solo Workshops

**What people do:** Apply the `liveblocks()` Zustand middleware to all workshops regardless of type.

**Why it's wrong:** Every solo workshop creates a Liveblocks room, consuming monthly active room quota from the free tier.

**Do this instead:** Guard the middleware behind a `workshopType` check. Two store factories: `createSoloCanvasStore` (existing, unchanged) and `createMultiplayerCanvasStore` (with middleware). The provider calls the correct one.

### Anti-Pattern 2: Disabling Auto-Save Without Registering the Liveblocks Webhook

**What people do:** Disable `useCanvasAutosave` in multiplayer mode but forget to register the Liveblocks webhook.

**Why it's wrong:** No writes to Neon occur during the session. When the session ends and the Liveblocks room expires, the canvas state is lost permanently.

**Do this instead:** Register the `StorageUpdated` webhook in the Liveblocks dashboard before shipping. Add an "End Session" button that triggers a manual sync to Neon as a safety net.

### Anti-Pattern 3: Storing Cursor Positions in Screen Coordinates

**What people do:** Broadcast `{ x: event.clientX, y: event.clientY }` directly to Liveblocks presence.

**Why it's wrong:** Screen coordinates are absolute to each user's browser viewport. When a participant pans or zooms the canvas, their view of another user's cursor drifts to a completely wrong position.

**Do this instead:** Always convert to flow coordinates first: `screenToFlowPosition({ x: event.clientX, y: event.clientY })`. Flow coordinates are invariant to viewport pan/zoom.

### Anti-Pattern 4: Facilitator Role Enforced Only Client-Side

**What people do:** Hide the step progression button from non-facilitators with a conditional render, but anyone can call the server action.

**Why it's wrong:** A participant can call `advanceWorkshopStep()` directly from browser dev tools.

**Do this instead:** The `advanceWorkshopStep` server action must check that the calling user is the workshop owner via `auth()` and match against the `workshops.clerkUserId` column. Guest participants have no Clerk session and fail this check by design.

### Anti-Pattern 5: Using Broadcast Events as the Only Step State

**What people do:** Only broadcast `STEP_CHANGED` and never write the step to Neon.

**Why it's wrong:** Broadcast events are ephemeral. A participant who joins mid-session after the step changed sees Step 1 — there is no event for them to receive.

**Do this instead:** Always write the current step to Neon via server action when the facilitator advances. Late-joiners load the step from the database on page mount.

### Anti-Pattern 6: Enabling `snapToGrid` with Live Cursor Tracking

**What people do:** Enable ReactFlow's `snapToGrid` prop while broadcasting `screenToFlowPosition` cursor coordinates to Liveblocks presence.

**Why it's wrong:** `screenToFlowPosition` honors the `snapGrid` configuration. Other users see the cursor jumping between grid cells rather than smooth movement. (Confirmed bug in [ReactFlow issue #3771](https://github.com/xyflow/xyflow/issues/3771))

**Do this instead:** If grid snapping is needed for nodes, implement it in the store action (snap on node drop) rather than via the ReactFlow `snapToGrid` prop. Cursor tracking stays smooth.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Liveblocks | WebSocket via `@liveblocks/zustand` middleware + `@liveblocks/react` hooks | Auth via `/api/liveblocks-auth` endpoint; webhook via `/api/webhooks/liveblocks` |
| Clerk | Existing — used in auth endpoint to distinguish facilitators from guests | No changes to existing Clerk config |
| Neon Postgres | Existing — receives write-back from Liveblocks webhook (StorageUpdated) | Add `workshopType`, `currentStepNumber` to workshops; `guestName` to workshopMembers |
| Vercel Blob | Existing — EzyDraw drawings already stored here; unchanged for multiplayer | No changes |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `canvas-store` (Zustand) to Liveblocks | Intercepted by `liveblocks()` middleware on `set()` calls | Only for `createMultiplayerCanvasStore`; solo store is unchanged |
| Liveblocks to Neon | `StorageUpdated` webhook -> HTTP POST -> `/api/webhooks/liveblocks` -> Drizzle upsert | 60s throttle; supplement with manual end-session sync |
| Facilitator to Participants (step control) | Liveblocks broadcast events + Neon server action in parallel | Both paths needed: broadcast for real-time, DB for late-joiners |
| Guest -> Liveblocks auth | HttpOnly signed cookie -> `/api/liveblocks-auth` -> access token | Cookie set on `/api/guest-join`; scoped per workshopId |
| ReactFlow viewport -> Presence cursors | `screenToFlowPosition()` in `onMouseMove` -> `updateMyPresence()` | Must convert to flow coords before broadcasting |

---

## Build Order

Dependencies flow from infrastructure to sync to UI. Each phase unblocks the next.

### Phase 1: Foundation (unblocks everything)
- Install `@liveblocks/client @liveblocks/react @liveblocks/zustand @liveblocks/node`
- Create `src/lib/liveblocks/` (client, config types, room-id convention)
- Create `/api/liveblocks-auth` route (Clerk path only, guest path stubbed)
- Register Liveblocks webhook in the Liveblocks dashboard
- Create `/api/webhooks/liveblocks` route (StorageUpdated -> Neon sync)
- Add `workshopType` (`'solo' | 'multiplayer'`) column to workshops table
- Add `currentStepNumber` column to workshops table
- Add `guestName` column (nullable) to workshopMembers table

### Phase 2: Core Canvas Sync (requires Phase 1)
- Export `createMultiplayerCanvasStore` from `canvas-store.ts` with `liveblocks()` middleware
- Modify `CanvasStoreProvider` to accept `isMultiplayer` prop and call correct factory
- Add `enterRoom`/`leaveRoom` lifecycle to provider
- Disable `useCanvasAutosave` in multiplayer mode (`options.disabled`)
- Test: two browser tabs on same multiplayer workshop, move sticky note in one, see it move in other

### Phase 3: Live Cursors + Presence Bar (requires Phase 2)
- Add `cursor`, `name`, `color`, `role` fields to Presence type in `config.ts`
- Add `onMouseMove`/`onMouseLeave` handlers in `react-flow-canvas.tsx`
- Build `LiveCursors` component with `ViewportPortal`
- Build `PresenceBar` component using `useOthers()`
- Test: two tabs, move mouse, see named cursor and avatar in other tab

### Phase 4: Guest Auth + Share Link (requires Phase 1)
- Add `shareToken` generation to multiplayer workshop creation flow
- Build `/join/[token]` page with `GuestJoinModal` (blocks canvas access)
- Build `/api/guest-join` endpoint (validate token, create workshopMember, set HttpOnly signed cookie)
- Extend `/api/liveblocks-auth` to handle guest cookie path
- Test: authenticated user creates workshop, copies share link, opens link in incognito, enters name, sees canvas

### Phase 5: Facilitator Controls (requires Phase 2 and Phase 3)
- Build `StepProgressionControl` component (conditional on `presence.role === 'facilitator'`)
- Implement `useBroadcastEvent` for `STEP_CHANGED`
- Implement `useEventListener` on participant clients
- Add server-side role check in `advanceWorkshopStep` server action
- Test: facilitator advances step, participant's view refreshes to new step

### Phase 6: Polish + End Session
- Build "End Session" button — triggers manual Liveblocks REST API call to snapshot storage to Neon immediately
- Add "Workshop Full" UI (catch Liveblocks 4001 connection error)
- Handle AI chat: display all messages to participants (read-only); facilitator-only input enforcement
- Graceful reconnection handling (Liveblocks reconnects automatically; verify page re-subscribes on focus restore)

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Liveblocks + Zustand middleware pattern | HIGH | Official Liveblocks docs + collaborative whiteboard example with Zustand |
| ReactFlow cursor coordinate handling | HIGH | ReactFlow multiplayer guide + ViewportPortal docs |
| Vercel no WebSocket constraint | HIGH | Vercel official KB — hard constraint, not configurable |
| Liveblocks + Clerk integration | HIGH | Clerk blog guide documents exact pattern |
| Guest auth via access token (no Clerk) | MEDIUM | Pattern is documented; mixed-auth (Clerk + cookie in same endpoint) requires implementation verification |
| StorageUpdated webhook -> Neon sync | HIGH | Liveblocks docs with exact Next.js/Vercel Postgres pattern |
| Broadcast events for step progression | HIGH | Liveblocks tutorial explicitly uses "slide presentation" as canonical example |
| Free tier room limits | MEDIUM | Pricing page confirmed 500 rooms/month; per-room connection limit shown as component placeholder — could not read exact number |

---

## Open Questions

1. **`temporal` + `liveblocks` middleware ordering:** The existing store wraps state with `zundo`'s `temporal` middleware for undo/redo. The `liveblocks()` middleware must compose correctly with `temporal`. The recommended order is `temporal(liveblocks(stateCreator, config))` but this must be verified empirically in Phase 2 since middleware composition order matters for which gets the intercepted `set` calls.

2. **Guest session cookie signing strategy:** HttpOnly cookies scoped per workshop prevent guest session hijacking, but the cookie signing implementation (using `jose`, Next.js `iron-session`, or a custom HMAC with `process.env.COOKIE_SECRET`) needs to be decided in Phase 4.

3. **Seed data and monthly active room quota:** The PawPal seed workshop CLI script should force `workshopType: 'solo'` to avoid consuming a monthly active room on every developer seed run.

4. **EzyDraw in multiplayer:** The existing EzyDraw tool is a modal that produces a PNG stored in Vercel Blob and a drawing node stored in canvas state. The drawing node IS in the canvas state that Liveblocks syncs, so the rendered image will appear for all participants. However, if two participants open EzyDraw simultaneously on the same drawing node, there is no conflict resolution for the vector JSON in-flight. This is a known scope limitation for v1.9 — EzyDraw editing should be single-user (first to open locks the slot).

5. **AI chat visibility for participants:** The current chat is stored in `chatMessages` in Neon and rendered client-side. In multiplayer mode, participants need to see the facilitator's chat in real-time. Options: poll chatMessages via SWR with short interval, use Liveblocks broadcast for new message notifications then fetch from Neon, or stream chat via Liveblocks Storage. The simplest approach is broadcasting a `AI_CHAT_UPDATED` event and having participants call `router.refresh()` — but this re-renders the whole page. A targeted SWR revalidation is cleaner.

---

## Sources

- [ReactFlow Multiplayer Guide](https://reactflow.dev/learn/advanced-use/multiplayer) — ephemeral vs durable state, cursor patterns, what to sync
- [ReactFlow ViewportPortal](https://reactflow.dev/api-reference/components/viewport-portal) — cursor overlay placement inside canvas viewport
- [Liveblocks Zustand API Reference](https://liveblocks.io/docs/api-reference/liveblocks-zustand) — middleware storageMapping/presenceMapping
- [Liveblocks Storage with Zustand Guide](https://liveblocks.io/docs/guides/how-to-use-liveblocks-storage-with-zustand) — exact pattern for syncing arrays to LiveList
- [Liveblocks Broadcasting Events Tutorial](https://liveblocks.io/docs/tutorial/react/getting-started/broadcasting-events) — useBroadcastEvent + useEventListener for facilitator step control
- [Liveblocks Access Token Auth (Next.js)](https://liveblocks.io/docs/authentication/access-token/nextjs) — prepareSession + allow pattern
- [Liveblocks Neon Sync Guide](https://liveblocks.io/docs/guides/how-to-synchronize-your-liveblocks-storage-document-data-to-a-vercel-postgres-database) — StorageUpdated webhook -> postgres write-back
- [Liveblocks Webhooks Reference](https://liveblocks.io/docs/platform/webhooks) — StorageUpdated throttle (60s), UserEntered/UserLeft events, payload shapes
- [Liveblocks Platform Limits](https://liveblocks.io/docs/platform/limits) — connection limits per room by plan
- [Liveblocks Pricing](https://liveblocks.io/pricing) — free tier (500 rooms/month, 200 MAU), Pro ($30/month)
- [Clerk + Liveblocks Guide](https://clerk.com/blog/secure-liveblocks-rooms-clerk-nextjs) — auth endpoint pattern with Clerk session claims
- [Vercel KB: No WebSocket on Serverless](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections) — constraint confirmed
- [ReactFlow Issue #3771](https://github.com/xyflow/xyflow/issues/3771) — snapToGrid + screenToFlowPosition cursor bug

---

*Architecture research for: v1.9 Multiplayer Collaboration — WorkshopPilot.ai*
*Researched: 2026-02-26*
