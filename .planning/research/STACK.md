# Stack Research

**Domain:** Real-time multiplayer collaboration (WebSocket, CRDT, presence, guest auth) — v1.9 addition to WorkshopPilot.ai
**Researched:** 2026-02-26
**Confidence:** HIGH (Liveblocks core recommendation verified via npm, official docs, working Zustand+ReactFlow example)

> This is a focused addendum for v1.9. The existing stack (Next.js 16.1.1, React 19,
> Tailwind 4, shadcn/ui, Clerk, Neon/Drizzle, Gemini, Stripe, ReactFlow, Zustand, Vercel) is
> validated in production and NOT re-researched here. Scope covers only new libraries and
> patterns needed for v1.9 multiplayer.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@liveblocks/client` | 3.14.0 | WebSocket connection, room management, CRDT-based storage | Purpose-built for multiplayer creative tools (Figma, Pitch, Spline). Handles conflict resolution, presence, history, and storage. Managed infrastructure — no WebSocket server to operate on Vercel. |
| `@liveblocks/react` | 3.14.0 | React hooks: `useStorage`, `useMyPresence`, `useOthers`, `useMutation` | First-class React hooks. Liveblocks has a documented, working example that combines Liveblocks + Zustand + ReactFlow + Next.js — the closest match to WorkshopPilot's existing architecture. |
| `@liveblocks/node` | 3.14.0 | Server-side access token issuance in Next.js App Router route handlers | Edge-compatible. Issues short-lived JWTs scoped to a room. `userId` accepts any string — enables guest users with a generated UUID and display name without Clerk. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `nanoid` | ^5.0.0 | Generate short UUIDs for guest session IDs | Generate a guest `userId` on the join page, stored in `sessionStorage`. Enables guests to rejoin with the same identity on page reload. Already a common ecosystem dependency — check if it is already in `package.json` before installing. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Liveblocks Dashboard | Inspect rooms, live connections, storage state, event logs | Free tier includes 24h event log retention. Use during development to verify presence and storage sync. |
| Liveblocks DevTools browser extension | Inspect presence, storage, and mutations in browser DevTools | Available for Chrome and Firefox. Install from Liveblocks docs. |

---

## Integration Points with Existing Stack

### ReactFlow Canvas Sync

Liveblocks provides a documented working example combining **Liveblocks + Zustand + ReactFlow + Next.js** for a collaborative flowchart (source: `liveblocks.io/examples/collaborative-flowchart/zustand-flowchart`). This is architecturally identical to WorkshopPilot's canvas setup.

**Pattern:** The existing Zustand store's local `nodes` and `edges` arrays become Liveblocks `LiveList<Node>` and `LiveList<Edge>`. On every node drag or content edit, `useMutation` updates the shared list. All participants receive the delta via WebSocket with CRDT conflict resolution. No manual merge required.

**Type configuration (`liveblocks.config.ts`):**
```typescript
import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { LiveList, LiveObject } from "@liveblocks/client";
import type { Node, Edge } from "@xyflow/react";

// Shared canvas state — synced to all participants
type Storage = {
  nodes: LiveList<LiveObject<Node>>;
  edges: LiveList<LiveObject<Edge>>;
};

// Ephemeral per-user state — cursors, name, color
type Presence = {
  cursor: { x: number; y: number } | null;
  name: string;
  color: string;
  role: "facilitator" | "participant";
};

export const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

