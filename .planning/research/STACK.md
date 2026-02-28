# Stack Research

**Domain:** Dot voting on Crazy 8s sketches (real-time + solo) + mobile phone gate
**Researched:** 2026-02-28
**Confidence:** HIGH

> This is a focused addendum for v2.0. The full stack (Next.js 16.1.1, React 19, Tailwind 4,
> shadcn/ui, Clerk, Neon/Drizzle, Gemini, Stripe, ReactFlow, Zustand, Liveblocks v3.14.0, Vercel)
> is validated in production and NOT re-researched here. Scope covers only what is new or modified
> for v2.0: dot voting state sync and mobile viewport gate.

---

## Summary

**No new packages required.** Both features are fully implementable with the existing stack.

- **Dot voting (multiplayer):** Liveblocks Storage (`LiveMap` + `LiveObject`) — already in the codebase, already used for canvas elements. Add two new Storage keys (`votes`, `votingSession`) to the existing type augmentation and `initialStorage`.
- **Dot voting (solo):** The `stepArtifacts` JSONB column already stores all Step 8 data. Vote state persists there.
- **Mobile gate:** The `useIsMobile()` hook already exists at `src/hooks/use-mobile.ts` with the correct 768px breakpoint. Build one new overlay component consuming it.
- **Voting timer:** The existing `FacilitatorControls` timer infrastructure (broadcast events, `TIMER_UPDATE`) reuses without changes. Wire voting close to timer expiry as an optional behavior.

Zero changes to `package.json`.

---

## What Already Exists (Do NOT Re-add)

| Capability | Already Provided By | Location |
|------------|--------------------|----|
| Real-time CRDT sync | `@liveblocks/react` v3.14.0 | `src/lib/liveblocks/config.ts` |
| Storage mutation API | `useMutation`, `useStorage` | via `@liveblocks/react` |
| `LiveMap` / `LiveObject` | `@liveblocks/client` v3.14.0 | imported in `src/components/workshop/multiplayer-room.tsx` |
| Broadcast events | `useBroadcastEvent` / `useEventListener` | `facilitator-controls.tsx`, `countdown-timer.tsx` |
| Countdown timer (facilitator broadcast) | `FacilitatorControls` + `CountdownTimer` | `src/components/workshop/` |
| `RoomEvent` type union | Global `Liveblocks` augmentation | `src/lib/liveblocks/config.ts` |
| Mobile breakpoint hook | `useIsMobile()` (768px matchMedia, SSR-safe) | `src/hooks/use-mobile.ts` |
| Solo state persistence | `stepArtifacts` JSONB via Drizzle | `src/db/schema/step-artifacts.ts` |
| Crazy 8s slot types | `Crazy8sSlot` | `src/lib/canvas/crazy-8s-types.ts` |
| Facilitator role detection | `isFacilitator` from `useMultiplayerContext()` | `src/components/workshop/multiplayer-room.tsx` |
| Debounced save | `use-debounce` | `package.json` dependency |
| Toast notifications | `sonner` | `package.json` dependency |
| Icons | `lucide-react` | `package.json` dependency |

---

## Feature: Dot Voting

### Vote State Architecture

#### Multiplayer Mode — Liveblocks Storage

Vote data lives in Liveblocks Storage, not Postgres. All participants see vote counts update live as votes are cast. Liveblocks CRDT handles conflicts automatically. No polling, no API round-trips per vote.

**Storage shape** — add to the existing `Liveblocks` global type in `src/lib/liveblocks/config.ts`:

```typescript
// Extend existing Storage type in the global Liveblocks augmentation:
Storage: {
  elements: LiveMap<string, LiveObject<CanvasElementStorable>>; // existing — unchanged
  votes: LiveMap<string, LiveObject<VoteRecord>>;               // NEW for v2.0
  votingSession: LiveObject<VotingSessionState>;                // NEW for v2.0
};
```

New supporting types (add to `src/lib/liveblocks/config.ts`):

