# Project Research Summary

**Project:** WorkshopPilot.ai — v1.9 Real-Time Multiplayer Collaboration
**Domain:** Collaborative whiteboard + structured facilitation (design thinking workshop with live canvas sync)
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

WorkshopPilot.ai v1.9 adds a parallel workshop mode: a human facilitator leads 5–15 participants through the same 10-step design thinking process with a shared live canvas. The research is unambiguous about infrastructure: Vercel's serverless execution model makes it impossible to self-host WebSockets, so a managed real-time provider is architecturally required. Liveblocks is the clear recommendation because it is the only provider with a documented, working example combining ReactFlow + Zustand + Next.js, which exactly matches the existing production stack. Liveblocks handles CRDT conflict resolution, presence, and storage internally, eliminating an entire category of hard distributed-systems problems. The existing stack requires only three new production packages: `@liveblocks/client@3.14.0`, `@liveblocks/react@3.14.0`, and `@liveblocks/node@3.14.0` — all pinned to the same version.

The architecture is well-understood and has a clear build order: foundation (Liveblocks config, schema migrations, auth endpoint) unblocks canvas sync, which unblocks cursors and presence, which unblocks the guest join flow, which unblocks facilitator controls. The decisive design constraint — established before writing any code — is the strict boundary between Zustand (solo workshops, AI conversation, step state) and Liveblocks (collaborative canvas nodes/edges, live cursors). Letting both write to the same canvas state is the single most common failure mode in multiplayer canvas applications. Two Zustand store factory functions are required: `createSoloCanvasStore` (unchanged) and `createMultiplayerCanvasStore` (wraps the existing state creator with the `liveblocks()` middleware), instantiated by the canvas store provider based on `workshopType`.

The primary risks are all preventable with known patterns. Ephemeral ReactFlow fields (`selected`, `dragging`, `measured`) must never enter shared CRDT storage or participants will steal each other's selections and see jittery drags. Cursor broadcasts must be throttled to ≤50ms intervals or they saturate the Liveblocks channel at 15 users. Guest auth must be validated server-side — hiding the step-advance button in the UI is not a security boundary, and any participant can call the server action from DevTools. The Liveblocks StorageUpdated webhook must be registered before auto-save is disabled, or canvas state is permanently lost when the room expires. The free Liveblocks tier covers early launch (500 rooms/month, 200 MAU) but the 10-simultaneous-connections-per-room cap means facilitators expecting more than 10 participants need the Pro plan ($30/month) — this upgrade prompt should be designed into the UI from Phase 1.

## Key Findings

### Recommended Stack

Liveblocks v3.14.0 across three packages — `@liveblocks/client`, `@liveblocks/react`, `@liveblocks/node` — is the complete real-time layer. The `@liveblocks/zustand` middleware is the integration point: it intercepts Zustand `set()` calls for declared storage keys and syncs them as CRDT-safe LiveList/LiveObject entries. For guest session IDs, `nanoid` or `crypto.randomUUID()` are both sufficient — check if nanoid is already in the dependency tree before installing. Two env vars are required: `LIVEBLOCKS_SECRET_KEY` (server-only, never `NEXT_PUBLIC_`) and `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY`. Vercel deployment requires zero configuration changes; Liveblocks is a Vercel-listed real-time partner and manages its own WebSocket infrastructure. The Liveblocks DevTools browser extension and the Liveblocks Dashboard are the primary development and debugging tools.

**Core technologies:**
- `@liveblocks/client@3.14.0`: WebSocket connection, CRDT storage (LiveList/LiveObject), room management — purpose-built for canvas/whiteboard tools (Figma, Pitch, Spline), eliminates custom conflict resolution
- `@liveblocks/react@3.14.0`: React hooks (`useStorage`, `useMyPresence`, `useOthers`, `useMutation`, `useBroadcastEvent`, `useEventListener`) — first-class React integration; official working example combines Liveblocks + Zustand + ReactFlow + Next.js
- `@liveblocks/node@3.14.0`: Server-side access token issuance in App Router route handlers — edge-compatible, supports arbitrary userId strings (enables guest users without Clerk)
- `nanoid` (or `crypto.randomUUID()`): Guest session ID generation — stored in sessionStorage, enables stable guest identity across page reloads within a tab

