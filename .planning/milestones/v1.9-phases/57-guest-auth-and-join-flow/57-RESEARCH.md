# Phase 57: Guest Auth and Join Flow - Research

**Researched:** 2026-02-27
**Domain:** Guest authentication (HttpOnly signed cookies), Liveblocks guest token issuance, /join/[token] Next.js page, reconnection UX
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Share Link & Copy UX**
- Share button lives in the workshop header/toolbar — always accessible, similar to Figma's share button
- One-click copy to clipboard — no modal, no popover, just copies and shows a toast confirmation
- URL format: `workshoppilot.ai/join/[token]` — clean, short, easy to share verbally
- No participant count badge on the share button — keep it a simple share icon

**Name Entry Modal**
- Collect display name only — single text field, minimum friction
- Modal shows workshop title + facilitator name before the input — builds trust without revealing content
- Full-screen overlay with centered card — blurred/dimmed background, no workshop content visible behind it
- Name validation: minimum 2 characters, max ~30, trim whitespace — no profanity filter (facilitator manages participants)

**Lobby Waiting Screen**
- Shows workshop title, "Waiting for the facilitator to start" message, and a live list of joined participants
- Auto-transition when facilitator starts — lobby fades out, canvas loads in, no action needed from participant
- WorkshopPilot branding only — no per-workshop customization for now
- Late joiners (workshop already started): brief lobby screen for 2-3 seconds ("Workshop in progress...") then auto-transition to canvas

**Reconnection Experience**
- Subtle toast notification on disconnect/reconnect — "Reconnecting..." then "Reconnected", non-blocking
- On extended failure (30+ seconds): show "Connection lost" message with a "Reconnect" button — name stays in sessionStorage
- Page refresh: auto-rejoin with stored name from sessionStorage — skip name modal, land back in lobby or canvas
- Silent to other participants — no reconnection indicators, Phase 56 presence bar handles join/leave naturally

### Claude's Discretion
- Share token generation strategy (entropy, format)
- Guest cookie implementation details (HttpOnly, signing, scope)
- Liveblocks auth integration for guest participants
- Exact transition animations and timing
- Toast notification styling and duration
- Error states for invalid/expired share links

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SESS-02 | Facilitator can generate a shareable link for the workshop | Share button in WorkshopHeader; `shareToken` already on `workshopSessions` table; `navigator.clipboard.writeText` + `sonner` toast pattern confirmed in codebase |
| SESS-03 | Participant can join a multiplayer workshop via share link with name only (no account needed) | `/join/[token]` Next.js page + `GuestJoinModal`; `/api/guest-join` creates `session_participants` record + sets HttpOnly cookie; Clerk middleware `isPublicRoute` extended to include `/join/(.*)` |
| SESS-04 | Participants see a lobby/waiting screen before the facilitator starts the session | `GuestLobby` component renders after cookie is set; polls or uses Liveblocks presence to detect session status transition from `waiting` → `active` |
| INFR-03 | Participants can reconnect after network interruption with state recovery | Liveblocks `useLostConnectionListener` for toast-based reconnection UX; `useStatus` for detecting `reconnecting` → `connected`; `sessionStorage` for name persistence across page refresh |
| INFR-04 | Guest authentication uses signed cookies (not Clerk accounts) | HttpOnly HMAC-signed cookie via `next/headers` `cookies()` in Route Handler; Node.js `crypto.createHmac('sha256', GUEST_COOKIE_SECRET)` — no new npm package required; read by `/api/liveblocks-auth` to issue guest Liveblocks tokens |
</phase_requirements>

---

## Summary

Phase 57 builds the guest participant entry flow end-to-end: share link generation, name entry, lobby waiting, reconnection recovery. The database schema is already fully in place from Phase 54 — `workshopSessions.shareToken` (UNIQUE NOT NULL), `sessionParticipants` (nullable `clerkUserId`, `liveblocksUserId`, `displayName`, `color`, `role`). The existing `workshop-actions.ts` already generates a 24-char `base64url` share token on multiplayer workshop creation.

