# Phase 56: Live Presence - Research

**Researched:** 2026-02-27
**Domain:** Liveblocks presence hooks, ReactFlow ViewportPortal, cursor broadcasting, participant list UI
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Cursor Appearance**
- Arrow pointer + name tag pill (Figma/Miro style) — colored arrow cursor with name label attached below-right
- Facilitator cursor distinguished by crown/star badge icon next to their name in the cursor label
- Smooth interpolation between broadcast positions for fluid cursor movement
- Name tag always visible as long as cursor is on canvas — no fade behavior

**Participant List Panel**
- Top-right avatar stack in the toolbar area — row of avatar circles
- No overflow/+N counter needed — max 6 people (5 participants + 1 facilitator), all always visible
- Avatars show two-letter initials on a colored circle background matching their assigned cursor color
- Click avatar stack to expand full participant list showing name, role, online/idle status
- Idle indicator (>2 min inactive): avatar circle becomes semi-transparent with a gray/yellow dot

**Join/Leave Notifications**
- Minimal text toasts: "Sarah joined" / "Sarah left" — small, auto-dismiss after ~3 seconds
- Bottom-right corner placement
- Stack individually — each person gets their own toast, no batching
- Same toast style for all roles — no special facilitator emphasis on join/leave

**Color Assignment**
- Fixed 6-color soft pastel palette, assigned sequentially by join order
- No special color reservation for facilitator — gets whatever slot based on join order
- Color persists per workshop — stored with participant record so Sarah is always the same color in a given workshop

### Claude's Discretion

- Exact pastel color hex values for the 6-color palette
- Cursor interpolation timing/easing function
- Toast animation style (slide-in, fade, etc.)
- Avatar stack spacing and sizing
- Expanded participant list layout details
- How cursor position converts between screen and flow coordinates

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PRES-01 | Each participant's cursor is visible to all others in real-time | `useOthersMapped` maps cursor presence; `ViewportPortal` renders in flow coordinates; throttle at 50ms via `createClient({ throttle: 50 })` |
| PRES-02 | Cursors display the participant's name and assigned color | `UserMeta.info.name` and `UserMeta.info.color` available on each `other.info` from `useOthersMapped`; `useSelf()` for current user |
| PRES-03 | Participant list panel shows all connected users with online/idle status | `useOthers()` for full user list; idle tracked via `lastInteractionAt` timestamp in Presence or local timer per connectionId |
| PRES-04 | Toast notifications appear when participants join or leave | `useOthersListener` fires `"enter"` and `"leave"` events; `toast()` from sonner (already installed, Toaster at bottom-right in layout) |
| PRES-05 | Facilitator's cursor is visually distinct (badge/icon) | `other.info.role === 'owner'` check in `LiveCursors`; crown/star SVG badge in cursor label |
| PRES-06 | Participants inactive >2 minutes show an idle indicator | Local `lastSeenAt` Map keyed by connectionId, updated on presence `"update"` events via `useOthersListener`; compare timestamp in render |
</phase_requirements>

## Summary

Phase 56 implements real-time cursor broadcasting and participant presence UI using Liveblocks v3.14.0 hooks that are already wired to the project's `RoomProvider` (set up in Phase 54–55). The Liveblocks `Presence` type in `liveblocks/config.ts` already has `cursor: { x: number; y: number } | null`, `color: string`, `displayName: string`, and `editingDrawingNodeId: string | null` — cursor and color fields are already declared and populated via the auth endpoint. No schema changes to `config.ts` are needed.

Cursor broadcasting works by calling `useUpdateMyPresence` in a throttled mouse-move handler inside `ReactFlowCanvasInner`. The key is converting from screen coordinates to ReactFlow flow coordinates using `screenToFlowPosition` (already imported and used in the canvas component). Cursors are rendered inside a `ViewportPortal` (from `@xyflow/react`), which places elements in the same panned/zoomed coordinate space as nodes — meaning a cursor stored at flow coordinates `(x, y)` is rendered at `transform: translate(Xpx, Ypx)` inside the portal with no manual viewport math needed.

The participant list (`PresenceBar`) must live inside the `RoomProvider` subtree because it calls `useOthers()` and `useOthersListener()`. The correct placement is inside `MultiplayerRoom` (or a new child component rendered by it), alongside the existing `MultiplayerRoomInner`. Join/leave toasts use `useOthersListener` with the existing sonner `toast()` function — the `Toaster` is already rendered at `bottom-right` in `app/layout.tsx`. Idle detection is done in the client by tracking the last time each connection's presence `cursor` was non-null; no server-side changes required.