**Do not add:** socket.io, Yjs, y-websocket, Automerge, PartyKit, Supabase, Ably, Pusher, or a second Postgres provider. Each is either incompatible with Vercel's serverless model or solves a problem Liveblocks already handles.

### Expected Features

The feature set has a clear P1/P2/P3 structure derived from competitive analysis (Miro, MURAL, FigJam, Butter) and ReactFlow's multiplayer documentation. P1 is the minimum for a real multiplayer experience. P2 adds facilitator superpowers that can ship within the same milestone once P1 is stable. P3 items involve architectural complexity not justified for v1.9.

**Must have (P1 — v1.9 launch):**
- Multiplayer workshop type — new session entity, creation flow, facilitator role in DB
- Share-link join flow — unique token, `/join/[token]` route, name entry only, no Clerk account needed
- Participant lobby — "waiting for facilitator to start" state before canvas unlocks
- Real-time canvas sync — all nodes/edges broadcast in real time via Liveblocks CRDT Storage
- Live cursors — colored, named, ephemeral cursor positions (Liveblocks Presence, not Storage)
- Full canvas edit access for participants — post-its, node moves, EzyDraw
- AI chat visible to all — full conversation history displayed read-only to all participants
- AI token streaming to all — streaming tokens broadcast to all connected clients, not just the facilitator
- Facilitator-only step progression — only the session owner can click Next/Previous Step
- Participant list panel — names, avatar colors, online/idle status, facilitator badge
- Join/leave notifications — non-intrusive toasts (bottom corner)
- Reconnection with state recovery — Liveblocks handles automatically when middleware is used correctly
- End session — facilitator deliberate action; all participants see "session ended" overlay

**Should have (P2 — add once P1 is stable):**
- "Bring everyone to me" viewport sync — facilitator broadcasts `x, y, zoom` to all clients
- Step timer — facilitator-set countdown visible to all participants
- User-specific post-it colors — nodes inherit the creating participant's cursor color
- Participant emoji reactions on AI messages — ephemeral sentiment signal, no storage
- Idle presence indicator — visual dim for participants inactive > 2 minutes

**Defer (v2+):**
- Private mode for independent ideation — requires server-side per-node authorization per participant, conflicts with current broadcast-all architecture; highest-risk item if attempted in v1.9
- Breakout groups / sub-canvases — separate architectural problem from shared-canvas model; already in FFP backlog
- Session recording / transcript export
- Facilitator private notes panel
- Dot voting — already in FFP backlog, depends on multiplayer foundation

**Confirmed anti-features (do not build):**
- Per-node lock / ownership — prevents collaborative refinement, which is the point
- Participant-to-participant side channel chat — professional facilitators actively prevent sidebar conversations
- Each participant gets their own AI conversation — destroys shared understanding
- Email invitation flow — join link achieves the same goal without the deliverability engineering
- Forced "follow facilitator" viewport lock — community complaints confirm participants feel trapped; use soft viewport sync instead

### Architecture Approach

The architecture is a strict dual-mode separation: solo workshops use the existing unmodified Zustand store; multiplayer workshops use a Liveblocks-middleware-wrapped variant of the same store. Two factory functions — `createSoloCanvasStore` (unchanged, existing behavior) and `createMultiplayerCanvasStore` (adds `liveblocks()` middleware with `storageMapping` and `presenceMapping`) — are instantiated by the canvas store provider based on `workshopType`. The `storageMapping` declares all canvas entity arrays as Liveblocks LiveList/LiveObject (stickyNotes, mindMapNodes, gridColumns, conceptCards, etc.); `presenceMapping` declares only cursor position. Step progression uses Liveblocks broadcast events (ephemeral, real-time delivery) in parallel with Neon writes (durable, for late-joiner state recovery). The Liveblocks StorageUpdated webhook (60s throttle) writes canvas state back to Neon as a persistence safety net; a manual Liveblocks REST API call on "End Session" provides the final authoritative snapshot. Auto-save is disabled in multiplayer mode to prevent dual writes to Neon. Guest auth uses HttpOnly signed cookies set by `/api/guest-join`, consumed by `/api/liveblocks-auth` when no Clerk session is present.

