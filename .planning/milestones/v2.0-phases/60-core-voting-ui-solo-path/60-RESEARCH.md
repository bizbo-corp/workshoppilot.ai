# Phase 60: Core Voting UI + Solo Path - Research

**Researched:** 2026-02-28
**Domain:** React UI components, Zustand state consumption, canvas persistence
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Vote Placement**
- Dedicated vote button ("+1" or dot icon) on each sketch card — not tap-on-sketch
- Vote count shown as a circular badge on the top-right corner of each sketch card
- Clicking the badge retracts one vote (badge doubles as display + undo control)
- Stacking: badge number increments with each vote (e.g., "3"), no progressive visual emphasis on the card itself

**Budget HUD**
- Floating pill positioned top-center of the canvas area, always visible during voting
- Format: count + dots visual (e.g., "●● ○○" with "2 of 4 remaining" text)
- At zero votes: pill text changes to "All votes placed" with a "Close Voting" CTA button
- Voting requires explicit "Start Voting" button from facilitator/solo user — does not auto-open on step entry

**Results Reveal**
- Separate results panel/overlay (not in-place grid reordering)
- Simple fade-in animation, no staggered reveal
- Each result shows: sketch thumbnail + vote count + rank position + original slot label + description
- Zero-vote sketches shown at bottom, visually dimmed

**Idea Selection**
- Checkboxes on each sketch in the results list to select ideas for advancement
- System suggests top-N voted sketches pre-checked, but user can add/remove freely
- After confirming selections, navigate to Step 8c (Brain Rewriting) with selected ideas
- User can re-open voting after closing (reset results, vote again) — forgiving for solo flow

### Claude's Discretion
- Exact vote button icon/styling
- Badge animation on vote/retract
- Results panel layout (slide-in direction, width)
- Top-N suggestion threshold
- "Start Voting" button placement and intro copy
- How selected ideas are passed to Step 8c

### Deferred Ideas (OUT OF SCOPE)
- Multiplayer real-time vote sync — Phase 61
- Facilitator countdown timer — Phase 61
- Participant completion indicators — Phase 61
- Anonymous vote hiding during open voting — Phase 61
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VOTE-02 | User can place multiple votes on the same Crazy 8s sketch (stacking) | Store `castVote` action already supports stacking — `dotVotes` array allows multiple DotVote entries per slotId. UI needs a "+1" button per card that calls `castVote` while `remainingBudget > 0`. |
| VOTE-03 | User can see visual dot indicators on each sketch showing vote count | Derive `voteCount = dotVotes.filter(v => v.slotId === slot.slotId && v.voterId === userId).length` per slot. Render as a circular badge top-right on each sketch card in `Crazy8sGrid`. |
| VOTE-04 | User can see remaining vote budget HUD during voting | Derive `remainingBudget = votingSession.voteBudget - myVotes.length`. Render floating pill at top-center of canvas area. Show dot glyphs (●/○). |
| VOTE-08 | Facilitator manually selects which ideas advance to Step 9 | Results panel with checkboxes. On confirm, call `setSelectedSlotIds(checkedIds)`. This overwrites the previous "idea-selection" phase selection. No Step 9 nav trigger — VOTE-08 just writes to store/canvas. |
| VOTE-09 | User can dot-vote in solo workshops (self-prioritization) | Solo path uses Zustand `canvas-store.ts` with `isDirty` persistence. VoterId in solo mode is the Clerk userId from `useUser()` (or a stable local ID). |
| VOTE-13 | User can undo a vote by clicking a voted sketch (retract, return to budget) | Clicking the vote-count badge calls `retractVote(lastVoteId)` where `lastVoteId` is the most recent DotVote.id for that slotId from this voter. Returns one vote to budget. |
</phase_requirements>

---

## Summary

Phase 60 builds the complete solo voting UI on top of the Phase 59 store foundation. All the core data primitives exist: `DotVote`, `VotingSession`, `VotingResult` types in `src/lib/canvas/voting-types.ts`; six store actions (`castVote`, `retractVote`, `openVoting`, `closeVoting`, `setVotingResults`, `resetVoting`) in both `canvas-store.ts` (solo) and `multiplayer-canvas-store.ts`. Phase 60 is purely a UI layer — it consumes the store but does NOT add new store actions.

