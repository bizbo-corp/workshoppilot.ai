# Architecture Research

**Domain:** Dot Voting + Mobile Gate integration into WorkshopPilot.ai
**Researched:** 2026-02-28
**Confidence:** HIGH (full codebase read, all facts derived from existing source)

---

## Context: What Is Being Added

Two features:

1. **Dot Voting** — Step 8 Crazy 8s idea prioritization. Configurable vote counts, multi-vote support, facilitator-controlled open/close with optional countdown timer. Works in solo (self-directed) and multiplayer (all participants vote, facilitator reviews tallies, manually picks ideas to advance). Replaces/augments the current "idea selection" checkbox phase in `IdeationSubStepContainer`.

2. **Mobile Phone Gate** — A dismissible overlay wall shown to users on screens narrower than 768px. Encourages desktop use. The app already has tablet-style mobile layouts in `IdeationSubStepContainer` (tab switching), but no hard gate exists. `useIsMobile()` hook already exists at `src/hooks/use-mobile.ts`.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Next.js App Router                              │
│  src/app/layout.tsx (root — ClerkProvider, ThemeProvider, Sonner)       │
│  ↳ src/app/workshop/[sessionId]/layout.tsx (WorkshopLayout — SSR)       │
│    ↳ src/app/workshop/[sessionId]/step/[stepId]/page.tsx (SSR)          │
│      ↳ <MultiplayerRoomLoader> or raw <CanvasStoreProvider>             │
│        ↳ <StepContainer> or <IdeationSubStepContainer>                  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        State Layer                                      │
│  Solo: createCanvasStore (Zustand + zundo temporal)                     │
│  Multiplayer: createMultiplayerCanvasStore (Zustand + liveblocks())     │
│                                                                         │
│  CanvasState fields relevant to Step 8:                                 │
│    crazy8sSlots: Crazy8sSlot[]        → already in storageMapping       │
│    selectedSlotIds: string[]          → already in storageMapping       │
│                                                                         │
│  NEW fields needed:                                                     │
│    dotVotes: DotVote[]                → goes into storageMapping        │
│    votingSession: VotingSession       → goes into storageMapping        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     Liveblocks Layer (multiplayer only)                 │
│  Presence: cursor, color, displayName, editingDrawingNodeId             │
│  Storage: elements LiveMap (canvas elements — CRDT)                    │
│  RoomEvent: STEP_CHANGED, VIEWPORT_SYNC, TIMER_UPDATE, SESSION_ENDED   │
│                                                                         │
│  NEW RoomEvent needed:                                                  │
│    VOTING_OPENED: { totalVotes: number; durationMs?: number }           │
│    VOTING_CLOSED: {}                                                    │
│  (vote tallies sync via Zustand storageMapping — not RoomEvent)         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `IdeationSubStepContainer` | Phase state machine (mind-mapping → crazy-eights → **dot-voting** → idea-selection) | `useCanvasStore`, `useBroadcastEvent`, `useMultiplayerContext` |
| `Crazy8sCanvas` | Crazy 8s slot display + EzyDraw modal. **Augmented to render vote badges on slots** | `useCanvasStore` for `crazy8sSlots` and new `dotVotes` |
| `Crazy8sGrid` | Slot card grid. **Augmented to accept vote count overlay and vote-casting interaction** | Props from `Crazy8sCanvas` |
| **`DotVotingControls`** (NEW) | Facilitator panel: open/close voting, configure vote count, show timer, show live tallies | `useCanvasStore` (write `votingSession`), `useBroadcastEvent` |
| **`DotVoteBadge`** (NEW) | Per-slot dot display (filled/empty circles, your votes, total count) | Props only |
| **`VoteButton`** (NEW) | Clickable dot for casting/retracting a vote, disabled when voting closed | Props + callback |
| `FacilitatorControls` | Existing toolbar. **Add DotVotingControls as a sub-panel** | `useMultiplayerContext` (isFacilitator gate) |
| `MultiplayerRoom` | RoomProvider, listeners. **Add VotingOpenedListener + VotingClosedListener** | `useEventListener` |
| **`MobileGate`** (NEW) | Full-screen overlay at <768px with dismiss/continue option | `useIsMobile()`, sessionStorage for persistence |
| `WorkshopLayout` (SSR) | **Mount point for MobileGate** — added at layout level via client component | None (SSR wrapper only) |

