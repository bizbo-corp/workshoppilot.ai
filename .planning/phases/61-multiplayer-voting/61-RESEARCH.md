# Phase 61: Multiplayer Voting - Research

**Researched:** 2026-03-01
**Domain:** Liveblocks CRDT storage + broadcast events + React presence (voting lifecycle, anonymity, completion indicators)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Vote Anonymity & Visibility**
- During open voting, all participants see aggregate vote counts on each sketch (total badge number), but no attribution of who voted for what
- Facilitator has a "god view" — can see which participant placed which votes during open voting
- On results reveal (voting closed), totals appear instantly for all participants — no staggered/animated reveal
- After results are shown, facilitator has an optional toggle to reveal individual vote attribution to all participants

**Timer & Voting Lifecycle**
- Timer and voting are coupled: starting a voting timer opens voting for all participants; timer expiry closes voting and triggers results reveal simultaneously
- Facilitator can manually close voting early before timer expires (button cancels timer + triggers reveal)
- Re-voting supported: facilitator can re-open voting after results reveal, which performs a full reset — all participants' votes are cleared and everyone gets fresh budgets
- Existing timer infrastructure (countdown-timer.tsx, facilitator-controls.tsx with presets + custom input) is reused — voting hooks into the existing TIMER_UPDATE broadcast events

**Completion Indicators**
- Visible to ALL participants, not facilitator-only
- Displayed as a checkmark overlay on participant avatars in the existing presence bar
- "Complete" = participant has used their entire vote budget (e.g., 4/4 votes placed)
- Dynamic: if a participant retracts a vote after being marked complete, their checkmark disappears

**Sync & Edge Cases**
- Late joiners (participant joins while voting is open) can vote immediately with full budget; they see the timer at its current position
- Votes are persisted in Liveblocks CRDT storage — disconnect/reconnect preserves existing votes and remaining budget seamlessly
- Idea selection (checkboxes to advance ideas to Step 8c) is facilitator-only in multiplayer; participants see results but cannot change the selection

### Claude's Discretion
- God view UI design for facilitator (how attribution info is displayed without cluttering)
- Attribution reveal toggle placement and interaction pattern
- How "Start Voting" integrates with existing timer preset UI (combined control vs. separate)
- Checkmark overlay styling on presence avatars
- How late-joiner timer sync is handled (derive from CRDT state vs. broadcast catchup)
- CRDT schema design for multiplayer vote storage

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VOTE-10 | User can dot-vote in multiplayer workshops with real-time sync | `dotVotes` and `votingSession` are already in `storageMapping` in `multiplayer-canvas-store.ts` — CRDT sync is wired but needs facilitator broadcast coupling to activate |
| VOTE-11 | Facilitator can set countdown timer that auto-closes voting on expiry | `facilitator-controls.tsx` has full timer infrastructure; need to intercept `TIMER_UPDATE` expired event to call `closeVoting()` + compute results; `VOTING_OPENED`/`VOTING_CLOSED` broadcast events already declared in `config.ts` |
| VOTE-12 | Facilitator can see which participants have placed all votes (completion indicator) | Completion is derivable from `dotVotes` CRDT (per-voter count vs. `votingSession.voteBudget`); presence bar avatar checkmarks need a vote-completion data source — either Presence field or derived from CRDT `dotVotes` |
</phase_requirements>

---

## Summary

Phase 61 extends the solo voting flow (Phase 60) to multiplayer. The good news: almost all required infrastructure is already in place. The `dotVotes` and `votingSession` fields are both in `storageMapping` in `multiplayer-canvas-store.ts`, meaning Liveblocks CRDT sync for votes is already wired — Phase 61 is about connecting the UI controls and adding the multiplayer-specific behaviors (facilitator opens/closes voting via timer coupling, anonymity enforcement, completion indicators).

