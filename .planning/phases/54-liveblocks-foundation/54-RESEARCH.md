# Phase 54: Liveblocks Foundation - Research

**Researched:** 2026-02-26
**Domain:** Real-time collaboration infrastructure (Liveblocks v3, Next.js App Router, Drizzle schema, Clerk auth)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Presence shape**: Cursor position only — no step tracking or selection in Presence. Each participant's Presence includes: cursor position, assigned color, display name. Current step is a session-level concept, not per-participant.
- **Storage shape**: Canvas elements only (sticky notes, cards, groupings — the visual artifacts). Chat messages and AI responses stay in Neon, not in Liveblocks Storage. Storage shape must support per-user undo/redo via Liveblocks History API.
- **Workshop type model**: `workshopType` set at creation time (solo vs multiplayer) — not upgradeable after. Max 5 participants per multiplayer workshop. Join via shareable invite link (not code, not email). Start-then-invite flow. Guests allowed — participants do not need a Clerk account to join.
- **Session & participant model**: One session per workshop = the entire collaboration lifecycle. Owner can remove participants from a live session. Disconnected participants show as "away" with a grace period (~30-60s) before presence removal. Participants can rejoin via the same invite link after disconnect.
- **Persistence & data flow**: Webhook writes to Neon are debounced (not on every StorageUpdated event). Per-user undo/redo is a requirement — Liveblocks History API supports this. Undo/redo UX is a later phase, but Storage shape must support it from day one.

### Claude's Discretion

- `workshopType` enum values (solo/multiplayer or a more granular set based on roadmap needs)
- Hydration strategy on load (Liveblocks-first vs Neon-first)
- Whether solo workshops keep current data flow or eventually route through Liveblocks
- session_participants table columns (role, status, display info for guests)
- Debounce interval for webhook writes
- Exact Presence/Storage TypeScript type definitions
- Guest auth implementation details (signed cookies per INFR-04, stubbed in this phase)

### Deferred Ideas (OUT OF SCOPE)

- Clone solo workshop to multiplayer — later phase (UI + data migration logic)
- Per-user undo/redo UX — later phase (canvas interaction)
- Invite flow UI — later phase (sharing/invitation management)
- Guest auth via signed cookies (INFR-04) — Phase 57, stubbed here
- Participant reconnection with state recovery (INFR-03) — Phase 57
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFR-01 | Real-time sync uses a managed WebSocket provider compatible with Vercel serverless (Liveblocks) | Liveblocks v3 packages confirmed compatible with Vercel; no persistent WebSocket server needed — Liveblocks hosts infra |
| INFR-02 | Canvas state persists to database via webhook for durability | StorageUpdated webhook (throttled 60s) + WebhookHandler from `@liveblocks/node`; writes to Neon `stepArtifacts` via Drizzle |
| INFR-05 | Multiplayer components are lazy-loaded to avoid bundle size impact on solo workshops | `next/dynamic` with `ssr: false` must live in `'use client'` files; confirmed pattern for isolating Liveblocks providers from solo render paths |
</phase_requirements>

---

## Summary

Liveblocks v3 (3.14.0 released ~2026-02-20) is the locked real-time provider. The v3 major version introduced AI Copilot APIs and removed deprecated v2 APIs, but the core Presence/Storage/Room APIs are unchanged from v2's global type-augmentation pattern. The `@liveblocks/zustand` package is still actively maintained and documented under v3 — it is NOT deprecated. The critical architectural pattern is the **global type augmentation** approach (declare `interface Liveblocks` once, import hooks directly from `@liveblocks/react`), not the older `createRoomContext()` factory.

Phase 54 is infrastructure-only: install three packages, define typed config, wire two API routes (`/api/liveblocks-auth` and `/api/webhooks/liveblocks`), and extend the Neon schema (add `workshopType` column + two new tables). No UI, no canvas integration, no invite flow. The Zustand dual-store factory (`createSoloCanvasStore` / `createMultiplayerCanvasStore`) is Phase 55's concern — Phase 54 just lays the typed foundation it builds on.

