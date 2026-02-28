# Phase 58: Facilitator Controls - Research

**Researched:** 2026-02-28
**Domain:** Liveblocks broadcast events, role-gated UI, viewport sync, countdown timer, session end flow
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Participant Restrictions**
- Hide the entire footer bar for participants — not just individual buttons, the whole bar is facilitator-only
- AI chat: participants see conversation history read-only with real-time streaming (they watch AI responses appear live as the facilitator works)
- Step transitions: when facilitator advances, participants see a brief toast notification (e.g., "Moving to Step 3: Ideation") then the view transitions after ~1 second
- Facilitator indicator: subtle icon (star or similar) next to the facilitator's avatar in the presence list so participants know who's driving

**Countdown Timer**
- Facilitator sets timer via preset buttons: 1 min, 3 min, 5 min, 10 min — plus a custom input option
- Timer displays as a floating pill in the top-right area, styled consistently with the whiteboard toolbar and zoom controls
- Must adapt to both light and dark mode
- On expiry: timer flashes red/pulses for a few seconds with a subtle chime sound
- Facilitator can pause (resume later) or cancel the timer mid-countdown
- Timer state broadcast to all participants — everyone sees the same countdown

**Session Ending**
- "End Session" triggers a confirmation modal: "End this workshop session? All participants will be disconnected." with Cancel/End buttons
- On confirm: participants immediately see a full-screen "Session has ended" overlay with a button to return to dashboard
- Facilitator redirects to the existing workshop detail page after ending
- Final canvas state persisted to Neon via Liveblocks REST API snapshot before the room is archived

**Viewport Sync ("Bring Everyone to Me")**
- Button placed in top-right area near the timer — facilitator-only controls grouped together
- On click: broadcasts facilitator's current viewport position and zoom to all participants
- Participant transition: smooth animated pan/zoom to facilitator's position over ~500ms
- Participants see a brief toast: "Facilitator is guiding your view"
- After sync, participants are free to pan/zoom away on their own — it's a one-time alignment, not a lock
- Facilitator can trigger sync as many times as needed

### Claude's Discretion
- Exact icon choices for facilitator indicator and viewport sync button
- Timer pill styling details (border radius, shadow, padding)
- Toast notification duration and positioning
- Sound asset selection for timer chime
- Server-side authorization patterns for role gating

### Deferred Ideas (OUT OF SCOPE)
- Workshop Review Page — a dedicated post-session review page accessible from Dashboard → workshop, acting as another artifact. Would show session summary, canvas snapshots, key decisions made. Belongs in a future phase.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FACL-01 | Only the facilitator can advance or navigate between steps | Role check via `useSelf().info.role === 'owner'` in StepNavigation; server-action auth via Clerk `auth()` + DB ownership check |
| FACL-02 | Only the facilitator can interact with the AI chat input | `useSelf()` role check in ChatPanel — participants see read-only scroll view; chat input (textarea + send button) hidden |
| FACL-03 | Facilitator can broadcast viewport to all participants ("bring everyone to me") | `useBroadcastEvent` sends `VIEWPORT_SYNC` event; `useEventListener` on participant side calls `setViewport()` with 500ms transition |
| FACL-04 | Facilitator can set a countdown timer visible to all participants | Timer state broadcast via `useBroadcastEvent` + `useEventListener`; local countdown drives display, ticks synced via periodic broadcast |
| FACL-05 | Facilitator can end the session (final state persisted to database) | Confirmation modal → `GET /v2/rooms/{roomId}/storage` snapshot → Neon upsert → `workshopSessions` status = 'ended' → `SESSION_ENDED` broadcast |
| SESS-05 | All participants see a "session ended" overlay when facilitator ends the session | `useEventListener` for `SESSION_ENDED` event → full-screen overlay component → redirect to dashboard button |
</phase_requirements>

---

## Summary

Phase 58 gates five facilitator-only behaviors behind the `role: 'owner'` value already set in Liveblocks UserMeta by the auth endpoint (`/api/liveblocks-auth`). The role is readable on any connected client via `useSelf().info.role`. No new auth infrastructure is required — the role is already correct and trusted because it is set server-side by Clerk auth.