---

## Recommended Architecture

### Dot Voting: Data Model

Add two new fields to `CanvasState` and both store factories:

```typescript
// src/lib/canvas/dot-vote-types.ts  (NEW FILE)

export interface DotVote {
  slotId: string;            // Which Crazy 8s slot was voted on
  voterId: string;           // Liveblocks userId (solo: 'solo', multi: Liveblocks user ID)
  voteCount: number;         // How many dots this voter placed on this slot (0 to max)
}

export interface VotingSession {
  status: 'closed' | 'open' | 'results';
  totalVotesPerPerson: number;  // Configurable: default 3
  allowMultiVote: boolean;      // Can stack multiple votes on one idea
  openedAt?: number;            // timestamp (for timer UI)
  durationMs?: number;          // Optional countdown (if facilitator sets one)
}

export const DEFAULT_VOTING_SESSION: VotingSession = {
  status: 'closed',
  totalVotesPerPerson: 3,
  allowMultiVote: true,
};
```

These fields belong in `CanvasState`:

```typescript
// Additions to CanvasState (canvas-store.ts)
dotVotes: DotVote[];
votingSession: VotingSession;
```

And corresponding actions:

```typescript
// Additions to CanvasActions
castVote: (slotId: string, voterId: string, count: number) => void;
retractVote: (slotId: string, voterId: string) => void;
openVoting: (config: Pick<VotingSession, 'totalVotesPerPerson' | 'allowMultiVote' | 'durationMs'>) => void;
closeVoting: () => void;
setVotingResults: () => void;  // transitions status: 'open' → 'results'
resetVoting: () => void;        // clears dotVotes, resets votingSession
```

Both `createCanvasStore` and `createMultiplayerCanvasStore` need these fields. In `createMultiplayerCanvasStore`, add them to `storageMapping`:

```typescript
// multiplayer-canvas-store.ts — storageMapping additions
dotVotes: true,
votingSession: true,
```

This means vote tallies sync automatically via Liveblocks CRDT — no separate API call needed for vote display.

### Dot Voting: Liveblocks Events

Extend `RoomEvent` in `src/lib/liveblocks/config.ts`:

```typescript
// Add to the RoomEvent union in config.ts
| { type: 'VOTING_OPENED'; totalVotes: number; allowMultiVote: boolean; durationMs?: number }
| { type: 'VOTING_CLOSED' }
```

`VOTING_OPENED` triggers participants to see the voting UI. `VOTING_CLOSED` locks voting. Actual vote data syncs through `storageMapping.dotVotes` — the events are notification-only.

### Dot Voting: Phase Machine Change

`IdeationSubStepContainer` currently manages:
```
mind-mapping → crazy-eights → idea-selection → brain-rewriting
```

The new flow inserts dot-voting between crazy-eights and idea-selection:
```
mind-mapping → crazy-eights → dot-voting → idea-selection → brain-rewriting
```

The new `IdeationPhase` type:

```typescript
type IdeationPhase =
  | 'mind-mapping'
  | 'crazy-eights'
  | 'dot-voting'     // NEW
  | 'idea-selection'
  | 'brain-rewriting';
```

The voting phase appears automatically after the user saves Crazy 8s. In solo mode, voting is self-directed — the user casts their own votes and clicks "Lock In Votes". In multiplayer, the facilitator opens/closes voting via `DotVotingControls` and then manually picks which ideas advance.

