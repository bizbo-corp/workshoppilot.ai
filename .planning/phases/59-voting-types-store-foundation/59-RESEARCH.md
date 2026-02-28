# Phase 59: Voting Types + Store Foundation - Research

**Researched:** 2026-02-28
**Domain:** TypeScript data modelling, Zustand state management, Liveblocks CRDT storage
**Confidence:** HIGH

## Summary

Phase 59 is a pure data-model and store-scaffolding phase. No UI is produced here — the goal is to establish TypeScript types (`DotVote`, `VotingSession`, `DEFAULT_VOTING_SESSION`) and extend both the solo canvas store (`canvas-store.ts`) and the multiplayer canvas store (`multiplayer-canvas-store.ts`) with vote state fields and actions. The phase also adds `VOTING_OPENED` and `VOTING_CLOSED` to the `RoomEvent` union in `src/lib/liveblocks/config.ts` to enable future UI phase transitions in Phase 61.

The project's existing store architecture is a textbook case for this kind of extension. `CanvasState` and `CanvasActions` types in `canvas-store.ts` are the single source of truth that both stores implement; the multiplayer store mirrors the exact same `CanvasStore` interface with `liveblocks()` middleware wrapping it. Adding voting fields means: (1) add types to `canvas-store.ts`, (2) add default state and action implementations to `canvas-store.ts`, (3) duplicate those implementations into `multiplayer-canvas-store.ts`, and (4) add the two new `storageMapping` keys. No new files are required.

The critical design constraint from STATE.md: vote state ownership is exclusive — multiplayer votes are Liveblocks-authoritative (`storageMapping`), solo votes are Zustand/JSONB-authoritative. The two fields (`dotVotes` and `votingSession`) must be in `storageMapping` in the multiplayer store and excluded from the `presenceMapping`. Anonymous vote hiding for VOTE-06 is a UI concern (Phase 60/61) not a data model concern: the data model stores each vote with `voterId` (for per-participant retraction), but the UI layer suppresses display of other participants' votes while `votingSession.status === 'open'`.

**Primary recommendation:** Add `DotVote`, `VotingSession`, and `DEFAULT_VOTING_SESSION` types to a new file `src/lib/canvas/voting-types.ts`; extend `CanvasState`/`CanvasActions` in `canvas-store.ts`; mirror in `multiplayer-canvas-store.ts`; patch `liveblocks/config.ts` for `RoomEvent`. Four files total.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VOTE-01 | Facilitator can configure vote budget per participant (default 2, range 1-8) | `VotingSession.voteBudget: number` field (clamped 1–8, default 2); `openVoting(voteBudget?)` action sets it |
| VOTE-05 | Facilitator can open and close voting session | `openVoting()` sets `votingSession.status = 'open'`; `closeVoting()` sets `status = 'closed'`; `VOTING_OPENED`/`VOTING_CLOSED` broadcast events |
| VOTE-06 | Votes are anonymous (hidden) until facilitator closes voting | `DotVote.voterId` field enables per-participant retraction server-side; vote DISPLAY anonymity is enforced by UI in Phase 60/61 (not by data model) |
| VOTE-07 | Ranked results revealed simultaneously when voting closes | `votingSession.results: VotingResult[]` populated by `setVotingResults()` action; VOTING_CLOSED broadcast triggers simultaneous reveal in Phase 61 |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand/vanilla | ^5.0.1 (installed) | Store factory pattern | Project already uses `createStore` from `zustand/vanilla` for SSR-safe canvas stores |
| @liveblocks/zustand | ^3.14.0 (installed) | CRDT sync via `storageMapping` | Project already uses `liveblocks()` middleware in `multiplayer-canvas-store.ts` |
| TypeScript | Project-wide | Type definitions | All store types follow the `CanvasState` + `CanvasActions` = `CanvasStore` pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zundo | ^2.3.0 (installed) | Undo/redo for solo store | Already wrapping solo store via `temporal()`; voting actions that mutate user data (castVote, retractVote) should set `isDirty: true` to trigger save |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Storing `dotVotes: DotVote[]` as array | Storing as `Record<slotId, voterId[]>` | Array approach matches existing patterns (stickyNotes, crazy8sSlots are all arrays); also easier for Liveblocks CRDT to handle |
| `VotingResult` embedded in `VotingSession` | Separate top-level field | Embedding in session keeps related data co-located — consistent with how other session-scoped state is modelled |

