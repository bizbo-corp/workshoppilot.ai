# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.8 — Onboarding + Payments

**Shipped:** 2026-02-26
**Phases:** 7 | **Plans:** 11

### What Was Built
- Credit-based payment system with Stripe Checkout (redirect mode, zero PCI surface)
- Server-side paywall at Step 7 with atomic credit consumption and grandfathering
- Inline UpgradeDialog with outcome-framed copy at the Step 6 gate
- Return-to-workshop flow (purchase → auto-resume at Step 7)
- First-run welcome modal with DB-backed cross-device dismissal
- Dashboard credit badge showing remaining balance
- Pricing page with credit-based tiers wired to Stripe Checkout

### What Worked
- Dual-trigger fulfillment pattern (success page + webhook) eliminated the stale-credit UX problem
- Server-side paywall enforcement proved robust — middleware-only would have been vulnerable to CVE-2025-29927
- Conditional-UPDATE for atomic credit deduction worked cleanly with neon-http (no need for interactive transactions)
- Phase dependency chain (47→48→49→50→51→52) was well-structured — each phase built on the previous cleanly
- Open redirect validation at 3 points (defense in depth) was straightforward to implement

### What Was Inefficient
- Phase 53 (pricing page) was planned but ultimately completed outside GSD tracking, creating audit gaps
- The audit found PRIC-01/02/03 gaps that could have been caught earlier with a pricing page review
- SUMMARY.md one_liner fields were empty across all v1.8 phases — summary-extract yielded no quick context

### Patterns Established
- `'server-only'` import + module-load fail-fast assertion for server singletons (stripe.ts matches db/client.ts)
- Pinned Stripe apiVersion to prevent silent API contract changes
- Conditional-UPDATE (WHERE col > 0 RETURNING) as the pattern for atomic operations on neon-http
- paywall-config.ts for constants that can't live in `'use server'` files (Next.js limitation)

### Key Lessons
1. Stripe Checkout redirect mode is the right default for simple purchase flows — zero client-side Stripe code needed
2. Credit-based billing is simpler than subscriptions when usage is infrequent (1-3 workshops/year)
3. Always validate return URLs at every point in the redirect chain, not just at the entry
4. When neon-http doesn't support SELECT FOR UPDATE, conditional-UPDATE with RETURNING is provably atomic at the PG row level

### Cost Observations
- Model mix: ~70% sonnet (execution), ~30% opus (planning/orchestration)
- Milestone completed in 2 days across multiple sessions
- Notable: Phases 47-49 (database + Stripe + API) completed in a single day

---

## Milestone: v1.9 — Multiplayer Collaboration

**Shipped:** 2026-02-28
**Phases:** 5 | **Plans:** 12

### What Was Built
- Real-time multiplayer canvas sync via Liveblocks CRDT storage with auto-persist to Neon
- Live presence with 50ms-throttled cursors, avatar stack, idle detection, facilitator crown badge
- Guest join flow via HMAC-SHA256 signed share links with no-account-needed entry
- Facilitator-gated step progression and AI chat (participants read-only)
- Facilitator controls: viewport sync, countdown timer with audio chime, session end with canvas snapshot
- Guest access to read-only Build Pack outputs after session end

### What Worked
- Liveblocks CRDT + Zustand dual-store pattern cleanly separated multiplayer (CRDT-authoritative) from solo (Zustand/JSONB-authoritative) state
- StorageUpdated webhook for auto-persisting canvas state to Neon eliminated manual save logic
- HMAC-SHA256 signed HttpOnly cookies for guest auth — no Clerk accounts needed, lobby pattern for join flow
- Phase dependency chain (foundation → sync → presence → auth → controls) built up incrementally with no backtracking

### What Was Inefficient
- Undo/redo had to be disabled in multiplayer (liveblocks() + temporal() TypeScript incompatible) — tech debt carried forward
- SYNC-04 (per-participant Crazy 8s slots) was deferred — voting had to work around shared slot ownership

### Patterns Established
- `storageMapping` entries for any durable multiplayer data needing CRDT sync
- RoomEvent broadcast for UI transitions (not data changes — data lives in CRDT)
- Sub-component conditional mounting pattern for hooks that require RoomProvider context

### Key Lessons
1. CRDT + event broadcast separation is the right architecture: events for ephemeral UI transitions, CRDT storage for durable data
2. Guest auth via HMAC-signed cookies is simpler and more secure than JWT-in-localStorage for read-mostly participants
3. Disabling features that don't compose well (undo/redo in multiplayer) is better than shipping a broken version