The core technical work is:
1. **Timer-voting coupling**: Hook `FacilitatorControls.startTimer()` to also broadcast `VOTING_OPENED` and call `openVoting()`. Hook the timer `expired` handler to call `closeVoting()`, compute results, and broadcast `VOTING_CLOSED`.
2. **Participant voting listener**: Add a `VotingEventListener` renderless component (pattern from `StepChangedListener`) that listens for `VOTING_OPENED`/`VOTING_CLOSED` broadcast events and triggers the appropriate store actions + UI transitions for participants.
3. **Anonymity**: Participants already only see `dotVotes` array aggregated by slotId (Phase 60 VotingHud/Crazy8sGrid). The god view for the facilitator requires reading `dotVotes` with `voterId` intact — this is available in CRDT storage to all clients, so god view is a UI rendering decision (show per-voter attribution in facilitator view only).
4. **Completion indicators**: Derive completion per voter from `dotVotes` (count by `voterId` vs. `votingSession.voteBudget`). Surface this in `PresenceBar` using Liveblocks `useOthers` + the CRDT `dotVotes` via `useCanvasStore`.
5. **VotingHud multiplayer adaptation**: In multiplayer, the "Start Voting" button in `VotingHud` must be facilitator-only and must trigger the timer dropdown (not open voting directly). Participants see no HUD controls, only their budget display.

**Primary recommendation:** Wire timer expiry to `closeVoting()` + results computation in `FacilitatorControls`, add a `VotingEventListener` renderless component in `MultiplayerRoomInner`, derive completion from CRDT `dotVotes`, and make `VotingHud` multiplayer-aware via `useMultiplayerContext`.

---

## Standard Stack

### Core (already in codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@liveblocks/react` | ^3.14.0 | `useOthers`, `useEventListener`, `useBroadcastEvent`, `useOthersListener` | All Liveblocks React hooks — already used in PresenceBar, CountdownTimer, FacilitatorControls |
| `@liveblocks/zustand` | ^3.14.0 | `liveblocks()` middleware + `storageMapping` | Already wires `dotVotes` + `votingSession` to CRDT — no new install needed |
| Zustand | (existing) | `useCanvasStore` selector reads for derived completion state | Store already has all voting actions |

### Supporting (already in codebase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `useMultiplayerContext` | local | `isFacilitator`, `isMultiplayer` flags | Gate facilitator-only UI (Start Voting button, god view, Close Voting button) |
| `shallow` from `@liveblocks/react` | ^3.14.0 | Prevent `useOthers` selector re-renders | Required whenever `useOthers` returns an array/object |

### No New Installs Required
All packages needed for Phase 61 are already installed.

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. Changes are within existing files:

```
src/
├── lib/liveblocks/config.ts          # Add VOTING_OPENED/VOTING_CLOSED (already declared, verify payload)
├── components/workshop/
│   ├── multiplayer-room.tsx          # Add VotingEventListener renderless component
│   ├── facilitator-controls.tsx      # Hook timer start → VOTING_OPENED broadcast + openVoting()
│   │                                 # Hook timer expiry → VOTING_CLOSED broadcast + closeVoting() + results
│   ├── voting-hud.tsx                # Make multiplayer-aware: facilitator-only controls
│   ├── presence-bar.tsx              # Add completion checkmark overlay on avatars
│   └── voting-results-panel.tsx      # Disable selection checkboxes for participants in multiplayer
```

### Pattern 1: VotingEventListener Renderless Component (mirrors StepChangedListener)

**What:** A renderless component rendered inside `MultiplayerRoomInner` that listens for `VOTING_OPENED` and `VOTING_CLOSED` broadcast events and drives store actions. This is exactly how `StepChangedListener` and `SessionEndedListener` work.

**When to use:** Any cross-participant event that needs to update shared state or trigger UI transitions.