**Installation:**
```bash
# No new packages needed — all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/canvas/
│   └── voting-types.ts          # NEW: DotVote, VotingSession, DEFAULT_VOTING_SESSION
├── stores/
│   ├── canvas-store.ts          # EXTEND: CanvasState + CanvasActions + implementations
│   └── multiplayer-canvas-store.ts  # EXTEND: mirror state/actions + storageMapping
└── lib/liveblocks/
    └── config.ts                # EXTEND: add VOTING_OPENED, VOTING_CLOSED to RoomEvent union
```

### Pattern 1: Centralized Type File (matching existing lib/canvas/* types)

**What:** All vote-specific types live in `src/lib/canvas/voting-types.ts`, parallel to `crazy-8s-types.ts`, `concept-card-types.ts`, etc.
**When to use:** Any type that is domain-specific to a canvas feature (not a generic Zustand type).
**Example:**

```typescript
// src/lib/canvas/voting-types.ts

/**
 * A single dot vote cast by a participant.
 * slotId: which Crazy 8s slot received the vote
 * voterId: Liveblocks userId of the voter — used for retraction and completion tracking
 * voteIndex: which vote in the voter's budget (0-based) — used to retract the correct vote
 */
export type DotVote = {
  id: string;         // crypto.randomUUID() at cast time
  slotId: string;     // Crazy8sSlot.slotId (e.g. 'slot-3')
  voterId: string;    // Liveblocks userId — 'user_xxx' for owners, 'guest-xxx' for participants
  voteIndex: number;  // 0-based index within this voter's budget (for retraction by position)
};

/**
 * A ranked result entry — populated when votingSession closes.
 */
export type VotingResult = {
  slotId: string;
  totalVotes: number;
  rank: number; // 1 = most votes; ties share rank
};

/**
 * Session-scoped voting configuration and status.
 * Owned by the facilitator (or the solo user).
 *
 * status:
 *   'idle'   — not yet opened, no voting UI shown
 *   'open'   — voting active; participants can cast/retract
 *   'closed' — voting ended; results are visible
 */
export type VotingSession = {
  status: 'idle' | 'open' | 'closed';
  voteBudget: number;  // votes per participant; default 2, range 1-8 (VOTE-01)
  results: VotingResult[]; // populated by setVotingResults(); empty while idle/open
};

export const DEFAULT_VOTING_SESSION: VotingSession = {
  status: 'idle',
  voteBudget: 2,  // NNGroup 25%-of-options rule: 8 slots × 25% = 2 (STATE.md decision)
  results: [],
};
```

### Pattern 2: CanvasState Extension (matching existing fields)

**What:** Add `dotVotes` and `votingSession` as first-class fields of `CanvasState` — they participate in `isDirty` tracking, `storageMapping`, and `temporal()` partialization.
**When to use:** Any field that must be persisted to Neon (solo) or Liveblocks (multiplayer).
**Example:**

```typescript
// In canvas-store.ts — CanvasState additions
export type CanvasState = {
  // ... existing fields ...
  dotVotes: DotVote[];
  votingSession: VotingSession;
};

// In canvas-store.ts — CanvasActions additions
export type CanvasActions = {
  // ... existing actions ...
  castVote: (vote: Omit<DotVote, 'id'>) => void;
  retractVote: (voteId: string) => void;
  openVoting: (voteBudget?: number) => void;
  closeVoting: () => void;
  setVotingResults: (results: VotingResult[]) => void;
  resetVoting: () => void;
};
```

### Pattern 3: Action Implementations (matching isDirty pattern)

**What:** Actions that mutate user-owned data set `isDirty: true` (solo) or are no-ops for isDirty (multiplayer — Liveblocks is authoritative).
**When to use:** Consistent with ALL existing store actions.

```typescript
// In canvas-store.ts createCanvasStore:
castVote: (vote) =>
  set((state) => ({
    dotVotes: [
      ...state.dotVotes,
      { ...vote, id: crypto.randomUUID() },
    ],
    isDirty: true,
  })),

retractVote: (voteId) =>
  set((state) => ({
    dotVotes: state.dotVotes.filter((v) => v.id !== voteId),
    isDirty: true,
  })),

openVoting: (voteBudget) =>
  set((state) => ({
    votingSession: {
      ...state.votingSession,
      status: 'open',
      voteBudget: voteBudget ?? state.votingSession.voteBudget,
    },
    isDirty: true,
  })),

closeVoting: () =>
  set((state) => ({
    votingSession: { ...state.votingSession, status: 'closed' },
    isDirty: true,
  })),

setVotingResults: (results) =>
  set((state) => ({
    votingSession: { ...state.votingSession, results },
    isDirty: true,
  })),

resetVoting: () =>
  set(() => ({
    dotVotes: [],
    votingSession: DEFAULT_VOTING_SESSION,
    isDirty: true,
  })),
```