The biggest risk is the `temporal` (zundo) + `liveblocks()` middleware composition order for the multiplayer store. This is explicitly flagged as a blocker in STATE.md and is out of scope for Phase 54, but the Storage type definitions designed here must be compatible with per-user undo/redo (Liveblocks History API), which they are by default — History is per-client in memory and does not require any special Storage shape.

**Primary recommendation:** Install `@liveblocks/client`, `@liveblocks/react`, `@liveblocks/node` all at v3.14.0 (identical versions required), define global type augmentation in `src/lib/liveblocks/config.ts`, wire auth and webhook routes following the patterns documented here, extend Drizzle schema via `db:generate` + `db:migrate`, and gate all Liveblocks providers behind `next/dynamic` with `ssr: false`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@liveblocks/client` | 3.14.0 | Core client, createClient, LiveList/LiveMap/LiveObject | Foundation; all other LB packages depend on this |
| `@liveblocks/react` | 3.14.0 | React hooks (useOthers, useSelf, useStorage, useMyPresence), RoomProvider, LiveblocksProvider, ClientSideSuspense | React integration layer |
| `@liveblocks/node` | 3.14.0 | Server-side: `Liveblocks` class, `prepareSession`, `authorize`, `WebhookHandler`, `verifyRequest` | Required for auth endpoint and webhook verification |

### Supporting (Phase 55+, not this phase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@liveblocks/zustand` | 3.14.0 | Zustand middleware `liveblocks()`, `storageMapping`, `presenceMapping` | Phase 55 — multiplayer canvas store |

**CRITICAL:** Every Liveblocks package must use the same version. Mixing versions causes runtime type errors.

**Installation:**
```bash
npm install @liveblocks/client@3.14.0 @liveblocks/react@3.14.0 @liveblocks/node@3.14.0
```

### Environment Variables Required
```env
LIVEBLOCKS_SECRET_KEY="sk_prod_..."     # From Liveblocks dashboard — auth endpoint + webhook
LIVEBLOCKS_WEBHOOK_SECRET="whsec_..."   # From Liveblocks dashboard — webhook verification
```
Add both to `.env.local` and Vercel environment variables.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── liveblocks/
│       └── config.ts           # Global type augmentation + room naming convention
├── app/
│   └── api/
│       ├── liveblocks-auth/
│       │   └── route.ts        # POST — issues access tokens for Clerk users + stub for guests
│       └── webhooks/
│           └── liveblocks/
│               └── route.ts    # POST — StorageUpdated → write canvas to Neon
└── db/
    └── schema/
        ├── workshops.ts        # ADD: workshopType column
        ├── workshop-sessions.ts  # NEW: workshop_sessions table
        └── session-participants.ts  # NEW: session_participants table
```

### Pattern 1: Global Type Augmentation (v2/v3 standard)

**What:** Define Presence and Storage types once in a config file using TypeScript interface augmentation. All hooks (`useMyPresence`, `useStorage`, `useOthers`) become type-safe automatically — no need to import from a local file.

**When to use:** Always. The old `createRoomContext()` pattern was removed in v2.0.

```typescript
// Source: https://liveblocks.io/docs/api-reference/liveblocks-client
// src/lib/liveblocks/config.ts
import { createClient } from "@liveblocks/client";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";

export const liveblocksClient = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

// Room naming convention: workshop-[workshopId]
export function getRoomId(workshopId: string): string {
  return `workshop-${workshopId}`;
}

// Canvas element types (subset — full shape defined in Phase 55)
export type CanvasElement = {
  id: string;
  type: "stickyNote" | "group" | "card";
  position: { x: number; y: number };
  width: number;
  height: number;
  text?: string;
  color?: string;
  authorId: string; // Track creator for color assignment
};