**Primary recommendation:** Wire cursor broadcasting into `ReactFlowCanvasInner` using `useUpdateMyPresence` + `screenToFlowPosition`; render `LiveCursors` inside `ViewportPortal`; render `PresenceBar` as a sibling inside `MultiplayerRoomInner`; use `useOthersListener` for join/leave toasts.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@liveblocks/react` | 3.14.0 (installed) | `useUpdateMyPresence`, `useOthersMapped`, `useOthersListener`, `useSelf`, `useOthers` | Already wired via RoomProvider in Phase 54-55 |
| `@xyflow/react` | 12.10.0 (installed) | `ViewportPortal`, `screenToFlowPosition`, `useReactFlow` | Already used for the entire canvas |
| `sonner` | installed | `toast()` for join/leave notifications | Already used throughout canvas; Toaster at `bottom-right` in layout |
| `framer-motion` | installed | Spring animations for smooth cursor interpolation | Best balance of smoothness vs responsiveness; already in node_modules |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `shallow` from `@liveblocks/react` | 3.14.0 | Equality check for `useOthersMapped` | Use when mapping multi-field objects to prevent re-renders |
| `lucide-react` | installed | Crown/star icon for facilitator badge | Already used across the UI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| framer-motion spring | CSS `transition: transform 0.1s linear` | CSS transition is simpler but produces straight-line interpolation; spring feels more organic. framer-motion is already installed so no bundle cost. |
| framer-motion spring | `perfect-cursors` library | perfect-cursors gives spline accuracy but adds a new dependency and introduces slight lag; not installed. CSS or framer-motion spring is preferred. |
| `useOthersMapped` | `useOthers()` | `useOthers()` re-renders on any other's presence change; `useOthersMapped` re-renders only when each user's selected subset changes — use mapped for cursor rendering |

**Installation:** No new packages needed — all dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── canvas/
│   │   └── live-cursors.tsx        # ViewportPortal + cursor SVG per other (Plan 56-01)
│   └── workshop/
│       ├── multiplayer-room.tsx    # MODIFIED: render PresenceBar + join/leave toasts inside MultiplayerRoomInner
│       └── presence-bar.tsx        # Avatar stack + expanded list + idle dots (Plan 56-02)
└── lib/
    └── liveblocks/
        └── config.ts               # MODIFIED: throttle: 50 on createClient
```

### Pattern 1: Cursor Broadcasting (Plan 56-01)

**What:** On every mouse move over the ReactFlow canvas, convert screen coords to flow coords, call `updateMyPresence({ cursor: { x, y } })`. On mouse leave, set `cursor: null`.

**Key insight:** `screenToFlowPosition` already exists in `ReactFlowCanvasInner` from `useReactFlow()`. The cursor field is already declared in the `Presence` type. No new hooks or type changes needed.

**Throttle strategy:** Set `throttle: 50` on `createClient()` in `lib/liveblocks/config.ts`. This is the ONLY place to configure Liveblocks broadcast throttle. Throttle at the client level applies to all presence updates globally — no per-call throttle option exists. The requirement says "within 50ms (throttled, never raw mousemove)" — setting `throttle: 50` on the client achieves this without manual `setTimeout` or `useCallback` debounce.

**Important:** `useUpdateMyPresence` must only be called when inside a `RoomProvider`. The canvas is only wrapped in `RoomProvider` in multiplayer mode (via `MultiplayerRoom` → `MultiplayerRoomLoader`). The existing `useMultiplayerContext()` check (`isMultiplayer`) guards multiplayer-only behavior. Cursor broadcasting should be gated: only call `useUpdateMyPresence` when `isMultiplayer === true`. Since React hooks cannot be called conditionally, the cursor-broadcasting logic should be extracted into a child component (`CursorBroadcaster`) that is only mounted when `isMultiplayer` is true, OR use a separate hook that returns a no-op when outside RoomProvider (check `useIsInsideRoom` — exported from `@liveblocks/react` as `useIsInsideRoom`).