```typescript
// Key format: `${userId}:${slotId}` — composite key enables:
//   - Per-user total vote enforcement (sum all records where userId matches)
//   - Per-user vote retrieval (show which slots this user voted on)
//   - Undo votes (set count to 0 or delete the record)
export type VoteRecord = {
  userId: string;
  slotId: string;
  count: number; // votes this user placed on this slot (multi-vote support)
};

export type VotingSessionState = {
  isOpen: boolean;
  maxVotesPerUser: number;  // configurable by facilitator, default 3
  openedAt: number | null;  // epoch ms — null when not open
};
```

**Mutation pattern** (uses existing `useMutation` from `@liveblocks/react`, matches patterns already in codebase):

```typescript
const castVote = useMutation(({ storage }, userId: string, slotId: string) => {
  const session = storage.get('votingSession');
  if (!session.get('isOpen')) return; // Guard: voting must be open

  const maxVotes = session.get('maxVotesPerUser');
  const votes = storage.get('votes');

  // Count total votes cast by this user across all slots
  let userTotal = 0;
  votes.forEach((record) => {
    if (record.get('userId') === userId) userTotal += record.get('count');
  });
  if (userTotal >= maxVotes) return; // Exceeds allocation

  const voteKey = `${userId}:${slotId}`;
  const existing = votes.get(voteKey);
  if (existing) {
    existing.set('count', existing.get('count') + 1);
  } else {
    votes.set(voteKey, new LiveObject({ userId, slotId, count: 1 }));
  }
}, []);
```

**Read pattern** (for displaying vote totals per slot in the Crazy 8s grid):

```typescript
const votes = useStorage((root) => root.votes);

const slotVoteTotals = useMemo(() => {
  const totals: Record<string, number> = {};
  if (!votes) return totals;
  votes.forEach((record, key) => {
    const slotId = key.split(':')[1];
    totals[slotId] = (totals[slotId] ?? 0) + record.count;
  });
  return totals;
}, [votes]);

// Current user's votes per slot (for highlighting their own votes):
const myVotesPerSlot = useMemo(() => {
  const mine: Record<string, number> = {};
  if (!votes || !userId) return mine;
  votes.forEach((record, key) => {
    if (key.startsWith(`${userId}:`)) {
      mine[record.slotId] = record.count;
    }
  });
  return mine;
}, [votes, userId]);
```

**`initialStorage` update** — modify `RoomProvider` in `src/components/workshop/multiplayer-room.tsx`:

```typescript
initialStorage={{
  elements: new LiveMap<string, LiveObject<CanvasElementStorable>>(),          // existing
  votes: new LiveMap<string, LiveObject<VoteRecord>>(),                         // NEW
  votingSession: new LiveObject<VotingSessionState>({                           // NEW
    isOpen: false,
    maxVotesPerUser: 3,
    openedAt: null,
  }),
}}
```

`initialStorage` is only applied on first room creation. Adding new keys is safely additive — existing rooms with `elements` already stored are unaffected.

#### Solo Mode — stepArtifacts JSONB

Solo workshops have no Liveblocks room. Vote state persists in the `artifact` JSONB column of the step's `stepArtifacts` row alongside existing Step 8 data (Crazy 8s slots, mind map nodes).

Shape to add to the Step 8 artifact schema in `src/lib/schemas/step-schemas.ts`:

```typescript
// Add to existing ideation artifact shape:
votes: z.record(z.string(), z.number()).optional(), // { [slotId]: totalVoteCount }
votingOpen: z.boolean().optional(),                 // local facilitator state
maxVotesPerUser: z.number().optional(),             // configurable, default 3
```

In solo mode, `isFacilitator` is always `true` (the user is both facilitator and participant). Vote state is React state debounced-saved to the artifact on change — same pattern as all other Step 8 state saves.

### Broadcast Events for Voting Lifecycle

Extend the `RoomEvent` union in `src/lib/liveblocks/config.ts` — additive, no existing events changed:

```typescript
RoomEvent:
  | { type: 'STEP_CHANGED'; stepOrder: number; stepName: string }                                    // existing
  | { type: 'VIEWPORT_SYNC'; x: number; y: number; zoom: number }                                   // existing
  | { type: 'TIMER_UPDATE'; state: 'running' | 'paused' | 'expired' | 'cancelled'; remainingMs: number; totalMs: number } // existing
  | { type: 'SESSION_ENDED' }                                                                        // existing
  | { type: 'VOTING_OPENED'; maxVotesPerUser: number }                                               // NEW
  | { type: 'VOTING_CLOSED' };                                                                       // NEW
```

These broadcast events are **ephemeral UI signals** only — trigger toasts and immediate UI transitions. The **authoritative** voting state lives in Storage (`votingSession.isOpen`). If a participant joins mid-voting, they read `useStorage` to get current state; they do not need to have received the broadcast event.

### Facilitator Controls Integration

Voting controls belong in `FacilitatorControls` — the established location for all facilitator-only controls (timer, viewport sync, end session). Add a "Voting" section gated to the Step 8 Crazy 8s sub-step.

**Controls to expose:**
- `maxVotesPerUser` input (range 1–10, default 3) — configurable before opening
- Open / Close toggle button — updates `votingSession.isOpen` in Storage + broadcasts event
- Optional: wire to existing timer — auto-close voting when timer expires

**Participant UX:**
- `CountdownTimer` component (already exists) handles timer broadcast display for participants
- A `VotingStatusBanner` or similar renderless listener handles `VOTING_OPENED` / `VOTING_CLOSED` events for participants — same pattern as `StepChangedListener` and `SessionEndedListener` in `multiplayer-room.tsx`

### Result Selection

After voting closes, the facilitator sees ranked results (slots sorted by total vote count) and manually selects which ideas advance to Step 9. This selection writes to the `stepArtifacts` JSONB (existing save mechanism) and flows to Step 9 concept card generation (existing Gemini context pipeline).

---

## Feature: Mobile Phone Gate

### What Already Exists

`src/hooks/use-mobile.ts` — `useIsMobile()` hook already present with exactly the right implementation:

```typescript
// Already implemented — no changes needed:
const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
```

**SSR behavior:** Returns `false` on server render (`!!undefined === false`). The gate is an additive client-only overlay — shows after hydration on mobile, never on server. No hydration mismatch possible.

### Gate Design

A single `MobileGate` component — full-screen overlay when `useIsMobile()` is `true` and the gate has not been dismissed.

**Requirements:**
- Dismissible — user taps "Continue anyway" and gate disappears
- Persistent dismissal — `localStorage` key survives page navigation within the session
- Scope — workshop routes only (not landing page, pricing, dashboard)

**localStorage key:** `workshoppilot:mobile-gate-dismissed`

**Why `localStorage` not DB:** Dismissal is cosmetic and per-device. No cross-device sync needed (contrast: the welcome modal uses DB-backed dismissal because it must not re-appear on any device). `localStorage` is the correct tool here.

**Placement:** `src/app/workshop/[sessionId]/layout.tsx` — wraps all workshop content. Landing page and dashboard remain accessible on mobile without the gate.

```typescript
// src/app/workshop/[sessionId]/layout.tsx
import { MobileGate } from '@/components/mobile-gate';

export default function WorkshopLayout({ children }) {
  return (
    <>
      <MobileGate />  {/* renders null on desktop, overlay on mobile */}
      {children}
    </>
  );
}
```

**Animation:** Use CSS opacity + transform transition consistent with the existing pattern (no framer-motion — project explicitly uses CSS for transitions per v1.6 decisions).

---

## Recommended Stack Changes

### Core Technologies — No Changes

| Technology | Current Version | Status |
|------------|-----------------|--------|
| `@liveblocks/react` | 3.14.0 | No version change — add new Storage keys only |
| `@liveblocks/client` | 3.14.0 | No version change — `LiveMap`/`LiveObject` already imported |
| Drizzle ORM | existing | No change — JSONB artifact column already handles solo vote storage |
| `useIsMobile` hook | — | Already exists in project |