// Global type augmentation — makes all @liveblocks/react hooks typed
declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number } | null;
      color: string;          // Assigned participant color (hex)
      displayName: string;    // Display name (from Clerk or guest name)
    };
    Storage: {
      elements: LiveMap<string, LiveObject<CanvasElement>>;
    };
    UserMeta: {
      id: string;             // Clerk userId or guest token
      info: {
        name: string;
        color: string;
        isOwner: boolean;
      };
    };
  }
}
```

**Notes on Storage shape:**
- `LiveMap<string, LiveObject<CanvasElement>>` is the correct structure for a canvas where elements are keyed by ID. Supports per-user undo via Liveblocks History (History is per-client in memory, no special shape needed).
- `LiveObject` wraps each element so individual field mutations are tracked separately (better granularity for undo).
- `LiveList` is better for ordered sequences; `LiveMap` is better for ID-keyed collections. Use `LiveMap` for canvas elements.

### Pattern 2: Auth Endpoint — Clerk + Guest Stub

**What:** POST `/api/liveblocks-auth` checks Clerk auth. If authenticated, issues a Liveblocks access token for the workshop room. For guests, stub returns 401 now; Phase 57 implements signed cookie guest auth.

```typescript
// Source: https://liveblocks.io/docs/authentication/access-token/nextjs
//         https://clerk.com/blog/secure-liveblocks-rooms-clerk-nextjs
// src/app/api/liveblocks-auth/route.ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { Liveblocks } from "@liveblocks/node";
import { getRoomId } from "@/lib/liveblocks/config";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: Request) {
  const { userId } = await auth();

  // Clerk-authenticated path
  if (userId) {
    const user = await currentUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { room } = await request.json();
    const roomId = room as string;

    // TODO: verify user has access to this workshop (db check)
    // For now: any authenticated user can enter their own workshops

    const session = liveblocks.prepareSession(user.id, {
      userInfo: {
        name: user.fullName || user.username || "Facilitator",
        color: "#6366f1", // Will be assigned per session in Phase 57
        isOwner: true,    // Clerk users are always owners for now
      },
    });

    session.allow(roomId, session.FULL_ACCESS);
    const { body, status } = await session.authorize();
    return new Response(body, { status });
  }

  // Guest path — stubbed for Phase 57 (signed cookie auth)
  // Phase 57 will: read guest identity from HttpOnly signed cookie,
  // look up session_participants record, issue token with FULL_ACCESS
  return new Response("Guest auth not yet implemented", { status: 401 });
}
```

**Key insight on `userId`:** `prepareSession` accepts any string — it does not need to be a Clerk ID. Guest users in Phase 57 will use their `session_participants.id` (prefixed CUID2) as the Liveblocks userId.

### Pattern 3: Webhook Handler — StorageUpdated

**What:** POST `/api/webhooks/liveblocks` receives StorageUpdated events (throttled by Liveblocks at ~60s), verifies signature, fetches current storage via REST API, writes canvas state to Neon `stepArtifacts`.

```typescript
// Source: https://liveblocks.io/docs/guides/how-to-synchronize-your-liveblocks-storage-document-data-to-a-vercel-postgres-database
//         https://liveblocks.io/docs/platform/webhooks
// src/app/api/webhooks/liveblocks/route.ts
import { WebhookHandler } from "@liveblocks/node";
import { db } from "@/db/client";
import { stepArtifacts } from "@/db/schema";
import { eq } from "drizzle-orm";

// IMPORTANT: Use raw body for HMAC verification — same pattern as Stripe webhook
const webhookHandler = new WebhookHandler(
  process.env.LIVEBLOCKS_WEBHOOK_SECRET!
);