**Major components:**
1. `src/lib/liveblocks/config.ts` — Presence/Storage type definitions, `createRoomContext()` factory; all Liveblocks hooks exported from here (single import point)
2. `stores/canvas-store.ts` — MODIFIED: exports both `createSoloCanvasStore` (unchanged) and `createMultiplayerCanvasStore` (with `liveblocks()` middleware)
3. `providers/canvas-store-provider.tsx` — MODIFIED: reads `isMultiplayer` prop, instantiates the correct store factory, calls `enterRoom`/`leaveRoom` lifecycle
4. `app/api/liveblocks-auth/route.ts` — NEW: unified auth endpoint for Clerk users (facilitators) and guest cookie path (participants)
5. `app/api/guest-join/route.ts` — NEW: validates share token, creates `workshopMembers` record, sets HttpOnly signed cookie
6. `app/join/[token]/page.tsx` — NEW: GuestJoinModal blocks canvas until participant name is entered; no workshop content visible before name submission
7. `components/canvas/live-cursors.tsx` — NEW: renders remote cursors inside ReactFlow `ViewportPortal` using flow coordinates (not screen coordinates)
8. `components/multiplayer/presence-bar.tsx` — NEW: participant list with avatar initials, online/idle status, facilitator badge, using `useOthers()`
9. `components/multiplayer/step-progression-control.tsx` — NEW: facilitator-only Next/Previous Step buttons; role check in both UI (`useSelf().info.role`) and server action
10. `app/api/webhooks/liveblocks/route.ts` — NEW: StorageUpdated webhook writes Liveblocks canvas state to Neon `stepArtifacts` every 60s

### Critical Pitfalls

1. **Vercel has no native WebSocket support** — socket.io or ws servers deployed to Vercel API routes work in local dev and fail immediately in production (504/timeout). Use Liveblocks from day one; this cannot be deferred or retrofitted. Source: Vercel official KB.

