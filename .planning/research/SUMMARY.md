# Project Research Summary

**Project:** WorkshopPilot.ai v2.0 — Dot Voting & Mobile Gate
**Domain:** Real-time collaborative voting on Crazy 8s sketches + mobile UX gate
**Researched:** 2026-02-28
**Confidence:** HIGH

## Executive Summary

WorkshopPilot v2.0 adds two targeted features to an already-production-validated multiplayer stack: dot voting on Step 8 Crazy 8s sketches, and a dismissible mobile phone gate. Both features are fully implementable using existing infrastructure — zero new packages, zero schema migrations. The dot voting system follows the canonical pattern established by Miro, FigJam, and MURAL: facilitator-controlled open/close sessions, configurable vote budgets per participant, anonymous voting during the open window to prevent groupthink, and a ranked-results reveal after close. Facilitators manually select which ideas advance to Step 9, in keeping with the Google Design Sprint methodology that votes inform rather than decide.

The recommended implementation approach is to extend existing Liveblocks Storage with two new keys (`votes: LiveMap` and `votingSession: LiveObject`) for multiplayer sync, and to persist solo vote state in the existing `stepArtifacts` JSONB column alongside other Step 8 artifacts. This avoids the temptation to create a new Postgres `dot_votes` table, which would introduce per-vote API latency (30 round-trips for 10 participants casting 3 votes each) where Liveblocks CRDT propagates each vote in under 50ms with no server involvement. The mobile gate is a standalone client component mounted in the workshop layout, using the already-existing `useIsMobile()` hook and `sessionStorage` for dismissal persistence.

Key risks are low given the additive nature of the work. The main architectural risk is accidentally creating a dual state authority — vote state must live exclusively in Liveblocks Storage for multiplayer and exclusively in the JSONB artifact for solo, never in both simultaneously. The secondary risk is misusing ephemeral broadcast events as a data transport for vote tallies; events trigger UI transitions only, while Storage is the durable source of truth. Both risks are explicitly documented in the architecture research with prevention patterns.

---

## Key Findings

### Recommended Stack

**From STACK.md:** No new packages required. The full existing stack (Next.js 16.1.1, React 19, Tailwind 4, shadcn/ui, Clerk, Neon/Drizzle, Gemini, Liveblocks v3.14.0, Zustand, Vercel) is validated in production and covers all v2.0 needs.

**Core technologies for v2.0:**
- `@liveblocks/react` v3.14.0: CRDT vote sync via two new Storage keys (`votes`, `votingSession`) — already imported and used for canvas elements; `LiveMap`/`LiveObject` already in codebase
- `useIsMobile()` hook (existing at `src/hooks/use-mobile.ts`): 768px matchMedia, SSR-safe — no new code required
- `stepArtifacts` JSONB column (existing): solo vote persistence alongside Crazy 8s slots and mind map nodes
- `FacilitatorControls` + `CountdownTimer` (existing): voting timer integration via existing Liveblocks broadcast pattern
- `use-debounce`, `sonner`, `lucide-react` (all existing): debounced artifact save, voting toasts, vote dot icons

**Key version constraint:** All Liveblocks packages must stay locked at 3.14.0 together. New Storage keys are safely additive to existing rooms — `initialStorage` only applies on first room creation.

### Expected Features

**From FEATURES.md:**

**Must have (table stakes — P1 for v2.0 launch):**
- Fixed vote budget per participant — without a budget, voting is meaningless; default 2 votes (NNGroup: 25% of 8 options), range 1–8
- Multi-vote on same sketch (stacking) — canonical dot voting behavior; prevents single-vote-only which blocks expressing conviction
- Visual vote counter per sketch — visible feedback that dot counts are registering
- Remaining budget HUD — persistent "N votes remaining" visible throughout voting
- Facilitator opens/closes voting — prevents premature voting, controls group pacing
- Anonymous voting during session — hide others' votes until close to prevent groupthink (NNGroup research is unambiguous: live results anchor later voters)
- Ranked results reveal on close — aggregate counts visible to all simultaneously
- Facilitator manually selects ideas to advance — voting informs, facilitator decides (Design Sprint methodology)
- Solo voting mode — full voting flow using local React state, no Liveblocks
- Multiplayer voting mode — voting state broadcasts via existing Liveblocks room
- Mobile phone gate — dismissible full-screen overlay at <768px
- Gate dismissal persistence — `sessionStorage`, does not re-appear on same browser session