export async function POST(request: Request) {
  const body = await request.text(); // Must be raw text, not .json()
  const headers = request.headers;

  let event;
  try {
    event = webhookHandler.verifyRequest({
      headers,
      rawBody: body,
    });
  } catch (err) {
    console.error("Liveblocks webhook verification failed:", err);
    return new Response("Invalid webhook signature", { status: 400 });
  }

  if (event.type === "storageUpdated") {
    const { roomId } = event.data;

    // Fetch current storage snapshot from Liveblocks REST API
    const storageResponse = await fetch(
      `https://api.liveblocks.io/v2/rooms/${roomId}/storage`,
      {
        headers: {
          Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
        },
      }
    );

    if (!storageResponse.ok) {
      console.error("Failed to fetch Liveblocks storage:", roomId);
      return new Response("Storage fetch failed", { status: 500 });
    }

    const storageData = await storageResponse.text();

    // Extract workshopId from roomId (convention: "workshop-[workshopId]")
    const workshopId = roomId.replace(/^workshop-/, "");

    // TODO: look up workshopStepId for the active step of this workshop
    // For now: stub upsert — Phase 55 wires the actual stepArtifact record
    console.log(`Liveblocks StorageUpdated: workshopId=${workshopId}, bytes=${storageData.length}`);

    // Return 200 to acknowledge receipt
    // Full Drizzle upsert wired in Phase 55 when we know the active step context
  }

  return new Response(null, { status: 200 });
}
```

**Note on debounce:** Liveblocks itself throttles StorageUpdated to once per 60 seconds on the sending side. The project decision to debounce writes on the receiving side means the webhook handler should be idempotent (upsert, not insert). The Stripe webhook pattern in the project already uses this approach.

### Pattern 4: `next/dynamic` with `ssr: false`

**What:** Multiplayer components (RoomProvider, LiveblocksProvider, presence hooks) must never render on the server. Use `next/dynamic` to lazy-load them, preventing Liveblocks code from entering the solo workshop JS bundle.

**When to use:** Any component that imports from `@liveblocks/react` must be wrapped.

```typescript
// Source: https://nextjs.org/docs/app/guides/lazy-loading
// IMPORTANT: dynamic() call must be in a 'use client' file (Next.js 15 requirement)
'use client';

import dynamic from 'next/dynamic';

// The multiplayer room wrapper is lazy-loaded — zero cost for solo workshops
const MultiplayerRoom = dynamic(
  () => import('@/components/workshop/multiplayer-room'),
  {
    ssr: false,
    loading: () => <div>Connecting...</div>,
  }
);
```

The gating logic in the parent component (which renders `MultiplayerRoom` vs `SoloRoom`) should read `workshop.workshopType` and branch accordingly. This ensures `@liveblocks/react` is never imported in the solo code path.

### Pattern 5: Neon Schema Extensions

**What:** Three schema changes required. Use project's established `db:generate` + `db:migrate` workflow.

```typescript
// 1. Add workshopType to workshops table (src/db/schema/workshops.ts)
// Add inside pgTable definition:
workshopType: text('workshop_type', {
  enum: ['solo', 'multiplayer'],
})
  .notNull()
  .default('solo')
  .$type<'solo' | 'multiplayer'>(),