**Example (Plan 56-01):**
```typescript
// Source: @liveblocks/react hooks + @xyflow/react ViewportPortal
// In ReactFlowCanvasInner — only mounted when workshopType === 'multiplayer'

// 1. Broadcasting: inside a sub-component CursorBroadcaster
function CursorBroadcaster() {
  const updateMyPresence = useUpdateMyPresence();
  const { screenToFlowPosition } = useReactFlow();
  // Wire to ReactFlow's onMouseMove / onMouseLeave props via callback from parent
  // OR attach to the canvas div via useEffect + addEventListener
  return null; // no UI
}

// 2. Rendering others' cursors
function LiveCursors() {
  // useOthersMapped returns [connectionId, { cursor, name, color, role }][]
  const others = useOthersMapped(
    (other) => ({
      cursor: other.presence.cursor,
      name: other.info?.name ?? 'Unknown',
      color: other.info?.color ?? '#6366f1',
      role: other.info?.role ?? 'participant',
    }),
    shallow,
  );

  return (
    <ViewportPortal>
      {others.map(([connectionId, { cursor, name, color, role }]) => {
        if (!cursor) return null;
        return (
          <div
            key={connectionId}
            style={{
              position: 'absolute',
              transform: `translate(${cursor.x}px, ${cursor.y}px)`,
              pointerEvents: 'none',
            }}
          >
            <CursorSvg color={color} />
            <CursorLabel name={name} color={color} isFacilitator={role === 'owner'} />
          </div>
        );
      })}
    </ViewportPortal>
  );
}
```

### Pattern 2: Join/Leave Toasts (Plan 56-02)

**What:** `useOthersListener` fires on presence changes. Listen for `type === "enter"` and `type === "leave"` to call `toast()` from sonner.

**Important:** `useOthersListener` must be called inside the `RoomProvider` tree. The `Toaster` is already rendered at `position="bottom-right"` in `app/layout.tsx` with `richColors`. Use plain `toast()` (not `toast.success` or `toast.error`) for neutral join/leave notifications.

**Example (Plan 56-02):**
```typescript
// Source: @liveblocks/react OthersEvent type
useOthersListener(({ type, user }) => {
  if (type === 'enter') {
    toast(`${user.info?.name ?? 'Someone'} joined`, {
      duration: 3000,
      position: 'bottom-right',
    });
  } else if (type === 'leave') {
    toast(`${user.info?.name ?? 'Someone'} left`, {
      duration: 3000,
      position: 'bottom-right',
    });
  }
});
```

**OthersEvent structure (from liveblocks/core type source):**
```typescript
type OthersEvent =
  | { type: 'enter'; user: User; others: readonly User[] }
  | { type: 'leave'; user: User; others: readonly User[] }
  | { type: 'update'; user: User; updates: Partial<Presence>; others: readonly User[] }
  | { type: 'reset'; others: readonly User[] }
```

### Pattern 3: Idle Detection (Plan 56-02, PRES-06)

**What:** Idle = no cursor movement for >2 minutes. Liveblocks does not have a built-in idle concept. Implementation: track `lastSeenAt` timestamp per `connectionId` in a `useRef<Map<number, number>>()`. Update the map on `type === 'update'` events from `useOthersListener`. In the `PresenceBar` render, compare `Date.now() - lastSeenAt[connectionId] > 120_000` to determine idle state.

**Alternative:** Store a `lastInteractionAt` ISO string in Presence itself (update it alongside cursor updates). This is simpler for the render side but adds more presence broadcast traffic. Since cursor `null` already signals "off canvas", tracking cursor null-ness at render time is sufficient: if `cursor === null` for >2 min, show idle. Use a local `Map<connectionId, { lastSeen: number }>` ref updated via `useOthersListener` on `'update'` events when `updates.cursor` is non-null.

**Recommended approach:** Keep idle state purely client-side with a `useRef` Map of `{ connectionId → lastSeenTimestamp }`. Update in `useOthersListener` on `type === 'update'`. Re-evaluate idle status on a 30-second interval (`useEffect` with `setInterval`). No Presence type changes needed.

### Pattern 4: PresenceBar Placement

**What:** The `PresenceBar` (avatar stack, expanded list) must be inside the `RoomProvider` tree since it calls Liveblocks hooks. The existing `MultiplayerRoomInner` component (in `multiplayer-room.tsx`) is the correct mount point — render `PresenceBar` there.

**Current tree:**
```
MultiplayerRoom
  └── ClientContext.Provider (liveblocksClient)
      └── RoomProvider
          └── MultiplayerRoomInner      ← hooks available here
              └── {children}            ← canvas, chat, etc.
```

**After Phase 56:**
```
MultiplayerRoomInner
  ├── PresenceBar                       ← NEW: avatar stack top-right
  ├── JoinLeaveListener                 ← NEW: useOthersListener for toasts (no UI)
  └── {children}
```