### Cost Observations
- Model mix: ~70% sonnet (execution), ~30% opus (orchestration)
- Milestone completed in 3 days
- Notable: Phases 54-56 (foundation + sync + presence) completed in a single day

---

## Milestone: v2.0 — Dot Voting & Mobile Gate

**Shipped:** 2026-03-01
**Phases:** 4 | **Plans:** 7

### What Was Built
- Dot voting type system with dual-store foundation (solo Zustand, multiplayer Liveblocks CRDT)
- VotingHud with budget dot glyphs, Crazy8sGrid vote badges/buttons, full JSONB persistence
- VotingResultsPanel with ranked results, thumbnails, selection checkboxes, confirm/re-vote
- Multiplayer voting: timer-coupled facilitator controls, anonymous votes, completion indicators
- Per-voter attribution dots (facilitator-only), PresenceBar completion checkmarks, god-view
- Dismissible mobile gate overlay with email-to-self and copy-link CTAs

### What Worked
- Vote state ownership boundary (CRDT vs Zustand) was cleanly designed in Phase 59 — Phases 60-61 built on it without rework
- VotingEventListener as renderless component mirrored the proven StepChangedListener/SessionEndedListener pattern
- computeVotingResults extracted to shared voting-utils.ts — avoided duplication between FacilitatorControls and VotingEventListener
- Mobile gate was truly independent (only depended on Phase 59 for context) — could execute in parallel with voting work

### What Was Inefficient
- SUMMARY.md one_liner fields still empty across all v2.0 phases — same gap as v1.8
- Phase 61 plan required undocumented intermediary (Crazy8sGroupNode data) for voting props — context file could have captured this

### Patterns Established
- Sub-component mounting for conditional Liveblocks hooks (AttributionDots only when isFacilitator=true)
- Deterministic voter color map by arrival order — avoids hooks in solo-capable components
- Compound matchMedia (pointer + viewport) for device detection instead of userAgent
- sessionStorage for per-session-tab dismissal (vs localStorage for permanent suppression)

### Key Lessons
1. Dual-store ownership boundaries should be designed up front in the type/store phase — it prevented all multiplayer integration issues
2. Timer-to-voting coupling through a single facilitator control surface is cleaner than distributed voting state
3. Anonymous voting until close is a non-negotiable UX decision (NNGroup research) — worth the extra complexity
4. votingSessionRef pattern (useRef + useEffect) solves stale closure problems in timer interval callbacks

### Cost Observations
- Model mix: ~70% sonnet (execution), ~30% opus (orchestration)
- Milestone completed in 2 days — smallest milestone yet (4 phases, 7 plans)
- Notable: Clean phase dependency chain meant zero rework across all 4 phases

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v0.5 | 6 | 19 | Initial scaffold — established GSD workflow |
| v1.0 | 8 | 25 | AI facilitation engine — heaviest planning phase |
| v1.1 | 6 | 15 | Canvas foundation — ReactFlow integration |
| v1.2 | 4 | 9 | Grid/whiteboard — coordinate system patterns |
| v1.3 | 5 | 23 | EzyDraw — most plans per phase (avg 4.6) |
| v1.4 | 6 | 13 | Polish — testing and personality |
| v1.5 | 4 | 9 | Launch ready — public-facing surfaces |
| v1.6 | 2 | 5 | Production auth — minimal scope |
| v1.7 | 4 | 7 | Build Pack — AI generation pipeline |
| v1.8 | 7 | 11 | Payments — Stripe integration, server-side enforcement |
| v1.9 | 5 | 12 | Multiplayer — Liveblocks CRDT, guest auth, facilitator controls |
| v2.0 | 4 | 7 | Dot voting + mobile gate — smallest milestone, cleanest chain |

### Top Lessons (Verified Across Milestones)

1. Phase dependency chains that build incrementally (schema → infra → API → enforcement → UI) produce clean, testable work (v1.8, v1.9, v2.0)
2. Server-side enforcement is always worth the extra effort over client-only checks (v1.8, v1.9)
3. Keeping summary/one-liner fields populated in SUMMARY.md pays dividends for progress tracking and retrospectives (v1.8, v2.0 — still a gap)
4. Completing work outside GSD tracking creates audit gaps — better to run quick plans through the system (v1.8)
5. Dual-store ownership boundaries (CRDT vs local) should be designed in the type/foundation phase — prevents integration issues downstream (v1.9, v2.0)
6. CRDT for data, broadcast events for UI transitions — clean separation verified across multiplayer + voting (v1.9, v2.0)