The two primary technical challenges are (1) cookie signing without introducing a new npm package (Node.js `crypto.createHmac` + `next/headers` `cookies()` is sufficient and already available in the stack), and (2) Liveblocks auth integration for guests (`/api/liveblocks-auth` already has a `TODO (Phase 57)` comment at the exact extension point). Reconnection UX is fully covered by Liveblocks' `useLostConnectionListener` hook (already available via `@liveblocks/react` which is installed at v3.14.0) combined with `sonner` toast (already in the project).

The lobby waiting screen needs to detect when `workshopSessions.status` transitions from `waiting` to `active`. The cleanest approach is Liveblocks Presence: the facilitator's Liveblocks `userInfo.role === 'owner'` is already set, and the session status could be polled via a lightweight fetch on the `/join/[token]` page. Alternatively, a short-poll against a new `/api/session-status/[token]` endpoint (no auth required) avoids requiring the lobby to be inside the Liveblocks `RoomProvider`.

**Primary recommendation:** Use Node.js `crypto.createHmac` for cookie signing (zero new dependencies), `next/headers` cookies API for setting/reading HttpOnly cookies in Route Handlers, Liveblocks `useLostConnectionListener` for reconnection toasts, and `sessionStorage` for name persistence. The lobby should poll a public status endpoint every 3-5 seconds, not require Liveblocks auth before entering the room.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:crypto` | Built-in | HMAC-SHA256 cookie signing | Already used in codebase (`randomBytes` in workshop-actions.ts); zero new deps; edge-compatible |
| `next/headers` (cookies) | Next.js 16.1.6 | Set/read HttpOnly cookies in Route Handlers | Official Next.js API; async in v15+; confirmed in project (used in billing/clerk webhook routes) |
| `@liveblocks/react` | 3.14.0 | `useLostConnectionListener`, `useStatus` for reconnection UX | Already installed; hooks available at this version |
| `sonner` | 2.0.7 | Toast notifications for reconnection status | Already installed and used throughout (JoinLeaveListener, step errors, etc.) |
| `@paralleldrive/cuid2` | 3.3.0 | `createPrefixedId('spar')` for session participant ID | Already installed; used for all ID generation in schema |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `drizzle-orm` | 0.45.1 | DB lookups for token validation and participant creation | Already in use; query by `shareToken` on `workshopSessions` |
| `lucide-react` | 0.546.0 | `Share2`, `Copy`, `Check` icons for share button | Already installed; consistent with existing icon usage |
| `framer-motion` | 12.33.0 | Lobby fade-out → canvas transition animation | Already installed; used in existing transitions |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node.js `crypto.createHmac` | `iron-session` npm package | iron-session has a polished API but adds a dep; project already avoids new auth packages; crypto is sufficient for this use case |
| Node.js `crypto.createHmac` | `jose` (JWT) | jose gives expiry claims automatically but adds 40KB dep; HMAC with manual expiry timestamp embedded in cookie value is sufficient and simpler |
| Short-poll status endpoint | Liveblocks Presence for lobby status | Presence requires the guest to be in the Liveblocks room during lobby (pre-auth); polling avoids this chicken-and-egg problem |

**Installation:** No new packages required — all needed libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure

New files this phase creates:

```
src/
├── app/
│   ├── join/
│   │   └── [token]/
│   │       └── page.tsx              # RSC: validates token, renders GuestJoinModal or GuestLobby
│   └── api/
│       └── guest-join/
│           └── route.ts              # POST: validate token, insert session_participant, set cookie
├── components/
│   └── guest/
│       ├── guest-join-modal.tsx      # Name entry modal (full-screen overlay)
│       └── guest-lobby.tsx           # Lobby waiting screen with participant list
└── lib/
    └── auth/
        └── guest-cookie.ts           # signGuestCookie / verifyGuestCookie utilities
```

Modified files:

```
src/
├── proxy.ts                          # Add '/join/(.*)' and '/api/guest-join' to isPublicRoute
├── components/layout/
│   └── workshop-header.tsx           # Add ShareButton (visible only when workshopType==='multiplayer')
└── app/api/
    └── liveblocks-auth/route.ts      # Implement guest path (read cookie, lookup DB, issue token)