**Example:**
```typescript
// Source: mirrors existing StepChangedListener in multiplayer-room.tsx

function VotingEventListener() {
  const { isFacilitator } = useMultiplayerContext();
  const openVoting = useCanvasStore((s) => s.openVoting);
  const closeVoting = useCanvasStore((s) => s.closeVoting);
  const setVotingResults = useCanvasStore((s) => s.setVotingResults);
  const dotVotes = useCanvasStore((s) => s.dotVotes);
  const crazy8sSlots = useCanvasStore((s) => s.crazy8sSlots);

  useEventListener(({ event }) => {
    if (event.type === 'VOTING_OPENED') {
      openVoting(event.voteBudget);
    }
    if (event.type === 'VOTING_CLOSED') {
      // Compute results from CRDT dotVotes (same logic as VotingHud.handleCloseVoting)
      const voteCounts = new Map<string, number>();
      for (const vote of dotVotes) {
        voteCounts.set(vote.slotId, (voteCounts.get(vote.slotId) ?? 0) + 1);
      }
      // ... rank assignment + closeVoting() + setVotingResults()
    }
  });

  return null;
}
```

**Critical note:** `useEventListener` does NOT fire for the broadcasting user (the facilitator). The facilitator must call `openVoting()`/`closeVoting()` directly in `FacilitatorControls`. Participants receive it via the listener.

### Pattern 2: Timer-Voting Coupling in FacilitatorControls

**What:** Intercept timer `startTimer()` to also broadcast `VOTING_OPENED` + call `openVoting()`. Intercept the `setTimerState('expired')` path to broadcast `VOTING_CLOSED` + call `closeVoting()` + compute results.

**When to use:** Only when `votingSession.status === 'idle'` should "start timer" also start voting. Gate on a "voting timer" mode that activates when in the ideation step's idea-selection phase.