### Supporting Libraries — No New Installs

| Library | Status | Role in v2.0 |
|---------|--------|--------------|
| `use-debounce` | Existing | Debounced artifact save for solo vote state |
| `sonner` | Existing | Voting opened/closed toasts for participants |
| `lucide-react` | Existing | Vote dot icons (`Circle`, `Dot`, or `Vote`) |
| `shadcn/ui Dialog` | Existing | Mobile gate overlay (or `div` with portal — no Dialog dependency required) |

### Development Tools — No Changes

No new dev dependencies. Extend existing Playwright E2E tests for voting behavior.

---

## Installation

```bash
# No new packages.
# Zero changes to package.json.
```

---

## Alternatives Considered

| Approach | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Multiplayer vote storage | Liveblocks Storage (`LiveMap`) | Postgres `dot_votes` table | DB requires API round-trip per vote click. At 10 participants each casting 3 votes that is 30 separate API calls with perceptible latency. Liveblocks CRDT propagates each vote to all participants in <50ms with no server involvement. |
| Solo vote storage | `stepArtifacts` JSONB (existing) | Separate `dot_votes` DB table | Solo votes are step-scoped. JSONB in the existing artifact row avoids a schema migration and aligns with how all other Step 8 data (slots, mind map) is already stored. |
| Mobile detection | `useIsMobile()` (matchMedia, existing) | CSS-only `@media` | CSS can hide content but cannot produce a dismissible gate with persistent localStorage state. Need JavaScript. Hook already exists — no new code required. |
| Gate persistence | `localStorage` | DB-backed (like welcome modal) | Gate dismissal is cosmetic and per-device. Welcome modal uses DB because it must not re-appear on any device after dismissal. Gate is less critical — `localStorage` is simpler and correct. |
| Vote composite key | `${userId}:${slotId}` LiveMap key | Separate LiveMap per user or per slot | Composite key enables: (a) total vote count per slot by iterating, (b) per-user total for enforcement, (c) per-user per-slot undo by setting `count: 0`. Single flat LiveMap is simpler than nested structures. |
| Voting state authority | Liveblocks Storage (`votingSession.isOpen`) | Broadcast event only | Broadcast events are ephemeral — participants who join after voting opens would not receive them. Storage is durable and readable on join. Events are additive UI signals, not the source of truth. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Postgres table for multiplayer votes | Per-vote API latency, polling complexity, no CRDT merge semantics | Liveblocks Storage `LiveMap` |
| `usePresence` for vote state | Presence is ephemeral — clears on disconnect/reconnect | Liveblocks Storage (durable, survives reconnects) |
| New `window.resize` listener for mobile gate | Less efficient than `matchMedia`, causes layout thrash | `useIsMobile()` hook — already uses `matchMedia`, already in codebase |
| `framer-motion` for gate animation | Project explicitly avoids framer-motion; CSS transitions are the established pattern | CSS `opacity` + `transform` with `transition` (same as step transitions in v1.6) |
| Separate Liveblocks room for voting | Voting must be in same room as canvas so facilitator controls both simultaneously | Same room, new Storage keys |
| `sessionStorage` for gate dismissal | Clears on tab close; user gets gate again on every browser session | `localStorage` for persistent dismissal |

---

## Stack Patterns by Variant

**If voting is open (facilitator toggled) in multiplayer:**
- Crazy 8s grid shows vote count badge on each slot
- Each participant sees a dot-vote button per slot (disabled after max votes reached)
- Vote counts update live via `useStorage` selector
- Facilitator sees real-time totals; can close voting at any time or when timer expires

**If voting is closed (multiplayer):**
- Grid shows final vote totals in read-only mode
- Facilitator sees ranked results overlay
- Facilitator selects ideas to advance to Step 9 — writes selection to `stepArtifacts`

**If solo mode (no Liveblocks room):**
- Same UI renders (same Crazy 8s grid component)
- Vote state is React local state debounced-saved to artifact JSONB
- `isFacilitator` is always `true` in solo mode — user sees open/close controls
- No real-time sync needed — single user, no network overhead