Cross-client communication (step changes, viewport sync, timer ticks, session end) all use Liveblocks broadcast events (`useBroadcastEvent` / `useEventListener`). These hooks are not yet used anywhere in the codebase — Phase 58 introduces them for the first time. The `RoomEvent` union type must be added to the global `Liveblocks` interface augmentation in `src/lib/liveblocks/config.ts`.

The session-end flow requires two server calls: (1) a `GET /v2/rooms/{roomId}/storage` REST API fetch to snapshot the canvas, followed by a Neon upsert (mirrors the existing webhook pattern), and (2) a Neon `UPDATE` to set `workshopSessions.status = 'ended'`. The room should NOT be deleted — deleting removes all history. Participants detect session end via a `SESSION_ENDED` broadcast event and render a full-screen overlay.

**Primary recommendation:** Add `RoomEvent` union to the global Liveblocks config, use `useBroadcastEvent`/`useEventListener` for all cross-client events, extend `MultiplayerContext` to expose `isFacilitator`, and wire role checks into the existing `StepNavigation` and `ChatPanel` components via the `workshopType` + `isFacilitator` props pattern already in use.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@liveblocks/react` | 3.14.0 (project) | `useBroadcastEvent`, `useEventListener`, `useSelf` | Already installed; events are the designed broadcast mechanism |
| `@liveblocks/client` | 3.14.0 (project) | `LiveMap`, `LiveObject` | Already installed for storage |
| `sonner` | 2.0.7 (project) | Toast notifications for step transitions and viewport sync toasts | Already used project-wide |
| `@xyflow/react` (ReactFlow) | project installed | `setViewport`, `getViewport`, `useReactFlow` | Already powers the canvas; `setViewport({ x, y, zoom, duration })` drives viewport sync animation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Web Audio API | Browser native | Timer chime sound | Synthesize a short chime without shipping an audio file; zero bundle cost |
| `lucide-react` | project installed | Icons for facilitator zone buttons | Already used throughout; consistent icon language |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Broadcast events for timer | Liveblocks Storage for timer state | Storage is durable/persistent — wrong for ephemeral countdown; broadcast events are instant and ephemeral |
| Web Audio API for chime | Static `.mp3` / `.ogg` file | Audio file requires hosting and fetch latency; Web Audio synth is instant and zero-dependency |
| Full-screen overlay as route | Client-side conditional render | Route navigation adds latency; instant client-side conditional render on `SESSION_ENDED` event is better UX |

**Installation:** No new packages needed. All required libraries are already in the project.

---

## Architecture Patterns

### Recommended Project Structure

New files:
```
src/
├── components/
│   └── workshop/
│       ├── facilitator-controls.tsx     # Timer pill + Viewport sync + End Session — facilitator-only top-right zone
│       ├── countdown-timer.tsx          # Timer display (shared read-only) + facilitator controls (preset buttons, pause, cancel)
│       └── session-ended-overlay.tsx    # Full-screen overlay shown to participants on SESSION_ENDED broadcast
├── actions/
│   └── session-actions.ts              # endWorkshopSession() server action (snapshot + Neon update)
```

Modified files:
```
src/
├── lib/liveblocks/config.ts            # Add RoomEvent union type to global Liveblocks interface
├── components/workshop/
│   ├── multiplayer-room.tsx            # Extend MultiplayerContext to expose isFacilitator
│   ├── step-navigation.tsx             # Hide entire footer bar for participants in multiplayer
│   └── chat-panel.tsx                  # Hide chat input for participants; show read-only view
```

### Pattern 1: RoomEvent Type Definition

**What:** All Liveblocks broadcast events must be declared in the global `Liveblocks` interface augmentation in `config.ts`. The existing project uses global interface augmentation (not `createRoomContext`) so `RoomEvent` is added to the same block.

**When to use:** Before implementing any broadcast event. Type safety prevents runtime event shape mismatches.

```typescript
// Source: https://liveblocks.io/docs/tutorial/react/getting-started/broadcasting-events
// In src/lib/liveblocks/config.ts — add to existing declare global { interface Liveblocks { ... } }