### Dot Voting: Solo vs. Multiplayer Behavior

| Behavior | Solo | Multiplayer |
|----------|------|-------------|
| Who casts votes | The single user | All participants |
| Open/close gating | No gate — voting always available in dot-voting phase | Facilitator opens/closes via `DotVotingControls` |
| Timer | Optional (user-initiated) | Facilitator-set via existing `FacilitatorControls` timer pattern |
| Results display | Immediately visible to self | Visible to all once facilitator closes |
| Advance to idea-selection | User clicks "Lock In Votes" | Facilitator selects ideas and clicks "Proceed" |
| State persistence | `isDirty` → Neon auto-save | `storageMapping.dotVotes` → Liveblocks |

For solo, `voterId` is the string `'solo'`. For multiplayer, `voterId` is the Liveblocks `userId` (available from `useSelf().id`).

### Dot Voting: UI Placement

Voting UI appears **inside the Crazy 8s grid**, not as a separate canvas view. The `Crazy8sGrid` cards gain:
- A dot badge showing current vote distribution per slot
- Click-to-vote/retract interaction (when voting is `open`)
- Dimming of non-voted slots in `results` status

`DotVotingControls` renders **inside `FacilitatorControls`** (the existing fixed top-right toolbar) when the current ideation phase is `dot-voting`. It is hidden for participants. For solo mode, a simplified "Start Voting" / "Lock In Votes" button pair renders in the canvas area.

### Dot Voting: Persistence

**Solo:** `dotVotes` and `votingSession` go through the existing auto-save path. `markDirty()` after each vote mutation. They are serialized into `stepArtifacts.artifact` alongside `crazy8sSlots`, `selectedSlotIds`, and `brainRewritingMatrices` — no schema change needed.

**Multiplayer:** Liveblocks `storageMapping` handles CRDT sync and persistence. The Liveblocks webhook already persists storage back to Neon on storage change events. No additional webhook work needed.

---

### Mobile Gate: Architecture

The mobile gate is a dismissible overlay shown on `window.innerWidth < 768`. It should:
- Block the workshop UI (not just warn)
- Be dismissible once per session (store dismiss in `sessionStorage`, not `localStorage`, so it re-appears on new sessions)
- Not appear on the landing page or dashboard (only in the workshop app routes)
- Use CSS-only detection where possible to avoid hydration flash

**Placement: Workshop Layout Client Wrapper**

The correct mount point is the workshop `layout.tsx` at `src/app/workshop/[sessionId]/layout.tsx`. This layout already exists as a Server Component. Add a Client Component wrapper `MobileGateWrapper` rendered inside the layout `<main>`:

```typescript
// src/components/layout/mobile-gate-wrapper.tsx  (NEW FILE — client component)
'use client';

import { useIsMobile } from '@/hooks/use-mobile';
import { MobileGate } from './mobile-gate';

export function MobileGateWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MobileGate />
      {children}
    </>
  );
}
```

```typescript
// src/components/layout/mobile-gate.tsx  (NEW FILE — client component)
'use client';

import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export function MobileGate() {
  const isMobile = useIsMobile();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('mobile-gate-dismissed') === 'true';
  });

  if (!isMobile || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background p-6 text-center">
      {/* "Best on desktop" message + dismiss button */}
    </div>
  );
}
```

This approach:
- Avoids touching `app/layout.tsx` (keeps gate scoped to workshop routes)
- Uses the existing `useIsMobile()` hook (no new dependency)
- Does not affect SSR — `useIsMobile()` returns `false` initially on server render (gate hidden until hydration)
- Renders as a portal-like overlay above all content with `z-[9999]`

**Hydration note:** `useIsMobile()` returns `false` initially (not `undefined`) due to the `!!isMobile` coercion. The gate will not flash on desktop. On mobile, there may be a 1-frame flash before the gate appears — acceptable.

**Placement in layout.tsx:**