The key insight is that Step 8 (ideation) is rendered by `IdeationSubStepContainer`, NOT by the standard `StepContainer` canvas path. The voting UI must be embedded within `IdeationSubStepContainer` because that's where the Crazy8sGrid lives (via `MindMapCanvas`'s Crazy8sCanvas integration). The voting HUD and "Start Voting" button must be injected at the `Crazy8sCanvas` level since that's the component that renders the grid wrapper.

There are two structural gaps that must be closed: (1) `dotVotes` and `votingSession` are not included in `saveCanvasState` / `loadCanvasState` — they will be lost on page refresh; (2) the page.tsx `CanvasStoreProvider` does not pass `initialDotVotes` or `initialVotingSession` props down, so restored state would never hydrate. Both require coordinated fixes across `canvas-actions.ts`, `page.tsx`, and `canvas-store-provider.tsx`.

**Primary recommendation:** Build the voting UI as two new standalone components (`VotingHud` + `VotingResultsPanel`) that read from `useCanvasStore`, then wire them into `Crazy8sCanvas`. This keeps the voting concern isolated and reusable for Phase 61 (multiplayer). Fix persistence in a separate task before or alongside UI work.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 (project) | Component rendering | Already in use project-wide |
| Zustand | (project) | State reads via `useCanvasStore` | All canvas state lives here |
| Tailwind 4 | (project) | Styling | Project standard |
| shadcn/ui | (project) | `Button`, `Checkbox`, `Badge` primitives | Project standard |
| Lucide React | (project) | Icons (Circle, Vote, Check icons) | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@clerk/nextjs` | (project) | `useUser()` for voterId in solo mode | Solo voter identity |
| `cn` from `@/lib/utils` | (project) | Conditional class composition | All components |
| `sonner` toast | (project) | User feedback (e.g., "Voting closed") | Status notifications |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Circular badge (custom div) | shadcn Badge | Custom div gives full control over size/position; Badge has predefined padding |
| CSS transition for results panel | Framer Motion | CSS fade-in is sufficient, Framer Motion adds bundle weight |

**Installation:** No new packages required. All needed libraries are already in the project.

---

## Architecture Patterns

### Recommended Project Structure

```
src/components/workshop/
├── voting-hud.tsx            # NEW — floating pill HUD (budget display + Start/Close Voting CTA)
├── voting-results-panel.tsx  # NEW — ranked results view with idea selection checkboxes
src/components/workshop/
├── crazy-8s-canvas.tsx       # MODIFIED — inject VotingHud + toggle voting mode
src/components/workshop/
├── crazy-8s-grid.tsx         # MODIFIED — add vote button + badge per slot
src/actions/
├── canvas-actions.ts         # MODIFIED — add dotVotes + votingSession to save/load
src/app/workshop/[sessionId]/step/[stepId]/
├── page.tsx                  # MODIFIED — pass initialDotVotes + initialVotingSession to provider
src/providers/
├── canvas-store-provider.tsx # ALREADY HAS initialDotVotes + initialVotingSession props
```

### Pattern 1: Deriving Voter-Scoped State

**What:** All vote counts and budget computations are derived from raw `dotVotes` array + `voterId`. Never store derived state (vote counts) separately.

**When to use:** Every component that shows vote counts or remaining budget.

```typescript
// Source: canvas-store.ts analysis
const dotVotes = useCanvasStore(s => s.dotVotes);
const votingSession = useCanvasStore(s => s.votingSession);

// Derive voter ID — solo path uses Clerk userId
const { user } = useUser();
const voterId = user?.id ?? 'solo-user';

// Per-slot vote count (all voters — for badge display)
const slotVoteCount = dotVotes.filter(v => v.slotId === slot.slotId).length;

// My remaining budget
const myVotes = dotVotes.filter(v => v.voterId === voterId);
const remainingBudget = votingSession.voteBudget - myVotes.length;