export const {
  RoomProvider,
  useStorage,
  useMutation,
  useMyPresence,
  useUpdateMyPresence,
  useOthers,
  useSelf,
} = createRoomContext<Presence, Storage>(client);
```

**What changes in ReactFlow:**
- `nodes` and `edges` props derive from `useStorage` instead of Zustand
- `onNodesChange` and `onEdgesChange` call `useMutation` instead of Zustand setters
- The existing Zustand store retains non-collaborative state (step progress, AI conversation, local UI state)
- Cursor tracking uses `useUpdateMyPresence` called on ReactFlow's `onMouseMove`

### Zustand Co-existence

Zustand remains the source of truth for:
- AI conversation history (facilitator-only, not shared with Liveblocks)
- Step progression state (facilitator-controlled, stored in Neon)
- Local UI state (sidebar, loading states, modals)

Liveblocks manages:
- Canvas node positions and content (shared, CRDT-synced)
- Live cursor positions (ephemeral Presence, not persisted)
- Participant presence list (derived from `useOthers`)

### Guest Authentication (No Clerk Account)

Liveblocks access tokens accept any arbitrary `userId` string. This enables guests who join via share link to receive a Liveblocks token without a Clerk account.

**Auth endpoint (`app/api/liveblocks-auth/route.ts`):**
```typescript
import { Liveblocks } from "@liveblocks/node";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: Request) {
  const { userId, displayName, roomId, role } = await request.json();

  // SECURITY: Validate roomId exists in Neon as a multiplayer workshop
  // before issuing any token. Prevents token fishing for arbitrary room IDs.
  const workshop = await db.query.workshops.findFirst({
    where: and(eq(workshops.id, roomId), eq(workshops.type, "multiplayer")),
  });
  if (!workshop) return new Response("Not found", { status: 404 });

  // Facilitator uses Clerk userId; guests use nanoid UUID from sessionStorage
  const session = liveblocks.prepareSession(userId, {
    userInfo: { name: displayName, role, color: assignColor(userId) },
  });

  // All participants get full canvas write access.
  // Step progression control is enforced in UI by checking role, not in Liveblocks permissions.
  session.allow(roomId, session.FULL_ACCESS);

  const { status, body } = await session.authorize();
  return new Response(body, { status });
}
```

**Guest session flow:**
1. Facilitator generates a share link: `/join/[workshopId]?token=[inviteToken]`
2. Guest opens link → shown a "Join Workshop" form (name field only)
3. On submit: `nanoid()` generates a `guestId`, stored in `sessionStorage`
4. POST to `/api/liveblocks-auth` with `{ userId: guestId, displayName, roomId, role: "participant" }`
5. Token returned, `RoomProvider` connects. Guest is live in the room.
6. On page reload: `guestId` re-read from `sessionStorage`, same presence identity

### Participant Presence List

```typescript
// Display connected participants
const others = useOthers();
const self = useSelf();

// others[i].info.name — display name
// others[i].info.role — "facilitator" | "participant"
// others[i].info.color — assigned color for avatar + cursor
// others[i].presence.cursor — null if off-canvas
```

### Live Cursors on ReactFlow Canvas

```typescript
const updateMyPresence = useUpdateMyPresence();

// In ReactFlow's onMouseMove handler:
const handleMouseMove = useCallback((e: React.MouseEvent) => {
  // Convert viewport coordinates to ReactFlow canvas coordinates
  const { x, y } = reactFlowInstance.screenToFlowPosition({
    x: e.clientX,
    y: e.clientY,
  });
  updateMyPresence({ cursor: { x, y } });
}, [updateMyPresence, reactFlowInstance]);