```

### Pattern 1: HttpOnly Signed Cookie for Guest Identity

**What:** When a guest submits their name, `/api/guest-join` inserts a `session_participants` row and sets an HttpOnly signed cookie. The cookie payload is `participantId:workshopId:iat` signed with HMAC-SHA256. Subsequent requests (to `/api/liveblocks-auth`) read and verify this cookie server-side.

**When to use:** Any route that needs to verify guest identity without Clerk. The guest never provides credentials again — the cookie persists for the session.

**Example:**

```typescript
// Source: Node.js crypto + Next.js cookies() API
// src/lib/auth/guest-cookie.ts

import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.GUEST_COOKIE_SECRET!; // min 32 chars, set in env
const COOKIE_NAME = 'wp_guest'; // scoped name

export type GuestCookiePayload = {
  participantId: string;  // spar_xxx
  workshopId: string;     // ws_xxx
  iat: number;            // issued-at epoch ms
};

export function signGuestCookie(payload: GuestCookiePayload): string {
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyGuestCookie(token: string): GuestCookiePayload | null {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expectedSig = createHmac('sha256', SECRET).update(encoded).digest('base64url');
  // Timing-safe comparison prevents timing attacks
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
  } catch {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
```

### Pattern 2: Setting HttpOnly Cookie in a Next.js Route Handler

**What:** Use `next/headers` `cookies()` async API to set the cookie in the POST route handler response.

**When to use:** `/api/guest-join` after validating token and creating `session_participants` record.

**Example:**

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/cookies
// src/app/api/guest-join/route.ts (abbreviated)

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { signGuestCookie, COOKIE_NAME } from '@/lib/auth/guest-cookie';

export async function POST(request: Request) {
  // ... validate token, insert session_participants ...
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, signGuestCookie({ participantId, workshopId, iat: Date.now() }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours — covers a full workshop session
  });
  return NextResponse.json({ ok: true, participantId, workshopId, displayName });
}
```

### Pattern 3: Reading the Cookie in /api/liveblocks-auth (Guest Path)

**What:** The existing `liveblocks-auth` route already has `TODO (Phase 57)` at the exact extension point. Read the HttpOnly cookie, verify it, look up the `session_participants` record, and issue a Liveblocks token with `role: 'participant'`.

**When to use:** When `auth()` returns no `userId` (unauthenticated Clerk), fall through to the guest cookie path.

**Example:**

```typescript
// Source: liveblocks-auth/route.ts TODO (Phase 57) — extend existing guest path
import { cookies } from 'next/headers';
import { verifyGuestCookie, COOKIE_NAME } from '@/lib/auth/guest-cookie';
import { db } from '@/db/client';
import { sessionParticipants } from '@/db/schema';
import { eq } from 'drizzle-orm';

// In the existing POST handler, replace the 401 stub:
if (!userId) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  const payload = raw ? verifyGuestCookie(raw) : null;

  if (!payload) {
    return new Response('Unauthorized', { status: 401 });
  }

  const [participant] = await db
    .select()
    .from(sessionParticipants)
    .where(eq(sessionParticipants.id, payload.participantId))
    .limit(1);

  if (!participant) {
    return new Response('Participant not found', { status: 401 });
  }

  // Parse room from request body (same as Clerk path)
  let room: string;
  try {
    const body = await request.json();
    room = body.room;
    if (!room) return new Response('Missing room', { status: 400 });
  } catch {
    return new Response('Invalid body', { status: 400 });
  }

  const liveblocks = getLiveblocksClient();
  const session = liveblocks.prepareSession(participant.liveblocksUserId, {
    userInfo: {
      name: participant.displayName,
      color: participant.color,
      role: 'participant',
    },
  });
  session.allow(room, session.FULL_ACCESS);
  const { body, status } = await session.authorize();
  return new Response(body, { status });
}
```

### Pattern 4: Liveblocks Reconnection UX

**What:** `useLostConnectionListener` fires callbacks on `lost` / `restored` / `failed` events. Use with `sonner` toast, which is already installed. `useStatus` is available for conditional rendering.

**When to use:** Inside the Liveblocks `RoomProvider` tree — render a `ReconnectionListener` renderless component alongside `JoinLeaveListener` in `multiplayer-room.tsx`.

**Example:**

```typescript
// Source: https://liveblocks.io/docs/api-reference/liveblocks-react
import { useLostConnectionListener, useStatus } from '@liveblocks/react';
import { toast } from 'sonner';
import { useRef } from 'react';

function ReconnectionListener() {
  const toastIdRef = useRef<string | number | null>(null);

  useLostConnectionListener((event) => {
    if (event === 'lost') {
      toastIdRef.current = toast('Reconnecting...', { duration: Infinity });
    } else if (event === 'restored') {
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
      toast('Reconnected', { duration: 3000 });
      toastIdRef.current = null;
    } else if (event === 'failed') {
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
      toast.error('Connection lost. Please refresh.', { duration: Infinity });
    }
  });

  return null;
}
```

`useStatus` values: `'initial' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'`

### Pattern 5: sessionStorage for Name Persistence

**What:** Store `{ name, workshopId }` in `sessionStorage` after successful name submission. On page load, check `sessionStorage` before showing the name modal.

**When to use:** `/join/[token]` page — client component reads `sessionStorage` on mount.

**Example:**

```typescript
// Client component on /join/[token] page
const STORAGE_KEY = 'wp_guest_name';

// Write after successful join:
sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ name: guestName, workshopId }));

// Read on mount to skip modal:
const stored = sessionStorage.getItem(STORAGE_KEY);
if (stored) {
  const { name, workshopId: storedId } = JSON.parse(stored);
  if (storedId === workshopId) {
    // Auto-rejoin with stored name — call /api/guest-join silently
  }
}
```

Note: The HttpOnly cookie is also re-sent on page refresh automatically (browser sends it on every request), so the cookie + sessionStorage work in tandem: sessionStorage skips the modal, the cookie authenticates the API calls.

### Pattern 6: Share Button in WorkshopHeader

**What:** The `WorkshopHeader` receives `workshopType` (currently NOT passed — needs to be added to the layout). The share button calls a new server action `getShareLink(workshopId)` or reads `shareToken` from the page's initial data.

**Constraint:** `WorkshopHeader` is a Client Component. The `shareToken` must be passed as a prop from the Server Component layout. The layout already queries `workshopSessions` would need to be extended to also fetch `shareToken`.

**Example:**

```typescript
// workshop-header.tsx — add shareToken prop
interface WorkshopHeaderProps {
  // ... existing props
  shareToken?: string | null;   // null for solo workshops
  workshopType?: 'solo' | 'multiplayer';
}

// Share button (only visible when workshopType === 'multiplayer' && shareToken)
function ShareButton({ shareToken }: { shareToken: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/join/${shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast('Link copied!', { duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-2">
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      <span className="hidden sm:inline">Share</span>
    </Button>
  );
}
```

The layout (`workshop/[sessionId]/layout.tsx`) needs to query `workshopSessions` for the `shareToken` and pass it down through `WorkshopHeader`.

### Pattern 7: /join/[token] Page Architecture

**What:** A Next.js RSC page that validates the token server-side and passes workshop metadata to a client component. The client component shows either the name modal (first visit) or the lobby (after joining).

**Structure:**

```
/join/[token]/page.tsx (RSC)
  → validates token in DB
  → fetches workshopTitle, facilitatorName, sessionStatus
  → renders <GuestJoinFlow token={token} workshopTitle={...} sessionStatus={...} />

GuestJoinFlow (Client Component)
  → useEffect: checks sessionStorage for existing name
  → if no stored name: shows <GuestJoinModal />
  → after name submitted: calls /api/guest-join, then shows <GuestLobby />
  → if stored name: silently calls /api/guest-join, shows <GuestLobby />
```

**Note:** The `/join/[token]` page is entirely outside the `MultiplayerRoom` / Liveblocks `RoomProvider`. The lobby participant list updates via polling or a separate Liveblocks presence endpoint, NOT via the main canvas room. The simplest approach: poll a public `/api/session-status/[token]` endpoint every 3-4 seconds to get `sessionStatus` and `participantCount`.

### Anti-Patterns to Avoid

- **Putting the lobby inside RoomProvider before cookie is set:** The Liveblocks auth endpoint returns 401 if no guest cookie exists. The `/join/[token]` page must NOT render `<MultiplayerRoom>` until after the guest cookie is set by `/api/guest-join`.
- **Storing guest identity in localStorage:** The decision is `sessionStorage` — tab-scoped, cleared on browser close. Using localStorage would persist identity across browser sessions (undesirable for shared devices).
- **Exposing the `GUEST_COOKIE_SECRET` env var on client:** The signing key must only live in server-side env vars. The cookie utility must be `server-only` or used exclusively in Route Handlers / RSC.
- **Signing with a per-request random key:** The signing key must be stable (env var) so that cookies survive Vercel serverless function cold starts on subsequent requests.
- **Using `jwt.sign()` from the `jsonwebtoken` package:** This package is NOT in the project and is not Edge-compatible. Use Node.js `crypto.createHmac` which is available in Next.js Route Handlers (Node.js runtime, not Edge).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast on reconnect | Custom connection polling | `useLostConnectionListener` from `@liveblocks/react` | Liveblocks handles exponential backoff, timeout detection, and all reconnection logic internally |
| Cookie parsing | Manual `document.cookie` string parsing | `next/headers` `cookies()` API | Already available, async, type-safe, SSR-compatible |
| Participant color assignment | Complex color rotation logic | Count existing `sessionParticipants` rows for this `sessionId`, then `PARTICIPANT_COLORS[count % PARTICIPANT_COLORS.length]` | Simple, deterministic, already documented in config.ts |
| Token entropy | Rolling your own PRNG | `randomBytes` from Node.js `crypto` (already used in workshop-actions.ts for share token generation) | Already in the codebase, cryptographically secure |

**Key insight:** The project already contains the `shareToken` (generated in `workshop-actions.ts`), the `session_participants` schema (Phase 54), and the Liveblocks auth endpoint stub (Phase 54). This phase is primarily wiring them together, not building from scratch.

---

## Common Pitfalls

### Pitfall 1: Liveblocks Auth 401 Loop

**What goes wrong:** Guest opens `/join/[token]`, enters name, cookie is set, browser navigates to the main workshop canvas. The `RoomProvider` calls `/api/liveblocks-auth`. If the cookie is not being sent (wrong `sameSite`, wrong `path`, or missing from the same origin), auth returns 401, Liveblocks retries, and the guest is stuck in a reconnect loop with no error message.

**Why it happens:** `sameSite: 'strict'` would block the cookie on any navigation from an external origin (including the facilitator sharing the link from a different tab). `sameSite: 'lax'` allows the cookie on same-site navigation initiated by the user (link clicks), which is the right choice here.

**How to avoid:** Set `sameSite: 'lax'`, `path: '/'` (not scoped to `/join/`), and verify the cookie is present in Chrome DevTools → Application → Cookies before testing the Liveblocks connection.

**Warning signs:** Browser console shows repeated 401s on `/api/liveblocks-auth` after completing name entry.

### Pitfall 2: /join/[token] Route Not Public in Clerk Middleware

**What goes wrong:** Clerk middleware intercepts `/join/[token]` and `/api/guest-join`, sees no Clerk session, and redirects to sign-in. Guests never see the join page.

**Why it happens:** The current `isPublicRoute` matcher in `proxy.ts` does not include `/join/(.*)` or `/api/guest-join`.

**How to avoid:** Add these to `isPublicRoute` in `proxy.ts`:
```typescript
const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/join(.*)',           // Guest join page
  '/api/guest-join',    // Guest join API
  '/api/session-status(.*)', // Public lobby status polling
  '/api/webhooks(.*)',
  '/api/health',
  '/workshop/:path*/step/1',
  // ...
]);
```

**Warning signs:** Incognito browser visiting `/join/[token]` redirects to `/sign-in` instead of showing the name entry modal.

### Pitfall 3: Workshop Layout Requires Clerk Auth for Guest Canvas View

**What goes wrong:** After joining, guests are redirected to `/workshop/[sessionId]/step/[stepId]`. This page is inside the `WorkshopLayout` which calls `currentUser()` (Clerk). It may redirect guests.

**Why it happens:** The workshop step page currently calls `currentUser()` and `auth()` but doesn't redirect unauthenticated users (the layout does not protect at the layout level — it relies on Clerk middleware). However, if the step page's sequential enforcement or paywall code throws on `null` userId, guests break.

**How to avoid:** Review `step/[stepId]/page.tsx` — it calls `currentUser()` for admin check but doesn't throw on null. The layout does NOT call `auth().protect()`. The Clerk middleware `isProtectedRoute` matcher for workshop steps 4-10 would block guests on those steps. For a multiplayer workshop, the guest needs to access the workshop step page without Clerk. Either add `/workshop/:path*/step/:stepId(*)` to `isPublicRoute` for multiplayer workshops, OR (simpler) redirect the guest from `/join/[token]` directly to the lobby UI on the same page without navigating to the workshop canvas route.

**Recommendation:** Keep guests on `/join/[token]` until the facilitator starts. Only then redirect to `/workshop/[sessionId]/step/[stepId]`. The middleware `isProtectedRoute` currently lists steps 4-10 as protected — this needs updating for multiplayer guest paths.

**Warning signs:** Guest sees a sign-in redirect after the facilitator starts the session.

### Pitfall 4: sessionStorage Not Available Server-Side

**What goes wrong:** Reading `sessionStorage` in a Next.js component causes a server-side error: `ReferenceError: sessionStorage is not defined`.

**Why it happens:** `sessionStorage` is a browser API, unavailable in RSC or during SSR.

**How to avoid:** Only access `sessionStorage` inside `useEffect` or in `'use client'` components with a `typeof window !== 'undefined'` guard. The `/join/[token]` page client component must wrap `sessionStorage` access in `useEffect`.

**Warning signs:** Next.js hydration error or build error referencing `sessionStorage`.

### Pitfall 5: Cookie Not Accessible to /api/liveblocks-auth After Redirect

**What goes wrong:** After `/api/guest-join` sets the cookie, the browser may not include it in the immediate next request to `/api/liveblocks-auth` if the response hasn't fully resolved.

**Why it happens:** The `Next.js Route Handler` sets the cookie via `Set-Cookie` response header. The cookie is available in all subsequent requests from the browser in the same session.

**How to avoid:** The `/api/guest-join` response should return the participant data (`participantId`, `workshopId`, `displayName`) in the JSON body so the client can update state immediately, without waiting to verify the cookie. The client then navigates/renders the lobby. Only when Liveblocks requests an auth token (on `RoomProvider` mount) does the cookie need to be present — by then, the `Set-Cookie` response has been processed.

---

## Code Examples

Verified patterns from official sources and the existing codebase:

### Share Button with Clipboard Copy

```typescript
// Pattern confirmed in: prd-viewer-dialog.tsx and deliverable-detail-view.tsx
// Source: Codebase analysis

const handleShareCopy = async () => {
  const url = `${window.location.origin}/join/${shareToken}`;
  await navigator.clipboard.writeText(url);
  toast('Link copied!', { duration: 2000 });
};
```

### Guest Cookie Signing (HMAC-SHA256)

```typescript
// Source: Node.js crypto docs + existing codebase pattern (randomBytes already used)
import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.GUEST_COOKIE_SECRET!;

export function signGuestCookie(payload: GuestCookiePayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyGuestCookie(token: string): GuestCookiePayload | null {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', SECRET).update(encoded).digest('base64url');
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return JSON.parse(Buffer.from(encoded, 'base64url').toString());
  } catch { return null; }
}
```

### Set HttpOnly Cookie in Next.js Route Handler

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/cookies (v16.1.6 docs)
import { cookies } from 'next/headers';

const cookieStore = await cookies();
cookieStore.set('wp_guest', signedToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 8, // 8 hours
});
```

### Read Cookie in Server-Side Route Handler

```typescript
// Source: next/headers cookies() API
import { cookies } from 'next/headers';

const cookieStore = await cookies();
const raw = cookieStore.get('wp_guest')?.value;
const payload = raw ? verifyGuestCookie(raw) : null;
if (!payload) return new Response('Unauthorized', { status: 401 });
```

### Liveblocks Reconnection Listener

```typescript
// Source: https://liveblocks.io/docs/api-reference/liveblocks-react
import { useLostConnectionListener } from '@liveblocks/react';
import { toast } from 'sonner';
import { useRef } from 'react';

function ReconnectionListener() {
  const toastIdRef = useRef<string | number | null>(null);

  useLostConnectionListener((event) => {
    if (event === 'lost') {
      toastIdRef.current = toast('Reconnecting...', { duration: Infinity });
    } else if (event === 'restored') {
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
      toast('Reconnected', { duration: 3000 });
      toastIdRef.current = null;
    } else if (event === 'failed') {
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
      toast.error('Connection lost. Refresh to rejoin.', { duration: Infinity });
    }
  });

  return null;
}
```

### Participant Color Assignment

```typescript
// Source: config.ts comment + session_participants schema
// Count existing active participants to assign next color slot
import { PARTICIPANT_COLORS } from '@/lib/liveblocks/config';

const existingCount = await db
  .select({ count: sql<number>`count(*)` })
  .from(sessionParticipants)
  .where(eq(sessionParticipants.sessionId, workshopSession.id));

const count = Number(existingCount[0].count);
// Owner (index 0 = indigo) is already slot 0, guests start at slot 1
const color = PARTICIPANT_COLORS[(count + 1) % PARTICIPANT_COLORS.length];
// Or simpler: owner is always index 0, guests cycle from 1 onward
```

### Token Validation in /api/guest-join

```typescript
// Source: Drizzle ORM patterns (existing codebase)
import { db } from '@/db/client';
import { workshopSessions, sessionParticipants } from '@/db/schema';
import { eq } from 'drizzle-orm';

const [workshopSession] = await db
  .select()
  .from(workshopSessions)
  .where(eq(workshopSessions.shareToken, shareToken))
  .limit(1);

if (!workshopSession) {
  return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
}

// Generate Liveblocks userId for guest
const liveblocksUserId = createPrefixedId('guest');

const [participant] = await db
  .insert(sessionParticipants)
  .values({
    sessionId: workshopSession.id,
    clerkUserId: null,        // guests have no Clerk account
    liveblocksUserId,
    displayName: guestName.trim(),
    color,
    role: 'participant',
    status: 'active',
  })
  .returning();
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `cookies()` was synchronous | `cookies()` is now async (`await cookies()`) | Next.js v15.0.0-RC | Must use `await` — already enforced in project (billing, webhook routes use `await headers()`) |
| Global `createRoomContext()` for Liveblocks hooks | Global interface augmentation (`declare global { interface Liveblocks { ... } }`) | Liveblocks v2+ | Already implemented in project (Phase 54 decision) — hooks import from `@liveblocks/react` directly |
| `lostConnectionTimeout` not configurable | `lostConnectionTimeout` configurable in `createClient()` | Liveblocks v1.1+ | Can pass `lostConnectionTimeout: 30_000` to `createClient` to extend the timeout to 30s per the UX decision ("On extended failure 30+ seconds") |

**Deprecated/outdated:**
- `authEndpoint` as a function (old Liveblocks pattern): Replaced by a URL string pointing to `/api/liveblocks-auth`. Already using the URL string approach in `config.ts`.

---

## Open Questions

1. **How should the lobby detect `session.status === 'active'`?**
   - What we know: `workshopSessions.status` transitions from `waiting` → `active` when the facilitator starts
   - What's unclear: Phase 58 (Facilitator Controls) covers the "start session" action. In Phase 57 we need the lobby to detect this transition WITHOUT Phase 58 existing yet
   - Recommendation: Implement a simple short-poll endpoint `/api/session-status/[token]` (public, no auth) that returns `{ status, participantCount, workshopTitle }`. The `GuestLobby` polls every 3-4 seconds. When `status` transitions to `active`, the lobby triggers the fade-out and redirects to the workshop canvas. This endpoint is backward-compatible with Phase 58 which will set `status = 'active'` in the DB.

2. **Where does the guest land after the facilitator starts? Which URL?**
   - What we know: The workshop canvas is at `/workshop/[sessionId]/step/[stepId]`. Guests need the `sessionId` (from the `sessions` table, not `workshopSessions`).
   - What's unclear: The `/join/[token]` RSC page must also fetch the `sessions` record (or the step page must be accessible without Clerk auth for multiplayer workshops).
   - Recommendation: In the `/join/[token]` RSC page, join `workshopSessions → workshops → sessions` to get the current session ID and current step order. Return these in the page props. The lobby redirect can then go to the correct `/workshop/[sessionId]/step/[stepId]` URL.

3. **Does the workshop step page block guest access via Clerk middleware?**
   - What we know: `isProtectedRoute` in `proxy.ts` includes steps 4-10. Guests have no Clerk session. The multiplayer canvas needs to be accessible.
   - What's unclear: Whether guests should go to the workshop step URL at all, or stay on `/join/[token]` and have the canvas render inline.
   - Recommendation: Keep guests on `/join/[token]` for the lobby. When the facilitator starts, the guest still goes to the same workshop canvas URL. Update `proxy.ts` to NOT protect workshop step pages when the request has a valid `wp_guest` cookie (or simply add the entire `/workshop(.*)` path to public routes — the workshop page itself already handles unauthenticated users gracefully via the `user = null` admin check path). Simpler: add `/workshop/:path*/step/:stepId(*)` to `isPublicRoute` for all workshops — the paywall logic in the step page already handles non-Clerk users by skipping paywall checks when `userId` is null.

4. **Cookie scope: should `wp_guest` be scoped to a specific workshop?**
   - What we know: A participant could theoretically join multiple workshops in different tabs.
   - What's unclear: Whether a single cookie value or a per-workshop cookie name (e.g., `wp_guest_${workshopId}`) is better.
   - Recommendation: Use a single `wp_guest` cookie name with the `workshopId` embedded in the payload. The verification in `/api/liveblocks-auth` validates that the cookie's `workshopId` matches the requested room's workshop ID. If a participant has a `wp_guest` cookie for a different workshop, they get a 403, not a 401. This is the correct behavior.

---

## Sources

### Primary (HIGH confidence)
- `src/db/schema/workshop-sessions.ts` — confirmed `shareToken UNIQUE NOT NULL` exists
- `src/db/schema/session-participants.ts` — confirmed schema: nullable `clerkUserId`, `liveblocksUserId`, `displayName`, `color`, `role`, `status`
- `src/app/api/liveblocks-auth/route.ts` — confirmed `TODO (Phase 57)` comment at exact extension point
- `src/proxy.ts` — confirmed `isPublicRoute` matcher using `createRouteMatcher`
- `src/actions/workshop-actions.ts` — confirmed `randomBytes(18).toString('base64url')` for share token; `createPrefixedId` usage
- `src/lib/liveblocks/config.ts` — confirmed `PARTICIPANT_COLORS` array (6 colors), `authEndpoint: '/api/liveblocks-auth'`, `throttle: 50`
- `src/components/layout/workshop-header.tsx` — confirmed header is a Client Component with props pattern; gap-2 button layout
- [https://nextjs.org/docs/app/api-reference/functions/cookies](https://nextjs.org/docs/app/api-reference/functions/cookies) — confirmed async `cookies()` API, `set(name, value, options)` with `httpOnly`, `secure`, `sameSite`, `maxAge`

### Secondary (MEDIUM confidence)
- [https://liveblocks.io/docs/api-reference/liveblocks-react](https://liveblocks.io/docs/api-reference/liveblocks-react) — `useLostConnectionListener`, `useStatus` hooks and event values verified via WebFetch
- [https://liveblocks.io/blog/whats-new-in-v1-1](https://liveblocks.io/blog/whats-new-in-v1-1) — `lostConnectionTimeout` configuration, event types (`lost`/`restored`/`failed`)
- [https://liveblocks.io/docs/authentication/access-token/nextjs](https://liveblocks.io/docs/authentication/access-token/nextjs) — `prepareSession` + `FULL_ACCESS` guest token issuance pattern

### Tertiary (LOW confidence — training data, not verified via live docs)
- Node.js `timingSafeEqual` for cookie signature comparison — standard security practice, verified exists in Node.js 20 `crypto` module

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and confirmed in package.json
- Architecture: HIGH — database schema confirmed complete; extension points confirmed in existing code with TODO comments
- Pitfalls: HIGH for Clerk middleware and cookie sameSite issues (common Next.js gotchas); MEDIUM for lobby status detection (Phase 58 dependency not yet built)

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable stack; Next.js cookies API and Liveblocks hooks are stable)
