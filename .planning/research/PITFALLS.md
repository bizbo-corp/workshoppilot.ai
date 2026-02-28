# Pitfalls Research: Real-Time Multiplayer Collaboration

**Domain:** Adding WebSocket-based real-time multiplayer to existing single-user Next.js + ReactFlow + Zustand app on Vercel
**Researched:** 2026-02-26
**Confidence:** HIGH (ReactFlow official docs, Vercel official KB, OWASP WebSocket Security, Liveblocks docs, multiple verified cross-sources)

**Context:** WorkshopPilot.ai v1.9 adds human-facilitated multiplayer workshops: share-link join flow (no account for participants), live cursors, real-time canvas sync, facilitator-only step progression, AI chat visible to all. Existing stack: Next.js 16.1.1, ReactFlow, Zustand, Clerk (authenticated facilitators), Neon Postgres (neon-http driver), Vercel deployment. Target: 5-15 simultaneous participants per session.

---

## Critical Pitfalls

### Pitfall 1: Vercel Has No Native WebSocket Support — Attempting It Anyway

**What goes wrong:**
Developer adds a `socket.io` server or a `ws` WebSocket server inside the Next.js API routes, deploys to Vercel, and finds it works in local development but fails immediately in production. The WebSocket connection either hangs, errors with 504, or closes after the function timeout. In Vercel's serverless model, each function invocation handles one request-response cycle and then terminates — there is no persistent process that can hold an open bidirectional connection.

**Why it happens:**
WebSockets work in local `next dev` because Node.js runs as a long-lived process. Vercel Serverless Functions (and even Edge Functions with Fluid Compute) are request-response only. The Vercel community FAQ explicitly states: "Vercel Serverless Functions do not support WebSocket connections." Fluid Compute adds streaming response support but is NOT the same as bidirectional WebSocket. Developers conflate "streaming" with "WebSockets."

**How to avoid:**
Use a purpose-built real-time service that runs outside Vercel's serverless execution model. Options ranked by fit for this project:

- **Liveblocks** — purpose-built for canvas/whiteboard collaboration, has a ReactFlow collaborative example, handles rooms, presence, storage, and conflict resolution. No self-hosted option, but managed and production-proven.
- **PartyKit** — Cloudflare Durable Objects-based, co-deployable alongside Vercel. Each room runs in its own long-lived Durable Object. WebSocket Hibernation reduces costs for sparse sessions. More code required vs. Liveblocks.
- **Ably / Pusher** — general-purpose pub/sub services, Vercel-recommended alternatives. Higher integration effort for canvas-specific needs.

The Next.js frontend remains on Vercel. The real-time server runs on a separate service. This is not a workaround — it is the intended architecture.

**Warning signs:**
- `socket.io` or `ws` library added to `/app/api/` routes
- WebSocket connections that work in `npm run dev` but produce 504/502 in staging
- Any comment like "we'll figure out Vercel WS support later"

**Phase to address:** Real-time infrastructure setup (first phase of v1.9) — the infrastructure choice must be made before any multiplayer feature is built

---

### Pitfall 2: Syncing ALL ReactFlow State — Including Per-User Ephemeral State

**What goes wrong:**
Developer wraps the entire ReactFlow `nodes` and `edges` arrays in a Yjs `Y.Array` (or Liveblocks `LiveList`) and syncs every field. This causes three concrete failures:

1. **Selection stealing:** User A selects a node (`selected: true`). User B sees that node as selected. User B deletes it (they see it highlighted as if they own it). User A's selection disappears.
2. **Drag jank:** User A is dragging a node. Every 16ms cursor position update fires a sync event. All other users see the node jitter at network latency intervals.
3. **DOM measurement sync:** The `measured.width`/`measured.height` fields are computed from the DOM by ReactFlow — they vary per user's viewport/zoom. Syncing them overwrites other users' computed values causing layout instability.

**Why it happens:**
Syncing "everything" feels safe — nothing can go out of sync. ReactFlow official docs explicitly warn against this pattern and categorize fields as ephemeral vs. durable. Developers miss or skip this categorization.

**How to avoid:**
Strict field-level sync discipline. From ReactFlow's official multiplayer documentation:

**DO sync (durable state — everyone must agree):**
- `id`, `type`, `data`, `position` (final resting position, not during drag), `source`, `target`, `sourceHandle`, `targetHandle`, `parentId`, `style`

**DO NOT sync (ephemeral state — per-user only):**
- `selected` — keep in local Zustand, never in shared store
- `dragging`, `resizing` — transient interaction flags
- `measured` (`width`, `height`) — DOM-computed, varies per viewport
- Viewport position (`x`, `y`, `zoom`) — each user has their own view

For dragging: sync only the final position on `dragEnd` (onNodeDragStop), not intermediate positions during drag.

**Warning signs:**
- `selected` field appearing in Yjs/Liveblocks shared storage schema
- Node jitter visible on other users' screens during drag operations
- Users seeing nodes highlighted that they didn't select
- Canvas layout unstable after multiple users move nodes

**Phase to address:** Canvas state sync architecture phase — the sync boundary must be designed before implementation, not discovered during QA

---

### Pitfall 3: Delete-Move Race Condition — Inconsistent Canvas State

**What goes wrong:**
User A deletes a node. Network latency delays the sync by 150ms. During that window, User B moves the now-deleted node. User B's `moveNode` operation references an ID that no longer exists in the shared state. Depending on implementation:

- **CRDT approach (Yjs):** Yjs's Last-Write-Wins resolves this by re-creating the deleted node with the moved position — deleted node comes back from the dead.
- **Server-authoritative approach:** Server rejects the move (node not found), but client has already updated local state optimistically. Client and server are now out of sync.

Both outcomes are wrong. This is the hardest edge case in collaborative canvas editing.

**Why it happens:**
Distributed state has no global clock. Two operations that feel simultaneous from the users' perspective may arrive at the sync engine in any order. ReactFlow's official documentation explicitly flags this: "If Alice deletes a node and Bob moves it before the deletion syncs, you have inconsistent application state that's difficult to recover from."

**How to avoid:**
Use a tombstone pattern for deletions: instead of removing the node from the shared map immediately, mark it `deleted: true` and suppress rendering. Apply actual removal only after a sync quorum timeout (e.g., 1 second). Operations referencing a tombstoned node ID are silently dropped.

Alternative: server-authoritative reconciliation — all mutations go through the server, which applies a canonical ordering and rejects stale operations. Simpler to reason about, but adds round-trip latency to every edit.

For WorkshopPilot specifically: canvas nodes (post-its, stakeholder rings, empathy zones) are created by AI or facilitator, so delete-move races are rare. The safest pragmatic approach is optimistic deletion with a 500ms tombstone window and "undo" button visible to the deleting user.

**Warning signs:**
- Deleted nodes reappearing on canvas after other users move them
- Canvas nodes with `undefined` data appearing after concurrent edits
- "Ghost" nodes that appear on some users' canvases but not others

**Phase to address:** Conflict resolution design phase — tombstone or server-authoritative model must be chosen before canvas sync is implemented

---

### Pitfall 4: Reconnection Storm — All Clients Reconnecting Simultaneously

**What goes wrong:**
The real-time server briefly becomes unavailable (deploy, restart, hiccup). All 15 participants in a session simultaneously attempt to reconnect with no delay. The server gets hit with 15 connection requests at the same instant it comes back up. This overwhelms the connection handler, causes cascading failures, and most participants never reconnect successfully. The session appears broken even though the server is healthy.

**Why it happens:**
Default WebSocket reconnection logic retries immediately on close (`onclose` → `reconnect()` with no delay). When a single server failure drops all users simultaneously, they all execute the same `reconnect()` at the same millisecond. Managed services like Liveblocks and Ably handle this internally, but custom WebSocket implementations do not.

**How to avoid:**
Always implement exponential backoff with jitter on reconnection:

```typescript
function reconnect(attempt: number) {
  const baseDelay = Math.min(30000, 300 * Math.pow(2, attempt));
  const jitter = Math.random() * baseDelay * 0.5; // ±50% jitter
  const delay = baseDelay + jitter;
  setTimeout(() => connect(), delay);
}
```

The jitter spreads 15 simultaneous reconnections across 0-30 seconds instead of all hitting at T+0ms.

If using Liveblocks or PartyKit: both implement exponential backoff with jitter internally. Do not bypass or override their reconnect logic.

**Warning signs:**
- "Session died" user reports that coincide with deploy events
- Real-time server logs showing a spike of 50+ connections in 1 second
- All participants lose connection simultaneously and most cannot rejoin without page refresh
- Real-time service metrics showing connection storm patterns post-deployment

**Phase to address:** Real-time infrastructure phase — reconnection strategy must be implemented with the connection layer, not added later

---

### Pitfall 5: Guest Auth Token Trusted Without Verification — Privilege Escalation