// On canvas mouse leave:
const handleMouseLeave = useCallback(() => {
  updateMyPresence({ cursor: null });
}, [updateMyPresence]);
```

Render other cursors as absolutely-positioned elements over the ReactFlow canvas, using `reactFlowInstance.flowToScreenPosition()` to convert back to viewport coordinates for rendering.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Liveblocks | **Yjs + y-websocket** | Requires a persistent WebSocket server. Vercel Serverless Functions cannot maintain persistent WebSocket connections (confirmed: `vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections`). Would require a second persistent server (Railway, Fly.io, Render) adding infrastructure to manage. Liveblocks eliminates the server entirely. Yjs is the right primitive if self-hosting is a requirement; it is not for WorkshopPilot. |
| Liveblocks | **PartyKit (now Cloudflare)** | Acquired by Cloudflare in April 2024. Runs on Cloudflare Durable Objects infrastructure, separate from Vercel — requires deploying a second service. PartyKit is a lower-level primitive; CRDT conflict resolution must be built manually on top of it. Liveblocks provides CRDT storage out of the box. Lower confidence given acquisition transition uncertainty. |
| Liveblocks | **Ably / Pusher** | Pub/sub channel model, not a document-model CRDT. Good for broadcasting events; not purpose-built for canvas state sync. Would require manual conflict resolution for concurrent node edits. Ably pricing is per-message, which is unpredictable for canvas-heavy workflows where mouse moves are high-frequency. |
| Liveblocks | **Supabase Realtime** | WorkshopPilot already uses Neon (not Supabase). Supabase Realtime's Presence + Broadcast can handle cursors but has no CRDT or conflict resolution for shared canvas state. Canvas sync would degrade to last-write-wins, breaking concurrent editing. Adding Supabase alongside Neon introduces two Postgres providers with no benefit. |
| Liveblocks | **Socket.io** | Requires a long-running Node.js server. Incompatible with Vercel's serverless execution model without a separate persistent server. |
| nanoid for guest IDs | crypto.randomUUID() | `crypto.randomUUID()` is available in modern browsers and could be used instead. nanoid is included here because it produces shorter IDs by default (~21 chars vs 36 with hyphens). If the project already uses nanoid, reuse it. If not, `crypto.randomUUID()` works fine and requires no install. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `socket.io` / raw WebSockets on Vercel | Vercel Serverless Functions cannot hold persistent connections. Requests time out; connections drop. | Liveblocks managed WebSocket infrastructure |
| `y-websocket` as a Vercel function | Same constraint — persistent WebSocket connection required. | Liveblocks (which uses Yjs-inspired CRDT data structures internally) |
| Supabase Realtime for canvas state | Last-write-wins only. Concurrent node moves overwrite each other with no merge. | Liveblocks Storage with CRDT conflict-free merging |
| Liveblocks Storage for AI chat history | AI messages are the facilitator's linear conversation, not collaborative data. Storing them in shared Liveblocks Storage exposes conversation at the storage layer and uses paid room quota unnecessarily. | Keep AI conversation in Neon Postgres, surface as read-only to participants via existing API routes |
| Building a custom CRDT | CRDT correctness is notoriously hard. Production-ready implementations (Yjs) took years to stabilize. | Liveblocks (CRDT internals managed by Liveblocks) |
| Rivet Actors on Vercel | Rivet enables WebSockets on Vercel Functions via tunneling, but it is immature for production (launched October 2025), requires Rivet's infrastructure alongside Vercel, and adds operational complexity for a problem Liveblocks solves completely. | Liveblocks |

---

## Stack Patterns by Variant

**For canvas node/edge sync (ReactFlow):**
- Use Liveblocks Storage: `LiveList<LiveObject<Node>>` and `LiveList<LiveObject<Edge>>`
- Replace Zustand canvas state with `useStorage` reads and `useMutation` writes
- All participants get FULL_ACCESS to the canvas room

**For live cursors:**
- Use Liveblocks Presence (`useMyPresence`, `useOthers`)
- Track `{ x, y }` in ReactFlow canvas (flow) coordinates, not screen pixels
- Set cursor to `null` on mouse leave so other participants see cursor disappear
- Render other cursors as absolutely-positioned `<div>` elements over the ReactFlow wrapper

**For participant presence list:**
- `useOthers()` returns all connected users with their `userInfo` (name, color, role)
- Display in a floating panel or avatar stack in the canvas toolbar area
- Facilitator is always the Clerk-authenticated room creator; guests identified by `role: "participant"`

**For facilitator-only controls (step progression, AI input):**
- Gate step transition mutations to facilitator role, checking `useSelf().info.role === "facilitator"` in the UI
- AI chat input renders only for facilitator; participants see a read-only live transcript
- Do NOT enforce this in Liveblocks permissions (all participants need canvas write for post-its); enforce in application logic

**For guest session identity:**
- Generate `guestId` with `nanoid()` or `crypto.randomUUID()` on the join page
- Store in `sessionStorage` (survives page reload within tab, cleared on tab close)
- On `RoomProvider` mount, POST to `/api/liveblocks-auth` with `{ userId: guestId, displayName, roomId }`

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@liveblocks/client@3.14.0` | `@liveblocks/react@3.14.0`, `@liveblocks/node@3.14.0` | Liveblocks docs state: "Every package should use the same version." Pin all three to the same version. |
| `@liveblocks/react@3.14.0` | React 19, Next.js 16.x | Actively developed. 3.14.0 confirmed current as of 2026-02-26. |
| `@liveblocks/node@3.14.0` | Next.js App Router route handlers | Edge-compatible. Works in both Node.js and Edge runtimes. |
| `@liveblocks/client@3.14.0` | `@xyflow/react` (ReactFlow) | No conflict. Liveblocks manages its own state; ReactFlow consumes derived state from `useStorage`. |
| `@liveblocks/react@3.14.0` | Zustand ^5.x | No conflict. Zustand handles non-collaborative state; Liveblocks handles shared canvas state. Different state trees. |