maxParticipants: integer('max_participants'), // null = solo (no limit applies)
```

```typescript
// 2. New: src/db/schema/workshop-sessions.ts
import { pgTable, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { workshops } from './workshops';

export const workshopSessions = pgTable(
  'workshop_sessions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('wses')),
    workshopId: text('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    liveblocksRoomId: text('liveblocks_room_id').notNull(), // "workshop-[workshopId]"
    status: text('status', {
      enum: ['waiting', 'active', 'ended'],
    })
      .notNull()
      .default('waiting')
      .$type<'waiting' | 'active' | 'ended'>(),
    maxParticipants: integer('max_participants').notNull().default(5),
    createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
    startedAt: timestamp('started_at', { mode: 'date', precision: 3 }),
    endedAt: timestamp('ended_at', { mode: 'date', precision: 3 }),
  },
  (table) => ({
    workshopIdIdx: index('workshop_sessions_workshop_id_idx').on(table.workshopId),
    statusIdx: index('workshop_sessions_status_idx').on(table.status),
  })
);
```

```typescript
// 3. New: src/db/schema/session-participants.ts
import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { workshopSessions } from './workshop-sessions';

export const sessionParticipants = pgTable(
  'session_participants',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createPrefixedId('spar')),
    sessionId: text('session_id')
      .notNull()
      .references(() => workshopSessions.id, { onDelete: 'cascade' }),
    // For Clerk users: their clerkUserId. For guests: null.
    clerkUserId: text('clerk_user_id'),
    // Liveblocks userId (Clerk ID or guest token used in prepareSession)
    liveblocksUserId: text('liveblocks_user_id').notNull(),
    displayName: text('display_name').notNull(),
    // Assigned color (hex) — deterministic per session slot
    color: text('color').notNull(),
    role: text('role', {
      enum: ['owner', 'participant'],
    })
      .notNull()
      .default('participant')
      .$type<'owner' | 'participant'>(),
    status: text('status', {
      enum: ['active', 'away', 'removed'],
    })
      .notNull()
      .default('active')
      .$type<'active' | 'away' | 'removed'>(),
    joinedAt: timestamp('joined_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { mode: 'date', precision: 3 }),
  },
  (table) => ({
    sessionIdIdx: index('session_participants_session_id_idx').on(table.sessionId),
    clerkUserIdIdx: index('session_participants_clerk_user_id_idx').on(table.clerkUserId),
    liveblocksUserIdIdx: index('session_participants_liveblocks_user_id_idx').on(table.liveblocksUserId),
  })
);
```

**Update `src/db/schema/index.ts`** to export new tables:
```typescript
export * from './workshop-sessions';
export * from './session-participants';
```

**Run migrations:**
```bash
npm run db:generate   # generates SQL migration file
npm run db:migrate    # applies to Neon
```

### Anti-Patterns to Avoid

- **Importing Liveblocks hooks in Server Components:** `useOthers`, `useStorage`, `useMyPresence` are client-only. Any file using them must have `'use client'`. Server components that need to branch on `workshopType` should read it from the database, not from Liveblocks.
- **Using `createRoomContext()`:** Removed in v2.0. Use global `interface Liveblocks` augmentation.
- **Mixing Liveblocks package versions:** `@liveblocks/client@3.14.0` with `@liveblocks/react@3.13.0` will cause runtime errors. All three packages must be exactly `3.14.0`.
- **Using `req.json()` in webhook handler:** Breaks HMAC verification. Use `req.text()` for raw body — identical to project's Stripe webhook pattern.
- **Placing `dynamic()` calls in Server Components:** In Next.js 15+, `dynamic()` with `ssr: false` must be in a `'use client'` file.
- **Hardcoding `workshopType = 'multiplayer'` check in RoomProvider:** Read from DB, not inferred from URL.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket connection management | Custom WS server | Liveblocks managed infra | Vercel has no persistent WS; managing reconnect, backpressure, and presence protocol is weeks of work |
| Webhook signature verification | Manual HMAC | `WebhookHandler.verifyRequest()` from `@liveblocks/node` | Handles timing attacks, replay attacks, malformed headers |
| Per-user undo/redo | Custom operation log | `room.history.undo()` / `room.history.redo()` from Liveblocks client | Per-client in memory, does not affect other users' state, handles pause/resume for drag |
| Presence conflict resolution | Custom CRDT | Liveblocks Presence (last-write-wins per field) | Sufficient for cursor positions; CRDT is overkill |
| Storage CRDT | Custom merge logic | `LiveMap`, `LiveList`, `LiveObject` | These are the Liveblocks CRDT primitives; hand-rolling breaks undo history |

**Key insight:** Liveblocks hosts all real-time infrastructure. The application only needs to: (1) issue tokens, (2) define types, (3) call hooks. Everything else — WebSocket connections, message ordering, presence sync, CRDT merging — is managed.

---

## Common Pitfalls

### Pitfall 1: Package Version Mismatch
**What goes wrong:** Runtime type errors or silent failures if `@liveblocks/client` and `@liveblocks/react` are on different minor versions.
**Why it happens:** npm may resolve compatible but different versions from separate installs.
**How to avoid:** Install all three packages in one command with explicit versions: `npm install @liveblocks/client@3.14.0 @liveblocks/react@3.14.0 @liveblocks/node@3.14.0`.
**Warning signs:** TypeScript errors on Liveblocks imports; `useStorage` returning `never`.

### Pitfall 2: Liveblocks Providers in Server Components
**What goes wrong:** `RoomProvider` or `LiveblocksProvider` crashes with "cannot use hooks in server component" or hydration mismatch.
**Why it happens:** These providers use React context and WebSocket connections — server-incompatible.
**How to avoid:** All files using `RoomProvider`, `LiveblocksProvider`, or any `use*` hook from `@liveblocks/react` must have `'use client'`. The `next/dynamic` wrapper prevents them from being included in server bundles.
**Warning signs:** Build error "You're importing a component that needs useState/useEffect" in a server component.

### Pitfall 3: Webhook Raw Body Requirement
**What goes wrong:** `WebhookHandler.verifyRequest()` throws "Invalid signature" even with correct secret.
**Why it happens:** `request.json()` re-serializes the body, changing byte sequence and breaking HMAC.
**How to avoid:** Use `request.text()` in the webhook handler. This is identical to the project's existing Stripe webhook pattern (`/api/webhooks/stripe/route.ts`).
**Warning signs:** 400 responses on valid webhook payloads; "Could not verify webhook call".

### Pitfall 4: Missing `LIVEBLOCKS_WEBHOOK_SECRET` in Production
**What goes wrong:** Webhook handler throws during `WebhookHandler` construction (null secret) or all webhook requests return 400.
**Why it happens:** Different secret from Liveblocks dashboard than `LIVEBLOCKS_SECRET_KEY`. The webhook signing secret starts with `whsec_`, not `sk_`.
**How to avoid:** Add both `LIVEBLOCKS_SECRET_KEY` (sk_...) and `LIVEBLOCKS_WEBHOOK_SECRET` (whsec_...) to Vercel environment variables. Verify in Liveblocks dashboard under Webhooks section.
**Warning signs:** Webhook events not appearing in Liveblocks dashboard as delivered; handler logs show construction error.

### Pitfall 5: `temporal` + `liveblocks()` Middleware Composition (Phase 55 Concern)
**What goes wrong:** zundo `temporal` middleware and `liveblocks()` middleware may conflict if composed in wrong order.
**Why it happens:** Both wrap the Zustand store; the outer middleware sees the inner's state shape including the injected `liveblocks` object.
**How to avoid:** This is flagged in STATE.md as a Phase 55 blocker. Phase 54 does NOT install `@liveblocks/zustand` — only the three core packages. The storage type definitions established in Phase 54 must be compatible, but the middleware composition question is deferred.
**Warning signs:** N/A for Phase 54.

### Pitfall 6: `workshopType` Column Breaking Existing Workshops
**What goes wrong:** Adding `workshopType NOT NULL DEFAULT 'solo'` may fail or require migration care if Neon rejects the alter.
**Why it happens:** Existing rows need a default value backfilled. Drizzle `generate` produces correct SQL with DEFAULT, but verify the migration SQL before running `db:migrate`.
**How to avoid:** Use `db:generate` to produce the SQL file, inspect it, then run `db:migrate`. The `DEFAULT 'solo'` ensures existing workshops are backfilled safely.
**Warning signs:** Migration fails with "column ... contains null values" — means the DEFAULT was not applied.

---

## Code Examples

Verified patterns from official sources:

### Liveblocks Client Config File (global type augmentation)
```typescript
// Source: https://liveblocks.io/docs/api-reference/liveblocks-client
// src/lib/liveblocks/config.ts
import { createClient } from "@liveblocks/client";
import type { LiveMap, LiveObject } from "@liveblocks/client";