2. **Syncing ephemeral ReactFlow fields into CRDT storage** — including `selected`, `dragging`, `resizing`, or `measured` in `storageMapping` causes selection stealing (User B sees User A's selected nodes), drag jank (every 16ms cursor-position update broadcasts to all clients), and layout instability (DOM-computed `measured.width/height` varies per viewport). `storageMapping` must list only durable fields. Source: ReactFlow official multiplayer documentation.

3. **Cursor broadcasts without throttling** — raw `mousemove` at 60fps from 15 users generates 900 messages/second, saturating the Liveblocks Presence channel and introducing canvas mutation lag. Throttle to 50ms (max 20 updates/second per user). Liveblocks Presence is a separate lower-priority sync path from Storage; use it exclusively for cursors. Source: confirmed performance trap in multiplayer canvas literature.

4. **Guest role enforced client-side only** — hiding the step-advance button from non-facilitators in the UI is not a security boundary. Participants can call `advanceWorkshopStep()` directly from browser DevTools. The server action must verify the caller is the workshop owner via `auth()` matching against `workshops.clerkUserId`. Guest participants have no Clerk session and fail this check by design. Source: OWASP WebSocket Security.

5. **Disabling auto-save without registering the StorageUpdated webhook** — if `useCanvasAutosave` is disabled for multiplayer mode but the Liveblocks webhook is not registered, no writes to Neon occur during the session. When the Liveblocks room expires, canvas state is permanently lost. Register and verify the webhook fires before disabling auto-save. Source: Liveblocks architecture pattern.

6. **Share link route not whitelisted in Clerk middleware** — `/join/[token]` will redirect guests to Clerk sign-in if not added to the public routes list in `clerkMiddleware`. Issue HttpOnly signed cookies (not Clerk JWTs) for guest participants; never prompt guests to create a Clerk account. Source: PITFALLS.md Pitfall 11.

7. **Cursor positions stored in screen coordinates, not flow coordinates** — `event.clientX/Y` varies per user's viewport pan/zoom; other participants' cursors drift to wrong positions when they pan or zoom. Always convert with `screenToFlowPosition()` before broadcasting to Presence. Confirmed ReactFlow bug in issue #3771.

## Implications for Roadmap

The build order has a clear dependency graph from the combined research. Each phase is a genuine gate: later phases cannot be correctly tested without earlier phases complete.

### Phase 1: Foundation and Schema
**Rationale:** Liveblocks configuration types, database schema additions, the auth endpoint stub, and the lazy-loading bundle strategy are prerequisites for every subsequent phase. Establishing the dual-store factory pattern and room naming convention before any multiplayer features are written prevents mid-implementation rework. Schema migrations are additive (no modification to existing solo-workshop tables).
**Delivers:** `@liveblocks/client@3.14.0 @liveblocks/react@3.14.0 @liveblocks/node@3.14.0` installed; `src/lib/liveblocks/` with client, config types, and room-id convention; `/api/liveblocks-auth` (Clerk path only, guest path stubbed); `/api/webhooks/liveblocks` StorageUpdated handler registered; Neon schema additions (`workshopType` and `currentStepNumber` columns on workshops, `guestName` on workshopMembers, `workshop_sessions` and `session_participants` tables); dual-store factory pattern established; `next/dynamic` lazy-loading wrapper for multiplayer components; bundle size baseline measured with `@next/bundle-analyzer`.
**Pitfalls avoided:** Vercel WebSocket constraint (Liveblocks from day one), schema not supporting multiplayer (additive migrations only), bundle size spike (lazy-load before installing), Zustand/Liveblocks dual-write (two store factories, only one active per workshop type), seed scripts must set `workshopType: 'solo'` to avoid consuming free tier room quota.
**Research flag:** Standard Liveblocks setup — follow STACK.md and ARCHITECTURE.md patterns directly. No additional research needed.

### Phase 2: Core Canvas Sync
**Rationale:** Real-time canvas sync is the critical path dependency for all other multiplayer features. Cursor rendering, facilitator controls, and guest join all depend on the Liveblocks room being functional with the correct storage schema. Building this in isolation (no cursor UI, no guest join) allows clean smoke-testing with two authenticated browser tabs before adding UI complexity.
**Delivers:** `createMultiplayerCanvasStore` with `liveblocks()` middleware and correct `storageMapping` (all canvas entity arrays: stickyNotes, drawingNodes, mindMapNodes, mindMapEdges, gridColumns, conceptCards, personaTemplates, hmwCards, crazy8sSlots); `CanvasStoreProvider` with `enterRoom`/`leaveRoom` lifecycle calls; auto-save disabled in multiplayer mode via `options.disabled`; smoke test: two browser tabs on the same multiplayer workshop, move sticky note in one, see it move in other.
**Architecture components:** canvas-store.ts (MODIFIED), CanvasStoreProvider (MODIFIED).
**Pitfalls avoided:** Syncing ephemeral ReactFlow fields (storageMapping lists only durable fields — no `selected`, `dragging`, `measured`), auto-save overwriting Liveblocks state (disabled), Zustand fighting the real-time store (only one store active per workshopType).
**Research flag:** Standard — follow ARCHITECTURE.md Pattern 1. Open question: `temporal` (zundo) + `liveblocks()` middleware composition order must be verified empirically. Recommended order is `temporal(liveblocks(stateCreator, config))` per ARCHITECTURE.md, but needs confirmation in Phase 2 before proceeding.

### Phase 3: Live Cursors and Presence Bar
**Rationale:** Live cursors require the Liveblocks room to be active (Phase 2). The PresenceBar is required for facilitator controls (kick participant, see idle status) in Phase 5. Separating this into its own phase allows clean testing of the throttle implementation and coordinate conversion before facilitator control logic is added.
**Delivers:** Presence type with cursor/name/color/role fields added to `liveblocks/config.ts`; `onMouseMove`/`onMouseLeave` handlers in ReactFlow canvas (50ms throttle mandatory, uses `screenToFlowPosition`); `LiveCursors` component using `ViewportPortal` with flow-coordinate-based cursor rendering (not screen coordinates); `PresenceBar` with `useOthers()` showing avatar initials, name, online/idle dot; join/leave toast notifications; facilitator cursor visually distinct (different icon, "Facilitator" badge).
**Architecture components:** live-cursors.tsx (NEW), react-flow-canvas.tsx (MODIFIED), presence-bar.tsx (NEW).
**Pitfalls avoided:** Screen coordinates vs. flow coordinates (use `screenToFlowPosition`), cursor channel saturation (50ms throttle mandatory before testing with multiple users), participant seeing own cursor (filter by connectionId), ReactFlow `snapToGrid` + cursor drift bug (implement grid snapping in store action, not via ReactFlow `snapToGrid` prop).
**Research flag:** Standard — ViewportPortal cursor placement and Presence hook patterns are explicitly documented. No additional research needed.

### Phase 4: Guest Auth and Share-Link Join Flow
**Rationale:** This phase is independent of cursor rendering (Phase 3) but depends on the auth endpoint stub from Phase 1. Guest auth must be fully implemented before facilitator controls (Phase 5) are built, because facilitator-vs-participant role distinction comes from the auth layer. Isolating guest auth into its own phase allows security testing in a controlled environment.
**Delivers:** Share token generation on multiplayer workshop creation; `/join/[token]` page with GuestJoinModal (blocks all workshop content until name is entered); `/api/guest-join` endpoint (validates share token, creates `workshopMembers` record with `guestName`, sets HttpOnly signed cookie scoped to workshopId); guest cookie path added to `/api/liveblocks-auth`; `/join/[token]` added to `clerkMiddleware` public routes; incognito-tab join test passing.
**Architecture components:** `/join/[token]` page (NEW), `/api/guest-join` (NEW), `/api/liveblocks-auth` (MODIFIED — adds guest cookie path).
**Pitfalls avoided:** Share link Clerk auth confusion (join route in public routes, no Clerk redirect), CSWSH (Liveblocks token-based auth makes this structurally impossible), guest tokens in `sessionStorage` (not `localStorage` — clears on tab close), join codes with sufficient entropy (8+ char alphanumeric, not sequential integers).
**Research flag:** Needs a decision spike before implementation — the mixed-auth endpoint (Clerk session + HttpOnly cookie in the same handler) and cookie signing library choice (`iron-session`, `jose`, or HMAC) are flagged MEDIUM confidence in ARCHITECTURE.md. Resolve before writing the auth endpoint.

### Phase 5: Facilitator Controls and Step Progression
**Rationale:** Facilitator controls require both an active room (Phase 2) and participant visibility (Phase 3's PresenceBar for kick/idle status). Step progression uses broadcast events (ephemeral) in parallel with Neon writes (durable for late-joiners) — both paths are required; broadcast-only leaves late-joiners on the wrong step.
**Delivers:** `StepProgressionControl` component (role-gated via `useSelf().info.role === 'facilitator'`); `useBroadcastEvent` for `STEP_CHANGED`; `useEventListener` on participant clients triggering `router.refresh()`; `advanceWorkshopStep` server action updated with server-side Clerk auth check matching `workshops.clerkUserId`; "End Session" button with confirmation modal; "End Session" triggers Liveblocks REST API manual sync to Neon before room archive; "Workshop Full" UI that catches Liveblocks 4001 connection error.
**Architecture components:** step-progression-control.tsx (NEW), advanceWorkshopStep server action (MODIFIED).
**Pitfalls avoided:** Broadcast events as the only step state (always write to Neon in parallel — late-joiners need DB), facilitator role enforced client-side only (server action validates caller against `workshops.clerkUserId`), data loss on End Session (manual Liveblocks REST API snapshot before room is archived).
**Research flag:** Standard — broadcast events for step progression is the canonical Liveblocks tutorial pattern ("slide presentation" is the documented use case). No additional research needed.

### Phase 6: AI Chat in Multiplayer Mode
**Rationale:** AI chat visibility to all participants is a P1 feature but architecturally the last core feature to implement because it requires the room (Phase 2), participant presence (Phase 3), and facilitator identity (Phase 5) all to be stable first. The AI token streaming pattern (broadcasting Gemini tokens to N clients) is non-standard and needs a validation spike at the start of this phase before the full implementation is written.
**Delivers:** AI conversation history displayed to all participants in real time (read-only); facilitator-only chat input (hidden for participants via role check); AI streaming tokens broadcast to all connected clients; graceful reconnection with visible "Reconnecting..." banner while disconnected; "Session has ended" full-screen overlay when facilitator ends session (broadcast `SESSION_ENDED` event to all participants).
**Architecture components:** existing AI chat panel (MODIFIED — dual render mode: facilitator gets input, participants get read-only view).
**Pitfalls avoided:** AI conversation stored in Liveblocks Storage (keep in Neon, use broadcast/SWR for real-time updates — AI messages are the facilitator's linear history, not collaborative canvas data), participant side-channel chat (read-only display only, no participant input), no session-ended signal (broadcast `SESSION_ENDED` with full-screen overlay).
**Research flag:** AI token streaming to N clients simultaneously is flagged in FEATURES.md as a non-standard pattern requiring validation. Two options: (A) broadcast `AI_CHAT_UPDATED` event + targeted SWR revalidation on participant clients (simpler, avoids coupling AI streaming to Liveblocks channel), or (B) broadcast each Gemini token chunk via Liveblocks broadcast events. Recommend a 1–2 hour spike at the start of Phase 6 to choose and validate the approach before full implementation.

### Phase 7: P2 Facilitator Enhancements
**Rationale:** P2 features are high value but not required for the first multiplayer session. They build on the stable P1 foundation and should be added incrementally after the core flow is validated with real users. All are low-to-medium complexity incremental additions.
**Delivers:** "Bring everyone to me" viewport broadcast (facilitator sends `x, y, zoom`; participants animate viewport); step timer (facilitator-set countdown, `useBroadcastEvent`, visible to all); user-specific post-it colors (node `data.creatorColor` set on creation from `useSelf().info.color`); participant emoji reactions on AI messages (ephemeral Liveblocks broadcast, aggregated counts); idle presence indicator (track last-interaction timestamp, dim avatar after 2 minutes).
**Research flag:** Standard patterns — all documented in FEATURES.md with clear implementation notes. No additional research needed.

### Phase Ordering Rationale

- Foundation first because Liveblocks config types, DB schema, and the lazy-loading pattern are required by every subsequent phase. Retrofitting these later means rewriting already-written code.
- Canvas sync before guest auth because the Liveblocks room must be functional before the guest join flow can be end-to-end tested. Testing guest auth before the room works produces false failures.
- Guest auth before facilitator controls because facilitator-vs-participant role distinction comes from the auth layer. Facilitator controls built before roles are defined cannot be correctly gated.
- Facilitator controls before AI chat because the "facilitator-only input" requirement depends on knowing the current user's role, which comes from the Liveblocks access token issued by the auth endpoint.
- AI chat last because it is the most novel implementation pattern and benefits from all infrastructure being stable before it is wired in. A bug in AI streaming in a broken room environment is extremely hard to diagnose.
- P2 enhancements last because they are add-on improvements that require a working P1 session to be validated against real-user behavior.

### Research Flags

Phases needing deeper research or implementation decision spikes before coding:
- **Phase 2 (Canvas Sync) — middleware ordering:** `temporal` (zundo) + `liveblocks()` middleware composition order needs empirical verification. If composition fails, the fallback is disabling undo/redo for multiplayer sessions (cross-user undo is an anti-feature per FEATURES.md anyway).
- **Phase 4 (Guest Auth) — mixed-auth endpoint:** The Clerk + HttpOnly cookie in the same `/api/liveblocks-auth` handler is MEDIUM confidence. Cookie signing library choice (`iron-session`, `jose`, or custom HMAC) should be decided before writing the auth endpoint. Check existing auth utilities in the project first.
- **Phase 6 (AI Chat) — token streaming to N clients:** The approach for broadcasting Gemini stream tokens to all connected participants (SWR revalidation vs. Liveblocks broadcast per token chunk) requires a validation spike before full implementation.

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 1 (Foundation):** Liveblocks setup, schema migrations, and next/dynamic lazy loading are all documented with official examples.
- **Phase 3 (Cursors):** ReactFlow ViewportPortal + Liveblocks Presence cursor pattern has an official working code example.
- **Phase 5 (Facilitator Controls):** Broadcast events for step progression is Liveblocks' canonical tutorial use case ("slide presentation").
- **Phase 7 (P2 enhancements):** All are incremental additions with documented patterns in FEATURES.md.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Liveblocks recommendation verified via npm (3.14.0 current), official docs, and a working Liveblocks + Zustand + ReactFlow + Next.js example published by Liveblocks. Vercel compatibility confirmed as an official Vercel real-time partner. All alternatives evaluated and rejected with documented rationale. |
| Features | HIGH | P1/P2/P3 structure derived from competitive analysis (Miro, MURAL, FigJam, Butter) and ReactFlow's official multiplayer documentation. Anti-features are well-reasoned with references to facilitator research. One flag: AI token streaming to N clients is an emerging pattern without a canonical reference implementation. |
| Architecture | HIGH | Liveblocks official docs, Vercel KB, Clerk+Liveblocks integration guide, ReactFlow multiplayer guide, and OWASP all consulted. Build order and component boundaries are explicit. Two MEDIUM items: mixed-auth endpoint composition, and `temporal` + `liveblocks()` middleware ordering. |
| Pitfalls | HIGH | 12 specific pitfalls with phase-level prevention assignments. Sources include ReactFlow official docs (#3771, discussion #2570), OWASP WebSocket Security Cheat Sheet, Vercel KB, and PortSwigger CSWSH. All major failure modes are documented with concrete prevention patterns. |

**Overall confidence:** HIGH

### Gaps to Address

- **AI token streaming strategy:** Two implementation approaches need a decision before Phase 6. Option A (broadcast `AI_CHAT_UPDATED` event + SWR revalidation) is simpler and avoids coupling AI streaming to the Liveblocks channel. Option B (broadcast each Gemini token chunk via Liveblocks broadcast events) provides true real-time streaming to participants. Run a 1–2 hour spike at the start of Phase 6 planning to validate the chosen approach before full implementation.

- **`temporal + liveblocks` middleware composition:** The existing store wraps state with `zundo`'s `temporal` middleware for undo/redo. The `liveblocks()` middleware must compose correctly with `temporal`. Recommended order is `temporal(liveblocks(stateCreator, config))` but must be verified in Phase 2. If ordering causes issues, the fallback is disabling undo/redo for multiplayer sessions — cross-user undo is an explicit anti-feature per FEATURES.md.

- **Liveblocks free tier per-room connection limit:** ARCHITECTURE.md notes the free tier connection limit per room but flags it could not be read from the pricing page render. Verify the exact limit from the Liveblocks dashboard or docs before Phase 1. Design a "Workshop Full" error state (Liveblocks 4001 error code) and upgrade prompt into Phase 1 schema (consider a `planTier` indicator) even if the upgrade flow is wired in Phase 5.

- **EzyDraw in multiplayer:** EzyDraw is a modal that produces a drawing node in canvas state (which Liveblocks will sync). If two participants open EzyDraw on the same drawing node simultaneously, there is no in-flight vector conflict resolution. For v1.9, scope to first-to-open wins: the EzyDraw modal should be locked to one user at a time per node (using Liveblocks Presence to track which nodes are being edited). Make this an explicit decision in Phase 2 when canvas sync is implemented.

- **Cookie signing library:** `iron-session`, `jose`, or a custom HMAC — check existing auth utilities in the project before Phase 4 begins. The project may already have a preference from v1.8 session management.

- **Seed data and free tier quota:** PawPal seed CLI and any developer seed scripts must force `workshopType: 'solo'` to avoid consuming Liveblocks free tier monthly active room quota on every dev seed run. Add this guard in Phase 1 schema work.

## Sources

### Primary (HIGH confidence)
- `https://liveblocks.io/examples/collaborative-flowchart/zustand-flowchart` — Official working example: Liveblocks + Zustand + ReactFlow + Next.js; direct architectural precedent for WorkshopPilot
- `https://liveblocks.io/docs/api-reference/liveblocks-zustand` — Middleware `storageMapping`/`presenceMapping` API reference
- `https://liveblocks.io/docs/authentication/access-token/nextjs` — Access token auth endpoint with arbitrary userId support; `prepareSession` + `allow` pattern
- `https://liveblocks.io/docs/guides/how-to-synchronize-your-liveblocks-storage-document-data-to-a-vercel-postgres-database` — StorageUpdated webhook to Postgres write-back pattern
- `https://liveblocks.io/docs/tutorial/react/getting-started/broadcasting-events` — `useBroadcastEvent` + `useEventListener`; "slide presentation" as canonical step progression example
- `https://reactflow.dev/learn/advanced-use/multiplayer` — Official multiplayer guide: ephemeral vs durable state, cursor patterns, delete-move race condition warning, field-level sync discipline
- `https://reactflow.dev/api-reference/components/viewport-portal` — ViewportPortal for cursor overlay placement inside the canvas viewport coordinate system
- `https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections` — Vercel Serverless Functions do NOT support persistent WebSockets (hard constraint, not configurable)
- `https://vercel.com/kb/guide/publish-and-subscribe-to-realtime-data-on-vercel` — Vercel lists Liveblocks as a supported real-time partner
- `https://clerk.com/blog/secure-liveblocks-rooms-clerk-nextjs` — Clerk + Liveblocks auth endpoint pattern with Clerk session claims
- `https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html` — CSWSH, Origin header validation, token-based auth patterns
- npm registry — `@liveblocks/client@3.14.0` confirmed current version as of 2026-02-26
- `https://liveblocks.io/pricing` — Free tier: 500 monthly active rooms, 200 MAU; Pro: $30/month + $0.03/room overage

### Secondary (MEDIUM confidence)
- `https://www.mural.co/features/superpowers` — MURAL Facilitation Superpowers: bring everyone to me, private mode, hide cursors (competitor feature analysis)
- `https://help.miro.com/hc/en-us/articles/360013358479-Attention-management` — Miro Attention Management viewport sync (competitor feature analysis)
- `https://www.synergycodes.com/blog/real-time-collaboration-for-multiple-users-in-react-flow-projects-with-yjs-e-book` — ReactFlow + Yjs field selection, conflict patterns, Y.Map vs Y.Array tradeoffs
- `https://ably.com/blog/collaborative-ux-best-practices` — Live cursor UX: throttling, name labels, idle behavior best practices
- `https://github.com/xyflow/xyflow/issues/3771` — `snapToGrid` + `screenToFlowPosition` cursor drift bug (confirmed community issue)
- `https://github.com/wbkd/react-flow/discussions/2570` — selection state sync pitfall confirmed by ReactFlow community
- `https://portswigger.net/web-security/websockets/cross-site-websocket-hijacking` — CSWSH attack pattern details
- `https://www.butter.us/compare/sessionlab-alternative` — Butter facilitation features (competitor reference)
- `https://www.sessionlab.com/state-of-facilitation/2025-report/` — State of Facilitation 2025 report (feature priority context)

### Tertiary (LOW confidence)
- `https://blog.cloudflare.com/cloudflare-acquires-partykit/` — PartyKit acquired by Cloudflare April 2024; transition uncertainty cited as a contributing reason to prefer Liveblocks
- `https://dev.to/hexshift/robust-websocket-reconnection-strategies-in-javascript-with-exponential-backoff-40n1` — Exponential backoff + jitter reconnection pattern (informational)

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*