`PresenceBar` renders as an absolutely-positioned overlay on the canvas container (top-right corner). The canvas container wrapper's parent is the step-container layout. The simplest approach: render `PresenceBar` inside `MultiplayerRoomInner` with `position: fixed; top: ...; right: ...` so it floats over the canvas toolbar area regardless of panel layout.

### Pattern 5: Throttle Configuration

**What:** Set `throttle: 50` on `createClient()` in `src/lib/liveblocks/config.ts`.

**Current code:**
```typescript
export const liveblocksClient = createClient({
  authEndpoint: "/api/liveblocks-auth",
});
```

**After change:**
```typescript
export const liveblocksClient = createClient({
  authEndpoint: "/api/liveblocks-auth",
  throttle: 50, // 50ms max broadcast rate — satisfies PRES-01 "within 50ms"
});
```

**Why 50 not 16:** The requirement says "within 50ms (throttled, never raw mousemove)". 50ms (20fps) is correct. 16ms (60fps) would be too chatty for a 6-person collaborative session and may hit Liveblocks rate limits. The client enforces min=16, max=1000.

### Anti-Patterns to Avoid

- **Calling Liveblocks hooks outside RoomProvider:** `useUpdateMyPresence`, `useOthersMapped`, `useOthersListener` throw errors outside `RoomProvider`. Always gate with `isMultiplayer` check or only mount components inside the Liveblocks tree.
- **Raw mousemove without throttle:** Never call `updateMyPresence` on every DOM `mousemove` event. Use Liveblocks' built-in `throttle` config on `createClient` — do NOT add a manual `setTimeout` wrapper on top.
- **Using `useOthers()` for cursor rendering:** `useOthers()` re-renders on ANY presence change from ANY user. Use `useOthersMapped` with `shallow` for cursor rendering to minimize re-renders.
- **Rendering cursors outside ViewportPortal:** If cursors are rendered outside `ViewportPortal`, they won't pan/zoom with the canvas — positions would be wrong when user zooms or pans. Always use `ViewportPortal`.
- **CSS easing for cursor interpolation:** Don't use `ease-in-out` — it causes cursors to artificially slow/speed. Use `linear` for CSS transition or framer-motion spring with appropriate stiffness.
- **Calling `toast` from layout-level component on every re-render:** `useOthersListener` callback must be stable. Wrap in `useCallback` if passing to child, or define directly in the `useOthersListener` call (the hook handles memoization internally).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket cursor broadcasting | Custom WebSocket presence protocol | Liveblocks `useUpdateMyPresence` | Handles reconnection, deduplication, ordered delivery |
| Cursor throttling | `setTimeout` / manual debounce wrapper | `createClient({ throttle: 50 })` | Liveblocks throttle is the correct knob; double-throttling causes issues |
| Viewport coordinate math | Manual `(x - panX) / zoom` calculations | `screenToFlowPosition` from `useReactFlow()` | ReactFlow's method handles all edge cases including viewport offset |
| Portal rendering | Custom `createPortal` into a dom node | `ViewportPortal` from `@xyflow/react` | Automatically inherits ReactFlow's transform CSS, handles SSR |
| Join/leave detection | Polling `useOthers()` length | `useOthersListener` with `type === "enter"/"leave"` | Event-driven, fires exactly once per transition |

**Key insight:** Liveblocks v3.x provides the exact set of primitives needed. No custom WebSocket, no polling, no manual coordinate math.

## Common Pitfalls

### Pitfall 1: Hook Called Outside RoomProvider

**What goes wrong:** `useUpdateMyPresence`, `useOthersMapped`, `useOthersListener`, `useSelf` throw `"No Liveblocks room found"` at runtime when called in a component not wrapped by `RoomProvider`.

**Why it happens:** The canvas (`ReactFlowCanvasInner`) is used in both solo and multiplayer modes. In solo mode, there is no `RoomProvider` ancestor. If Liveblocks hooks are called unconditionally inside the canvas component, solo workshops will crash.

**How to avoid:** Extract all Liveblocks presence calls into a separate `LiveCursors` component and a `CursorBroadcaster` component. Only mount these when `workshopType === 'multiplayer'`. Use a conditional render gate: `{workshopType === 'multiplayer' && <LiveCursors />}`.

**Warning signs:** TypeScript won't catch this. Runtime error: `"useOthersMapped: Cannot read properties of null"` or Liveblocks context not found.

### Pitfall 2: Wrong Coordinate System for Cursors

**What goes wrong:** Cursors render at wrong positions when the canvas is panned or zoomed. E.g., cursor appears offset by the current pan amount.