export const liveblocksClient = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

export function getRoomId(workshopId: string): string {
  return `workshop-${workshopId}`;
}

declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number } | null;
      color: string;
      displayName: string;
    };
    Storage: {
      elements: LiveMap<string, LiveObject<{
        id: string;
        type: "stickyNote" | "group" | "card";
        position: { x: number; y: number };
        width: number;
        height: number;
        text?: string;
        color?: string;
        authorId: string;
      }>>;
    };
    UserMeta: {
      id: string;
      info: {
        name: string;
        color: string;
        isOwner: boolean;
      };
    };
  }
}
```

### Auth Endpoint (Clerk user path)
```typescript
// Source: https://liveblocks.io/docs/authentication/access-token/nextjs
//         https://clerk.com/blog/secure-liveblocks-rooms-clerk-nextjs
// src/app/api/liveblocks-auth/route.ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { Liveblocks } from "@liveblocks/node";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: Request) {
  const { userId } = await auth();

  if (userId) {
    const user = await currentUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const { room } = await request.json();

    const session = liveblocks.prepareSession(user.id, {
      userInfo: {
        name: user.fullName || "Facilitator",
        color: "#6366f1",
        isOwner: true,
      },
    });

    session.allow(room as string, session.FULL_ACCESS);
    const { body, status } = await session.authorize();
    return new Response(body, { status });
  }

  // Guest stub — Phase 57
  return new Response("Guest auth not yet implemented", { status: 401 });
}
```

### Webhook Handler (StorageUpdated)
```typescript
// Source: https://liveblocks.io/docs/guides/how-to-synchronize-your-liveblocks-storage-document-data-to-a-vercel-postgres-database
// src/app/api/webhooks/liveblocks/route.ts
import { WebhookHandler } from "@liveblocks/node";