---

## Installation

```bash
# Core Liveblocks packages — all must be pinned to the same version
npm install @liveblocks/client@3.14.0 @liveblocks/react@3.14.0 @liveblocks/node@3.14.0

# Guest session ID generation (check if nanoid already in package.json first)
npm install nanoid
```

**Environment variables to add (`.env.local`):**
```bash
# Liveblocks — from https://liveblocks.io/dashboard
LIVEBLOCKS_SECRET_KEY=sk_...            # Server-side ONLY — never prefix NEXT_PUBLIC_
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_... # Client-side room identification
```

---

## Vercel Deployment Compatibility

**Confirmed compatible.** Liveblocks manages its own global WebSocket infrastructure, separate from Vercel Functions. The Next.js app on Vercel makes outbound HTTP calls to Liveblocks from the token route handler. Browser clients connect directly to Liveblocks' WebSocket servers. No changes to `vercel.json`, no edge function configuration, no persistent server required.

Vercel explicitly lists Liveblocks as a supported real-time partner (`vercel.com/kb/guide/publish-and-subscribe-to-realtime-data-on-vercel`).

**Free tier:** 500 monthly active rooms, unlimited users per room, 256 MB realtime data, 512 MB file storage. Sufficient for v1.9 launch at WorkshopPilot's current scale.

---

## What NOT to Add (Anti-over-engineering)

- **Do not add a standalone CRDT library (Yjs, Automerge).** Liveblocks provides CRDT semantics internally — owning the library means owning the operational complexity.
- **Do not add a separate WebSocket server.** Liveblocks eliminates this requirement.
- **Do not sync AI conversation to Liveblocks Storage.** AI messages are owned by the facilitator and stored in Neon. Participants read them via existing API routes, not via shared storage.
- **Do not replicate canvas state to Neon in real-time.** Persist canvas to Neon only on step completion (existing behavior). Liveblocks ephemeral storage handles in-session sync. On reconnect, Liveblocks restores room state automatically.
- **Do not add Supabase.** Already using Neon. Two Postgres providers is confusion with no benefit.
- **Do not add Ably or Pusher.** These solve pub/sub messaging, not canvas conflict resolution.

---

## Sources

- `https://liveblocks.io/examples/collaborative-flowchart/zustand-flowchart` — Official working example: Liveblocks + Zustand + ReactFlow + Next.js. HIGH confidence.
- `https://liveblocks.io/pricing` — Free tier: 500 monthly active rooms, unlimited users. HIGH confidence (fetched directly).
- `https://liveblocks.io/docs/authentication/access-token/nextjs` — Access token auth endpoint; `userId` is any string. HIGH confidence.
- `https://liveblocks.io/docs/rooms/permissions` — `defaultAccesses`, FULL_ACCESS scoping. HIGH confidence.
- `https://liveblocks.io/docs/ready-made-features/multiplayer/sync-engine/liveblocks-storage` — `LiveList`, `LiveObject`, `useMutation` API. HIGH confidence.
- `https://liveblocks.io/docs/guides/how-to-use-liveblocks-presence-with-react` — `useMyPresence`, `useOthers`, cursor tracking pattern. HIGH confidence.
- `https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections` — Vercel Serverless Functions do NOT support persistent WebSockets. HIGH confidence.
- `https://blog.cloudflare.com/cloudflare-acquires-partykit/` — PartyKit acquired by Cloudflare, April 2024. HIGH confidence.
- npm registry — `@liveblocks/client@3.14.0` confirmed current version as of 2026-02-26. HIGH confidence.

---
*Stack research for: v1.9 Real-time Multiplayer Collaboration (WorkshopPilot.ai)*
*Researched: 2026-02-26*
*Previous: v1.8 Stripe Checkout + credit system (2026-02-26)*