declare global {
  interface Liveblocks {
    // ... existing Presence, Storage, UserMeta ...

    RoomEvent:
      | { type: 'STEP_CHANGED'; stepOrder: number; stepName: string }
      | { type: 'VIEWPORT_SYNC'; x: number; y: number; zoom: number }
      | { type: 'TIMER_UPDATE'; state: 'running' | 'paused' | 'expired' | 'cancelled'; remainingMs: number; totalMs: number }
      | { type: 'SESSION_ENDED' };
  }
}
```

### Pattern 2: Broadcast + Listen (Liveblocks v3)

**What:** `useBroadcastEvent` returns a stable function; `useEventListener` subscribes to all room events from other users. Both require being inside `RoomProvider`.

**When to use:** Step change notifications, viewport sync, timer tick distribution, session end signal.

```typescript
// Source: https://liveblocks.io/docs/api-reference/liveblocks-react#useBroadcastEvent
import { useBroadcastEvent, useEventListener } from '@liveblocks/react';

// Facilitator side — broadcast
const broadcast = useBroadcastEvent();
broadcast({ type: 'STEP_CHANGED', stepOrder: nextStep, stepName: 'Ideation' });

// Participant side — listen
useEventListener(({ event }) => {
  if (event.type === 'STEP_CHANGED') {
    toast(`Moving to Step ${event.stepOrder}: ${event.stepName}`);
    // After 1s, navigate to new step
    setTimeout(() => router.push(`/workshop/${sessionId}/step/${event.stepOrder}`), 1000);
  }
});
```

**Important:** `useEventListener` does NOT fire for the broadcasting user's own events. The facilitator handles their own navigation via the existing `advanceToNextStep` flow; `STEP_CHANGED` only drives participant navigation.

### Pattern 3: Reading Role from Liveblocks UserMeta

**What:** `useSelf(selector)` reads the current user's metadata. `info.role` is `'owner'` for the facilitator and `'participant'` for guests — set server-side in `/api/liveblocks-auth`. This is the canonical source of truth for role gating.

**When to use:** Any component that needs to conditionally render facilitator-only controls.

```typescript
// Source: project pattern from presence-bar.tsx
import { useSelf } from '@liveblocks/react';

// Option A: Direct hook in component
const isFacilitator = useSelf((me) => me?.info?.role === 'owner') ?? false;

// Option B: Extend MultiplayerContext (preferred — avoids conditional hook calls)
// In multiplayer-room.tsx:
export const MultiplayerContext = createContext<{
  participantColor: string | null;
  isMultiplayer: boolean;
  isFacilitator: boolean;  // NEW
}>({ participantColor: null, isMultiplayer: false, isFacilitator: false });

// In MultiplayerRoomInner:
const self = useSelf();
// ...
value={{ participantColor: ..., isMultiplayer: true, isFacilitator: self?.info?.role === 'owner' }}
```

The **context approach is preferred** for `StepNavigation` and `ChatPanel` because those components already accept `workshopType` but are not inside `RoomProvider` — they're rendered above it in the tree. Using context avoids prop drilling a `isFacilitator` boolean all the way down.

Wait — check the component tree: `MultiplayerRoom` wraps `children` which includes `StepContainer` which renders `StepNavigation` and `ChatPanel`. Both are children of `RoomProvider` (via `MultiplayerRoom`). Therefore they CAN use `useSelf()` directly, or consume the context.

**Recommendation:** Extend `MultiplayerContext` with `isFacilitator` (already consumed in the react-flow-canvas via `useMultiplayerContext`). This is consistent with the existing pattern.

### Pattern 4: Viewport Sync via ReactFlow setViewport

**What:** `setViewport` from `useReactFlow()` accepts `{ x, y, zoom }` and an optional `{ duration }` for smooth animation. The canvas already uses this extensively. The facilitator reads their current viewport via `getViewport()` (also exposed via `canvasRef.current.getViewport()`).

**When to use:** When a `VIEWPORT_SYNC` broadcast event is received by a participant.

```typescript
// Source: react-flow-canvas.tsx existing pattern — setViewport already used at lines 2438-2513
import { useReactFlow } from '@xyflow/react';

// Facilitator: capture and broadcast
const { getViewport } = useReactFlow();
const broadcast = useBroadcastEvent();
const vp = getViewport(); // { x, y, zoom }
broadcast({ type: 'VIEWPORT_SYNC', ...vp });