**Should have (competitive differentiators — P2, add after P1 stable):**
- Countdown timer with auto-close — reuses existing v1.9 timer infrastructure at LOW complexity
- Participant completion indicator — checkmark on participant list when all votes placed
- Vote undo (click to retract) — toggle behavior: clicking a voted slot removes one vote, returns it to budget
- Email-to-self CTA on gate — `mailto:` link pre-filled with current URL

**Defer to v2+:**
- Multi-round voting for tie-breaking (NNGroup best practice for close results)
- Vote history export in Build Pack
- Per-concept card voting in Step 9
- Full mobile-optimized workshop experience (separate engineering project; in FFP backlog)

**Anti-features explicitly excluded:**
- Auto-advancement of ideas based on vote count — removes facilitator judgment; votes inform, do not decide
- Real-time vote counts visible to all during session — groupthink trap; Miro added anonymous mode as default for this reason
- Custom vote colors per participant — defeats anonymous voting by making each person's votes identifiable
- Hard mobile block with no dismiss — removes user autonomy; tablet users at 767px would be hard-blocked unfairly

### Architecture Approach

**From ARCHITECTURE.md:** The architecture is additive and follows established patterns already in the codebase. Dot voting inserts a new `dot-voting` phase into the existing `IdeationSubStepContainer` phase machine (between `crazy-eights` and `idea-selection`). Vote state flows through `CanvasState` via two new fields (`dotVotes: DotVote[]`, `votingSession: VotingSession`) that are added to `storageMapping` for automatic CRDT sync in multiplayer. Liveblocks `RoomEvent` broadcasts (`VOTING_OPENED`, `VOTING_CLOSED`) handle UI phase transitions only; `storageMapping` handles durable vote data. The mobile gate mounts as a client-component wrapper in the workshop layout via `MobileGateWrapper` without touching the root `app/layout.tsx`.

**Major components:**
1. `DotVotingControls` (NEW) — facilitator panel for open/close voting, configure vote count, view tallies; renders inside existing `FacilitatorControls` gated to `dot-voting` phase and `isFacilitator` role
2. `DotVoteBadge` (NEW) — per-slot dot display (filled/empty circles, vote count); props-only dumb component consumed by `Crazy8sGrid`
3. `VotingOpenedListener` / `VotingClosedListener` (NEW renderless) — participant event handlers; follow exact pattern of existing `StepChangedListener` and `SessionEndedListener` in `multiplayer-room.tsx`
4. `MobileGate` + `MobileGateWrapper` (NEW) — full-screen overlay using `useIsMobile()` + `sessionStorage`; mounted in `workshop/[sessionId]/layout.tsx`; `MobileGateWrapper` is the client boundary that wraps server-rendered workshop children
5. Modified `Crazy8sGrid` / `Crazy8sCanvas` — accept vote state props, render `DotVoteBadge` per slot, handle vote interaction callbacks
6. Modified `IdeationSubStepContainer` — add `'dot-voting'` to `IdeationPhase` union, add phase transition from `crazy-eights` to `dot-voting`

**Build order (with rationale):**
1. Types + store foundation — everything downstream depends on correct `CanvasState` shape
2. Core voting UI (solo path first) — validates complete UX without Liveblocks complexity
3. Multiplayer voting wiring — additive over solo path once UI is stable
4. Mobile gate — fully independent, parallelizable with Phase 2/3
5. Persistence wiring — last, after store API is settled

### Critical Pitfalls

**From PITFALLS.md** (v1.9 multiplayer research, now shipped; v2.0-specific risks extracted):

1. **Storing vote tallies in RoomEvent broadcast** — Vote data in ephemeral events is lost for late joiners and on reconnect. Store `dotVotes` in `storageMapping` (CRDT, durable, survives reconnects); use `VOTING_OPENED`/`VOTING_CLOSED` broadcast events only to trigger UI phase transitions, never to convey vote counts.