**What goes wrong:**
Participant joins via share link, provides their name, receives a guest token. The token contains `{ role: "participant", sessionId: "abc123", name: "Alice" }`. Developer trusts this token client-side only — the WebSocket message handler checks `message.role === "facilitator"` from the client-provided token to authorize facilitator-only actions (step progression, AI chat input). A participant opens DevTools, crafts a WebSocket message with `role: "facilitator"`, and advances the workshop to a different step without the facilitator's knowledge.

**Why it happens:**
Session join tokens are often treated as display metadata, not security credentials. The distinction between "what we show in the UI" and "what we enforce on the server" gets blurred during implementation.

**How to avoid:**
Never authorize based on data inside a client-provided token without server-side verification. The real-time server (PartyKit/Liveblocks/Ably) must validate every operation against the session record in Neon:

1. On join: generate a signed JWT (or use the managed service's auth token) that encodes `{ clerkUserId | guestId, role, sessionId }` — signed with a secret the client cannot forge.
2. On every mutation (step advance, AI trigger, node delete): verify the signed token against the server-side session record in Neon before applying the mutation.
3. Facilitator role is determined by Clerk authentication (they have an account). Guest participants never get facilitator role regardless of any token they provide.

For Liveblocks: use the `authEndpoint` to issue tokens server-side — the client never constructs its own token.

**Warning signs:**
- Role check appearing in client-side code only (`if (token.role === 'facilitator')`)
- WebSocket message handler trusting `message.userId` without re-verifying against the session record
- No server-side validation of who can trigger step progression
- Any code comment like "participants can't fake this anyway"

**Phase to address:** Guest auth + session join phase — auth model must be designed with server-side enforcement before any role-based UI is built

---

### Pitfall 6: Cross-Site WebSocket Hijacking (CSWSH)

**What goes wrong:**
A malicious site (attacker.com) loads in a participant's browser. It silently initiates a WebSocket connection to the WorkshopPilot real-time server using the victim's session cookies. The WebSocket handshake includes cookies automatically. If the server doesn't validate the Origin header, the attacker's site gets a valid connection and can read all canvas data and AI conversation in the workshop session in real time.

**Why it happens:**
HTTP requests are protected by CSRF tokens. WebSocket upgrade requests include cookies automatically — just like HTTP requests — but the WebSocket API has no built-in CSRF protection. Developers assume the authentication token is enough to prevent unauthorized connections, ignoring that the browser will send cookies to any site that opens a WebSocket to the same domain.

**How to avoid:**
On the WebSocket server (PartyKit party handler, Liveblocks auth endpoint, etc.), validate the `Origin` header on every connection:

```typescript
// PartyKit onConnect handler
onConnect(conn, room, ctx) {
  const origin = ctx.request.headers.get('Origin');
  const allowedOrigins = ['https://workshoppilot.ai', 'http://localhost:3000'];
  if (!allowedOrigins.includes(origin ?? '')) {
    conn.close(4000, 'Unauthorized origin');
    return;
  }
}
```

Additionally: use token-based auth (not cookie-only) for WebSocket connections. Liveblocks tokens, PartyKit connection tokens, and Ably token requests all use short-lived tokens in the connection URL or first message — not cookies — making CSWSH structurally impossible since the token can only be obtained by authenticated code on the real domain.

**Warning signs:**
- WebSocket server accepting connections from any Origin without validation
- Auth relying entirely on browser cookies rather than explicit token in connection payload
- No `Origin` header check in connection handler

**Phase to address:** Real-time infrastructure + guest auth phase — Origin validation must be in place before the share link is made public

---

### Pitfall 7: Cursor Broadcasting Overwhelming the Real-Time Channel

**What goes wrong:**
Live cursors are implemented by broadcasting every `mousemove` event. At 60fps, each user generates 60 cursor events per second. With 15 participants, that's 900 messages/second flowing through the real-time channel — from cursors alone, before any canvas mutations. The channel saturates, canvas sync messages get queued behind cursor updates, and participants see their post-its updating with 2-3 second delays. The app feels broken even though the canvas sync logic is correct.

**Why it happens:**
`mousemove` fires at monitor refresh rate (60-144Hz). Developers wire it directly to the broadcast function without throttling because it "feels more real-time" in local testing. Local testing never reveals the bandwidth problem because there's only one user.

**How to avoid:**
Throttle cursor broadcasts to 30-50ms intervals (20-33 updates/second per user). At 15 users throttled to 50ms: 300 messages/second — manageable.

```typescript
// Throttle with lodash/throttle or manual implementation
const broadcastCursor = throttle((position: {x: number, y: number}) => {
  realtime.broadcast('cursor-move', {
    userId: currentUser.id,
    position,
    color: currentUser.color,
  });
}, 50); // max 20 updates/second

canvas.on('mousemove', (event) => {
  broadcastCursor(canvas.screenToFlowPosition({ x: event.clientX, y: event.clientY }));
});
```

Additionally: separate cursor updates from canvas mutation messages by using different channels or Liveblocks `others.presence` (presence is a separate, lower-priority sync from storage mutations). Never put cursor positions in the same channel as node changes.

Implement cursor interpolation on the receiving end: rather than jumping cursors between positions, use `lerp` or `perfect-cursors` to animate between the last two received positions — this makes 20fps feel like 60fps.

**Warning signs:**
- Canvas updates feel laggy with 5+ participants but fine with 1-2
- Real-time service message volume metrics showing 90%+ cursor events
- `mousemove` handler calling `broadcast()` directly without throttle
- Liveblocks presence updates and storage updates in the same call

**Phase to address:** Live cursor implementation phase — throttling and channel separation must be built into the initial cursor implementation, not added as a performance fix

---

### Pitfall 8: Data Loss on Disconnect — Unsent Canvas Changes Evaporate

**What goes wrong:**
Facilitator is moving post-its on the canvas, arranging stakeholder rings. Network drops for 3 seconds (mobile, spotty wifi). During the disconnect, the facilitator makes 5 more node moves. When the connection restores, the reconnect logic re-subscribes to the room but the 5 offline mutations were never sent — they were queued in memory that was cleared on reconnect. The canvas reverts to its pre-disconnect state for the facilitator. Participants (who never lost connection) have the state from before the facilitator's offline edits. Now the facilitator's view and participants' views are permanently split.

**Why it happens:**
Basic WebSocket implementations queue messages in memory. On reconnect, the queue is not replayed — the code simply re-subscribes to new updates. The missing mutations are lost. This is most common with custom WebSocket or socket.io implementations. Managed services like Liveblocks and Yjs handle this correctly by design (Yjs has offline-first CRDT semantics, Liveblocks has reconnect state recovery), but only if used correctly.

**How to avoid:**
Use a managed service that guarantees offline mutation recovery. With Liveblocks: mutations applied to `LiveMap`/`LiveObject`/`LiveList` during disconnect are queued durably and replayed on reconnect — this is built in. With Yjs: offline mutations are stored in the Yjs document (CRDT), and on reconnect the document state is merged with the server — also built in, if using `y-websocket` or `y-partykit` providers correctly.

If rolling a custom solution: implement a client-side mutation log (IndexedDB or sessionStorage) that persists across reconnects. On reconnect, replay the log in order before re-subscribing to new updates.

Show a persistent "offline" indicator in the UI while disconnected: users should know they're offline and their changes are queued, not silently lost.

**Warning signs:**
- Canvas reverting to pre-disconnect state after reconnect
- Facilitator's view diverging from participants' view after a network hiccup
- No visible offline indicator in the UI
- `socket.onopen` handler that only re-subscribes without replaying a mutation queue

**Phase to address:** Real-time infrastructure phase — offline mutation durability must be verified as part of infrastructure selection, not discovered during user testing

---

### Pitfall 9: Existing Zustand Store Fighting the Real-Time Store

**What goes wrong:**
The existing solo-workshop Zustand store manages all canvas state: `nodes`, `edges`, `workshopData`, `currentStep`. Adding a real-time layer (Liveblocks `useStorage`, Yjs `Y.Map`) introduces a second source of truth for nodes and edges. Both stores update independently in response to different events. A facilitator moves a node: Zustand updates immediately (optimistic), Liveblocks updates after network round-trip, ReactFlow re-renders twice. Participants receive the Liveblocks update, but their Zustand store is never updated. Their canvas shows the moved node; their Zustand-based AI context extraction still reads the old positions.

**Why it happens:**
Adding real-time sync to an existing Zustand-based app is an incremental refactor. Developers add the real-time layer alongside Zustand rather than replacing the relevant parts, creating two competing sources of truth.

**How to avoid:**
For multiplayer workshops specifically: make the real-time store the single source of truth for canvas state (nodes/edges). Zustand remains authoritative for solo-workshop state and non-shared state (step progression, AI conversation, UI state like panel sizes). Never have both Zustand and the real-time store managing the same data.

The practical approach: use a `workshopType` flag (`'solo' | 'multiplayer'`). For `multiplayer` workshops, the canvas components read from Liveblocks `useStorage(root => root.nodes)` instead of Zustand `useWorkshopStore(s => s.nodes)`. For `solo` workshops, nothing changes. This prevents any code path from accidentally writing to both stores.

Add a runtime assertion during development: if both Zustand nodes and Liveblocks nodes are non-empty for the same workshop, throw an error. Catches the split-brain condition immediately.

**Warning signs:**
- `useWorkshopStore` and `useStorage` both containing `nodes` arrays
- ReactFlow `setNodes` called from both a Zustand action and a Liveblocks mutation callback
- Canvas positions in Neon DB diverging from what the real-time store holds
- AI context extraction reading from Zustand but canvas rendering from Liveblocks

**Phase to address:** State architecture phase (before any multiplayer code) — the boundary between Zustand and the real-time store must be drawn explicitly as the first design decision

---

### Pitfall 10: Database Schema Not Supporting Multiplayer Sessions

**What goes wrong:**
The existing `workshops` table has `userId` (the creator's Clerk ID) as a foreign key, implying single ownership. When adding multiplayer, developers try to reuse this table — passing the share link adds participants as additional rows or storing participant IDs in a JSON column. Queries that check workshop ownership (`WHERE userId = currentUser`) now accidentally exclude facilitator-owned workshops from participant views. Auto-save (debounced 2s, optimistic locking) writes the full canvas state from the facilitator's Zustand store, overwriting concurrent participant edits. The `version` column for optimistic locking now conflicts between real-time sync and periodic DB persistence.

**Why it happens:**
The existing schema was designed for single-user ownership. Multiplayer requires a fundamentally different data model: a session with participants, not a resource with an owner. Retrofitting session/participant tables onto the existing schema without careful planning creates foreign key constraint violations, ownership check regressions, and conflicting write patterns.

**How to avoid:**
Add new tables for multiplayer without modifying existing tables (additive migration only):

```sql
-- New table: multiplayer sessions
workshop_sessions (
  id UUID PRIMARY KEY,
  workshop_id UUID NOT NULL REFERENCES workshops(id),
  facilitator_clerk_id TEXT NOT NULL, -- must match workshop owner
  join_code TEXT UNIQUE NOT NULL,     -- short alphanumeric share code
  status TEXT NOT NULL DEFAULT 'active', -- active | ended
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- New table: session participants (guests + Clerk users)
session_participants (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES workshop_sessions(id),
  display_name TEXT NOT NULL,
  guest_id TEXT UNIQUE,       -- ephemeral ID for non-Clerk users
  clerk_user_id TEXT,         -- populated if participant has Clerk account
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  cursor_color TEXT           -- assigned on join, stable per session
);
```

Canvas state for multiplayer sessions is managed by the real-time service (Liveblocks/Yjs), NOT by the existing `canvas_state` column or auto-save. The auto-save mechanism must be disabled or isolated for multiplayer workshop mode to prevent it from overwriting real-time state.

**Warning signs:**
- Participant lookup using `WHERE userId = clerkId` that filters out guest participants
- `canvas_state` column being written from both auto-save and real-time sync
- Optimistic locking `version` column mismatch errors appearing in multiplayer sessions
- Single `workshopId` used to identify both the workshop content and the live session

**Phase to address:** Schema design phase — new tables must be created before any session or participant logic is written, with explicit documentation of which tables are real-time-authoritative vs DB-authoritative

---

### Pitfall 11: Share-Link Join Flow Creating Clerk Auth Confusion

**What goes wrong:**
Participant clicks the share link. The share link URL is `/session/[joinCode]`. The existing `clerkMiddleware` on this route requires authentication. Participant is redirected to Clerk sign-in. They create a Clerk account to join. Now they're an authenticated Clerk user who joined as a "participant" — but Clerk's user record doesn't know anything about their session role. Later, they navigate to `/dashboard` and see a Clerk-authenticated dashboard with no workshops. The auth system is confused: they're a full user who was supposed to be a guest, their role in the session is undefined, and the Clerk account they created is orphaned.

**Why it happens:**
Clerk's middleware defaults to protecting all routes. The join flow requires bypassing auth for guests while keeping auth working for the facilitator on the same route. This split requirement isn't obvious when adding routes incrementally.

**How to avoid:**
Add the session join route to `clerkMiddleware`'s public route list:

```typescript
// middleware.ts
const isPublicRoute = createRouteMatcher([
  '/',
  '/session/(.*)',   // join flow is always public
  '/pricing',
  '/api/webhooks/(.*)',
]);
```

Issue a custom JWT (not a Clerk JWT) for guest participants on join:

```typescript
// POST /api/session/[joinCode]/join
// Body: { displayName: string }
// Returns: { guestToken: string } — signed with APP_JWT_SECRET
```

The `guestToken` is stored in `sessionStorage` (not localStorage — it should not survive browser restart) and sent as a Bearer token on WebSocket connections and any API calls the guest needs to make. The token is scoped to a single session and expires when the session ends.

Never prompt guests to create a Clerk account. The join flow is: enter name → get guestToken → enter canvas. If a facilitator wants to join their own session as a participant for testing, they use their existing Clerk session.

**Warning signs:**
- `/session/[joinCode]` protected by Clerk auth
- Participants being prompted for email/password on the join page
- Clerk user accounts being created with zero workshops on dashboard
- `useAuth()` returning `{ userId: null }` causing errors in session components that assumed auth

**Phase to address:** Guest auth + session join phase — the middleware public route list and guest JWT issuance must be implemented as the first join-flow task

---

### Pitfall 12: Bundle Size Spike Breaking Mobile Performance

**What goes wrong:**
The existing canvas bundle was carefully kept under 300KB (v1.1 requirement). Adding Yjs + y-websocket + y-protocols adds ~120-180KB. Adding Liveblocks client SDK adds ~80-120KB. Adding `perfect-cursors` adds ~15KB. Total addition: 200-300KB gzipped, which nearly doubles the canvas bundle and breaks mobile performance targets. Workshop participants on mobile phones (common for "quick join" scenarios) see 8-12 second load times on 4G and canvas interactions at <30fps.

**Why it happens:**
Real-time collaboration libraries are inherently large — they include CRDT data structures, sync protocols, and connection management. Each library justifies its size individually, but they compound. Teams add them without auditing the impact on bundle targets established for solo mode.

**How to avoid:**
Audit bundle size before and after adding each dependency. Target: multiplayer additions should not exceed 150KB gzipped total.

Strategies to stay under budget:
- **Use Liveblocks over Yjs for this project**: Liveblocks client SDK is ~80KB gzipped and handles CRDT, conflict resolution, and presence internally — no need for separate Yjs + y-websocket + y-protocols dependencies.
- **Lazy load the multiplayer layer**: Only load real-time dependencies when the user is in a multiplayer session. Use `next/dynamic` with `ssr: false` for the multiplayer canvas component.
- **Skip `perfect-cursors` for MVP**: Throttled cursor positions with CSS `transition: transform 50ms linear` achieve acceptable smoothness at zero additional bundle cost.

```typescript
// Dynamic import for multiplayer canvas only
const MultiplayerCanvas = dynamic(
  () => import('@/components/canvas/MultiplayerCanvas'),
  { ssr: false, loading: () => <CanvasSkeleton /> }
);
```

Participants in solo mode never download the multiplayer bundle.

**Warning signs:**
- Canvas bundle size metric not tracked before multiplayer work begins
- `import { createClient } from '@liveblocks/client'` at the top level of a component loaded for all workshop types
- Yjs, y-websocket, and a Liveblocks client all installed simultaneously (redundant — pick one)
- No `next/dynamic` wrapper around multiplayer-specific components

**Phase to address:** Infrastructure setup phase — bundle budget must be established and the lazy loading pattern must be in place before any real-time dependencies are installed

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Sync all ReactFlow node fields including `selected`/`dragging` | Simpler sync logic, one store | Selection stealing, drag jank for all users, DOM measurement conflicts | Never — field-level sync discipline is required |
| Store participant list in Zustand only | No schema change, fast to build | Lost on page refresh, not persisted if facilitator refreshes, inconsistent across participants | Never for persistent session state — DB table required |
| Disable existing auto-save for multiplayer workshops via a flag | Fast workaround | Auto-save and real-time sync will conflict on canvas state; the flag is not the architecture | Acceptable as temporary isolation during development, must be removed before production |
| Use `localStorage` for guest token | Simple to implement | Guest token survives browser restart; guest can "replay" a stale session join; security issue if shared device | Never — use `sessionStorage` for guest tokens |
| Broadcast raw `mousemove` events without throttle | Zero implementation effort | Channel saturation at 5+ users; canvas mutation lag | Never — throttle is mandatory |
| One Liveblocks room per workshop (persisted indefinitely) | Simple room ID scheme | Liveblocks charges for cumulative storage; old rooms accumulate; 8GB storage limit on free tier | Acceptable if rooms are explicitly closed/deleted after session ends |
| Skip Origin header validation on WebSocket server | Saves 5 lines of code | CSWSH vulnerability — any site can open a WebSocket connection authenticated as the user | Never — Origin validation is mandatory |
| Role check on client only | Simpler architecture, faster UI | Facilitator-only actions (step advance, end session) can be triggered by any participant via DevTools | Never for destructive or irreversible actions |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Liveblocks auth | Using public API key for all connections | Use `authEndpoint` to generate signed tokens server-side; the public key is read-only and does not authorize mutations |
| Liveblocks storage | Storing cursor positions in `LiveMap` (durable storage) | Use `updatePresence()` for cursors — presence is ephemeral and cheaper than storage; durable storage for canvas nodes/edges only |
| Liveblocks rooms | Never ending rooms after session completes | Call `liveblocks.deleteRoom(roomId)` from Neon webhook after `workshop_sessions.status = 'ended'`; unclosed rooms accumulate toward the 8GB storage limit |
| PartyKit | Using `onMessage` without connection auth | The first message after connection should be the auth token; all subsequent messages are rejected if auth wasn't established in the first 5 seconds |
| Neon neon-http driver | Using neon-http for transactions during real-time sync | neon-http is request/response; use neon-ws (WebSocket driver) or connection pooling for transactions in the real-time message handler. This project already avoids this in solo mode |
| Clerk + guest auth | Calling `auth()` in routes that guests hit | `auth()` returns `{ userId: null }` for unauthenticated users; routes must explicitly handle the null case without redirecting guests to sign-in |
| ReactFlow + Liveblocks | Calling `setNodes()` from both Liveblocks `onChange` callback and Zustand actions | One call site only: Liveblocks `onChange` calls `setNodes()`; Zustand actions in multiplayer mode must never call `setNodes()` directly |
| WebSocket + Vercel | Deploying socket.io server to Vercel API routes | Socket.io requires persistent Node.js process; Vercel functions are request-response only; deploy WS server to PartyKit/Fly.io/Railway separately |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unbounded cursor broadcasts (raw `mousemove`) | Canvas sync lag at 5+ users; real-time service rate limit errors | Throttle to 50ms (20/s per user); separate cursor channel from canvas mutations | 3+ simultaneous participants |
| Full node array sync on every edit | Every node position change triggers full re-render for all participants | Use Y.Map keyed by node ID; only changed fields sync | 20+ nodes on canvas |
| Re-fetching session participant list from Neon on every WebSocket message | Neon cold start (500ms) blocks message processing; participant list queries add 50-200ms per message | Cache participant list in real-time service presence; query Neon only on join/leave events | Any message volume above 1/second |
| Synchronous Neon writes in real-time message handler | 50-200ms Neon round trip blocks the WebSocket message loop; message queue backs up | Queue mutations; write to Neon asynchronously in batches; treat Neon as backup persistence, not primary sync | Any real-time session with >1 user |
| Storing full canvas state in Liveblocks LiveObject at once | Single large object update is not granular; any change triggers full re-sync for all users | Nested LiveMap structure: `root.nodes` is a `LiveMap` keyed by nodeId; each node is a `LiveObject` with only its own fields | 30+ canvas nodes |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting client-provided role in WebSocket messages | Participant escalates to facilitator role, advances steps without consent | Sign role into server-issued JWT; verify server-side on every mutation |
| No Origin header validation on WebSocket connection | CSWSH — any site can steal session data in real time | Validate `Origin` header on every WebSocket upgrade; allowlist workshoppilot.ai domains only |
| Generating join codes without sufficient entropy | Brute-force enumeration of active sessions; unauthorized workshop joining | Use 8+ character alphanumeric codes (62^8 = 218 trillion combinations); rate limit join attempts to 5/minute per IP |
| Exposing Clerk user data (email, full name) to anonymous guests | Privacy violation — guests see facilitator's full Clerk profile | Only expose display name in presence data; never include Clerk userId, email, or private metadata in real-time presence payload |
| Allowing guests to read workshop data after session ends | Past participant re-joins ended session via bookmarked share link | Check `workshop_sessions.status = 'active'` on every connection attempt; reject joins to ended sessions |
| Real-time message payload without size limits | Participant sends 50MB message, crashing the session for all users | Enforce max message size (32KB for canvas mutations, 1KB for cursor updates) at the real-time server level |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing participant's own cursor on screen | Confusing — user's real cursor and their "sync" cursor overlay | Filter own cursor from `others.cursors`; only render remote participants' cursors |
| No visual distinction between facilitator and participants on canvas | Participants don't know who is leading; facilitator's changes feel anonymous | Assign unique cursor colors on join; display name labels on remote cursors; facilitator cursor gets a distinct icon (e.g., pointer vs. dot) |
| Live cursors for participants on mobile | Mobile users have no mouse cursor concept; broadcasting touch position is non-intuitive | Disable cursor broadcasting for touch-primary devices; show presence as avatar list only |
| No offline indicator when real-time connection drops | User thinks canvas is working; makes changes that silently don't sync | Show persistent "Reconnecting..." banner on disconnect; grey out canvas until reconnected |
| Participant can see AI chat input (facilitator-only) | Accidental facilitator prompts visible, creates expectation that participants can also type | Use two separate chat display modes: facilitator sees input field, participants see read-only chat feed |
| Showing raw node IDs or technical errors in participant view | Breaks immersion for non-technical workshop participants | Sanitize all error messages for participant role; map technical errors to human language |
| No "session ended" signal when facilitator closes the workshop | Participants left staring at a frozen canvas, confused | Broadcast `session:ended` event; show a full-screen "The facilitator has ended this session" overlay |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **WebSocket connection:** Works in `npm run dev` — verify it still works after deploying to Vercel staging (serverless = no persistent connections)
- [ ] **Canvas sync:** Nodes sync between users — verify `selected`, `dragging`, and `measured` fields are NOT in the shared store
- [ ] **Cursor broadcasting:** Cursors appear on other users' screens — verify mousemove is throttled (check: emit rate should be ≤20/second per user)
- [ ] **Guest join flow:** Name entry works — verify the join route is in `clerkMiddleware` public routes and guests are not prompted for Clerk sign-in
- [ ] **Role enforcement:** Facilitator-only buttons are hidden from participants — verify the step-advance server action also rejects non-facilitator requests server-side
- [ ] **Origin validation:** WebSocket server accepts connections from localhost in dev — verify it also validates Origin in production and rejects foreign origins
- [ ] **Bundle size:** Real-time library installed — verify `next build` bundle analysis shows the multiplayer components are lazy-loaded and not included in the initial chunk
- [ ] **Reconnect behavior:** App appears to reconnect — verify that canvas state after reconnect matches other participants' state (not a stale pre-disconnect snapshot)
- [ ] **Session ended:** Facilitator ends session — verify all participant screens receive and display the session-ended state (not frozen canvas)
- [ ] **Join code entropy:** Join codes generate — verify codes are 8+ characters alphanumeric and not sequential integers or short codes that can be enumerated

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Serverless WS failure after Vercel deploy | HIGH | Rollback to external real-time service; cannot fix in Vercel natively — must migrate to PartyKit/Liveblocks/Ably retroactively |
| Canvas state split-brain (some users see different nodes) | MEDIUM | Add "resync" button in facilitator UI that broadcasts the full current canvas state; participants apply it as authoritative; identify root cause in sync boundary design |
| Reconnection storm causing dropped sessions | MEDIUM | Add jitter to reconnect logic in managed service config or custom code; if using managed service, verify their built-in backoff is enabled and not being overridden |
| Guest token compromise (session hijacking) | MEDIUM | Short-lived tokens (30min expiry) self-heal; end the compromised session from facilitator UI; generate a new join code for the workshop |
| Bundle size regression breaking mobile | LOW | Add `next/dynamic` wrapper to real-time components; verify with `@next/bundle-analyzer` after each dependency addition |
| Role privilege escalation by participant | HIGH | Audit server-side action logs for unauthorized facilitator actions; add rate limiting on mutation endpoints; require signed JWTs before re-enabling the compromised actions |
| Auto-save overwriting real-time canvas state | MEDIUM | Disable auto-save in multiplayer mode immediately; restore from Liveblocks room state as authoritative; implement proper `workshopType` guard before re-enabling |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Vercel has no native WebSocket support | Infrastructure setup (Phase 1) | Verify WebSocket connections from Vercel-deployed frontend to external real-time service succeed |
| Syncing ephemeral ReactFlow state | State sync architecture (Phase 1-2) | Verify `selected` and `dragging` fields are absent from Liveblocks/Yjs shared store schema |
| Delete-move race condition | Conflict resolution design (Phase 2) | Simultaneous delete + move test: canvas reaches consistent state within 2 seconds |
| Reconnection storm | Infrastructure setup (Phase 1) | Simulate server restart with 10 connected clients; verify all reconnect within 30 seconds |
| Guest role privilege escalation | Guest auth + session join (Phase 2) | Attempt step-advance via raw WebSocket message as participant; verify rejection |
| CSWSH WebSocket hijacking | Infrastructure + guest auth (Phase 1-2) | Send WebSocket upgrade from foreign Origin; verify 4000 close code |
| Cursor channel saturation | Live cursor phase (Phase 3) | 10 users moving cursors simultaneously; verify canvas mutations still arrive in <500ms |
| Data loss on disconnect | Infrastructure setup (Phase 1) | Disconnect facilitator for 5 seconds mid-edit; reconnect; verify mutations replay correctly |
| Zustand vs real-time store conflict | State architecture (Phase 1, before any code) | Runtime assertion: dual-write throws error in development mode |
| Schema not supporting multiplayer | Schema design (Phase 1) | Verify participant table exists with foreign key to sessions before any join flow code |
| Share link Clerk auth confusion | Guest auth phase (Phase 2) | Guest joins without Clerk account; verify no Clerk redirect occurs; verify guest token issued |
| Bundle size spike | Infrastructure setup (Phase 1) | `next build --analyze` before and after real-time dependency install; multiplayer chunk lazy-loaded |

---

## Sources

- [ReactFlow Multiplayer Documentation — official field-level sync guidance, ephemeral vs durable state, delete-move race condition warning](https://reactflow.dev/learn/advanced-use/multiplayer)
- [Vercel Knowledge Base — WebSocket support (none), recommended alternatives](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections)
- [Vercel Knowledge Base — Publish and Subscribe, recommended real-time services list](https://vercel.com/kb/guide/publish-and-subscribe-to-realtime-data-on-vercel)
- [OWASP WebSocket Security Cheat Sheet — CSWSH, Origin header validation, token auth patterns](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)
- [PortSwigger Web Security Academy — Cross-Site WebSocket Hijacking (CSWSH)](https://portswigger.net/web-security/websockets/cross-site-websocket-hijacking)
- [Liveblocks Platform Limits — MAU, storage per room, rate limits](https://liveblocks.io/docs/platform/limits)
- [PartyKit Hibernation Guide — Durable Objects WebSocket hibernation, cold start behavior, cost model](https://docs.partykit.io/guides/scaling-partykit-servers-with-hibernation/)
- [Ably Blog: Next.js + Vercel Serverless WebSockets — architecture patterns for Vercel-hosted apps](https://ably.com/blog/next-js-vercel-link-sharing-serverless-websockets)
- [Synergy Codes: Real-time Collaboration in ReactFlow with Yjs — Y.Map vs Y.Array, field selection, conflict patterns](https://www.synergycodes.com/blog/real-time-collaboration-for-multiple-users-in-react-flow-projects-with-yjs-e-book)
- [ReactFlow GitHub Discussion #2570 — selection state sync pitfall confirmed by community](https://github.com/wbkd/react-flow/discussions/2570)
- [Steve Ruiz: perfect-cursors — cursor interpolation for multiplayer apps](https://github.com/steveruizok/perfect-cursors)
- [WebSocket Reconnection with Exponential Backoff and Jitter — thundering herd prevention](https://dev.to/hexshift/robust-websocket-reconnection-strategies-in-javascript-with-exponential-backoff-40n1)
- [Convex + Automerge: Local-first CRDT for offline mutations](https://stack.convex.dev/automerge-and-convex)
- [Liveblocks Collaborative Flowchart Example — Zustand + ReactFlow + Liveblocks integration pattern](https://liveblocks.io/examples/collaborative-flowchart/zustand-flowchart)

---
*Pitfalls research for: Real-time multiplayer collaboration (v1.9)*
*Researched: 2026-02-26*

---
---

# Pitfalls Research: Dot Voting + Mobile Gate (v2.0)

**Domain:** Adding dot voting (Step 8 idea prioritization) and mobile phone gate (<768px) to existing Next.js + Liveblocks + Zustand app
**Researched:** 2026-02-28
**Confidence:** HIGH (Liveblocks official docs, NN/g dot voting research, Next.js official hydration docs, codebase inspection of existing timer + Crazy 8s + storageMapping, multiple cross-verified sources)

**Context:** WorkshopPilot.ai v2.0 adds dot voting on Crazy 8s sketches (configurable vote counts, multi-vote per slot, facilitator-controlled open/close with timer, solo + multiplayer modes) and a <768px dismissible mobile wall. Existing Liveblocks integration uses `@liveblocks/zustand` middleware with `storageMapping`, and the existing timer pattern uses `TIMER_UPDATE` broadcast events (not Storage). The `Crazy8sSlot` type in `canvas-store.ts` has no vote data yet. Solo mode uses vanilla Zustand + Neon auto-save.

---

## Critical Pitfalls

### Pitfall 1: Vote Counts in Liveblocks Storage via storageMapping — Lost Updates Under Concurrency

**What goes wrong:**
Developer adds a `votes` field (e.g., `voteCount: number` or `voters: string[]`) to the `Crazy8sSlot` type and maps `crazy8sSlots` (already in `storageMapping`) to Liveblocks Storage. Two participants vote for the same slot within the same ~100ms window. Both clients read `voteCount: 2`, both compute `voteCount: 3`, and both write `voteCount: 3`. Liveblocks' last-write-wins resolution means only the final received write survives — one vote is silently lost. The displayed count is 3, not 4.

**Why it happens:**
Liveblocks Storage uses last-write-wins for `LiveObject` property updates. The existing `storageMapping` in `multiplayer-canvas-store.ts` maps the entire `crazy8sSlots` array, meaning the whole array is patched on any slot update. There is no atomic increment primitive in Liveblocks' CRDT for numeric counters. Developers assume eventual consistency means "all votes are counted" — but lost updates are possible and correct under last-write-wins semantics.

**How to avoid:**
Use an append-only voter identity model instead of a numeric counter:

```typescript
// Instead of: voteCount: number  (not safe under concurrency)
// Use:        voters: string[]   (voter IDs — append semantics via LiveList)
```

Store `voters` as a `LiveList<string>` (Liveblocks list), where each append is a separate operation. LiveList appends are conflict-free — two simultaneous appends both survive, resulting in a list with both entries. Count is derived as `voters.length`. This converts a numeric update (lost under LWW) into a list append (safe under CRDT).

For the `@liveblocks/zustand` integration specifically: the current `storageMapping` syncs entire arrays. Rather than extending the Zustand mapping, consider direct Liveblocks Storage mutation for vote operations outside of Zustand, or store votes in a separate data structure (a `LiveMap<slotId, LiveList<voterId>>`) accessed via `useStorage` hooks rather than the Zustand storageMapping.

**Warning signs:**
- `voteCount: number` as a field in `Crazy8sSlot` that is part of `storageMapping`
- `updateCrazy8sSlot(slotId, { voteCount: prev + 1 })` called on multiple clients simultaneously
- Vote totals not matching expected counts in multiplayer sessions with 5+ participants
- No voter identity tracking — only a raw integer

**Phase to address:** Dot voting data model phase (first phase of v2.0) — the storage model must be designed before any voting UI is built

---

### Pitfall 2: Dot Voting Timer Reusing TIMER_UPDATE Broadcast — Vote Deadline Confusion

**What goes wrong:**
The existing `TIMER_UPDATE` broadcast event (from `facilitator-controls.tsx`) is reused for the dot voting countdown. The existing `CountdownTimer` component in `countdown-timer.tsx` already listens for `TIMER_UPDATE` on all participants. Adding a "voting timer" that uses the same event type means participants see the voting countdown in the existing timer pill UI — which appears in all steps, not just Step 8. A facilitator running the voting timer while reviewing Step 5 data (in a separate browser tab) accidentally resets the participant countdown from a step-timer context into a voting context.

**Why it happens:**
The existing timer infrastructure works for general countdown purposes and is easy to reach for. Developers reuse it rather than adding a voting-specific event type. The event type system (`RoomEvent` in `liveblocks/config.ts`) is extensible, but extending it requires modifying the global Liveblocks type augmentation, which feels heavyweight for a "quick" feature.

**How to avoid:**
Add a dedicated `VOTING_TIMER_UPDATE` event type to the `RoomEvent` union in `/src/lib/liveblocks/config.ts`:

```typescript
RoomEvent:
  | { type: 'STEP_CHANGED'; stepOrder: number; stepName: string }
  | { type: 'VIEWPORT_SYNC'; x: number; y: number; zoom: number }
  | { type: 'TIMER_UPDATE'; state: 'running' | 'paused' | 'expired' | 'cancelled'; remainingMs: number; totalMs: number }
  | { type: 'VOTING_TIMER_UPDATE'; state: 'open' | 'closed' | 'expired'; remainingMs: number; totalMs: number }
  | { type: 'VOTING_STATE_CHANGED'; isOpen: boolean }
  | { type: 'SESSION_ENDED' };
```

Create a separate `DotVotingTimer` component that listens exclusively for `VOTING_TIMER_UPDATE`. This prevents any rendering in the existing `CountdownTimer` component when voting is happening.

**Warning signs:**
- `TIMER_UPDATE` broadcast used for voting deadline instead of a new event type
- `CountdownTimer` component appearing on non-Step 8 participants while voting runs
- Facilitator starting a step timer and inadvertently overwriting the voting deadline broadcast

**Phase to address:** Dot voting multiplayer phase — event type separation must be established before any voting timer broadcast code is written

---

### Pitfall 3: Facilitator Closing Voting While Participants Are Mid-Vote — Race Between "Close" and "Cast Vote"

**What goes wrong:**
Facilitator clicks "Close Voting." A participant cast their last vote 50ms earlier — the vote write is in-flight to Liveblocks Storage. The `VOTING_STATE_CHANGED { isOpen: false }` broadcast arrives at the participant's client before the in-flight vote write acknowledges. The participant's UI locks ("Voting closed"), but their vote optimistically appeared in local state. When the Storage response arrives, the vote is written to Storage — but the "voting closed" UI state suppresses re-renders. Other participants see the vote count increment post-close. Results are inconsistent.

**Why it happens:**
Broadcast events (close signal) and Storage writes (votes) travel on separate channels with different latencies. Broadcasts are faster but ephemeral; Storage writes are authoritative but slower. The window between close signal broadcast and all in-flight Storage writes settling is ~100-500ms and is unpredictable.

**How to avoid:**
Store the voting open/close state in Liveblocks Storage (not just broadcast):

```typescript
// In storageMapping or direct Liveblocks Storage:
votingSession: {
  isOpen: boolean;
  closedAt: number | null;  // timestamp facilitator closed
}
```

Participants validate against the Storage `isOpen` flag before writing votes, not just the broadcast event. The broadcast serves only for immediate UI feedback (lock the button); the Storage value is authoritative. On vote write, check `votingSession.isOpen === true` before applying the mutation. Reject any write when `isOpen === false`.

Additionally: add a 1-second grace window on the facilitator's close action — disable close button for 1 second to let in-flight writes settle, then broadcast close + write `isOpen: false` to Storage together.

**Warning signs:**
- Voting open/close state only in a `VOTING_STATE_CHANGED` broadcast and local React state (not in Liveblocks Storage)
- Vote counts incrementing after the facilitator has closed voting (visible in multiplayer sessions)
- No validation of voting state before applying a vote mutation

**Phase to address:** Dot voting multiplayer phase — the voting session state model must be in Storage before any facilitator open/close controls are built

---

### Pitfall 4: Solo Mode Votes Persisted Through Zustand Auto-Save Race

**What goes wrong:**
Solo dot voting stores vote data in the Zustand canvas store, which auto-saves to Neon via the debounced (2s) auto-save mechanism. User votes rapidly across 8 slots within 2 seconds. The debounce collapses all intermediate states into one save. If the final save call races with a page navigation event (user proceeds to Step 9), the save might fire after the step transition, writing the wrong step's canvas state to Neon, or the auto-save is cancelled by navigation and votes are lost entirely.

**Why it happens:**
The existing auto-save is debounced with 2s delay and 10s maxWait. Dot voting produces many rapid state changes within that window. Navigation away from Step 8 can cancel the pending debounced save. The auto-save does not know about the vote-close event as a natural "flush" point.

**How to avoid:**
Treat "facilitator closes voting" as a hard flush boundary for solo mode. When voting closes (solo), immediately call the canvas save function synchronously (not debounced) before any navigation is allowed:

```typescript
async function handleVotingClose() {
  setVotingOpen(false);
  // Force immediate Neon persistence before state transitions
  await canvasStore.getState().saveCanvasNow(); // bypass debounce
  setVotingResults(computeResults());
}
```

For the "Advance to Step 9" action after voting, gate the navigation on `isSaving === false` — show a brief "Saving votes..." spinner if a save is in progress.

**Warning signs:**
- Vote data disappearing when navigating from Step 8 to Step 9 in solo mode
- Neon canvas state missing vote fields after rapid voting sequences
- Navigation allowed before the debounced auto-save has fired

**Phase to address:** Solo dot voting phase — vote save discipline must be designed before the solo voting UI is built

---

### Pitfall 5: Mobile Gate Hydration Mismatch — Flash of Full App on Phone

**What goes wrong:**
The mobile gate is implemented with `window.innerWidth < 768` in a React state initializer or directly in render. The Next.js server renders the full app (no `window` during SSR). The client hydrates with the gate visible. React detects a mismatch between server output (full app) and client output (mobile gate), throws a hydration error in development, and causes a layout flash in production. On a phone, the user sees the full canvas briefly, then the gate appears — a jarring experience that undermines the gate's credibility.

**Why it happens:**
`window` is undefined during SSR. Any code path that checks `window.innerWidth` during the server render will either throw (if unguarded) or silently return the wrong value (if guarded with `typeof window !== 'undefined'` returning false). The server renders one thing, the client renders another — hydration mismatch.

**How to avoid:**
Use a `useEffect`-based approach with an initially non-blocking state:

```typescript
function useMobileGate() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null); // null = unknown (SSR)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}
```

During SSR and initial hydration, `isMobile` is `null` — render nothing (or a neutral skeleton). After hydration, the effect runs and the correct gate state is applied. Server and client render the same null/skeleton — no mismatch.

Do NOT use `dynamic(() => import('./MobileGate'), { ssr: false })` alone without handling the flash — the component simply won't render during SSR, which is fine, but the full app still renders on phones until the dynamic import resolves (~200ms). Combine with `null` initial state for zero-flash.

**Warning signs:**
- "Hydration mismatch" error in browser console on mobile devices
- Full app visible for ~200ms on phone before gate appears
- `window.innerWidth` called outside of a `useEffect` or event handler
- Gate component imported statically in a server component

**Phase to address:** Mobile gate phase — the SSR-safe detection pattern must be the first implementation decision, not a fix applied after the gate "works in development"

---

### Pitfall 6: iPad as False Positive — Gate Showing on 768px Tablet

**What goes wrong:**
The gate checks `width < 768`. iPad 9th/10th generation portrait mode reports exactly `768px` viewport width. With `<768px`, the iPad narrowly escapes the gate. But iPad mini (768px portrait) hits the boundary exactly. iPad Pro 11" in portrait mode reports 834px — well above 768px. The gate correctly hides for most iPads but blocks iPad mini users who have a perfectly usable experience. Meanwhile, some large Android phones in landscape mode exceed 768px and bypass the gate despite being phone-class devices used in portrait orientation.

**Why it happens:**
CSS breakpoints treat `768px` as the canonical "tablet" boundary, but real devices cluster at this exact value. The gate's intent is "this device type (phone) cannot use the canvas well" not "this viewport width is too small." Width is a proxy for device type, and it breaks at the boundary.

**How to avoid:**
Use a compound detection: CSS width check as primary signal, with pointer media query as secondary confirmation:

```typescript
useEffect(() => {
  const isNarrow = window.innerWidth < 768;
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  // Gate fires if: narrow viewport AND touch-primary input
  // iPad with Pencil reports pointer: fine — excluded correctly
  // iPhone always reports pointer: coarse — included correctly
  setIsMobile(isNarrow && isCoarsePointer);
}, []);
```

`pointer: coarse` distinguishes touch-primary devices (phones, iPads without Pencil) from mice/trackpads. An iPad mini in portrait (768px) with a Bluetooth keyboard/trackpad reports `pointer: fine` — the gate correctly allows it. A phone in landscape (800px) with `pointer: coarse` — the gate still blocks it.

The gate should also be dismissible with a confirmation message ("I know my screen is small — continue anyway") stored in `localStorage` so the user is not re-gated on every reload.

**Warning signs:**
- iPad mini users reporting they see the mobile gate
- Large-screen Android phone users in landscape mode accessing the full canvas despite having a poor experience
- No `localStorage` persistence of the dismiss choice (gate re-appears on every refresh)

**Phase to address:** Mobile gate phase — compound detection must be designed before the gate component is built, not discovered during cross-device QA

---

### Pitfall 7: Dismissal State Lost on Mobile — Gate Re-Appears Every Refresh

**What goes wrong:**
User on phone sees the gate, reads "Best on desktop," but proceeds anyway (or taps dismiss). They do some work on the phone. They refresh the page — gate appears again. They can't remember how to dismiss it. They give up. The gate's intent was to discourage phone use, not to make it impossible — but without persistent dismissal, it functionally blocks phone access entirely.

**Why it happens:**
Gate dismissal stored only in React state (ephemeral, lost on navigation/refresh). `sessionStorage` would persist for the tab session but not across refreshes. `localStorage` persists correctly but developers often miss this for simple UI state.

**How to avoid:**
Persist dismissal in `localStorage` with a session-scoped key (so users get the hint on their next *fresh* session if they switch devices, but not mid-session):

```typescript
const MOBILE_GATE_DISMISSED_KEY = 'workshoppilot_mobile_gate_dismissed_v1';

function useMobileGateDismiss() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(MOBILE_GATE_DISMISSED_KEY) === 'true';
  });

  const dismiss = useCallback(() => {
    localStorage.setItem(MOBILE_GATE_DISMISSED_KEY, 'true');
    setDismissed(true);
  }, []);

  return { dismissed, dismiss };
}
```

The gate shows if: `isMobile === true AND !dismissed`. The dismiss is permanent until localStorage is cleared (acceptable — if a user explicitly chose to proceed on mobile, don't re-ask every time).

**Warning signs:**
- Mobile gate state stored in `useState` only (no persistence)
- Gate re-appearing on page refresh for users who already dismissed
- No dismiss button at all (fully blocking gate with no escape)

**Phase to address:** Mobile gate phase — dismissal persistence must be part of the initial gate design

---

### Pitfall 8: Vote Visibility Causing Anchoring Bias — All Votes Visible During Voting

**What goes wrong:**
Participants can see the running vote total in real time during the voting period (e.g., "Slot 4: 5 votes, Slot 2: 3 votes"). Participants who haven't voted yet see which slots are "winning" and anchor their choices to the existing distribution rather than their independent preference. Vote results become self-reinforcing: the leading slot attracts disproportionate votes from late voters who want to be "on the winning side." The final distribution does not reflect independent judgment — it reflects social following.

**Why it happens:**
Showing live vote counts is technically trivial (it's just a count of voters in Liveblocks Storage). Developers assume transparency is always good in collaborative tools. The social psychology literature on anchoring and groupthink in voting is not commonly known to engineers.

**How to avoid:**
Hide vote counts from participants during the voting period. Show only whether they personally have voted on each slot (their own dot is placed), not the aggregate count. Reveal totals only when the facilitator closes voting.

Implement two display modes:
- `VOTING_OPEN`: each participant sees their own votes placed (dots on slots they voted for), but no total count visible
- `VOTING_CLOSED`: all vote counts revealed simultaneously to all participants

```typescript
// In the Crazy8sGrid component
const showVoteCounts = votingState === 'closed'; // not 'open'
```

For solo mode (self-voting/prioritization), this concern doesn't apply — the user is the only voter and sees their own dots as they place them.

**Warning signs:**
- Running aggregate vote counts visible to participants during the open voting phase
- "3 votes" badge on slots while voting is still active in multiplayer
- Facilitator and participants seeing the same vote-count display during voting

**Phase to address:** Dot voting UI phase — display mode (open vs. closed) must be a design requirement, not an afterthought

---

### Pitfall 9: Multi-Vote Per Slot Without Per-Participant Limits — Vote Stuffing

**What goes wrong:**
The dot voting feature allows "configurable votes" and "multi-vote support" (from the v2.0 spec). If the per-participant vote limit is enforced only in the UI (disabling a button after N votes), a participant can bypass the limit by directly mutating Liveblocks Storage through the developer console. They cast 20 votes for their own idea when the limit is 5.

**Why it happens:**
Vote limits enforced at the UI layer only. The underlying Liveblocks mutation (adding a voter ID to the slot's `voters` list) has no server-side constraint — Liveblocks Storage accepts any write. Client-side enforcement is trivially bypassed.

**How to avoid:**
Enforce vote limits in the mutation logic, not just the button state. Before appending to the voters list, count how many slots already contain the current user's ID and compare against the configured limit:

```typescript
function castVote(slotId: string, voterId: string, maxVotesPerParticipant: number) {
  // Count existing votes for this participant across all slots
  const existingVotes = crazy8sSlots.reduce((count, slot) => {
    return count + (slot.voters?.includes(voterId) ? 1 : 0);
  }, 0);

  if (existingVotes >= maxVotesPerParticipant) {
    toast.error(`You have used all ${maxVotesPerParticipant} votes`);
    return; // Do not write to Storage
  }

  // Safe to write
  appendVoter(slotId, voterId);
}
```

This check runs client-side but is validated against the actual Storage state (not just local React state). A participant trying to bypass via DevTools would still need to forge a valid Liveblocks mutation token — which they cannot, since tokens are server-issued.

Note: For a design thinking workshop with 5-15 participants, the risk of deliberate vote stuffing is very low. The primary goal is preventing accidental over-voting (misclick, UI bug), not adversarial cheating.

**Warning signs:**
- Vote limit enforced only by disabling a button (`disabled={votesUsed >= maxVotes}`)
- No pre-write validation of existing vote count in the mutation function
- `voters` list accepting duplicates (same voter ID appearing twice for the same slot)

**Phase to address:** Dot voting data model phase — the vote limit validation logic must be part of the castVote function, not added later as a UI concern

---

### Pitfall 10: Timer Drift Between Facilitator and Participants in Existing Pattern

**What goes wrong:**
The existing `FacilitatorControls` timer uses `setInterval` (1 second ticks) and broadcasts `TIMER_UPDATE` every tick. The participant `CountdownTimer` also uses a local `setInterval` (1 second ticks) between broadcasts. `setInterval` is not guaranteed to fire exactly every 1000ms — browser tab throttling, garbage collection pauses, and event loop congestion can cause 10-200ms delays per tick. Over a 5-minute voting session, facilitator and participant timers can drift by 3-15 seconds. The facilitator's timer shows "0:00" and they close voting; participants' timers still show "0:12" — participants think they have more time and feel cheated.

**Why it happens:**
`setInterval` accumulates drift because each tick fires relative to the *previous tick*, not to the original start time. The existing implementation (inspected in `countdown-timer.tsx` and `facilitator-controls.tsx`) uses `prev - 1000` in the state updater — this is correct for display but does not compensate for missed or delayed ticks. This is a known JavaScript timer accuracy issue.

**How to avoid:**
Use the broadcast's `remainingMs` as the authoritative clock, not the local `setInterval`. On each `TIMER_UPDATE` received, reset the local timer to the broadcast value — don't accumulate local state. The local interval is only for display smoothness between broadcasts, not for accuracy:

```typescript
// On TIMER_UPDATE received:
setRemainingMs(event.remainingMs); // authoritative from facilitator
// Local interval RESETS on next broadcast — drift never accumulates beyond 1 broadcast interval
```

The facilitator's timer should also use wall clock time rather than accumulated ticks:

```typescript
// In FacilitatorControls:
const startTimestamp = Date.now();
const totalMs = selectedDuration;

const interval = setInterval(() => {
  const elapsed = Date.now() - startTimestamp;
  const remaining = Math.max(0, totalMs - elapsed);
  setRemainingMs(remaining);
  broadcast({ type: 'VOTING_TIMER_UPDATE', state: 'open', remainingMs: remaining, totalMs });
  if (remaining === 0) { /* expire */ }
}, 1000);
```

Wall-clock elapsed time (`Date.now() - startTimestamp`) does not accumulate setInterval drift.

**Warning signs:**
- Timer display diverging between facilitator and participant screens during a 5-minute countdown
- Participants confused when the facilitator closes voting while their timer still shows time remaining
- `prev - 1000` pattern in a setInterval without a wall-clock correction

**Phase to address:** Dot voting timer phase — wall-clock-based timer must be used for the voting countdown from the start; drift is nearly impossible to fix post-implementation without a full timer rewrite

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `voteCount: number` in Crazy8sSlot storageMapping | Simple data model, easy to read | Lost votes under concurrent updates (last-write-wins CRDT semantics) | Never — use voter ID list append instead |
| Reusing `TIMER_UPDATE` broadcast for voting timer | No config changes needed | Voting timer appears in all steps' participant UI; step timers interfere with voting timers | Never — add a distinct `VOTING_TIMER_UPDATE` event type |
| `window.innerWidth < 768` in render or useState init | Works in development | Hydration mismatch in Next.js SSR; flash of full app on mobile before gate appears | Never — use useEffect-based detection with null initial state |
| Showing live vote counts during open voting period | Feels "interactive," real-time | Anchoring bias; groupthink; final results reflect social following not independent judgment | Never in multiplayer mode — hide counts until voting closes |
| Gate dismissal in React state only | Zero extra code | Gate re-appears on every page refresh; users who dismiss must do so repeatedly | Never — persist dismissal in localStorage |
| Width-only mobile detection (`< 768px`) | Simple to implement | iPad mini false positives; large landscape phones bypass gate | Acceptable as first version if `pointer: coarse` addition is planned for fast follow |
| Enforce vote limit only in UI (`disabled` button) | No validation logic needed | Vote stuffing possible via DevTools console mutation | Acceptable for v2.0 given low-stakes workshop context; schedule for fast-follow hardening |

---

## Integration Gotchas

Common mistakes when connecting to the existing Liveblocks + Zustand pattern.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Crazy8sSlot + storageMapping | Adding `voteCount: number` to `Crazy8sSlot` and relying on last-write-wins for increments | Store `voters: string[]` and use list-append semantics; derive count as `voters.length` |
| `@liveblocks/zustand` middleware | Adding vote state to `storageMapping` and calling `updateCrazy8sSlot` from multiple clients simultaneously | Use direct Liveblocks Storage mutation outside Zustand for vote operations; storageMapping is designed for state replacement, not concurrent increments |
| `RoomEvent` type union | Adding voting timer events to existing `TIMER_UPDATE` type | Extend the `RoomEvent` union with `VOTING_TIMER_UPDATE` and `VOTING_STATE_CHANGED`; keep timers semantically separated |
| Solo mode canvas store | Adding vote state to Zustand canvas store without a flush point | Treat voting close as an explicit save boundary; call `saveCanvasNow()` before any navigation after votes are cast |
| `useEffect` + `window.innerWidth` | Checking `window.innerWidth` at component initialization (runs on server) | Initialize to `null`; check in `useEffect` after hydration; render gate only when non-null |
| `localStorage` for gate dismissal | Calling `localStorage.getItem` during SSR (throws `ReferenceError` on server) | Wrap in `typeof window !== 'undefined'` guard or use lazy state initializer |
| CountdownTimer + DotVotingTimer | Rendering both in the same step, causing two overlapping timer pills | Gate `CountdownTimer` to non-voting contexts; gate `DotVotingTimer` to Step 8 voting phase only |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Broadcasting full `voters` array on every vote | Large payload per vote event; 10 participants voting simultaneously = 10 full-array broadcasts in <1s | Use append operations on `LiveList` rather than replacing the whole array | 8+ participants voting simultaneously |
| Re-rendering all 8 Crazy8s slots on every vote update | Each vote on slot 1 re-renders all 8 slot components | Memoize individual slot components with `React.memo`; pass `voters` as a derived count (not the array) to avoid referential instability | Every vote cast — visible as jank immediately |
| `resize` event on `window` without throttle for mobile gate | Mobile browsers fire `resize` on scroll when address bar shows/hides; gate flickers | Debounce the resize handler at 100ms; also avoid recalculating on virtual keyboard open | Any iOS/Android browser with dynamic viewport |
| Storing vote state in both Zustand (local display) and Liveblocks Storage (sync) | Dual-write causes double renders; Zustand optimistic state and Storage state briefly diverge | Single source of truth: Liveblocks Storage for multiplayer, Zustand for solo; never both | Any multiplayer voting session |

---

## UX Pitfalls

Common user experience mistakes specific to dot voting and mobile gating.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Revealing all votes in real time during open voting | Anchoring bias; late voters copy early voters; results don't reflect independent judgment | Hide aggregate counts until facilitator closes voting; show only personal votes placed |
| No visual feedback when vote is cast | User unsure if their vote registered; may vote multiple times accidentally | Show dot animation on vote cast; show "You've used 3/5 votes" counter updating immediately |
| Facilitator closes voting without warning | Participants mid-vote have their in-progress interaction suddenly locked | Broadcast a 10-second warning before close; show countdown in participant UI: "Voting closes in 10s" |
| Mobile gate with no context about "why" | Users on phone feel rejected without understanding; they may be first-time users who don't know what the app is | Gate copy: "WorkshopPilot works best on a larger screen — the canvas and AI chat need more space. Try on a laptop or desktop." + dismiss link |
| Results screen showing only counts, not which ideas | Facilitator must mentally connect vote counts to sketch images | Results view shows sketch thumbnail + title + vote count side-by-side, sorted descending |
| No "retract vote" capability when multi-vote is allowed | User accidentally votes for wrong slot; cannot undo | Tapping a voted slot retracts the vote (toggle behavior); show visual diff between voted and unvoted state |

---

## "Looks Done But Isn't" Checklist

Things that appear complete in development but are missing critical pieces.

- [ ] **Vote counts:** Correct in single-user testing — verify counts with 3+ participants voting simultaneously in <200ms (concurrent write test)
- [ ] **Vote limits:** Max votes enforced by disabled button — verify the mutation function also validates existing vote count in Storage state before writing
- [ ] **Vote visibility:** Counts visible during open phase — verify counts are hidden from participants during voting; only revealed on close
- [ ] **Voting timer:** Timer appears correct in development — verify facilitator and participant timers are within 1 second of each other after 5 minutes
- [ ] **Mobile gate:** Gate appears on resized desktop browser window (mobile emulation) — verify on a real iPhone (Safari, Chrome) — emulation and real device behave differently for `window.innerWidth`
- [ ] **iPad 768px:** Gate not showing on resized 768px window — verify on actual iPad mini portrait orientation (exact boundary behavior)
- [ ] **Gate dismissal:** Gate dismissed in one session — verify `localStorage` key is set and gate does not re-appear on page refresh
- [ ] **Solo vote persistence:** Votes cast in solo mode — navigate to Step 9 and navigate back to Step 8; verify votes are still shown
- [ ] **Facilitator close + in-flight votes:** Facilitator closes voting — verify no vote count increments arrive in Storage after the `closedAt` timestamp
- [ ] **Retract vote:** Toggling off a vote in multi-vote mode — verify voter ID is removed from the voters list (not just hidden in UI)

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Lost vote count (numeric LWW collision) | HIGH — undermines trust | Cannot recover lost votes from LWW collisions; requires data model change to voter ID list; re-run the voting session |
| Timer drift causing unfair close | LOW | Facilitator broadcasts a corrective `VOTING_TIMER_UPDATE` event; extend voting by restarting the timer |
| Mobile gate blocking valid tablet users | LOW | User clicks dismiss; localStorage is set; gate not seen again |
| Anchoring bias from visible vote counts | HIGH — results are invalid | Discard results; reset vote state; re-run voting with counts hidden (requires feature fix first) |
| Solo votes lost on navigation | MEDIUM | Restore from Neon if auto-save fired; if not, votes must be re-cast; prevent with explicit save-before-navigate |
| Vote stuffing discovered post-session | LOW in workshop context | Results are advisory anyway; facilitator manually overrides selection; plan limit enforcement for fast-follow |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Lost votes under LWW concurrency | Dot voting data model (Phase 1 of v2.0) | Concurrent vote test: 3 clients vote same slot within 100ms — all votes counted |
| Voting timer confusion with existing TIMER_UPDATE | Voting timer event type setup (Phase 1) | `RoomEvent` union extended; `TIMER_UPDATE` and `VOTING_TIMER_UPDATE` are distinct; step timer and vote timer never overlap |
| Race between close signal and in-flight vote | Voting state model in Storage (Phase 1) | `votingSession.isOpen` in Liveblocks Storage; close action writes Storage before broadcasting close event |
| Solo vote save race on navigation | Solo voting implementation | Force-save on voting close; navigation gated on `isSaving === false` |
| Mobile gate hydration mismatch | Mobile gate implementation | No hydration errors in browser console on mobile; gate appears without flash |
| iPad 768px false positive | Mobile gate implementation | Compound detection (`width + pointer: coarse`); iPad mini without gate; iPhone with gate |
| Gate dismissal not persisted | Mobile gate implementation | Dismiss → refresh → gate does not re-appear |
| Anchoring bias from live vote counts | Voting UI design | Vote counts hidden during open phase; revealed only on facilitator close |
| Vote stuffing via client bypass | Voting mutation logic | Pre-write count validation in castVote function; voter ID deduplication per slot |
| Timer drift over 5 minutes | Voting timer implementation | Wall-clock elapsed time in facilitator timer; broadcast remaining time resets participant timer |

---

## Sources

- [Liveblocks Storage API — LiveObject last-write-wins conflict resolution behavior](https://liveblocks.io/docs/api-reference/liveblocks-client#Storage)
- [Liveblocks Storage Guide — conflict resolution, LiveMap vs LiveList semantics](https://liveblocks.io/docs/guides/how-to-use-liveblocks-storage-with-react)
- [Liveblocks Zustand middleware — storageMapping, concurrent write behavior](https://liveblocks.io/docs/guides/how-to-use-liveblocks-storage-with-zustand)
- [Liveblocks GitHub Issue #1495 — Zustand middleware set() incompatible with batch() causing duplicate patches](https://github.com/liveblocks/liveblocks/issues/1495)
- [NN/g: Dot Voting — persuaded voting, split voting, group think as documented weaknesses](https://www.nngroup.com/articles/dot-voting/)
- [UX Collective: Better Dot Voting — hiding votes during voting period to reduce social influence](https://uxdesign.cc/design-techniques-better-dot-voting-590085fe36db)
- [Next.js Hydration Error Documentation — server/client mismatch causes, window access during SSR](https://nextjs.org/docs/messages/react-hydration-error)
- [Next.js Discussion #14810 — rendering different components based on screen size, SSR-safe patterns](https://github.com/vercel/next.js/discussions/14810)
- [Next.js Discussion #46466 — useMediaQuery returns undefined on first load, SSR pattern guidance](https://github.com/vercel/next.js/discussions/46466)
- [CSS-Tricks: iPad Media Query boundary at exactly 768px — false positive issue](https://css-tricks.com/snippets/css/media-queries-for-standard-devices/)
- [MDN: pointer media query — distinguishing touch-primary vs. fine-pointer devices](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using)
- [Codebase: `/src/components/workshop/countdown-timer.tsx` — existing TIMER_UPDATE broadcast consumer pattern](../codebase)
- [Codebase: `/src/components/workshop/facilitator-controls.tsx` — existing facilitator timer with setInterval drift pattern](../codebase)
- [Codebase: `/src/stores/multiplayer-canvas-store.ts` — storageMapping fields, liveblocks() middleware composition](../codebase)
- [Codebase: `/src/lib/canvas/crazy-8s-types.ts` — current Crazy8sSlot type (no vote fields yet)](../codebase)
- [Codebase: `/src/lib/liveblocks/config.ts` — RoomEvent union, Presence, Storage types](../codebase)

---
*Pitfalls research for: Dot Voting + Mobile Gate (v2.0)*
*Researched: 2026-02-28*