```typescript
// src/app/workshop/[sessionId]/layout.tsx — modification
import { MobileGateWrapper } from '@/components/layout/mobile-gate-wrapper';

// Replace:
<main className="flex-1 overflow-hidden">{children}</main>
// With:
<MobileGateWrapper>
  <main className="flex-1 overflow-hidden">{children}</main>
</MobileGateWrapper>
```

---

## Data Flow

### Dot Voting (Multiplayer)

```
Facilitator clicks "Open Voting" in DotVotingControls
    ↓
store.openVoting({ totalVotesPerPerson: 3, allowMultiVote: true })
    ↓  (Zustand set → liveblocks storageMapping syncs votingSession to all)
broadcast({ type: 'VOTING_OPENED', totalVotes: 3, allowMultiVote: true })
    ↓
VotingOpenedListener in MultiplayerRoom receives event
    ↓
Participants' IdeationSubStepContainer transitions to 'dot-voting' phase
    ↓
Participant clicks dot on slot → castVote(slotId, userId, count)
    ↓  (Zustand set → liveblocks storageMapping syncs dotVotes to all — CRDT merge)
All participants see live vote counts update in real time
    ↓
Facilitator clicks "Close Voting" → broadcast(VOTING_CLOSED)
    ↓
All see results view. Facilitator selects ideas → setSelectedSlotIds()
    ↓
Advance to idea-selection phase (existing flow)
```

### Dot Voting (Solo)

```
User saves Crazy 8s → phase transitions to 'dot-voting'
    ↓
User casts votes (voterId = 'solo')
    ↓  (Zustand set → isDirty = true → debounced auto-save to Neon)
User clicks "Lock In Votes"
    ↓
setVotingResults() + setSelectedSlotIds() from top-voted slots
    ↓
Advance to idea-selection (existing flow)
```

### Mobile Gate

```
User opens /workshop/[sessionId]/step/[stepId] on phone
    ↓
MobileGateWrapper renders (client component — hydrates on client)
    ↓
useIsMobile() → true
    ↓
MobileGate renders full-screen overlay (z-index 9999 above all workshop UI)
    ↓
User clicks "Continue anyway"
    ↓
sessionStorage.setItem('mobile-gate-dismissed', 'true')
    ↓
setDismissed(true) → gate unmounts → workshop renders normally
```

---

## New vs. Modified — Explicit List

### New Files

| File | Purpose |
|------|---------|
| `src/lib/canvas/dot-vote-types.ts` | `DotVote`, `VotingSession`, `DEFAULT_VOTING_SESSION` types |
| `src/components/workshop/dot-voting-controls.tsx` | Facilitator UI: open/close, configure, view tallies |
| `src/components/canvas/dot-vote-badge.tsx` | Per-slot dot display (filled/empty circles) |
| `src/components/layout/mobile-gate.tsx` | Full-screen mobile wall with dismiss |
| `src/components/layout/mobile-gate-wrapper.tsx` | Client wrapper for layout injection |

### Modified Files

| File | What Changes |
|------|-------------|
| `src/stores/canvas-store.ts` | Add `dotVotes: DotVote[]`, `votingSession: VotingSession` to `CanvasState`; add 6 new actions to `CanvasActions` and `createCanvasStore` |
| `src/stores/multiplayer-canvas-store.ts` | Same new fields and actions; add `dotVotes: true` and `votingSession: true` to `storageMapping` |
| `src/lib/liveblocks/config.ts` | Add `VOTING_OPENED` and `VOTING_CLOSED` to `RoomEvent` union |
| `src/components/workshop/multiplayer-room.tsx` | Add `VotingOpenedListener` and `VotingClosedListener` renderless components inside `MultiplayerRoomInner` |
| `src/components/workshop/ideation-sub-step-container.tsx` | Add `'dot-voting'` to `IdeationPhase`; add phase transition from `crazy-eights` to `dot-voting`; pass voting props to canvas |
| `src/components/workshop/crazy-8s-canvas.tsx` | Accept `votingMode` prop; render vote badges and vote interaction on slots |
| `src/components/workshop/crazy-8s-grid.tsx` | Accept per-slot vote counts and interactive vote dots; render `DotVoteBadge` overlay on each card |
| `src/components/workshop/facilitator-controls.tsx` | Conditionally render `DotVotingControls` when in dot-voting phase |
| `src/app/workshop/[sessionId]/layout.tsx` | Wrap `<main>` with `<MobileGateWrapper>` |
| `src/providers/canvas-store-provider.tsx` | Add `initialDotVotes` and `initialVotingSession` props to `CanvasStoreProviderProps`; pass to store factories |
| `src/app/workshop/[sessionId]/step/[stepId]/page.tsx` | Load `dotVotes` and `votingSession` from `stepArtifacts.artifact` and pass as initial props |