2. **Syncing ephemeral vote UI state via storageMapping** — Per-user "is vote panel expanded" or "which slot is hovered" are local UI concerns. Only durable shared state (`dotVotes`, `votingSession`) belongs in `storageMapping`. Ephemeral UI state stays in local React state.

3. **CSS-only mobile gate** — Using `hidden sm:block` still loads all scripts and connects Liveblocks on mobile, wasting resources and leaving broken layouts visible on landscape rotation. Use a React overlay at `z-[9999]`; workshop content still mounts (keeps hydration stable) but is inaccessible until dismissed.

4. **Mobile gate dismiss persisting to `localStorage`** — A user who dismisses on mobile one day never sees the recommendation again. Use `sessionStorage` — persists per browser tab session, resets on new sessions. The user sees the gate once per session on mobile, which is the right UX balance.

5. **Adding mobile gate to root `app/layout.tsx`** — Gate would block the landing page, dashboard, and pricing page on mobile — none of which need it. Scope exclusively to `src/app/workshop/[sessionId]/layout.tsx` via `MobileGateWrapper`.

6. **Dual state authority for vote data** — If vote state ends up in both Liveblocks Storage and Zustand simultaneously for multiplayer, canvas renders from one store while AI context extraction reads from the other. Rule: multiplayer votes are Liveblocks-authoritative; solo votes are Zustand/JSONB-authoritative. The `isMultiplayer` context flag from `MultiplayerContext` enforces this boundary explicitly.

---

## Implications for Roadmap

Based on research, the architecture defines a natural build order with one parallel track:

### Phase 1: Types + Store Foundation
**Rationale:** All downstream UI depends on the correct `CanvasState` shape. TypeScript propagates type errors from store shape changes through the entire component tree — fix the root before touching UI. This is the same principle the architecture research calls out as the most important build-order decision.
**Delivers:** `src/lib/canvas/dot-vote-types.ts` (NEW) with `DotVote`, `VotingSession`, `DEFAULT_VOTING_SESSION`; extended `canvas-store.ts` with `dotVotes`, `votingSession` fields and 6 new actions (`castVote`, `retractVote`, `openVoting`, `closeVoting`, `setVotingResults`, `resetVoting`); extended `multiplayer-canvas-store.ts` with same fields, actions, and `storageMapping` entries (`dotVotes: true`, `votingSession: true`); extended `liveblocks/config.ts` with `VOTING_OPENED`/`VOTING_CLOSED` in `RoomEvent` union; extended `canvas-store-provider.tsx` with new optional initial props.
**Addresses:** Core data model for all voting features; establishes state ownership boundary (Liveblocks vs JSONB)
**Avoids:** Dual state authority pitfall; type errors propagating mid-feature-build

### Phase 2: Core Voting UI (Solo-first)
**Rationale:** Solo voting validates the complete UX path — vote placement, budget HUD, anonymous mode, results reveal, ranked view, facilitator idea selection — without any Liveblocks complexity. Any design issues in vote placement, budget enforcement, or results reveal are caught before multiplayer wiring is added. Also validates the solo persistence path through `markDirty()` + JSONB auto-save.
**Delivers:** `DotVoteBadge` component (NEW, props-only); modified `Crazy8sGrid` with vote overlays and interaction; modified `Crazy8sCanvas` wiring vote state from store to grid; modified `IdeationSubStepContainer` adding `'dot-voting'` phase transition + solo voting flow (user opens voting, places votes, closes, sees ranked results, selects ideas to advance).
**Uses:** Existing `stepArtifacts` JSONB for solo persistence via existing `markDirty()` auto-save
**Implements:** Vote budget enforcement, anonymous vote hide during open session, ranked results view, facilitator idea selection writing to existing `selectedSlotIds` field
**Avoids:** Syncing ephemeral UI state (all vote interaction state is local React state or store actions only)