**If mobile and not dismissed:**
- `MobileGate` overlay renders on top of all workshop content
- User sees "WorkshopPilot works best on desktop" message
- "Continue anyway" button sets `localStorage` key and unmounts overlay

**If mobile and dismissed:**
- `localStorage` key present — gate does not render
- User can use the app in degraded mobile state

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `@liveblocks/client` | 3.14.0 | `@liveblocks/react` 3.14.0, `@liveblocks/zustand` 3.14.0 | All Liveblocks packages must stay at same version — already locked at 3.14.0 |
| `LiveMap` / `LiveObject` | — | Liveblocks Storage v3 type augmentation | `initialStorage` new keys are additive — existing room data (canvas elements) is not reset |
| `useIsMobile` matchMedia | — | All modern browsers including Safari | `addEventListener('change')` API has full support — no polyfill needed |

---

## Integration Points

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/liveblocks/config.ts` | Add `votes: LiveMap`, `votingSession: LiveObject` to `Storage` type; add `VoteRecord`, `VotingSessionState` types; add `VOTING_OPENED`, `VOTING_CLOSED` to `RoomEvent` union |
| `src/components/workshop/multiplayer-room.tsx` | Add `votes` + `votingSession` to `initialStorage` in `RoomProvider` |
| `src/components/workshop/facilitator-controls.tsx` | Add voting open/close section (conditional on Step 8 Crazy 8s sub-step) |
| `src/components/workshop/crazy-8s-grid.tsx` | Add vote count overlays and vote button per slot; accept vote state props |
| `src/lib/canvas/crazy-8s-types.ts` | Add optional `votes?: Record<string, number>` to solo artifact shape |
| `src/lib/schemas/step-schemas.ts` | Add `votes`, `votingOpen`, `maxVotesPerUser` to Step 8 artifact Zod schema |
| `src/app/workshop/[sessionId]/layout.tsx` | Render `<MobileGate />` |

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/mobile-gate.tsx` | Dismissible overlay for <768px viewports using `useIsMobile()` + localStorage |
| `src/components/workshop/voting-results.tsx` | Ranked slot list for facilitator after voting closes; facilitator selects ideas to advance |
| `src/components/workshop/voting-status-listener.tsx` | Renderless listener for `VOTING_OPENED` / `VOTING_CLOSED` events (participant toast + UI state) — follows pattern of `StepChangedListener` and `SessionEndedListener` in `multiplayer-room.tsx` |

---

## Sources

- Liveblocks Storage API — `LiveMap`, `LiveObject`, `useMutation`, `useStorage`, `initialStorage`: https://liveblocks.io/docs/ready-made-features/multiplayer-editing/sync-engine/liveblocks-storage — HIGH confidence (official docs, fetched directly)
- Liveblocks React hooks — `useBroadcastEvent`, `useEventListener`, `RoomEvent` type augmentation: https://liveblocks.io/docs/api-reference/liveblocks-react — HIGH confidence (official docs)
- Liveblocks Storage mutation guide — `useMutation` pattern with nested LiveObject: https://liveblocks.io/docs/guides/how-to-use-liveblocks-storage-with-react — HIGH confidence (official guide)
- shadcn `useMediaQuery` / `useIsMobile`: https://www.shadcn.io/hooks/use-media-query — MEDIUM confidence (docs confirm SSR safety via `useEffect` + matchMedia; exact implementation verified directly in `src/hooks/use-mobile.ts`)
- Existing codebase — direct inspection of: `src/lib/liveblocks/config.ts`, `src/components/workshop/multiplayer-room.tsx`, `src/components/workshop/facilitator-controls.tsx`, `src/hooks/use-mobile.ts`, `src/lib/canvas/crazy-8s-types.ts`, `package.json` — HIGH confidence

---

*Stack research for: WorkshopPilot.ai v2.0 Dot Voting & Mobile Gate*
*Researched: 2026-02-28*
*Previous milestone: v1.9 Multiplayer Collaboration (2026-02-28)*