**Why it happens:** `mousemove` events report `clientX/clientY` (screen pixels). If stored and rendered directly in `ViewportPortal` without converting through `screenToFlowPosition`, they won't track the node coordinate space. Alternatively, if stored correctly but rendered outside `ViewportPortal` (e.g., as fixed-position divs), they won't move with the canvas when panned.

**How to avoid:**
1. On broadcast: convert `clientX/clientY` → flow coords via `screenToFlowPosition({ x: e.clientX, y: e.clientY })` before calling `updateMyPresence`.
2. On render: use `ViewportPortal` + `style={{ transform: 'translate(Xpx, Ypx)', position: 'absolute' }}`.

**Warning signs:** Cursors appear in wrong position when zoomed in/out; cursors don't move when canvas is panned.

### Pitfall 3: Presence Update Thundering Herd on Mount

**What goes wrong:** When `MultiplayerRoomInner` mounts, all 6 participants' presence updates fire simultaneously, causing a flash of incorrect state before `useOthersMapped` settles.

**Why it happens:** Liveblocks broadcasts all current presence to a newly connected client on join, triggering rapid re-renders.

**How to avoid:** Initialize `cursor: null` in `initialPresence` (already done in `multiplayer-room.tsx`). The `LiveCursors` component already filters `if (!cursor) return null`, so null cursors are invisible. No additional fix needed.

### Pitfall 4: framer-motion spring causes cursor lag

**What goes wrong:** Spring animation overshoots or lags behind the actual cursor position, especially for fast movements.

**Why it happens:** Spring physics with low stiffness produce long oscillation tails.

**How to avoid:** Use high stiffness + high damping for cursor-following motion. Example: `{ type: 'spring', stiffness: 500, damping: 50 }` in framer-motion `animate` prop. Alternatively, use CSS `transition: transform 80ms linear` which is simpler and sufficient for 50ms update intervals.