### Phase 3: Multiplayer Voting
**Rationale:** Depends on Phase 1 types and Phase 2 UI being stable. Wires Liveblocks event listeners and facilitator controls. Multiplayer is purely additive over the solo path — the same UI components receive different data sources based on `isMultiplayer`.
**Delivers:** `VotingOpenedListener` and `VotingClosedListener` renderless components in `multiplayer-room.tsx`; `DotVotingControls` facilitator panel (NEW); modified `FacilitatorControls` to conditionally render `DotVotingControls` when in `dot-voting` phase.
**Uses:** Existing `useBroadcastEvent` / `useEventListener` patterns from `FacilitatorControls` and `CountdownTimer`; `storageMapping.dotVotes` for CRDT vote sync (automatic via existing Liveblocks middleware)
**Implements:** Real-time vote sync, facilitator open/close via broadcast, participant vote HUD, live tally display for facilitator
**Avoids:** Vote tallies in RoomEvent (events are notification-only; `storageMapping` is the durable data)

### Phase 4: Mobile Gate (Independent — Parallelizable)
**Rationale:** Completely independent of voting work. No shared state, no dependencies on Phases 1–3. Can be built in parallel with Phase 2 or 3, or shipped as a standalone at any point. Listed after Phase 3 only because voting is higher business value.
**Delivers:** `src/components/layout/mobile-gate.tsx` (NEW) — full-screen overlay, dismissible, CSS transitions (no framer-motion); `src/components/layout/mobile-gate-wrapper.tsx` (NEW) — client boundary for layout injection; modified `workshop/[sessionId]/layout.tsx` to wrap `<main>` with `<MobileGateWrapper>`.
**Uses:** Existing `useIsMobile()` hook; `sessionStorage` for dismissal persistence (not `localStorage`); CSS `opacity`/`transform` transitions consistent with project patterns
**Avoids:** Root layout scope pitfall; CSS-only approach; `localStorage` dismiss persistence

### Phase 5: Persistence Wiring + QA
**Rationale:** Persistence correctness depends on the store API being stable (Phases 1–3 complete). The JSONB schema is flexible (no migration needed), but absent fields on existing workshops must be handled defensively. The Liveblocks webhook already handles `storageMapping` changes — verify it covers the new `dotVotes` and `votingSession` keys.
**Delivers:** Modified `step/[stepId]/page.tsx` to load `dotVotes` and `votingSession` from `stepArtifacts.artifact` and pass as initial props to store; verified auto-save handles new fields in solo mode; verified Liveblocks webhook persists new `storageMapping` fields in multiplayer; Playwright E2E tests for solo voting flow, multiplayer voting flow, and mobile gate.

### Phase Ordering Rationale

- Types must precede UI because TypeScript propagates store shape errors through all consuming components simultaneously — fixing the root first prevents cascading type errors mid-build.
- Solo-first in Phase 2 validates the complete voting UX with no Liveblocks complexity — any design issues in budget enforcement, anonymous mode, or results reveal are caught before adding real-time sync.
- Mobile gate is listed as Phase 4 but is genuinely independent and can ship after Phase 1 completes; listed fourth because voting is higher business value.
- Persistence is last because the JSONB schema is flexible and the Liveblocks webhook already handles `storageMapping` changes, but correct behavior requires the state shape to be finalized first — wiring persistence against an unstable store API produces hard-to-diagnose data issues.

### Research Flags

**Standard patterns (skip research-phase for all phases):**
- **Phase 1 (Types + Store Foundation):** `storageMapping` extension is an established codebase pattern. Liveblocks type augmentation is already in `config.ts`. Direct codebase inspection provides full confidence. No research needed.
- **Phase 2 (Core Voting UI):** Dot voting UI patterns are well-researched (Miro, FigJam, MURAL, NNGroup). Crazy 8s component structure is fully documented in ARCHITECTURE.md with file-level implementation guidance. No research needed.
- **Phase 3 (Multiplayer Voting):** Liveblocks event listener pattern is identical to existing `StepChangedListener` and `SessionEndedListener`. `storageMapping` CRDT sync is already proven for canvas elements. No research needed.
- **Phase 4 (Mobile Gate):** One new component consuming an existing hook. Pattern is documented with full implementation in ARCHITECTURE.md. No research needed.
- **Phase 5 (Persistence):** Existing auto-save + Liveblocks webhook paths are production-proven. Defensive JSONB field reading is a standard Zod `.optional()` pattern. No research needed.