### Pattern 4: Liveblocks RoomEvent Union Extension

**What:** VOTING_OPENED and VOTING_CLOSED are broadcast-only events for UI phase transitions. The actual vote data lives in `storageMapping` (durable CRDT). These events are stateless signals — no vote data travels in the event payload.
**When to use:** Consistent with STEP_CHANGED, SESSION_ENDED pattern in `config.ts`.

```typescript
// In src/lib/liveblocks/config.ts — RoomEvent union addition
RoomEvent:
  | { type: 'STEP_CHANGED'; stepOrder: number; stepName: string }
  | { type: 'VIEWPORT_SYNC'; x: number; y: number; zoom: number }
  | { type: 'TIMER_UPDATE'; state: 'running' | 'paused' | 'expired' | 'cancelled'; remainingMs: number; totalMs: number }
  | { type: 'SESSION_ENDED' }
  | { type: 'VOTING_OPENED'; voteBudget: number }
  | { type: 'VOTING_CLOSED' };
```

Note: `VOTING_OPENED` carries `voteBudget` in the event payload so non-facilitator clients can initialize their local UI state (budget display) immediately upon receiving the event — before Liveblocks Storage sync completes. `VOTING_CLOSED` carries no payload; clients read results from the `votingSession.results` CRDT field.

### Pattern 5: storageMapping Extension (multiplayer store)

**What:** `dotVotes` and `votingSession` must be in `storageMapping` so Liveblocks CRDT handles conflict resolution. The existing `storageMapping` object lists all durable fields; simply add the two new keys.
**When to use:** Any field that must be shared across participants.

```typescript
// In multiplayer-canvas-store.ts storageMapping config:
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
  dotVotes: true,        // NEW
  votingSession: true,   // NEW
},
```

### Pattern 6: temporal() partialization (solo store)

**What:** The solo store uses `zundo` temporal middleware with a `partialize` function that lists which fields are tracked for undo/redo. Vote fields should be included so undo works during voting.
**When to use:** All persisted canvas state fields.

```typescript
// In canvas-store.ts temporal() config:
partialize: (state) => ({
  stickyNotes: state.stickyNotes,
  // ... existing fields ...
  dotVotes: state.dotVotes,        // NEW
  votingSession: state.votingSession, // NEW
}),
```

### Pattern 7: InitState extension (multiplayer store factory)

**What:** `createMultiplayerCanvasStore` accepts an `InitState` parameter to seed from SSR-loaded DB data. Adding voting fields here enables server-side hydration of vote state when a session resumes.
**When to use:** All persisted canvas state fields.

```typescript
// In multiplayer-canvas-store.ts InitState:
type InitState = {
  // ... existing fields ...
  dotVotes?: DotVote[];
  votingSession?: VotingSession;
};

// In DEFAULT_STATE:
dotVotes: initState?.dotVotes || [],
votingSession: initState?.votingSession || DEFAULT_VOTING_SESSION,
```

### Anti-Patterns to Avoid

- **Storing vote anonymity logic in the data model:** VOTE-06 anonymity is a UI rendering concern — do not add an `isVisible` or `isAnonymous` field to `DotVote`. The store simply stores all votes; the UI chooses what to display based on `votingSession.status` and the current `voterId`.
- **Using Presence for vote data:** Presence is ephemeral and not persisted. Vote data must be in `storageMapping`. The existing `presenceMapping` is intentionally omitted in this project.
- **Separating vote types from the CanvasStore interface:** `DotVote` and `VotingSession` must be part of `CanvasState`/`CanvasActions` — not a parallel store — because the `useCanvasStore` provider pattern requires a single unified interface.
- **Making `votingSession` a top-level optional field:** It should always be initialized to `DEFAULT_VOTING_SESSION`, never `undefined`. Downstream code in Phase 60/61 can safely read `votingSession.status` without null checks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CRDT conflict resolution for concurrent votes | Custom merge logic | Liveblocks `storageMapping` | Liveblocks handles last-write-wins and CRDT semantics automatically; two participants casting votes simultaneously is safe because each vote is a separate array entry with a unique UUID |
| Undo/redo for vote actions | Custom history stack | `zundo` temporal (already installed) | Already wrapping the solo store; just include `dotVotes` and `votingSession` in the `partialize` function |
| Type guards for RoomEvent discriminated union | Manual `if (event.type === ...)` checks | TypeScript discriminated unions + exhaustive switch | The `RoomEvent` type is already a discriminated union; TypeScript's narrowing handles it |