---

## Build Order (Phase Dependencies)

Build in this sequence to avoid blocking dependencies:

### Phase 1: Types + Store Foundation (no UI)
1. Create `src/lib/canvas/dot-vote-types.ts`
2. Extend `canvas-store.ts` with new state fields and actions
3. Extend `multiplayer-canvas-store.ts` with new fields, actions, and `storageMapping` entries
4. Extend `canvas-store-provider.tsx` with new initial props
5. Extend `liveblocks/config.ts` with new `RoomEvent` types

**Why first:** Everything else depends on the store shape being correct. Type errors propagate through the whole tree — fix the root before touching UI.

### Phase 2: Core Voting UI (no multiplayer)
6. Create `dot-vote-badge.tsx` (dumb display component, no store dependency)
7. Modify `crazy-8s-grid.tsx` to render `DotVoteBadge` and accept vote interaction props
8. Modify `crazy-8s-canvas.tsx` to wire voting state from store to grid
9. Modify `ideation-sub-step-container.tsx` to add `dot-voting` phase transition + solo voting flow

**Why second:** Solo voting works without Liveblocks events. Validates the core UI without multiplayer complexity.

### Phase 3: Multiplayer Voting
10. Add `VotingOpenedListener` and `VotingClosedListener` to `multiplayer-room.tsx`
11. Create `dot-voting-controls.tsx` (facilitator UI)
12. Modify `facilitator-controls.tsx` to conditionally render `DotVotingControls`
13. Test multiplayer vote sync via Liveblocks storage

**Why third:** Depends on Phase 1 types and Phase 2 UI. Event listeners are simple, but need the full type union in place.

### Phase 4: Mobile Gate (independent — parallelizable with Phase 2/3)
14. Create `mobile-gate.tsx`
15. Create `mobile-gate-wrapper.tsx`
16. Modify `workshop/[sessionId]/layout.tsx` to inject wrapper

**Why listed fourth:** Completely independent of voting work. Can be built in parallel with Phase 2 or 3. Listed here because voting is higher business value.

### Phase 5: Persistence Wiring
17. Modify `step/[stepId]/page.tsx` to load `dotVotes` and `votingSession` from `stepArtifacts.artifact`
18. Verify auto-save path handles new fields in solo mode
19. Verify Liveblocks webhook persists new `storageMapping` fields in multiplayer

**Why last:** Correctness depends on the state shape being stable. Do not wire persistence until the store API is settled.

---

## Architectural Patterns

### Pattern 1: Extend storageMapping for New Shared State

**What:** Any new state that must be consistent across all multiplayer participants goes into `storageMapping` in `createMultiplayerCanvasStore`. This is the established pattern for `stickyNotes`, `crazy8sSlots`, `selectedSlotIds`, etc.

**When to use:** State that must survive reconnects and be consistent across all participants. Vote tallies (`dotVotes`) and voting configuration (`votingSession`) both qualify.