**No phases require `/gsd:research-phase` for this milestone.** All patterns are documented in the research files with direct codebase verification. Confidence is HIGH across all areas.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new packages — full confidence. All tools are production-validated at v1.9. Liveblocks Storage mutation patterns verified against official docs and existing `multiplayer-room.tsx` / `facilitator-controls.tsx` usage. |
| Features | HIGH | Dot voting patterns sourced from NNGroup research, Miro/FigJam/MURAL official docs, and Google Design Sprint Kit. Feature scope is narrow and well-defined. Anti-features are reasoned with research citations. |
| Architecture | HIGH | All architectural claims derived from direct inspection of 10+ source files. Data flow diagrams match existing code patterns exactly. Component boundary changes are fully specified. |
| Pitfalls | HIGH | Pitfalls research covers v1.9 multiplayer (now shipped and validated). v2.0-specific risks are low-severity and prevention strategies are already established as codebase patterns. |

**Overall confidence:** HIGH

### Gaps to Address

- **`sessionStorage` vs `localStorage` for mobile gate dismissal:** STACK.md recommends `localStorage` (persistent across sessions with optional TTL). ARCHITECTURE.md recommends `sessionStorage` (per-session, resets on new browser sessions). **Recommendation:** Use `sessionStorage` — the ARCHITECTURE.md rationale is stronger (user sees the gate once per browser session; `localStorage` would silently suppress the recommendation indefinitely on devices that always open the app from the same browser). Resolve at the start of Phase 4.

- **Vote default count (2 vs 3):** FEATURES.md sets default at 2 (NNGroup's 25%-of-options rule: 8 slots × 25% = 2). STACK.md and ARCHITECTURE.md both set default at 3. **Recommendation:** Use 2 as the default (NNGroup-derived), configurable range 1–8. Resolve during Phase 1 type definition in `DEFAULT_VOTING_SESSION`.

- **`IdeationPhase` switch chain coverage:** Adding `'dot-voting'` to the phase union will surface TypeScript errors in any exhaustive switch statements across `ideation-sub-step-container.tsx` and related components. These are intentional errors that guide implementation — all callsites require explicit `dot-voting` handling. Treat as a feature, not a bug; plan time for this sweep in Phase 2.

---

## Sources

### Primary (HIGH confidence)
- Liveblocks Storage API official docs — `LiveMap`, `LiveObject`, `useMutation`, `useStorage`, `initialStorage` patterns; vote `LiveMap` composite key design
- Liveblocks React hooks official docs — `useBroadcastEvent`, `useEventListener`, `RoomEvent` type augmentation
- NNGroup: Dot Voting article — vote budget sizing (25% rule), anonymous voting rationale, groupthink prevention with research citations
- Google Design Sprint Kit: Crazy 8s sharing and voting methodology — facilitator-decides pattern for idea advancement
- Direct codebase inspection: `src/lib/liveblocks/config.ts`, `src/stores/canvas-store.ts`, `src/stores/multiplayer-canvas-store.ts`, `src/components/workshop/multiplayer-room.tsx`, `src/components/workshop/facilitator-controls.tsx`, `src/components/workshop/ideation-sub-step-container.tsx`, `src/components/workshop/crazy-8s-canvas.tsx`, `src/components/workshop/crazy-8s-grid.tsx`, `src/hooks/use-mobile.ts`, `src/app/workshop/[sessionId]/layout.tsx`, `src/providers/canvas-store-provider.tsx`

### Secondary (MEDIUM confidence)
- Miro Voting Help Center — vote budget UX, anonymous mode default, ranked results display, "one vote per object" toggle
- FigJam Voting Sessions Help — vote counts, participant flow, "results immediately shown" behavior
- MURAL facilitation patterns — facilitator controls, blind voting, auto-sort by votes
- shadcn `useIsMobile` hook docs — SSR safety confirmation (independently verified against actual hook implementation in codebase)
- Miro community discussion on blind voting — anonymous mode implementation approach (confirmed by official docs)

### Tertiary (LOW confidence / no validation needed)
- Designary and UX Collective blog posts on dot voting — general context for vote budget recommendations (supported by primary NNGroup source)

---

*Research completed: 2026-02-28*
*Ready for roadmap: yes*