**Key insight:** The array-of-objects pattern for `DotVote[]` is intentionally chosen over a `Map<slotId, count>` because: (1) it supports retraction by `voteId`, (2) it supports per-voter completion tracking (Phase 61), and (3) it is JSON-serializable for Liveblocks CRDT without custom serialization.

## Common Pitfalls

### Pitfall 1: CanvasStoreProvider InitState not updated

**What goes wrong:** `CanvasStoreProvider` in `src/providers/canvas-store-provider.tsx` accepts typed `initial*` props (e.g., `initialStickyNotes`). If the provider is not updated to accept `initialDotVotes` and `initialVotingSession`, the store will always initialize to the default values even when resuming a session with existing votes.
**Why it happens:** The provider has an explicit InitState object passed to `createCanvasStore` and `createMultiplayerCanvasStore`.
**How to avoid:** Add `initialDotVotes?: DotVote[]` and `initialVotingSession?: VotingSession` to `CanvasStoreProviderProps` and pass them through to `initState`. Phase 59 can add the props even if no server-load path exists yet (they'll just be unused until Phase 60 wires up persistence).
**Warning signs:** TypeScript will not error if you miss this — it's not a type error, just a runtime data loss.

### Pitfall 2: Forgetting votingSession in temporal() partialize

**What goes wrong:** `zundo` temporal middleware only tracks fields listed in `partialize`. If `dotVotes` and `votingSession` are omitted, undo/redo won't include vote state changes, causing desync between canvas state and vote state.
**Why it happens:** Developers add new state fields to `CanvasState` but forget the `partialize` config at the bottom of `createCanvasStore`.
**How to avoid:** Always add new CanvasState fields to `partialize` in the same commit.
**Warning signs:** Undo appears to work but vote counts jump after undo.

### Pitfall 3: storageMapping includes ephemeral UI state

**What goes wrong:** The multiplayer store comment explicitly warns: "Ephemeral fields MUST NOT be here — they would thrash between participants." Adding any UI-only voting field (e.g., `isVotingPanelOpen`, `localVotePreview`) to `storageMapping` would cause thrashing.
**Why it happens:** Fields that look like state often belong in component-local state or Presence, not Storage.
**How to avoid:** `dotVotes` and `votingSession` are the only two vote fields that go in `storageMapping`. Any UI state for voting (e.g., which vote is being hovered) is component state, not store state.
**Warning signs:** Rapid re-renders or state resets when other participants interact.

### Pitfall 4: Multiplayer store DEFAULT_STATE not updated

**What goes wrong:** `multiplayer-canvas-store.ts` has its own `DEFAULT_STATE` const that is defined separately from the solo store. If `dotVotes` and `votingSession` are added to `CanvasState` but not to `DEFAULT_STATE` in the multiplayer store, TypeScript will error: `Property 'dotVotes' is missing in type '...' but required in type 'CanvasState'`.
**Why it happens:** The two stores share the `CanvasStore` type but have separate default state objects.
**How to avoid:** Update both `DEFAULT_STATE` objects (solo store line ~160, multiplayer store line ~71).
**Warning signs:** TypeScript compile error immediately.

### Pitfall 5: RoomEvent includes vote data payload (VOTE-06 violation)

**What goes wrong:** Including vote tally data in `VOTING_OPENED` or `VOTING_CLOSED` event payloads would allow a participant to inspect the broadcast event in devtools and see real-time tallies before the session closes.
**Why it happens:** Convenient to piggyback results on the close event.
**How to avoid:** `VOTING_CLOSED` payload is intentionally empty. Results are read from `votingSession.results` in CRDT storage, which is updated by the facilitator's `setVotingResults()` action. The Liveblocks CRDT sync delivers results to all clients simultaneously via storage mutation, not via a broadcast event.
**Warning signs:** VOTE-06 compliance failure — anonymous voting requirement violated.

## Code Examples

Verified patterns from official sources and existing codebase:

### Existing CanvasState + CanvasActions Extension Pattern

```typescript
// Source: src/stores/canvas-store.ts (existing pattern)
// All new fields follow: (1) add to CanvasState, (2) add to CanvasActions, (3) implement in createCanvasStore

export type CanvasState = {
  // ... existing fields ...
  dotVotes: DotVote[];           // Array of all votes cast this session
  votingSession: VotingSession;  // Session config + status + results
};

export type CanvasActions = {
  // ... existing actions ...
  castVote: (vote: Omit<DotVote, 'id'>) => void;
  retractVote: (voteId: string) => void;
  openVoting: (voteBudget?: number) => void;
  closeVoting: () => void;
  setVotingResults: (results: VotingResult[]) => void;
  resetVoting: () => void;
};
```

### Multiplayer Store Action Mirror Pattern

```typescript
// Source: src/stores/multiplayer-canvas-store.ts (existing pattern)
// Actions are identical to solo store EXCEPT isDirty is NOT set (Liveblocks handles persistence)

castVote: (vote) =>
  set((state) => ({
    dotVotes: [
      ...state.dotVotes,
      { ...vote, id: crypto.randomUUID() },
    ],
    // isDirty stays false in multiplayer — Liveblocks handles persistence
  })),
```

### RoomEvent Union Discriminated Type Pattern

```typescript
// Source: src/lib/liveblocks/config.ts (existing pattern)
RoomEvent:
  | { type: 'STEP_CHANGED'; stepOrder: number; stepName: string }
  | { type: 'VIEWPORT_SYNC'; x: number; y: number; zoom: number }
  | { type: 'TIMER_UPDATE'; state: 'running' | 'paused' | 'expired' | 'cancelled'; remainingMs: number; totalMs: number }
  | { type: 'SESSION_ENDED' }
  | { type: 'VOTING_OPENED'; voteBudget: number }  // NEW
  | { type: 'VOTING_CLOSED' };                     // NEW
```

### DEFAULT_VOTING_SESSION Constant

```typescript
// Matches the pattern of EMPTY_CRAZY_8S_SLOTS in crazy-8s-types.ts
export const DEFAULT_VOTING_SESSION: VotingSession = {
  status: 'idle',
  voteBudget: 2, // NNGroup 25%-of-options rule; overrides STACK.md default of 3 per STATE.md
  results: [],
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Liveblocks v1 `createRoomContext` | v3 global declaration augmentation (`declare global { interface Liveblocks { ... } }`) | Liveblocks v2+ | This project already uses v3 pattern; `RoomEvent` extension is via the global augmentation, not function parameter |

**Deprecated/outdated:**
- `createRoomContext`: The project uses the global `declare global { interface Liveblocks { ... } }` augmentation pattern from Liveblocks v3. New event types are added to the `RoomEvent` union inside this declaration in `src/lib/liveblocks/config.ts`.

## Open Questions

1. **Should `CanvasStoreProvider` be extended in Phase 59 or Phase 60?**
   - What we know: Provider needs `initialDotVotes?` and `initialVotingSession?` props to support session resume. These props won't be wired to any server load action until Phase 60 adds DB persistence for votes.
   - What's unclear: Whether adding unused props to the provider in Phase 59 is cleaner, or deferring to Phase 60 when the props will actually be consumed.
   - Recommendation: Add the props in Phase 59 as optional with undefined defaults — this keeps the provider aligned with the store's type signature and prevents a Phase 60 provider-update task from being blocking.

2. **`votingSession.voteBudget` is set at `openVoting()` time — can it change mid-session?**
   - What we know: VOTE-01 says facilitator can configure budget. VOTE-05 says facilitator opens/closes session. No requirement says budget can change while voting is open.
   - What's unclear: Whether `openVoting(voteBudget)` should be the only way to set budget, or whether a separate `setVoteBudget(n)` action is needed.
   - Recommendation: `openVoting(voteBudget?)` handles budget configuration at session open. No separate `setVoteBudget` action needed for Phase 59 — Phase 60 UI can call `resetVoting()` + `openVoting(newBudget)` if a facilitator changes their mind before opening.

## Sources

### Primary (HIGH confidence)

- Existing codebase — `src/stores/canvas-store.ts` — CanvasState/CanvasActions/createCanvasStore pattern
- Existing codebase — `src/stores/multiplayer-canvas-store.ts` — storageMapping, liveblocks() middleware, isDirty no-op pattern
- Existing codebase — `src/lib/liveblocks/config.ts` — RoomEvent discriminated union, global declaration augmentation
- Existing codebase — `src/lib/canvas/crazy-8s-types.ts` — type file co-location pattern
- `.planning/STATE.md` — locked decisions: default voteBudget = 2, storageMapping ownership boundary, VOTING_OPENED/VOTING_CLOSED are broadcast-only

### Secondary (MEDIUM confidence)

- `.planning/REQUIREMENTS.md` — VOTE-01, VOTE-05, VOTE-06, VOTE-07 requirements driving type design

### Tertiary (LOW confidence)

- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all decisions verified from existing codebase
- Architecture: HIGH — direct extension of an established, functioning pattern with no ambiguity
- Pitfalls: HIGH — all pitfalls derived from reading the actual codebase (missing DEFAULT_STATE update, temporal partialize, etc.)

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (stable — no fast-moving external dependencies)