// Last retractable vote for this slot (for undo)
const myVotesOnSlot = dotVotes.filter(v => v.slotId === slot.slotId && v.voterId === voterId);
const lastVoteId = myVotesOnSlot[myVotesOnSlot.length - 1]?.id;
```

### Pattern 2: Vote Placement Guard

**What:** Check budget before calling `castVote`. The store does not enforce budget limits — enforcement is the UI's responsibility.

```typescript
const handleCastVote = (slotId: string) => {
  if (remainingBudget <= 0) return; // Budget exhausted — no-op
  if (votingSession.status !== 'open') return; // Guard: only during open voting
  castVote({ slotId, voterId, voteIndex: myVotes.length });
};
```

### Pattern 3: Close Voting + Compute Results

**What:** `closeVoting()` transitions status to `'closed'` but does NOT compute results. Caller must compute and then call `setVotingResults()`.

```typescript
// Source: voting-types.ts — VotingResult + VotingSession shape analysis
const handleCloseVoting = () => {
  // Compute results from raw votes
  const voteCounts = new Map<string, number>();
  dotVotes.forEach(v => voteCounts.set(v.slotId, (voteCounts.get(v.slotId) ?? 0) + 1));

  // All crazy8sSlots must appear in results, even zero-vote slots
  const allSlotIds = crazy8sSlots.map(s => s.slotId);
  const sorted = [...allSlotIds].sort((a, b) => (voteCounts.get(b) ?? 0) - (voteCounts.get(a) ?? 0));

  let rank = 1;
  let prevCount = -1;
  const results: VotingResult[] = sorted.map((slotId, i) => {
    const count = voteCounts.get(slotId) ?? 0;
    if (count !== prevCount) { rank = i + 1; prevCount = count; }
    return { slotId, totalVotes: count, rank };
  });

  closeVoting();          // status → 'closed'
  setVotingResults(results); // populate votingSession.results
};
```

### Pattern 4: Re-Vote Flow (Solo Forgiveness)

**What:** User re-opens voting by calling `resetVoting()` then `openVoting()`. This clears all `dotVotes` and resets `votingSession` to idle, then immediately opens.

```typescript
const handleReVote = () => {
  resetVoting();       // clears dotVotes + sets status back to 'idle'
  openVoting();        // re-opens with same voteBudget
};
```

### Pattern 5: Results-Based Idea Selection → Step 8c

**What:** After results are displayed, user selects ideas via checkboxes. On confirm, call `setSelectedSlotIds(selectedIds)`. This is the same action used by the existing "idea-selection" phase in `IdeationSubStepContainer`. The voting results replace the earlier manual selection.

```typescript
// After user confirms their checkbox selection in VotingResultsPanel:
const handleConfirmSelection = (selectedIds: string[]) => {
  setSelectedSlotIds(selectedIds);
  // Then the parent IdeationSubStepContainer handles the brain-rewriting transition
  onConfirmSelection(false); // false = don't skip brain rewriting
};
```

### Anti-Patterns to Avoid

- **Storing vote counts as separate state:** Derive from `dotVotes` — computed state causes sync bugs
- **Calling `closeVoting()` without `setVotingResults()`:** Results must be set atomically with close
- **Allowing vote actions when `status !== 'open'`:** Guard all cast/retract calls against status
- **Storing `votingPhase` in local component state:** `votingSession.status` in Zustand is the source of truth; derive local UI mode from it
- **Mutating `selectedSlotIds` from voting independently of the brain-rewriting flow:** `setSelectedSlotIds` is shared with the existing idea-selection phase — calling it from voting replaces that selection correctly, but the parent must then trigger the brain-rewriting transition

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dot glyph rendering | Custom SVG icon set | Unicode bullet chars `●` / `○` | Zero bundle cost, renders cleanly at small sizes |
| Checkbox state | Custom toggle UI | shadcn `Checkbox` | Accessible, project-standard |
| Toast notifications | Alert div component | `sonner` toast (already imported in step-container) | Project standard, already wired |
| Badge positioning | Complex CSS grid overlay | Tailwind `absolute top-2 right-2` | Matches existing slot-number badge pattern in Crazy8sGrid |

**Key insight:** The hardest part of this phase is not any individual component — it is the persistence gap. `dotVotes` and `votingSession` must be added to `saveCanvasState`/`loadCanvasState` or voting state is lost on every page refresh.

---

## Common Pitfalls

### Pitfall 1: Voting State Not Persisted Across Page Refreshes

**What goes wrong:** User places votes, refreshes, votes are gone. `VotingSession.status` resets to `'idle'`.

**Why it happens:** `canvas-actions.ts` `saveCanvasState` and `loadCanvasState` do NOT currently include `dotVotes` or `votingSession`. The `CanvasStoreProvider` already accepts `initialDotVotes` and `initialVotingSession` props (Phase 59 added them), but `page.tsx` never reads them from the DB and never passes them in.

**How to avoid:** Add `dotVotes` and `votingSession` to both `saveCanvasState` signature and `loadCanvasState` return type. In `page.tsx`, read `canvasData?.dotVotes` and `canvasData?.votingSession`, pass as `initialDotVotes` and `initialVotingSession` to `CanvasStoreProvider`. In `IdeationSubStepContainer`'s `flushCanvasState()`, include `dotVotes` and `votingSession` in the flush payload.

**Warning signs:** After page refresh, "Start Voting" button is shown even though voting was already in progress.

### Pitfall 2: VoterId Mismatch in Solo Mode

**What goes wrong:** `castVote` uses `voterId: 'user_xxx'` (Clerk format) but `retractVote` computes `myVotes` using a different format, causing retraction to find no matching votes.

**Why it happens:** The `DotVote.voterId` field comment in `voting-types.ts` says format is `'user_xxx'` for owners, but `useUser()` from Clerk returns `user.id` which is in format `'user_xxxxxxxx'`. Must be consistent across all vote operations.

**How to avoid:** Define a single `useVoterId()` hook that derives voterId consistently. In solo mode, use `user?.id ?? 'solo-anon'`. Pass the same value to every `castVote` call. Derive `myVotes` using the same value.

### Pitfall 3: Budget Enforcement Race on Button Click

**What goes wrong:** User rapidly clicks "+1" button multiple times before React re-renders, exceeding their vote budget.

**Why it happens:** React batches state updates, but `useCanvasStore` selectors re-compute on the next render. Multiple rapid clicks all read `remainingBudget > 0` before any update commits.

**How to avoid:** Add a `isVoting` local state flag that disables the button during the click handler duration, OR rely on the fact that Zustand's `set()` is synchronous — the store updates before the next click handler reads it. In practice, Zustand synchronous updates prevent this race for normal user speeds. For extra safety, add a `disabled={remainingBudget <= 0}` guard on the button.

### Pitfall 4: `IdeationSubStepContainer` Phase State Conflict

**What goes wrong:** After voting closes and user selects ideas, calling `setSelectedSlotIds` does not trigger the brain-rewriting transition because `IdeationSubStepContainer` manages `currentPhase` in local state separately from `selectedSlotIds` in the store.

**Why it happens:** `IdeationSubStepContainer` has its own `localSelectedSlotIds` state and `handleConfirmSelection` callback. Voting results must call into the same callback path, not bypass it.

**How to avoid:** Expose a callback prop from `IdeationSubStepContainer` (e.g., `onVoteSelectionConfirm`) that voting results can call. This callback then calls `handleConfirmSelection(false)` to trigger the standard brain-rewriting initialization flow with the voting-selected IDs.

### Pitfall 5: `crazy-8s-canvas.tsx` Is the Wrong Level for Voting HUD

**What goes wrong:** Voting HUD placed inside `Crazy8sCanvas` scrolls with the grid content, disappears when canvas is small, or is clipped by `overflow-auto`.

**Why it happens:** `Crazy8sCanvas` has `className="h-full overflow-auto p-6"` — any `fixed` or `absolute` positioned child will be affected by the scroll container.

**How to avoid:** Mount the `VotingHud` outside `Crazy8sCanvas`, at the `IdeationSubStepContainer` canvas panel level (the `relative h-full` wrapper div). Use `absolute top-3 left-1/2 -translate-x-1/2 z-30` relative to the panel container, not the scrolling grid.

### Pitfall 6: Results Panel Must Include All 8 Slots

**What goes wrong:** Zero-vote sketches are missing from results because `setVotingResults` only processes slots that actually received votes.

**Why it happens:** Naive implementation iterates `dotVotes` to build results, never touching un-voted slots.

**How to avoid:** Seed results from `crazy8sSlots.map(s => s.slotId)` — all 8 slots — then join vote counts. Slots with 0 votes get `rank` equal to the lowest rank (tied with other zero-vote slots), visually dimmed in the results panel.

---

## Code Examples

### VotingHud Component Skeleton

```typescript
// Source: Derived from voting-types.ts + canvas-store.ts patterns
'use client';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import { useUser } from '@clerk/nextjs';