// Participant: receive and animate
useEventListener(({ event }) => {
  if (event.type === 'VIEWPORT_SYNC') {
    setViewport({ x: event.x, y: event.y, zoom: event.zoom }, { duration: 500 });
    toast('Facilitator is guiding your view', { duration: 2000 });
  }
});
```

### Pattern 5: Timer Implementation

**What:** The facilitator manages a `setInterval` locally. On tick, broadcasts `TIMER_UPDATE` with remaining milliseconds. All participants (including facilitator) derive their display from received events. The facilitator also starts the interval locally and receives their own ticks via local state (not broadcast — they don't receive their own broadcasts).

**Architecture decision:** The facilitator maintains the authoritative timer locally via `useState` + `useRef` for the interval. They broadcast `TIMER_UPDATE` every second to keep all participants in sync. On pause/cancel, they broadcast the new state immediately.

```typescript
// Facilitator-side timer management
const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused' | 'expired'>('idle');
const [remainingMs, setRemainingMs] = useState(0);
const intervalRef = useRef<NodeJS.Timeout | null>(null);
const broadcast = useBroadcastEvent();

function startTimer(ms: number) {
  setTimerState('running');
  setRemainingMs(ms);
  broadcast({ type: 'TIMER_UPDATE', state: 'running', remainingMs: ms, totalMs: ms });
  intervalRef.current = setInterval(() => {
    setRemainingMs((prev) => {
      const next = prev - 1000;
      if (next <= 0) {
        clearInterval(intervalRef.current!);
        setTimerState('expired');
        broadcast({ type: 'TIMER_UPDATE', state: 'expired', remainingMs: 0, totalMs: ms });
        playChime(); // Web Audio API
        return 0;
      }
      broadcast({ type: 'TIMER_UPDATE', state: 'running', remainingMs: next, totalMs: ms });
      return next;
    });
  }, 1000);
}

// Participant-side: just react to received events
useEventListener(({ event }) => {
  if (event.type === 'TIMER_UPDATE') {
    setTimerState(event.state);
    setRemainingMs(event.remainingMs);
    setTotalMs(event.totalMs);
  }
});
```

**Timer sound:** Use Web Audio API to synthesize a chime on expiry. No audio file needed.

```typescript
function playChime() {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
  osc.start();
  osc.stop(ctx.currentTime + 1);
}
```

### Pattern 6: Session End Flow

**What:** Multi-step flow requiring: (1) snapshot canvas to Neon, (2) update `workshopSessions.status` to `'ended'`, (3) broadcast `SESSION_ENDED` to all participants.

```typescript
// In src/actions/session-actions.ts (new server action)
'use server';
import { auth } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { workshops, workshopSessions, workshopSteps, stepArtifacts } from '@/db/schema';
import { getRoomId } from '@/lib/liveblocks/config';