**Key design decision (Claude's discretion):** The simplest approach is a prop `onVotingTimerStart` / `onVotingTimerExpired` passed from `IdeationSubStepContainer` to `FacilitatorControls`. This avoids global coupling — `FacilitatorControls` stays a presentational component that calls callbacks, and `IdeationSubStepContainer` owns the voting-timer coupling logic.

**Alternative:** Add a `votingMode: boolean` prop to `FacilitatorControls` that, when true, makes the timer start also trigger `VOTING_OPENED`. This is slightly simpler.

```typescript
// In FacilitatorControls, inside startTimer(), after broadcasting TIMER_UPDATE:
if (votingMode && votingStatus === 'idle') {
  broadcast({ type: 'VOTING_OPENED', voteBudget: currentVoteBudget });
  openVoting(currentVoteBudget); // facilitator's own store
}

// In the timer expiry path (setTimerState('expired')):
if (votingMode && votingStatus === 'open') {
  // Compute results from store snapshot
  broadcast({ type: 'VOTING_CLOSED' });
  closeVoting();
  setVotingResults(computedResults);
}
```

**Challenge:** `FacilitatorControls` currently lives in `multiplayer-room.tsx` hierarchy but doesn't read from `useCanvasStore`. It will need `openVoting`, `closeVoting`, `setVotingResults`, `dotVotes`, and `votingSession` from the store. These can be passed as props from the parent or read directly via `useCanvasStore`.

### Pattern 3: Completion Checkmarks via CRDT + useCanvasStore + useOthers

**What:** Derive which participants have placed all votes by cross-referencing `dotVotes` (CRDT, available to all) with each participant's Liveblocks `userId`.

**The key insight:** Each `DotVote` has a `voterId` field (Liveblocks userId: `user_xxx` for owners, `guest-xxx` for participants). Each Liveblocks user has an `.id` field (`UserMeta.id`). These match. So completion for participant P is: `dotVotes.filter(v => v.voterId === P.id).length >= votingSession.voteBudget`.

**PresenceBar integration:**

```typescript
// In PresenceBar — add useCanvasStore selectors alongside existing useOthers
const dotVotes = useCanvasStore((s) => s.dotVotes);
const votingSession = useCanvasStore((s) => s.votingSession);

// Derive completion set — keyed by Liveblocks userId
const completedVoterIds = React.useMemo(() => {
  if (votingSession.status !== 'open') return new Set<string>();
  const countByVoter = new Map<string, number>();
  for (const vote of dotVotes) {
    countByVoter.set(vote.voterId, (countByVoter.get(vote.voterId) ?? 0) + 1);
  }
  const completed = new Set<string>();
  countByVoter.forEach((count, voterId) => {
    if (count >= votingSession.voteBudget) completed.add(voterId);
  });
  return completed;
}, [dotVotes, votingSession]);

// Then in avatar rendering, check completedVoterIds.has(p.id)
// where p.id is the Liveblocks userId from useOthers/useSelf
```

**Problem with `p.id` in PresenceBar:** The current `PresenceBar` reads `others` via `useOthers()` with a selector that maps `connectionId`, `name`, `color`, `role` — but NOT the Liveblocks `userId` (`.id`). This needs to be added to the selector.

```typescript
// Current (missing userId):
const others = useOthers(
  (others) => others.map((o) => ({ connectionId: o.connectionId, name: ..., color: ..., role: ... })),
  shallow,
);

// Required addition (add id):
const others = useOthers(
  (others) => others.map((o) => ({ connectionId: o.connectionId, id: o.id, name: ..., color: ..., role: ... })),
  shallow,
);

// And for self:
const self = useSelf((me) => ({ id: me.id, name: ..., color: ..., role: ... }));
```

The `o.id` is the Liveblocks `userId` set by the auth endpoint — this matches `DotVote.voterId`.

### Pattern 4: VotingHud Multiplayer Awareness

**What:** In solo, VotingHud shows "Start Voting" to the only user. In multiplayer, "Start Voting" should only appear for the facilitator (tied to timer, not a direct button). Participants see only the budget display.

**Integration point:** `VotingHud` already reads from `useCanvasStore`. Add `useMultiplayerContext()` to gate the "Start Voting" button and "Close Voting" button.

```typescript
const { isFacilitator, isMultiplayer } = useMultiplayerContext();

// In idle state render:
// Solo OR multiplayer facilitator: show Start Voting (but in multiplayer, this may route to timer)
// Multiplayer participant: render nothing in idle state

// In open state render:
// Close Voting button: facilitator-only in multiplayer
// Budget display: all participants
```

**Note:** In multiplayer, "Close Voting" in VotingHud (when budget exhausted) should be facilitator-only. Participants with all votes placed just see "All votes placed" — the actual close is triggered by the facilitator (via timer expiry or manual close button in FacilitatorControls).

### Pattern 5: VotingResultsPanel Multiplayer Access Control

**What:** In solo, the "Continue with N ideas" confirmation is the participant's own action. In multiplayer, idea selection (checkboxes to advance to Step 8c) is **facilitator-only**. Participants see results read-only.

**Implementation:** Add `useMultiplayerContext()` to `VotingResultsPanel`. When `isMultiplayer && !isFacilitator`, disable checkboxes and hide the "Continue" button. Show a message like "Waiting for facilitator to confirm selection..."

### Pattern 6: God View for Facilitator

**What:** During open voting, the facilitator sees per-participant vote attribution layered onto the sketches. The requirement says it should not look dramatically different — "additional info layered on."

**Implementation (Claude's discretion):** Small voter avatar chips under each sketch's vote count badge, visible only when `isFacilitator && votingSession.status === 'open'`. The `dotVotes` array contains `voterId` for all votes — map `voterId` to participant color/name using `useOthers` + `useSelf`.

**Attribution reveal toggle (post-close):** A small toggle in `VotingResultsPanel` header area, facilitator-only. When toggled on, each result card shows which voters voted for it (avatar chips). When toggled off, only totals shown. Default: off.

### Anti-Patterns to Avoid

- **Broadcasting state instead of using CRDT:** Do not encode vote tallies in broadcast events (VOTING_CLOSED payload). STATE.md decision: "VOTING_CLOSED carries no vote tally payload (VOTE-06 anonymous voting compliance) — results read from CRDT storage." Results must always be computed from `dotVotes` in CRDT.
- **Presence for votes:** Do not put vote counts or vote-placed status in Presence. Presence is ephemeral — disconnects clear it. Votes are durable CRDT data in `dotVotes`.
- **Per-participant `openVoting()` broadcast reaction:** Do not have all participants call `openVoting()` in response to `VOTING_OPENED`. Instead, the CRDT `votingSession.status` update (made by facilitator) propagates via Liveblocks storageMapping automatically. The broadcast event is purely for UI transitions (show toast, update local UI state). But if `VotingEventListener` calls `openVoting()`, that's also fine since it just sets the same status — be consistent.
- **Late joiner timer sync:** Do not attempt to sync the timer position for late joiners via Presence or CRDT — the existing approach (broadcast catchup on next TIMER_UPDATE which comes every second) is sufficient. The CONTEXT.md defers this to Claude's discretion: "derive from CRDT state vs. broadcast catchup" — the broadcast approach is simpler and already works.
- **Overriding storageMapping fields from multiple clients:** All voting store actions (`castVote`, `retractVote`, `openVoting`, `closeVoting`, `setVotingResults`, `resetVoting`) modify storageMapping fields. Liveblocks CRDT handles concurrent mutations. Do not add optimistic client locks — trust the CRDT.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Real-time vote sync | Custom WebSocket vote sync | Existing `storageMapping: { dotVotes: true, votingSession: true }` | Already wired in `createMultiplayerCanvasStore` — Phase 59 confirmed this works |
| Completion detection | Polling or WebSocket ping | Derive from `dotVotes` CRDT via `useCanvasStore` selector | CRDT syncs `dotVotes` to all clients automatically |
| Timer broadcast | Custom timer server | Existing `FacilitatorControls` + `TIMER_UPDATE` events + `CountdownTimer` | 200+ lines of battle-tested timer code |
| Vote conflict resolution | Custom merge logic | Liveblocks CRDT (array append/remove) | CRDTs handle concurrent vote cast/retract automatically |
| Participant identity | Custom session tracking | `DotVote.voterId` matches Liveblocks `UserMeta.id` | Auth endpoint already sets userId correctly |

**Key insight:** All the durable infrastructure for multiplayer voting was built in Phase 59. Phase 61 is the UI layer on top — coupling controls to the already-working CRDT.

---

## Common Pitfalls

### Pitfall 1: VotingHud "Start Voting" Opens Voting Without Timer
**What goes wrong:** In multiplayer, if `VotingHud` shows "Start Voting" and a participant (or even facilitator) clicks it, `openVoting()` is called locally — but no `VOTING_OPENED` broadcast goes out. Other participants' stores don't update their UI (though CRDT `votingSession.status` does change, so vote casting would still work, but UI doesn't know to show the budget HUD).
**Why it happens:** Phase 60 wired `VotingHud` for solo use — the "Start Voting" button calls `openVoting()` directly with no broadcast.
**How to avoid:** In multiplayer, the "Start Voting" path must go through `FacilitatorControls` timer start, which broadcasts `VOTING_OPENED`. Either hide the VotingHud "Start Voting" button in multiplayer for all users, or route the facilitator's click through to the timer UI.
**Warning signs:** Voting opens on facilitator's screen but participants see no budget HUD.

### Pitfall 2: VOTING_CLOSED Listener Reads Stale dotVotes
**What goes wrong:** `VotingEventListener` reads `dotVotes` from the store at event-listener definition time (closure), not at call time. If votes were cast after the listener was set up, the `dotVotes` reference may be stale.
**Why it happens:** React closures capture state at definition time. `useEventListener` callback captures the `dotVotes` reference from when the component rendered.
**How to avoid:** Use `useCanvasStoreApi()` to read `dotVotes` at call time inside the event handler: `const state = storeApi.getState(); const dotVotes = state.dotVotes;`
**Warning signs:** Results computed with wrong vote counts, or empty results on closed voting.

### Pitfall 3: Completion Checkmark Uses connectionId Instead of userId
**What goes wrong:** `completedVoterIds` is keyed by Liveblocks `userId` (`DotVote.voterId`), but the presence bar avatar rendering loop uses `connectionId`. A participant's `connectionId` changes on reconnect; `userId` does not.
**Why it happens:** The current `PresenceBar` maps `connectionId` as the React key but doesn't expose `id` (userId). Easy to confuse the two.
**How to avoid:** Ensure `useOthers` selector extracts `o.id` (not `o.connectionId`) alongside `o.connectionId`. Key the checkmark lookup by `o.id`.
**Warning signs:** Checkmarks disappear for reconnected participants even though they have all votes placed.

### Pitfall 4: Facilitator's Own VOTING_OPENED Broadcast Not Received by Self
**What goes wrong:** `useEventListener` does NOT fire for the sender's own broadcast events (Liveblocks design). If `FacilitatorControls` broadcasts `VOTING_OPENED` and `VotingEventListener` calls `openVoting()`, the facilitator's store is NOT updated via the listener — it must be updated directly.
**Why it happens:** Liveblocks intentionally excludes self from broadcast delivery to prevent loops.
**How to avoid:** `FacilitatorControls` must call both `broadcast({ type: 'VOTING_OPENED', voteBudget })` AND `openVoting(voteBudget)` directly. Participants receive the broadcast and call `openVoting` from the listener.
**Warning signs:** Facilitator's budget HUD doesn't appear after starting voting.

### Pitfall 5: Results Panel Checkboxes Available to Participants
**What goes wrong:** `VotingResultsPanel` shows "Continue with N ideas" to all users. Participants can select ideas and trigger `onConfirmSelection`, which would push them into brain-rewriting independently.
**Why it happens:** Phase 60 built the panel for solo use where the single user has full authority.
**How to avoid:** Gate `ResultCard.onClick`, checkboxes, and the "Continue" button behind `!isMultiplayer || isFacilitator`. Show participants a "Waiting for facilitator..." message instead.
**Warning signs:** Participants navigating to brain-rewriting before the facilitator confirms selection.

### Pitfall 6: Re-Vote Reset Not Broadcast
**What goes wrong:** Facilitator clicks "Vote Again" → `handleReVote()` in `IdeationSubStepContainer` calls `state.resetVoting()` + `state.openVoting()` locally. These write to `storageMapping` CRDT, so participants' stores do update. However, participants don't receive a UI notification and their `VotingHud` may not re-render correctly.
**Why it happens:** `resetVoting()` changes storageMapping — Liveblocks syncs it. But participants may be on the results panel with no visible path back to the voting UI.
**How to avoid:** Broadcast a `VOTING_RESET` event (or reuse `VOTING_OPENED`) so participants' `VotingEventListener` can handle the transition — e.g., clearing the results panel and showing the budget HUD again. Alternative: listen to `votingSession.status` changes in the store (which CRDT syncs) and derive UI state from that alone, without needing a broadcast.
**Warning signs:** After re-vote, some participants still see results panel while voting is live.

---

## Code Examples

Verified patterns from existing codebase:

### Reading userId vs connectionId in PresenceBar
```typescript
// Source: src/components/workshop/presence-bar.tsx (existing pattern, needs id added)
const others = useOthers(
  (others) =>
    others.map((o) => ({
      connectionId: o.connectionId,
      id: o.id,               // ADD THIS — Liveblocks userId, matches DotVote.voterId
      name: o.info?.name ?? 'Unknown',
      color: o.info?.color ?? '#6366f1',
      role: o.info?.role ?? 'participant',
    })),
  shallow,
);

const self = useSelf((me) => ({
  id: me.id,                  // ADD THIS
  name: me.info?.name ?? 'You',
  color: me.info?.color ?? '#6366f1',
  role: me.info?.role ?? 'participant',
}));
```

### Completion Derivation (new logic for PresenceBar)
```typescript
// Source: based on src/lib/canvas/voting-types.ts (DotVote.voterId)
// and src/lib/liveblocks/config.ts (UserMeta.id)
const dotVotes = useCanvasStore((s) => s.dotVotes);
const votingSession = useCanvasStore((s) => s.votingSession);

const completedVoterIds = React.useMemo(() => {
  if (votingSession.status !== 'open') return new Set<string>();
  const countByVoter = new Map<string, number>();
  for (const vote of dotVotes) {
    countByVoter.set(vote.voterId, (countByVoter.get(vote.voterId) ?? 0) + 1);
  }
  const completed = new Set<string>();
  countByVoter.forEach((count, voterId) => {
    if (count >= votingSession.voteBudget) completed.add(voterId);
  });
  return completed;
}, [dotVotes, votingSession.status, votingSession.voteBudget]);
```

### VotingEventListener (renderless, new)
```typescript
// Source: mirrors StepChangedListener in src/components/workshop/multiplayer-room.tsx
function VotingEventListener() {
  const { isFacilitator } = useMultiplayerContext();
  const openVoting = useCanvasStore((s) => s.openVoting);
  const closeVoting = useCanvasStore((s) => s.closeVoting);
  const setVotingResults = useCanvasStore((s) => s.setVotingResults);
  const storeApi = useCanvasStoreApi(); // read at call time to avoid stale closure

  useEventListener(({ event }) => {
    if (event.type === 'VOTING_OPENED') {
      // Participants only — facilitator already called openVoting() directly
      openVoting(event.voteBudget);
    }
    if (event.type === 'VOTING_CLOSED') {
      const { dotVotes, crazy8sSlots } = storeApi.getState();
      // ... compute results (same logic as VotingHud.handleCloseVoting) ...
      closeVoting();
      setVotingResults(results);
    }
  });

  return null;
}
```

### Timer Expiry → Voting Close in FacilitatorControls
```typescript
// Source: src/components/workshop/facilitator-controls.tsx (existing timer expiry path)
// Current expired handler (lines ~103-108):
if (next <= 0) {
  if (intervalRef.current) clearInterval(intervalRef.current);
  setTimerState('expired');
  broadcast({ type: 'TIMER_UPDATE', state: 'expired', remainingMs: 0, totalMs: ms });
  playChime();
  // ADD: if voting mode active, also close voting
  if (votingMode && votingSessionRef.current?.status === 'open') {
    broadcast({ type: 'VOTING_CLOSED' });
    onVotingClose?.(); // callback to IdeationSubStepContainer to compute results
  }
  setTimeout(() => { setTimerState('idle'); setRemainingMs(0); }, 5000);
  return 0;
}
```

**Note on votingSessionRef:** `FacilitatorControls` uses intervals and closures. To avoid stale state, pass votingSession status via a ref (like `intervalRef` pattern already used).

### Aggregate Vote Count Display (existing solo pattern, already anonymous)
```typescript
// Source: Crazy8sGrid already shows aggregate counts, no attribution
// Pattern: filter dotVotes by slotId (not voterId) for public display
const slotVoteCount = dotVotes.filter((v) => v.slotId === slot.slotId).length;
// For facilitator god view, additionally show per-voter:
const slotVoterIds = isFacilitator ? dotVotes.filter((v) => v.slotId === slot.slotId).map(v => v.voterId) : [];
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom WebSocket for real-time sync | Liveblocks CRDT storageMapping | Phase 56+ | No manual conflict resolution; Liveblocks handles concurrent edits |
| Poll DB for vote state | CRDT arrays (`dotVotes`, `votingSession`) | Phase 59 | Sub-50ms sync latency; offline resilience |
| Separate multiplayer vote store | Same Zustand actions in multiplayer store | Phase 59 | `castVote`, `retractVote`, `openVoting`, `closeVoting` work identically in solo and multiplayer |

**Deprecated/outdated:**
- `temporal` (zundo) middleware: removed from `createMultiplayerCanvasStore` — undo/redo disabled for multiplayer per STATE.md. Do not attempt to re-add.

---

## Open Questions

1. **How does "Start Voting" integrate with the timer UI?**
   - What we know: Timer UI is a dropdown on `FacilitatorControls` with preset buttons. Voting must be coupled to timer start.
   - What's unclear: Does clicking "Start Voting" open the timer preset dropdown (combined flow), or does the timer preset button also start voting automatically when in the idea-selection phase?
   - Recommendation: Add a `votingMode: boolean` prop to `FacilitatorControls` (passed from `IdeationSubStepContainer` when `currentPhase === 'idea-selection'`). When `votingMode` is true, timer start also broadcasts `VOTING_OPENED`. The facilitator sees no separate "Start Voting" button — starting the timer IS starting voting.

2. **How do we handle the attribution reveal toggle state across participants?**
   - What we know: The reveal toggle is facilitator-only, optional, post-close.
   - What's unclear: Should the toggle state be local to the facilitator (just showing them attribution) or shared via broadcast to show all participants?
   - Recommendation: Per CONTEXT.md — "facilitator has an optional toggle to reveal individual vote attribution to all participants" — this implies a broadcast. Add a `VOTE_ATTRIBUTION_REVEALED: boolean` broadcast event or store it in a simple Presence field (ephemeral is fine here since it's toggle UI state).

3. **Late joiner timer position**
   - What we know: Timer broadcasts `TIMER_UPDATE` every second. Late joiner will receive the next broadcast within ~1 second.
   - What's unclear: Is a 0-1 second gap acceptable, or do we need to query current timer state on join?
   - Recommendation: The existing approach (next TIMER_UPDATE arrives within 1 second) is sufficient. This matches the existing `CountdownTimer` design and requires zero additional work.

4. **VotingHud in multiplayer: what do participants see in idle state?**
   - What we know: In solo, `VotingHud` shows "Start Voting" in idle state. In multiplayer, participants cannot start voting.
   - What's unclear: Should participants see nothing (null) in idle state, or a "Waiting for voting to start..." indicator?
   - Recommendation: Return null for participants in idle multiplayer state. The facilitator will start voting via timer. No need for a waiting indicator.

---

## Validation Architecture

> `workflow.nyquist_validation` not found in config.json — config.json has `workflow.research`, `workflow.plan_check`, `workflow.verifier` but no `nyquist_validation` key.

Skipping Validation Architecture section — `nyquist_validation` is not configured.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/stores/multiplayer-canvas-store.ts` — confirmed `dotVotes`, `votingSession` in `storageMapping`; all voting actions present
- Codebase: `src/lib/liveblocks/config.ts` — `VOTING_OPENED`, `VOTING_CLOSED` broadcast events already declared; `UserMeta.id` is Liveblocks userId
- Codebase: `src/lib/canvas/voting-types.ts` — `DotVote.voterId` confirmed as Liveblocks userId format
- Codebase: `src/components/workshop/presence-bar.tsx` — existing `useOthers`/`useSelf` pattern; confirmed `o.id` is accessible but not currently read
- Codebase: `src/components/workshop/facilitator-controls.tsx` — full timer infrastructure with broadcast; identified `startTimer` + expiry hooks
- Codebase: `src/components/workshop/multiplayer-room.tsx` — `VotingEventListener` placement and pattern (mirrors `StepChangedListener`)
- Codebase: `src/components/workshop/voting-hud.tsx` — existing solo VotingHud, gaps identified for multiplayer
- Liveblocks React API Reference (WebFetch): `useOthers(selector, shallow)`, `useSelf(selector)`, `useEventListener` — confirmed hooks and selector patterns; `o.id` is the Liveblocks userId

### Secondary (MEDIUM confidence)
- WebSearch + official Liveblocks docs: CRDT storageMapping conflict resolution confirmed; broadcast event sender does not receive own event confirmed
- STATE.md decision: "VOTING_CLOSED carries no vote tally payload (VOTE-06 anonymous voting compliance) — results read from CRDT storage" — confirmed pattern for VOTING_CLOSED

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed; versions confirmed in package.json
- Architecture: HIGH — patterns directly derived from existing codebase (StepChangedListener, PresenceBar, FacilitatorControls)
- Pitfalls: HIGH — derived from direct code inspection of async closure patterns, Liveblocks self-broadcast behavior, and CRDT auth endpoint setup

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (Liveblocks 3.x API is stable; no breaking changes expected in 30 days)