export function VotingHud() {
  const dotVotes = useCanvasStore(s => s.dotVotes);
  const votingSession = useCanvasStore(s => s.votingSession);
  const openVoting = useCanvasStore(s => s.openVoting);
  const closeVoting = useCanvasStore(s => s.closeVoting);
  const setVotingResults = useCanvasStore(s => s.setVotingResults);
  const crazy8sSlots = useCanvasStore(s => s.crazy8sSlots);
  const { user } = useUser();
  const voterId = user?.id ?? 'solo-anon';

  if (votingSession.status === 'idle') {
    return (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
        <button onClick={() => openVoting()} className="...">
          Start Voting
        </button>
      </div>
    );
  }

  const myVotes = dotVotes.filter(v => v.voterId === voterId);
  const remainingBudget = votingSession.voteBudget - myVotes.length;
  const totalBudget = votingSession.voteBudget;

  const handleClose = () => {
    // Compute results before closing
    const counts = new Map<string, number>();
    dotVotes.forEach(v => counts.set(v.slotId, (counts.get(v.slotId) ?? 0) + 1));
    const allSlotIds = crazy8sSlots.map(s => s.slotId);
    const sorted = [...allSlotIds].sort(
      (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0)
    );
    let rank = 1; let prev = -1;
    const results = sorted.map((slotId, i) => {
      const count = counts.get(slotId) ?? 0;
      if (count !== prev) { rank = i + 1; prev = count; }
      return { slotId, totalVotes: count, rank };
    });
    closeVoting();
    setVotingResults(results);
  };

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-full bg-background/90 backdrop-blur-sm border shadow-sm px-4 py-2">
      {/* Dot glyphs */}
      <span className="font-mono text-sm tracking-wide">
        {Array.from({ length: totalBudget }, (_, i) =>
          i < (totalBudget - remainingBudget) ? '●' : '○'
        ).join('')}
      </span>
      {remainingBudget > 0 ? (
        <span className="text-sm text-muted-foreground">
          {remainingBudget} of {totalBudget} remaining
        </span>
      ) : (
        <>
          <span className="text-sm font-medium">All votes placed</span>
          <button onClick={handleClose} className="...">Close Voting</button>
        </>
      )}
    </div>
  );
}
```

### Vote Badge + Button on Crazy8sGrid Card

```typescript
// Additions to crazy-8s-grid.tsx card rendering
// Requires: votingMode boolean prop + onCastVote/onRetractVote callbacks