**Recommendation (Claude's discretion):** Use CSS `transition: transform 80ms linear` — it's zero-dependency (framer-motion not currently used in any component), easy to tune, and sufficient for the 50ms throttle rate. Framer-motion spring is a valid upgrade if feel is unsatisfactory.

### Pitfall 5: Idle timer drifts after reconnect

**What goes wrong:** After a participant reconnects, their `lastSeenAt` timestamp in the local Map is stale from before their disconnect, showing them as idle even when they're active.

**Why it happens:** The local `Map<connectionId, timestamp>` is reset on component remount but `connectionId` may be reused by Liveblocks for reconnected users.

**How to avoid:** On `type === 'enter'` in `useOthersListener`, reset `lastSeenAt[connectionId] = Date.now()` to treat a reconnected user as freshly active.

## Code Examples

Verified patterns from official sources and project codebase:

### 1. Throttled cursor broadcast (Plan 56-01)

```typescript
// Source: @liveblocks/react useUpdateMyPresence + @xyflow/react screenToFlowPosition
// Component: CursorBroadcaster — only mounted when workshopType === 'multiplayer'

function CursorBroadcaster() {
  const updateMyPresence = useUpdateMyPresence();
  const { screenToFlowPosition } = useReactFlow();

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      updateMyPresence({ cursor: flowPos });
    },
    [updateMyPresence, screenToFlowPosition],
  );

  const handleMouseLeave = useCallback(() => {
    updateMyPresence({ cursor: null });
  }, [updateMyPresence]);

  // Attach to ReactFlow's onMouseMove/onMouseLeave via context or pass up via ref
  // See rendering pattern below for how ReactFlow receives these
  return null;
}
```

**Note on event attachment:** ReactFlow's `<ReactFlow>` component exposes `onMouseMove` and `onMouseLeave` props. The cleanest approach is to pass the handlers from `ReactFlowCanvasInner` into the `<ReactFlow>` JSX — `ReactFlowCanvasInner` already destructures `{ screenToFlowPosition }` from `useReactFlow()`. Mount `CursorBroadcaster` inside `ReactFlowCanvasInner` only when `workshopType === 'multiplayer'`, and pass back handlers via a ref pattern or context.

**Alternative (simpler):** Move `updateMyPresence` call directly into `ReactFlowCanvasInner` since it already has `screenToFlowPosition` and the `isMultiplayer` flag. Use `useIsInsideRoom` hook to safely call `useUpdateMyPresence` — but this still violates the rule of not calling hooks conditionally. Best approach: use a simple wrapper with `useIsInsideRoom` guard rendered conditionally.

**Cleanest pattern:**
```typescript
// In ReactFlowCanvasInner JSX — attach to ReactFlow's mouse events
<ReactFlow
  ...existing props...
  onMouseMove={(e) => {
    if (!isMultiplayer) return;
    // updateMyPresence defined at top of component only when isMultiplayer
  }}
/>
```

But since hooks can't be called conditionally, the recommended structure is:

```tsx
// In ReactFlowCanvasInner render:
{workshopType === 'multiplayer' && (
  <LiveCursors />  // contains useOthersMapped
)}
// AND: pass onMouseMove/onMouseLeave to ReactFlow only when multiplayer
// Use a ref to store handlers from a sub-component
```

The pragmatic approach: Extract cursor state into a separate `useMultiplayerCursors` hook that uses `useIsInsideRoom()` to safely no-op when outside a room. Liveblocks exports `useIsInsideRoom` which returns `false` outside a `RoomProvider`.

### 2. LiveCursors rendering inside ViewportPortal (Plan 56-01)

```tsx
// Source: @xyflow/react ViewportPortal docs + @liveblocks/react useOthersMapped
import { ViewportPortal } from '@xyflow/react';
import { useOthersMapped } from '@liveblocks/react';
import { shallow } from '@liveblocks/react';

export function LiveCursors() {
  const others = useOthersMapped(
    (other) => ({
      cursor: other.presence.cursor,
      name: other.info?.name ?? 'Unknown',
      color: other.info?.color ?? '#6366f1',
      role: other.info?.role ?? 'participant',
    }),
    shallow, // Prevents re-render if selected data unchanged
  );

  return (
    <ViewportPortal>
      {others.map(([connectionId, data]) => {
        if (!data.cursor) return null;
        return (
          <div
            key={connectionId}
            style={{
              position: 'absolute',
              transform: `translate(${data.cursor.x}px, ${data.cursor.y}px)`,
              pointerEvents: 'none',
              userSelect: 'none',
              // CSS transition for smooth interpolation (Claude's discretion)
              transition: 'transform 80ms linear',
            }}
          >
            {/* Colored arrow SVG cursor */}
            <CursorArrow color={data.color} />
            {/* Name pill with optional facilitator badge */}
            <CursorLabel
              name={data.name}
              color={data.color}
              isFacilitator={data.role === 'owner'}
            />
          </div>
        );
      })}
    </ViewportPortal>
  );
}
```

### 3. Join/Leave toasts (Plan 56-02)

```tsx
// Source: @liveblocks/react useOthersListener OthersEvent type
import { useOthersListener } from '@liveblocks/react';
import { toast } from 'sonner';

function JoinLeaveListener() {
  useOthersListener(({ type, user }) => {
    if (type === 'enter') {
      toast(`${user.info?.name ?? 'Someone'} joined`, {
        duration: 3000,
        // Toaster already positioned at bottom-right in app/layout.tsx
      });
    } else if (type === 'leave') {
      toast(`${user.info?.name ?? 'Someone'} left`, {
        duration: 3000,
      });
    }
    // 'update' and 'reset' events: use for idle tracking, not toasts
  });
  return null; // no UI
}
```

### 4. Idle detection (Plan 56-02)

```tsx
// Source: project pattern — local ref tracking, no Liveblocks API changes needed
import { useRef, useState, useEffect } from 'react';
import { useOthers, useOthersListener } from '@liveblocks/react';
import { shallow } from '@liveblocks/react';

const IDLE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

function useIdleStatus() {
  const lastSeenRef = useRef<Map<number, number>>(new Map());
  const [idleIds, setIdleIds] = useState<Set<number>>(new Set());

  // Update last-seen on presence updates
  useOthersListener(({ type, user }) => {
    if (type === 'enter') {
      lastSeenRef.current.set(user.connectionId, Date.now());
    } else if (type === 'leave') {
      lastSeenRef.current.delete(user.connectionId);
    } else if (type === 'update' && user.presence.cursor !== null) {
      // Only count cursor movement as "active" interaction
      lastSeenRef.current.set(user.connectionId, Date.now());
    }
  });

  // Re-evaluate idle status every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newIdleIds = new Set<number>();
      lastSeenRef.current.forEach((lastSeen, connectionId) => {
        if (now - lastSeen > IDLE_THRESHOLD_MS) {
          newIdleIds.add(connectionId);
        }
      });
      setIdleIds(newIdleIds);
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return idleIds;
}
```

### 5. Throttle config change (Plan 56-01)

```typescript
// File: src/lib/liveblocks/config.ts
// Change createClient to add throttle: 50
export const liveblocksClient = createClient({
  authEndpoint: "/api/liveblocks-auth",
  throttle: 50, // 50ms — satisfies PRES-01 "within 50ms (throttled, never raw mousemove)"
});
```

### 6. PresenceBar component structure (Plan 56-02)

```tsx
// src/components/workshop/presence-bar.tsx
// Renders inside MultiplayerRoomInner — has access to all Liveblocks hooks

import { useOthers, useSelf } from '@liveblocks/react';
import { shallow } from '@liveblocks/react';
import { useState } from 'react';
import { Crown } from 'lucide-react';

export function PresenceBar({ idleIds }: { idleIds: Set<number> }) {
  const [expanded, setExpanded] = useState(false);

  const others = useOthers(
    (others) => others.map((o) => ({
      connectionId: o.connectionId,
      name: o.info?.name ?? 'Unknown',
      color: o.info?.color ?? '#6366f1',
      role: o.info?.role ?? 'participant',
    })),
    shallow,
  );

  const self = useSelf((me) => ({
    name: me.info?.name ?? 'You',
    color: me.info?.color ?? '#6366f1',
    role: me.info?.role ?? 'participant',
  }));

  const allParticipants = self ? [{ ...self, connectionId: -1 }, ...others] : others;

  // Avatar initials: first letter of each word, max 2
  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
      {/* Collapsed: avatar stack */}
      <div
        className="flex items-center gap-1 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {allParticipants.map((p) => {
          const isIdle = idleIds.has(p.connectionId);
          return (
            <div
              key={p.connectionId}
              className="relative w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
              style={{
                backgroundColor: p.color,
                opacity: isIdle ? 0.5 : 1,
              }}
              title={p.name}
            >
              {getInitials(p.name)}
              {isIdle && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-yellow-400 border border-background" />
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded: full participant list */}
      {expanded && (
        <div className="bg-card rounded-xl shadow-md border border-border p-3 min-w-[180px]">
          {allParticipants.map((p) => {
            const isIdle = idleIds.has(p.connectionId);
            return (
              <div key={p.connectionId} className="flex items-center gap-2 py-1">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
                  style={{ backgroundColor: p.color, opacity: isIdle ? 0.5 : 1 }}
                >
                  {getInitials(p.name)}
                </div>
                <span className="text-sm text-foreground flex-1">{p.name}</span>
                {p.role === 'owner' && <Crown className="w-3 h-3 text-amber-500" />}
                {/* Online/idle dot */}
                <span
                  className={`w-2 h-2 rounded-full ${isIdle ? 'bg-yellow-400' : 'bg-green-400'}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `createRoomContext` for typed hooks | Global `declare global { interface Liveblocks { ... } }` augmentation | Liveblocks v2 | Project already uses global augmentation (Phase 54) — hooks are typed globally |
| Per-component `throttle` wrapper on presence calls | `createClient({ throttle: N })` at client level | Liveblocks v1.x | Throttle is only configurable globally; per-call options do not exist |
| `useBroadcastEvent` for join/leave | `useOthersListener` with `type === 'enter'/'leave'` | Liveblocks v1.x | `useOthersListener` is event-driven and accurate; broadcast events require explicit send |

**Deprecated/outdated:**
- `createRoomContext`: Removed in Liveblocks v2+. Project already uses global augmentation — confirmed in STATE.md.
- `throttle` on individual `updateMyPresence` calls: No such option exists. Throttle is client-global only.

## Open Questions

1. **Mouse event source: ReactFlow props vs DOM listener**
   - What we know: `ReactFlow` component accepts `onMouseMove` and `onMouseLeave` props. `canvasContainerRef` exists and wraps the entire ReactFlow div.
   - What's unclear: Whether to attach to `<ReactFlow onMouseMove>` (fires on all content including nodes) or `<div ref={canvasContainerRef} onMouseMove>` (fires on the outer container).
   - Recommendation: Attach to `<ReactFlow onMouseMove={...}>` because ReactFlow normalizes coordinate events and the handler already receives a `React.MouseEvent<Element>` with correct `clientX/clientY`. Simpler than a DOM listener.

2. **`PresenceBar` absolute positioning target**
   - What we know: The canvas occupies a resizable panel within the step-container layout using `react-resizable-panels`. The canvas container is `<div ref={canvasContainerRef} className="w-full h-full relative">`.
   - What's unclear: Whether `position: absolute; top: 3; right: 3` inside `MultiplayerRoomInner` (which wraps the canvas + chat panel) gives the correct top-right placement, or if it needs to be inside the canvas container itself.
   - Recommendation: Render `PresenceBar` as an absolutely-positioned child of the canvas wrapper div (`w-full h-full relative`), not at the `MultiplayerRoomInner` level. This keeps it anchored to the canvas panel. Pass `idleIds` down from `MultiplayerRoomInner` via context or lift the `useIdleStatus` hook into `ReactFlowCanvasInner`.

3. **`initialPresence.displayName` and `color` population**
   - What we know: `MultiplayerRoom` initializes `initialPresence` with hardcoded `color: '#6366f1'` and `displayName: ''`. The auth endpoint sets `userInfo.color` and `userInfo.name` in `UserMeta`. `UserMeta.info` is what's returned by `useSelf().info` and `other.info`.
   - What's unclear: Does `Presence.color` and `Presence.displayName` need to mirror `UserMeta.info.color/name`, or can cursor rendering use `other.info` exclusively?
   - Recommendation: Use `other.info.color` and `other.info.name` (from `UserMeta`) for cursor display — these are set by the auth endpoint and are authoritative. The `Presence.color` and `Presence.displayName` fields are redundant for Phase 56. Cursor rendering should read from `other.info`, not `other.presence`. This avoids any sync issue between the two.

## Validation Architecture

`workflow.nyquist_validation` is not set in `.planning/config.json` (field absent = false). Skipping this section.

## Sources

### Primary (HIGH confidence)
- `node_modules/@liveblocks/react/dist/room-DamZM98T.d.ts` — `useUpdateMyPresence`, `useOthersMapped`, `useOthersListener`, `OthersEvent` type structure verified directly from installed package
- `node_modules/@liveblocks/core/dist/index.d.ts` — `ClientOptions.throttle`, `InternalOthersEvent` type (enter/leave/update/reset), `DEFAULT_THROTTLE=100`, `MIN_THROTTLE=16`, `MAX_THROTTLE=1000` verified in package source
- `node_modules/@xyflow/react/dist/esm/components/ViewportPortal/index.d.ts` — `ViewportPortal` component type verified; coordinate system confirmed from JSDoc
- `src/lib/liveblocks/config.ts` — existing `Presence` type (cursor/color/displayName/editingDrawingNodeId), `PARTICIPANT_COLORS`, `createClient` setup
- `src/components/workshop/multiplayer-room.tsx` — `RoomProvider` tree, `initialPresence`, `MultiplayerRoomInner`, `useSelf` usage
- `src/components/canvas/react-flow-canvas.tsx` — `screenToFlowPosition` usage, `useMultiplayerContext`, `workshopType` prop, `<ReactFlow>` JSX location
- `src/app/layout.tsx` — `Toaster` at `position="bottom-right"` confirmed

### Secondary (MEDIUM confidence)
- [Liveblocks live cursors tutorial](https://liveblocks.io/docs/tutorial/react/getting-started/live-cursors) — cursor pattern, `useOthers` filtering, `connectionId` as key — verified against installed types
- [Liveblocks @liveblocks/react API reference](https://liveblocks.io/docs/api-reference/liveblocks-react) — `useOthersListener` event types, `useUpdateMyPresence` signature, throttle at provider level — verified against installed package
- [ReactFlow ViewportPortal docs](https://reactflow.dev/api-reference/components/viewport-portal) — coordinate system, `position: absolute` + `transform: translate` pattern — verified against installed component source
- [Liveblocks cursor animation blog](https://liveblocks.io/blog/how-to-animate-multiplayer-cursors) — CSS `linear` transition recommended; spring animation as alternative — MEDIUM (blog, not official API docs)

### Tertiary (LOW confidence)
- [Liveblocks advanced cursors example](https://github.com/liveblocks/liveblocks/blob/main/examples/nextjs-live-cursors-advanced/components/LiveCursors.tsx) — `useOthersMapped` + shallow + rendering pattern — LOW (external example; core pattern verified against installed types)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed; hooks verified against installed type definitions
- Architecture: HIGH — component tree understood from codebase exploration; Liveblocks hook constraints verified
- Pitfalls: HIGH — hook-outside-RoomProvider and coordinate system pitfalls verified against codebase structure; throttle behavior verified in package source code
- Idle detection: MEDIUM — no official Liveblocks idle API; local timer approach is standard pattern but specific implementation is Claude's design choice

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable APIs; Liveblocks 3.x is recent stable)