const webhookHandler = new WebhookHandler(
  process.env.LIVEBLOCKS_WEBHOOK_SECRET!
);

export async function POST(request: Request) {
  const body = await request.text(); // Raw body — DO NOT use request.json()

  let event;
  try {
    event = webhookHandler.verifyRequest({
      headers: request.headers,
      rawBody: body,
    });
  } catch (err) {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "storageUpdated") {
    const { roomId } = event.data;
    // Phase 55 wires the actual Neon write — stub logging here
    console.log(`Liveblocks StorageUpdated: room=${roomId}`);
  }

  return new Response(null, { status: 200 });
}
```

### Multiplayer Component Lazy-Load Pattern
```typescript
// Source: https://nextjs.org/docs/app/guides/lazy-loading
// In a 'use client' file that conditionally renders multiplayer:
'use client';
import dynamic from 'next/dynamic';

const MultiplayerRoom = dynamic(
  () => import('@/components/workshop/multiplayer-room'),
  { ssr: false, loading: () => null }
);

// Usage: only renders MultiplayerRoom (and imports @liveblocks/react)
// when workshopType === 'multiplayer'
export function WorkshopContainer({ workshopType, workshopId }: Props) {
  if (workshopType === 'multiplayer') {
    return <MultiplayerRoom workshopId={workshopId} />;
  }
  return <SoloWorkshop workshopId={workshopId} />;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `createRoomContext<Presence, Storage>()` factory + local config exports | Global `declare global { interface Liveblocks {...} }` | v2.0 | Hooks imported from `@liveblocks/react` directly; no local config imports |
| Separate type parameter ordering required | Optional, unordered interface properties | v2.0 | Define only what you need (Presence only, Storage only, etc.) |
| v2 API only | v3 adds AI Copilot APIs (useAiChats, AiChat component) | v3.0 | AI Copilot features available but NOT used in this project |
| StorageUpdated webhook fires on every write | Throttled to 60 seconds | Always | Plan database writes accordingly; idempotent upserts required |

**Deprecated/outdated:**
- `createRoomContext()`: Removed in v2.0. Do not use.
- Individual type parameters on `createClient`: Replaced by global augmentation.

---

## Open Questions

1. **Exact `CanvasElement` type for Storage**
   - What we know: Phase 54 defines the Storage type; `StickyNote`, `DrawingNode`, `MindMapNodeState` types already exist in `src/stores/canvas-store.ts`
   - What's unclear: Whether Storage should use the existing types verbatim or a simplified subset (Liveblocks Storage types must be JSON-serializable — no methods, no Date objects)
   - Recommendation: Define a separate `CanvasElementStorable` type in `config.ts` that is a JSON-safe subset. Phase 55 maps between it and the richer Zustand types.

2. **`workshopType` enum granularity (Claude's discretion)**
   - What we know: User wants `solo` vs `multiplayer` minimally; STATE.md notes clone solo→multiplayer is deferred
   - What's unclear: Whether a `'template'` or `'cloned'` type is needed now
   - Recommendation: Use `'solo' | 'multiplayer'` only. Adding more values is a non-breaking schema change later.

3. **Hydration strategy on load (Claude's discretion)**
   - What we know: On multiplayer workshop load, both Neon (last saved) and Liveblocks (live room) may have canvas data
   - What's unclear: Which is authoritative when they differ
   - Recommendation: **Liveblocks-first**. If the room is active (connected users), Liveblocks has the latest state. Neon is the durability backup, loaded as `initialStorage` only when the room is empty/first-load. This is consistent with the webhook being a durable backup, not the primary.

4. **Bundle size impact**
   - What we know: `@liveblocks/client` + `@liveblocks/react` combined is significant JS; exact size for v3.14.0 not confirmed from tools
   - What's unclear: Exact kb impact on solo routes
   - Recommendation: The `next/dynamic` + `ssr: false` pattern ensures Liveblocks code is excluded from solo workshop routes entirely. Confirm with `@next/bundle-analyzer` after install.

---

## Sources

### Primary (HIGH confidence)
- [Liveblocks access token auth with Next.js](https://liveblocks.io/docs/authentication/access-token/nextjs) — auth route pattern
- [Liveblocks @liveblocks/node API Reference](https://liveblocks.io/docs/api-reference/liveblocks-node) — prepareSession, WebhookHandler
- [Liveblocks @liveblocks/client API Reference](https://liveblocks.io/docs/api-reference/liveblocks-client) — global type augmentation, LiveMap, LiveObject
- [Liveblocks StorageUpdated → Vercel Postgres sync guide](https://liveblocks.io/docs/guides/how-to-synchronize-your-liveblocks-storage-document-data-to-a-vercel-postgres-database) — webhook handler pattern
- [Liveblocks webhooks platform docs](https://liveblocks.io/docs/platform/webhooks) — StorageUpdated event structure, 60s throttle
- [Liveblocks v2.0 upgrade guide](https://liveblocks.io/docs/platform/upgrading/2.0) — createRoomContext removal, global augmentation
- [Liveblocks multiplayer undo/redo with Zustand](https://liveblocks.io/docs/guides/how-to-use-liveblocks-multiplayer-undo-redo-with-zustand) — History API, per-user undo behavior
- [Liveblocks Zustand API Reference](https://liveblocks.io/docs/api-reference/liveblocks-zustand) — middleware options
- [Next.js lazy loading guide](https://nextjs.org/docs/app/guides/lazy-loading) — dynamic() with ssr:false constraints in Next.js 15

### Secondary (MEDIUM confidence)
- [Clerk blog: secure Liveblocks rooms with Clerk](https://clerk.com/blog/secure-liveblocks-rooms-clerk-nextjs) — complete auth route with currentUser()
- [Liveblocks Next.js App Directory guide](https://liveblocks.io/docs/guides/how-to-use-liveblocks-with-nextjs-app-directory) — client component boundary requirements
- [Liveblocks collaborative whiteboard with Zustand](https://liveblocks.io/docs/guides/how-to-create-a-collaborative-online-whiteboard-with-react-zustand-and-liveblocks) — storageMapping, presenceMapping example

### Tertiary (LOW confidence)
- Liveblocks v3.14.0 release date (~2026-02-20): inferred from "last published 6 days ago" in npm search results — verify via npm before install

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — packages confirmed active at v3.14.0, docs verified via WebFetch
- Architecture: HIGH — auth pattern, webhook pattern, and type augmentation verified against official docs
- Pitfalls: HIGH — raw body requirement verified by existing Stripe pattern; version mismatch documented in official warnings; SSR constraints verified in Next.js docs
- Schema design: MEDIUM — columns are discretionary (Claude's discretion area); patterns follow existing project conventions

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable library; Liveblocks publishes frequently but core Presence/Storage/auth APIs are stable)