{votingMode && votingSession.status === 'open' && (
  <>
    {/* Vote button — bottom-left of card */}
    <button
      className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs font-semibold disabled:opacity-40"
      onClick={(e) => { e.stopPropagation(); onCastVote(slot.slotId); }}
      disabled={remainingBudget <= 0}
    >
      +1
    </button>

    {/* Vote count badge — top-right, clicking retracts */}
    {slotVoteCount > 0 && (
      <button
        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center"
        onClick={(e) => { e.stopPropagation(); onRetractVote(slot.slotId); }}
        title="Click to retract one vote"
      >
        {slotVoteCount}
      </button>
    )}
  </>
)}
```

### Persistence Gap Fix — canvas-actions.ts

```typescript
// saveCanvasState: add to signature + _canvas merge
// loadCanvasState: add to return type + read from canvas object
// Both functions need dotVotes?: DotVote[] and votingSession?: VotingSession

import type { DotVote, VotingSession } from '@/lib/canvas/voting-types';

// In saveCanvasState signature:
canvasState: {
  // ... existing fields ...
  dotVotes?: DotVote[];
  votingSession?: VotingSession;
}

// In loadCanvasState return type + canvas destructuring:
dotVotes?: DotVote[];
votingSession?: VotingSession;
```

### IdeationSubStepContainer flushCanvasState Update

```typescript
// In ideation-sub-step-container.tsx flushCanvasState():
const flushCanvasState = async () => {
  const state = canvasStoreApi.getState();
  await saveCanvasState(workshopId, stepId, {
    // ... existing fields ...
    ...(state.dotVotes.length > 0 ? { dotVotes: state.dotVotes } : {}),
    // Always persist votingSession if status is not idle (preserve open/closed state)
    ...(state.votingSession.status !== 'idle' ? { votingSession: state.votingSession } : {}),
  });
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual idea selection only | Voting → selection pipeline | Phase 60 | `setSelectedSlotIds` is now called from voting results confirm, not just the idea-selection checkbox UI |
| No vote persistence | dotVotes + votingSession in canvas JSONB | Phase 60 | Votes survive page refresh |

---

## Open Questions

1. **VoterId in solo mode**
   - What we know: `DotVote.voterId` is typed as Liveblocks format `'user_xxx'` in the type comments, but solo mode has no Liveblocks connection
   - What's unclear: Should solo mode use `user.id` from Clerk (format `user_xxxxxxxxxxxxxxxx`) or a normalized form?
   - Recommendation: Use `user?.id ?? 'solo-anon'` directly. The format comment in `voting-types.ts` describes the multiplayer intent; solo just needs a consistent string. No normalization needed since solo votes are never displayed to other participants.

2. **"Start Voting" button placement**
   - What we know: HUD is top-center of canvas area, always visible during voting (per user decision). Before voting starts (status=idle), the "Start Voting" button must appear somewhere.
   - What's unclear: Should it live in the HUD position (same pill, different content) or in the Crazy8s instructions header?
   - Recommendation: Use the same pill position for consistency — when status is `'idle'`, render a "Start Voting" button pill at top-center. This is within Claude's discretion.

3. **Top-N suggestion threshold for pre-checked results**
   - What we know: Context says "system suggests top-N voted sketches pre-checked"
   - What's unclear: What is N? Top 2? Top 3? Top half?
   - Recommendation: Pre-check sketches that have votes AND are in the top 50% of vote counts (i.e., above-median). For simplicity, pre-check any sketch with `totalVotes > 0`. Mark as Claude's discretion.

4. **IdeationSubStepContainer phase state after voting closes**
   - What we know: `IdeationSubStepContainer` has phase state machine: `mind-mapping` → `crazy-eights` → `idea-selection` → `brain-rewriting`. Voting result selection needs to transition to `brain-rewriting`.
   - What's unclear: How does the results panel transition work? Does voting replace `idea-selection` entirely, or is it an additional path?
   - Recommendation: When user confirms voting selections, call the existing `handleConfirmSelection(false)` with `localSelectedSlotIds` populated from the voting results. This keeps the existing brain-rewriting initialization intact. VotingResultsPanel should call a callback prop that the parent handles.

---

## Integration Architecture: Where Things Plug In

### Component Hierarchy for Phase 60

```
IdeationSubStepContainer (manages currentPhase state machine)
└── Canvas panel div (relative h-full)
    ├── VotingHud (NEW — absolute top-center, always visible during voting)
    └── MindMapCanvas
        └── Crazy8sCanvas (modified)
            ├── VotingHud renders here? NO — see Pitfall 5
            ├── Crazy8sGrid (modified — receives votingMode + vote callbacks)
            │   └── Per slot: +1 button + badge (NEW)
            └── VotingResultsPanel (NEW — shown when status === 'closed')
                └── Results list + checkboxes + "Confirm Selection" + "Vote Again"
```

**Correction:** `VotingHud` should be placed in the `Crazy8sCanvas` wrapper (the `<div className="h-full overflow-auto p-6">` container's PARENT or at `IdeationSubStepContainer`'s canvas panel level), NOT inside the scroll container. The `VotingResultsPanel` replaces the grid view when status is `'closed'` — it renders at the `Crazy8sCanvas` level as a conditional replacement.

### Revised Clean Architecture

```
IdeationSubStepContainer canvas panel (relative h-full)
├── VotingHud (absolute top-3 left-1/2 z-30) — mounted when status !== 'idle'
└── MindMapCanvas
    └── Crazy8sCanvas (h-full overflow-auto p-6)
        ├── [status === 'open']  → Crazy8sGrid + voting badges/buttons
        ├── [status === 'idle']  → Normal Crazy8sGrid (no voting UI)
        └── [status === 'closed'] → VotingResultsPanel (full replacement)
```

This means `VotingHud` is mounted at the IdeationSubStepContainer level, not inside `Crazy8sCanvas`. The component just reads from `useCanvasStore` — it doesn't need to be inside the scroll container.

---

## Persistence Fix Details

### Files to Modify for Persistence

1. **`src/actions/canvas-actions.ts`**
   - `saveCanvasState`: Add `dotVotes?: DotVote[]` and `votingSession?: VotingSession` to parameter type. Include in `_canvas` merge.
   - `loadCanvasState`: Add `dotVotes?: DotVote[]` and `votingSession?: VotingSession` to return type. Read from `canvas.dotVotes` and `canvas.votingSession`.

2. **`src/app/workshop/[sessionId]/step/[stepId]/page.tsx`**
   - After `const canvasData = await loadCanvasState(...)`, read `canvasData?.dotVotes` and `canvasData?.votingSession`.
   - Pass as `initialDotVotes={initialDotVotes}` and `initialVotingSession={initialVotingSession}` to `CanvasStoreProvider`.

3. **`src/components/workshop/ideation-sub-step-container.tsx`**
   - In `flushCanvasState()`, include `dotVotes` and `votingSession` conditionally.
   - Note: `IdeationSubStepContainer` is the only flush point for step 8 canvas state. The auto-save in `canvas-store-provider.tsx` (if any) handles other steps.

4. **`src/providers/canvas-store-provider.tsx`**
   - Already has `initialDotVotes` and `initialVotingSession` props (added in Phase 59). No changes needed here.

---

## Sources

### Primary (HIGH confidence)
- `/src/lib/canvas/voting-types.ts` — DotVote, VotingResult, VotingSession types + DEFAULT_VOTING_SESSION
- `/src/stores/canvas-store.ts` — All voting actions (castVote, retractVote, openVoting, closeVoting, setVotingResults, resetVoting) + state shape
- `/src/stores/multiplayer-canvas-store.ts` — Multiplayer equivalents + storageMapping confirmation
- `/src/components/workshop/ideation-sub-step-container.tsx` — Complete step 8 phase state machine + canvas flush pattern
- `/src/components/workshop/crazy-8s-canvas.tsx` — Grid container structure + EzyDraw integration
- `/src/components/workshop/crazy-8s-grid.tsx` — Existing slot card rendering + badge patterns
- `/src/providers/canvas-store-provider.tsx` — initialDotVotes + initialVotingSession props confirmed present
- `/src/actions/canvas-actions.ts` — Confirmed: dotVotes/votingSession NOT in save/load
- `/src/app/workshop/[sessionId]/step/[stepId]/page.tsx` — Confirmed: initialDotVotes/initialVotingSession not passed

### Secondary (MEDIUM confidence)
- `/src/lib/liveblocks/config.ts` — VOTING_OPENED/VOTING_CLOSED RoomEvents confirmed for Phase 61 (out of scope for this phase)
- `/src/components/workshop/step-container.tsx` — Confirmed step 8 uses IdeationSubStepContainer, not standard canvas path

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in codebase
- Architecture: HIGH — complete reading of all relevant files; integration points confirmed
- Pitfalls: HIGH — persistence gap verified by reading canvas-actions.ts; voting-in-scroll confirmed by reading Crazy8sCanvas
- Persistence fix: HIGH — exact files and lines identified

**Research date:** 2026-02-28
**Valid until:** 2026-03-30 (stable internal codebase, not dependent on external library versions)