**Do NOT put in storageMapping:** Ephemeral per-client UI state like "which slot is highlighted" or "is the vote panel expanded". Those stay in local React state or Zustand fields outside the mapping.

### Pattern 2: RoomEvent for Notification, storageMapping for Data

**What:** Liveblocks `RoomEvent` (broadcast) is for instant notifications that trigger UI transitions. Actual data lives in `storageMapping` so it survives late joiners and reconnects.

**Applied to voting:** `VOTING_OPENED` tells participants to show the voting UI NOW. The actual `votingSession` config arrives via storageMapping sync (which may lag slightly). Handle this by reading config from the store, not from the event payload, once the transition happens.

**Example:**
```typescript
// VotingOpenedListener — triggers phase transition
useEventListener(({ event }) => {
  if (event.type === 'VOTING_OPENED' && !isFacilitator) {
    // Don't read vote config from event — read from store (synced via storageMapping)
    setCurrentPhase('dot-voting');
  }
});
```

### Pattern 3: Solo Fallback for Multiplayer-First Features

**What:** Features built for multiplayer (like dot voting) need a degraded solo mode. The `isFacilitator` and `isMultiplayer` context flags (from `MultiplayerContext`) gate multiplayer-specific UI. For solo, the same state shape works but without event broadcast.

**Applied to voting:** In solo, `openVoting()` sets `votingSession.status = 'open'` locally. No broadcast needed. The `DotVotingControls` component (facilitator-only in multiplayer) is replaced by a simpler inline button in solo mode.

### Pattern 4: Client Wrapper for Server Layout Injection

**What:** Next.js App Router layouts are Server Components. To add client interactivity (like the mobile gate), wrap `children` in a thin Client Component that renders the interactive overlay alongside the server-rendered children.

**Applied to MobileGate:**
```
WorkshopLayout (Server Component)
  → <MobileGateWrapper> (Client Component — boundary)
    → <MobileGate> (Client — reads window.innerWidth)
    → {children} (Server-rendered step pages)
```

This is the correct pattern — do not add `'use client'` to the layout itself, as that would defeat SSR for all workshop pages.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Vote Tallies in RoomEvent

**What people do:** Broadcast `{ type: 'VOTE_CAST', slotId, voterId, count }` events and maintain tallies from event stream.

**Why it's wrong:** Late joiners miss historical events. Connection interruptions lose state. This is the classic "events vs. state" confusion in CRDT systems.

**Do this instead:** Store votes in `storageMapping.dotVotes`. The CRDT merge ensures consistency regardless of join order or reconnections. Use RoomEvent only to trigger UI transitions, never to convey durable data.

### Anti-Pattern 2: Per-Participant Crazy 8s Slots in storageMapping

**What people do:** Namespace `crazy8sSlots` by participant ID to give each person their own slots for voting.

**Why it's wrong:** This was explicitly deferred as SYNC-04 in `PROJECT.md`: "SYNC-04 (per-participant Crazy 8s slots) deferred to v2 — requires partitioned Liveblocks storage." The current storageMapping uses a flat array. Partitioning requires a map-of-arrays shape change that touches the Liveblocks storage schema.