export async function endWorkshopSession(workshopId: string): Promise<{ success: true }> {
  // 1. Auth: only the workshop owner can end the session
  const { userId } = await auth();
  if (!userId) throw new Error('Authentication required');

  const [workshop] = await db.select().from(workshops)
    .where(and(eq(workshops.id, workshopId), eq(workshops.clerkUserId, userId)))
    .limit(1);
  if (!workshop) throw new Error('Workshop not found or access denied');

  // 2. Snapshot canvas from Liveblocks REST API
  const roomId = getRoomId(workshopId);
  const storageRes = await fetch(`https://api.liveblocks.io/v2/rooms/${roomId}/storage`, {
    headers: { Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}` },
  });

  if (storageRes.ok) {
    const storageJson = await storageRes.json();
    // Find current in_progress step and upsert snapshot (mirrors webhook pattern)
    const [activeStep] = await db.select().from(workshopSteps)
      .where(and(eq(workshopSteps.workshopId, workshopId), eq(workshopSteps.status, 'in_progress')))
      .limit(1);
    if (activeStep) {
      await db.insert(stepArtifacts).values({
        workshopStepId: activeStep.id,
        stepId: activeStep.stepId,
        artifact: { _canvas: storageJson },
        schemaVersion: 'liveblocks-1.0',
        version: 1,
      }).onConflictDoUpdate({
        target: stepArtifacts.workshopStepId,
        set: { artifact: { _canvas: storageJson }, extractedAt: new Date() },
      });
    }
  }
  // Log but don't throw on snapshot failure — session must still end

  // 3. Mark session ended in Neon
  await db.update(workshopSessions)
    .set({ status: 'ended', endedAt: new Date() })
    .where(eq(workshopSessions.workshopId, workshopId));

  return { success: true };
}
```

**Client side:** After `endWorkshopSession()` succeeds, the facilitator calls `broadcast({ type: 'SESSION_ENDED' })` and then redirects to the workshop detail page. Participants listen for `SESSION_ENDED` and render the full-screen overlay.

**Note on room deletion:** Do NOT delete the room. The `DELETE /rooms/{roomId}` REST endpoint permanently removes the room and cannot be restored. The `status: 'ended'` in Neon and the snapshot are sufficient for archival. The Liveblocks room remains accessible for historical reads.

### Pattern 7: StepNavigation — Hide Footer for Participants

**What:** The entire footer bar (`StepNavigation` component) should be hidden for participants. The clearest approach is to pass `isFacilitator` to `StepContainer` and conditionally not render `StepNavigation`.

```typescript
// In StepContainer — add to props:
isFacilitator?: boolean;

// In render — wrap StepNavigation:
{(workshopType !== 'multiplayer' || isFacilitator) && (
  <StepNavigation ... />
)}
```

**Server-side auth check on `advanceToNextStep`:** Add a guard to the existing server action. The workshop ownership check pattern already exists in `completeWorkshop` and `deleteWorkshops`. Mirror that pattern.

```typescript
// In advanceToNextStep — add ownership check:
const userId = await getUserId();
if (userId) {
  // In multiplayer: verify caller owns this workshop
  const [wk] = await db.select().from(workshops)
    .where(and(eq(workshops.id, workshopId), eq(workshops.clerkUserId, userId)))
    .limit(1);
  if (!wk) {
    throw new Error('Access denied: only the facilitator can advance steps');
  }
}
```

**Note:** Guest participants cannot call server actions (they have no Clerk session). The `getUserId()` call returns `null` for guests. The guard only fires for Clerk-authed callers (who may try to call the action from browser devtools).

### Anti-Patterns to Avoid

- **Deleting the Liveblocks room on session end:** Permanently removes all history; use `status: 'ended'` + snapshot instead.
- **Using Liveblocks Storage for timer state:** Storage is durable and synchronized — wrong for an ephemeral countdown. Broadcast events are correct.
- **Calling `useSelf()` outside `RoomProvider`:** Will throw. `StepNavigation` IS inside `RoomProvider` (it's a child of `MultiplayerRoom` wrapping `StepContainer`). But guard with the `workshopType === 'multiplayer'` check before consuming role.
- **Calling `useEventListener` / `useBroadcastEvent` in solo workshops:** These hooks require being inside `RoomProvider`. Only call them when `workshopType === 'multiplayer'`.
- **Timer drift:** `setInterval` in JS can drift. For a 1-10 minute countdown, 1-second granularity and ~50ms drift per tick is acceptable. No need for a high-precision timer.
- **Broadcasting timer every tick to a large room:** At 20 participants × 60 ticks/min, this is 1200 events/min — well within Liveblocks free-tier limits (no concern).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-client event delivery | Custom WebSocket server or SSE | `useBroadcastEvent` + `useEventListener` | Liveblocks already handles room membership, delivery guarantees, and reconnection |
| Role determination | Cookie or localStorage role flags | `useSelf().info.role` from Liveblocks UserMeta | Already set server-side by `/api/liveblocks-auth`; tamper-proof |
| Animated viewport transition | CSS transform or Framer Motion | `setViewport({ x, y, zoom }, { duration: 500 })` from ReactFlow | Native ReactFlow API; already used in the codebase |
| Canvas snapshot on session end | Custom serialization of Zustand store | Liveblocks REST API `GET /v2/rooms/{roomId}/storage` | Mirrors existing webhook pattern; guaranteed to be in sync with Liveblocks storage |

---

## Common Pitfalls

### Pitfall 1: useEventListener Receives Facilitator's Own Events? — It Does NOT
**What goes wrong:** Developer assumes facilitator's `useEventListener` will fire when they broadcast.
**Why it happens:** Broadcast events are sent to "all other users in the room" — the sender is excluded.
**How to avoid:** The facilitator's own state updates (step navigation, timer state) are driven by local state, not by received events. Only participants drive state from `useEventListener`.
**Warning signs:** Facilitator appears to double-navigate or has infinite loops.

### Pitfall 2: Calling Liveblocks Hooks Outside RoomProvider
**What goes wrong:** `useBroadcastEvent()` or `useEventListener()` throws "not inside RoomProvider".
**Why it happens:** `FacilitatorControls` or `CountdownTimer` rendered outside `MultiplayerRoom`.
**How to avoid:** These components must be rendered inside `MultiplayerRoom` (inside `RoomProvider`). Check the render tree. The `multiplayer-room.tsx` `MultiplayerRoomInner` is the right place to add new broadcast listeners.
**Warning signs:** Runtime error "Attempted to call useBroadcastEvent outside of a RoomProvider".

### Pitfall 3: Participant Step Navigation Before Toast Dismissal
**What goes wrong:** Participants navigate immediately on `STEP_CHANGED` before the toast is visible.
**Why it happens:** `router.push()` called with zero delay.
**How to avoid:** Use `setTimeout(() => router.push(...), 1000)` as specified in the design decisions. The 1-second delay lets the toast render before navigation.
**Warning signs:** Toast flashes briefly or never appears on step transitions.

### Pitfall 4: Missing `isFacilitator` on Re-render Flicker
**What goes wrong:** Footer bar briefly shows for participants before Liveblocks connects.
**Why it happens:** `useSelf()` returns `null` before room connection; default context value is `isFacilitator: false`.
**How to avoid:** Default the context value to `isFacilitator: false` (which hides the footer) — the footer will never flash for participants. For the facilitator, the footer appears once the room connects and `useSelf()` resolves.
**Warning signs:** Participants see footer for 200-500ms on page load.

### Pitfall 5: Session End Race — Broadcast Before Neon Write Completes
**What goes wrong:** Participants redirect before Neon marks session as `ended`, causing their redirect to show `waiting` status.
**Why it happens:** `broadcast({ type: 'SESSION_ENDED' })` fires on the client immediately after `endWorkshopSession()` resolves, but guest-lobby polling may catch a stale read.
**How to avoid:** The `SESSION_ENDED` broadcast drives participants to a full-screen overlay (not the lobby). Participants see the overlay and click "Return to dashboard" — by then Neon is committed. No race condition in the actual flow.

### Pitfall 6: Liveblocks REST API Snapshot vs Webhook — Which is Authoritative?
**What goes wrong:** Session end snapshot and the 60s webhook snapshot can theoretically conflict.
**Why it happens:** The webhook fires ~60s after last change; if the facilitator ends the session sooner, the final snapshot may not have fired yet.
**How to avoid:** Call `GET /v2/rooms/{roomId}/storage` explicitly in `endWorkshopSession()` — this is a fresh, synchronous read from Liveblocks. The result is the authoritative final state. This mirrors the approach in the existing webhook handler.

---

## Code Examples

### Verified Pattern: Extending MultiplayerContext with isFacilitator

```typescript
// Source: project pattern from multiplayer-room.tsx
// Extend the existing MultiplayerContext shape:

export const MultiplayerContext = createContext<{
  participantColor: string | null;
  isMultiplayer: boolean;
  isFacilitator: boolean;
}>({ participantColor: null, isMultiplayer: false, isFacilitator: false });

// In MultiplayerRoomInner:
function MultiplayerRoomInner({ children }: { children: React.ReactNode }) {
  const self = useSelf();
  return (
    <MultiplayerContext.Provider value={{
      participantColor: self?.info?.color ?? null,
      isMultiplayer: true,
      isFacilitator: self?.info?.role === 'owner',
    }}>
      <PresenceBar />
      <JoinLeaveListener />
      <ReconnectionListener />
      {children}
    </MultiplayerContext.Provider>
  );
}
```

### Verified Pattern: Full RoomEvent Union in global config

```typescript
// Source: liveblocks.io/docs/tutorial/react/getting-started/broadcasting-events
// Add to the declare global { interface Liveblocks { ... } } block in config.ts

RoomEvent:
  | { type: 'STEP_CHANGED'; stepOrder: number; stepName: string }
  | { type: 'VIEWPORT_SYNC'; x: number; y: number; zoom: number }
  | { type: 'TIMER_UPDATE'; state: 'running' | 'paused' | 'expired' | 'cancelled'; remainingMs: number; totalMs: number }
  | { type: 'SESSION_ENDED' };
```

### Verified Pattern: Snapshot via Liveblocks REST API (mirrors existing webhook)

```typescript
// Source: project pattern from src/app/api/webhooks/liveblocks/route.ts (lines 72-90)
// Same fetch call used in endWorkshopSession():

const storageRes = await fetch(
  `https://api.liveblocks.io/v2/rooms/${roomId}/storage`,
  {
    headers: { Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}` },
  }
);
// storageRes returns LSON format — use as-is for _canvas key
```

### Verified Pattern: Conditional Rendering of Facilitator Zone

```typescript
// FacilitatorControls — renders only for owner in multiplayer
// Source: project pattern; useMultiplayerContext already used in react-flow-canvas.tsx

'use client';
import { useMultiplayerContext } from '@/components/workshop/multiplayer-room';

export function FacilitatorControls({ workshopId }: { workshopId: string }) {
  const { isFacilitator } = useMultiplayerContext();
  if (!isFacilitator) return null;

  return (
    <div className="fixed top-3 right-[200px] z-50 flex items-center gap-2">
      {/* Timer pill, Viewport sync button, End Session button */}
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `createRoomContext` for Liveblocks type config | Global `declare global { interface Liveblocks {} }` augmentation | Liveblocks v2+ | Project already uses new pattern — no migration needed |
| Separate `config.ts` with exported hooks | Global augmentation + direct imports from `@liveblocks/react` | Liveblocks v2 | `useBroadcastEvent` imported directly from `@liveblocks/react`, not from a context object |

**Deprecated/outdated:**
- `createRoomContext`: Removed in Liveblocks v2+. The project uses the correct current pattern.
- Old broadcast API with `room.broadcastEvent()`: Replaced by `useBroadcastEvent()` hook. Do not use the imperative API.

---

## Open Questions

1. **Participant ChatPanel: read-only AI streaming**
   - What we know: `ChatPanel` uses `useChat` from `@ai-sdk/react` which manages the conversation stream. Participants need to see the conversation updating in real-time.
   - What's unclear: The chat messages are not stored in Liveblocks Storage — they're in Neon. Participants cannot directly observe the AI stream via Liveblocks. Options: (a) Liveblocks broadcast per token chunk (latency risk), (b) SWR polling on `/api/chat` messages (simpler, ~500ms lag), (c) Liveblocks Storage for the last assistant message (complex schema change).
   - Recommendation: Use SWR revalidation (`mutate` on interval or triggered by a `MESSAGE_UPDATE` broadcast) — this is noted in STATE.md as a "decision spike" needed. The simplest approach: when the facilitator's AI response finishes streaming, broadcast `{ type: 'MESSAGE_UPDATE' }` and participants call `mutate('/api/messages/...')` to refresh. This is Phase 58's most architecturally uncertain piece.
   - **This is the only open question — all other patterns are clear.**

---

## Sources

### Primary (HIGH confidence)
- `@liveblocks/react` v3 — `useBroadcastEvent`, `useEventListener`, `useSelf` hooks (fetched from liveblocks.io/docs/api-reference/liveblocks-react and liveblocks.io/docs/tutorial/react/getting-started/broadcasting-events)
- Liveblocks REST API — `GET /v2/rooms/{roomId}/storage` (fetched from liveblocks.io/docs/api-reference/rest-api-endpoints)
- Project codebase — existing patterns verified by direct file reads: `config.ts`, `multiplayer-room.tsx`, `presence-bar.tsx`, `react-flow-canvas.tsx`, `webhooks/liveblocks/route.ts`, `liveblocks-auth/route.ts`, `step-navigation.tsx`, `workshop-actions.ts`

### Secondary (MEDIUM confidence)
- Web Audio API chime synthesis — standard browser API, widely documented; used as described

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project; APIs verified from official Liveblocks docs
- Architecture: HIGH — patterns derived from existing project code; broadcast events confirmed in docs
- Pitfalls: HIGH — derived from code analysis of component tree and Liveblocks event model
- Open question (ChatPanel read-only): MEDIUM — multiple viable approaches; STATE.md calls it out as a known uncertainty

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (Liveblocks v3.x API is stable; ReactFlow viewport API is stable)