**Do this instead:** For v2.0, all participants share the same `crazy8sSlots` (facilitator's sketches are the shared reference). Each participant votes on the shared slots. Per-participant slots remain FFP scope.

### Anti-Pattern 3: CSS-Only Mobile Gate

**What people do:** Use Tailwind `hidden sm:block` to hide workshop UI on mobile.

**Why it's wrong:** The workshop content still loads, scripts execute, and Liveblocks connects. This wastes resources and causes partially-visible broken layouts if the user rotates to landscape.

**Do this instead:** Render `<MobileGate>` as a React overlay that sits above all content (`z-[9999]`). The workshop content still mounts (avoids complex conditional rendering and keeps layout hydration stable), but the overlay makes it inaccessible until dismissed.

### Anti-Pattern 4: Adding Mobile Gate to Root Layout

**What people do:** Add `<MobileGate>` to `src/app/layout.tsx` for maximum coverage.

**Why it's wrong:** The gate would also show on the landing page, dashboard, and pricing page — none of which need it. Those pages work fine on mobile.

**Do this instead:** Add to `src/app/workshop/[sessionId]/layout.tsx` via `MobileGateWrapper`. This scopes the gate exclusively to workshop pages.

### Anti-Pattern 5: Persisting Mobile Gate Dismiss to localStorage

**What people do:** `localStorage.setItem('mobile-gate-dismissed', 'true')` so it never shows again.

**Why it's wrong:** A user who dismisses from mobile one day and later comes back on mobile has no way to see the recommendation again. Also, if they switch to desktop, the localStorage flag is irrelevant but persists forever.

**Do this instead:** `sessionStorage` — persists for the browser tab session but resets on new sessions. The user sees the gate once per session on mobile, which is the right balance.

---

## Integration Points Summary

| Integration Point | What Changes | Risk |
|-------------------|-------------|------|
| `CanvasState` shape | New `dotVotes` and `votingSession` fields | LOW — additive, no existing fields change |
| `storageMapping` in multiplayer store | Add 2 new keys | LOW — additive only; existing CRDT fields unaffected |
| `RoomEvent` union type | Add 2 new event types | LOW — union extension; existing listeners unaffected |
| `MultiplayerRoom` listeners | Add 2 new renderless components | LOW — same pattern as `StepChangedListener` |
| `IdeationPhase` type | Add `'dot-voting'` variant | LOW — but `currentPhase` switch/if chains need updating |
| `crazy-8s-grid.tsx` | New props for vote overlay | LOW — additive props; no existing prop changes |
| `WorkshopLayout` (SSR) | Add `MobileGateWrapper` | LOW — client boundary, no SSR impact |
| `CanvasStoreProvider` | New initial props | LOW — optional props with defaults |
| Persistence (page.tsx) | Load dotVotes/votingSession from artifact | MEDIUM — artifact schema is flexible JSONB; no migration needed, but must handle absent fields gracefully on existing workshops |

---

## Scaling Considerations

Dot voting adds minimal load:

| Scale | Impact |
|-------|--------|
| Current (workshoppilot.ai) | Negligible — vote events are small CRDT deltas, same path as sticky note moves |
| 10+ participants voting simultaneously | Liveblocks handles concurrent writes via CRDT merge — no conflicts. `dotVotes` array merges per-user entries. |
| High-frequency voting (rapid clicks) | Zustand batches state updates. Liveblocks has 50ms throttle already set on the client. No additional throttle needed. |

---

## Sources

- Codebase: `src/stores/canvas-store.ts`, `src/stores/multiplayer-canvas-store.ts` (full read)
- Codebase: `src/lib/liveblocks/config.ts` (Liveblocks type augmentation, RoomEvent union)
- Codebase: `src/components/workshop/multiplayer-room.tsx` (listener pattern)
- Codebase: `src/components/workshop/facilitator-controls.tsx` (existing facilitator toolbar pattern)
- Codebase: `src/components/workshop/ideation-sub-step-container.tsx` (phase state machine)
- Codebase: `src/components/workshop/crazy-8s-canvas.tsx`, `crazy-8s-grid.tsx` (existing Crazy 8s UI)
- Codebase: `src/providers/canvas-store-provider.tsx` (store factory and room lifecycle)
- Codebase: `src/hooks/use-mobile.ts` (existing mobile detection hook)
- Codebase: `src/app/workshop/[sessionId]/layout.tsx` (SSR layout structure)
- Codebase: `src/app/layout.tsx` (root layout — scoping rationale for mobile gate)
- `PROJECT.md`: SYNC-04 deferral note, v2.0 milestone scope

---

*Architecture research for: v2.0 Dot Voting & Mobile Gate*
*Researched: 2026-02-28*
