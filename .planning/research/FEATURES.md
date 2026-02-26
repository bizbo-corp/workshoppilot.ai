# Feature Research

**Domain:** Real-time multiplayer workshop facilitation (design thinking + collaborative whiteboard)
**Researched:** 2026-02-26
**Confidence:** HIGH (facilitation patterns from Miro/MURAL/Butter), HIGH (real-time sync patterns from ReactFlow docs + Liveblocks), MEDIUM (AI chat multiplayer patterns — emerging space)

---

## Context: What Is Being Added (v1.9)

WorkshopPilot already ships a fully functional solo AI-facilitated workshop (10 steps, split-screen canvas, EzyDraw, Build Pack). v1.9 adds a **parallel workshop mode**: a human facilitator leads 5-15 participants through the same 10-step design thinking process with a shared live canvas.

This is not a generic whiteboard. It is a **structured, facilitated session** where:
- The facilitator drives step progression (like a presenter controls slides)
- The AI chat is visible to all but only the facilitator types into it
- All participants can contribute to the shared canvas
- Existing canvas types (post-its, empathy maps, journey maps, mind maps, concept cards) are unchanged

Research draws from: Miro, MURAL, FigJam, Butter, SessionLab, and the ReactFlow multiplayer documentation.

---

## Feature Area 1: Session Creation and Join Flow

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Shareable join link | Participants in any online collaboration tool join via a link — this is non-negotiable; any other mechanism is friction | LOW | Generate a short URL-safe token on session creation. `/join/[token]` route. No other join mechanism needed. |
| No account required for participants | Miro, Canva, Collaboard all support guest/link-join without signup. Requiring accounts for 15 participants is a dealbreaker for facilitators | LOW | Participants enter a display name only. Store as ephemeral session presence, not DB user record. |
| Name entry prompt before entering canvas | Every presence-first tool (MURAL, Excalidraw, Canva) prompts for a name before the session opens. Without it, cursors show as "Anonymous" and the facilitator cannot identify participants | LOW | Single-field modal: "Enter your name to join." Name stored in session context only, no auth. |
| Session state visible (before/during/ended) | Participants who join early or late need to know where they are | LOW | Show session status on the join screen. "Waiting for facilitator to start" or "Step 3 of 10 in progress." |
| Facilitator starts the session deliberately | Joining early should not trigger session start; facilitator controls when participants enter the canvas | LOW | Two states: `waiting` (join link active, participants queue) and `active` (canvas unlocked). Facilitator clicks "Start Session." |

### Differentiators (Worth Adding)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Session lobby / waiting room | Participants who join early see who else has joined and a countdown or "waiting for facilitator" message. Reduces confusion. MURAL does this well. | LOW | Simple list of joined names + session info. No separate infrastructure — just poll the session state. |
| Link expiry (24-48 hours) | Prevents stale links being accessed post-workshop; Miro uses 30-day expiry for guest links | LOW | `expiresAt` column on session. Configurable at creation. Default 48 hours. |
| Participant count cap (soft) | Facilitators who run workshops know 5-15 is the productive range. A soft cap prevents accidental oversized sessions. | LOW | Warning (not hard block) at > 15 participants. Facilitator can override. |

### Anti-Features (Do Not Build)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Email invitation flow | Feels organized and professional | 5-minute implementation becomes a multi-sprint email delivery project (deliverability, formatting, unsubscribe, spam). Join link achieves the same goal. | Share the join link directly via any existing communication channel (Slack, email, Teams) |
| QR code on join screen | In-person workshops sometimes use QR codes | WorkshopPilot is a digital tool — in-person projection is edge case, not core use case. Adds complexity for zero multiplayer value. | Join link is sufficient; facilitator pastes it into chat |
| Password-protected sessions | Feels more secure | The join link IS the access token. Adding a second factor (password) creates friction for legitimate participants with zero security benefit over a long random token. | Use a sufficiently long (20+ char) token for the join link |

---

## Feature Area 2: Real-Time Canvas Collaboration

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Shared canvas state visible to all | This is the literal definition of a collaborative whiteboard. Any tool that doesn't sync canvas in real time fails its core promise. | HIGH | ReactFlow node/edge state broadcast via WebSocket. ReactFlow's own multiplayer docs recommend Yjs or a managed service (Liveblocks) as the sync layer. |
| Live cursors with participant names | Miro, MURAL, FigJam, Canva, Excalidraw all show colored cursors with name labels. Without this, participants feel disconnected and cannot reference what others are pointing at. | MEDIUM | Ephemeral (not persisted) cursor positions. Each participant gets a consistent color for the session. Name label appears beside cursor. Hide when cursor is idle > 3s. |
| All participants can add/edit nodes | Design thinking workshops require every voice. Participants add post-its, edit text, move nodes. If participants can only watch, it's a demo, not a workshop. | HIGH | Full canvas edit access for participants. Facilitator does not need to control who can edit what (unlike Miro's enterprise lock feature). |
| Real-time node creation visible to all | When a participant drops a post-it, everyone sees it appear immediately — not after a refresh. | HIGH | Fundamental CRDT/sync requirement. Covered by canvas state sync above. |
| Smooth conflict handling (not jarring) | Two participants editing the same node will happen. The UI must not freeze or show error states. Last-write-wins is acceptable for v1.9. | HIGH | For node positions: last-write-wins. For node text: last-write-wins (optimistic). CRDT merge handles concurrent edits. |

### Differentiators (Worth Adding)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| User-specific node colors | When each participant's post-its are their color, facilitators can quickly see contribution distribution. MURAL does this. | LOW | Apply the participant's session color to nodes they create. Stored on node data, not ephemeral. |
| Participant cursor follows facilitator (optional) | When facilitator uses "Bring Everyone to Me," all viewports snap to the facilitator's current location. Critical for focused exercises. | MEDIUM | Facilitator-only action. Broadcasts a `focusViewport` event. Each client pans to that position. Not a forced lock — user can pan away after. |
| Idle presence indicator | Participants who have not interacted in > 2 minutes show as "idle" in the participant list. Facilitator can see who is disengaged. | LOW | Track last-interaction timestamp in session state. Visual: dim avatar or "idle" badge. |
| Canvas activity feed / last action | Shows "Michael added a post-it" or "Sarah moved a node" in a small corner overlay. Provides orientation when many things are happening at once. | MEDIUM | Optional. Can feel noisy. Consider as a toggle, not always-on. |

### Anti-Features (Do Not Build)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Per-node lock (only creator can edit) | Seems like a natural "ownership" concept | Prevents collaborative refinement, which is the point of the workshop. Facilitators who want to protect content should lock the step, not individual nodes. | Step-level facilitator controls (see Area 3) |
| Persistent undo/redo across all users | Teams want to "undo what John did" | Multi-user undo is an extremely hard CRDT problem. Per-user undo within the same session is acceptable. Cross-user undo causes confusion and correctness issues. | Each user gets their own local undo stack. Session-wide undo is out of scope. |
| Version history / timeline replay | Useful in Figma for design files | Adds significant storage and compute complexity. Workshop outputs are the artifact — not the history of how you got there. | The canvas state at completion is what matters. No replay needed for v1.9. |
| Offline canvas editing | Participants should be able to work offline and sync later | A live facilitated session has no valid offline use case — if you're offline, you're not in the session. CRDT offline-first complexity is not justified here. | Reconnection handling is sufficient (see PITFALLS.md) |

---

## Feature Area 3: Facilitator Controls

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Facilitator-only step progression | Every structured workshop tool (Butter, MURAL, SessionLab) has the facilitator control when the group moves forward. Participants cannot jump ahead or stay behind. | MEDIUM | "Next Step" and "Previous Step" buttons visible only to the facilitator. State change broadcasts to all clients. All participants transition simultaneously. |
| Facilitator identity clearly marked | In any session with a named human leader, their presence must be distinct. Participants need to know who to look to. | LOW | Facilitator cursor and avatar in participant list has a distinct badge (e.g., "Facilitator" label, crown icon). |
| Kick / remove participant | Facilitators running professional workshops must be able to remove disruptive or accidental joiners. | LOW | Facilitator-only action in participant list. Disconnects the participant's session. They receive a message: "You have been removed from this session." |
| End session with confirmation | Ending the session should be deliberate — not accidental. | LOW | Facilitator-only "End Session" button with confirmation modal. On confirmation, session state moves to `ended`, all participants see "Session has ended" screen. |
| Participant list panel | Facilitators need to see who is in the room at all times. | LOW | Sidebar or floating panel showing all connected participants with avatar colors, names, and online/idle status. |

### Differentiators (Worth Adding)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Bring everyone to me" viewport sync | MIRAL's signature facilitation feature. When the facilitator needs everyone looking at the same thing, one click snaps all viewports to the facilitator's view. Far more effective than "please look at the top left." | MEDIUM | Facilitator-only broadcast event. Clients receive `syncViewport` with `x, y, zoom` and animate their viewport there. |
| Hide cursors temporarily | MURAL allows facilitators to hide all cursors to reduce visual noise during key moments (voting, reading instructions). | LOW | Facilitator toggle. Broadcasts `hideCursors: true` to all clients. Cursors invisible until facilitator re-enables. |
| Private mode for independent ideation | When brainstorming (Step 8), facilitators should be able to prevent participants from seeing each other's work until the reveal. Prevents groupthink. MURAL's "Private Mode" does exactly this. | HIGH | Each participant sees only their own nodes. Facilitator sees all. On "reveal," all nodes become visible. This requires server-side authorization of which nodes to broadcast to which client — non-trivial. Flag for deeper research. |
| Step timer (visible to all) | Workshop exercises are time-boxed. MURAL and Miro both have shared timers. Participants manage their pace better when a countdown is visible. | LOW | Facilitator sets a countdown (e.g., 5 minutes). Timer broadcasts to all clients and displays on each screen. When timer expires, a sound/animation cues the facilitator (not auto-advance). |

### Anti-Features (Do Not Build)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Granular per-participant canvas permissions | Enterprise whiteboards like Miro support per-user edit/view/comment levels | This is a facilitated design thinking workshop, not an enterprise project board. Role complexity prevents the spontaneous collaboration that makes workshops work. | One permission model: facilitator controls steps, everyone edits canvas |
| Facilitator-assigned breakout groups | Butter and other workshop tools support breakout rooms | Breakout groups require maintaining multiple canvas states simultaneously. This is a separate architectural problem from v1.9's shared-canvas model. | Defer to FFP (it's already in the FFP backlog as "Brain Writing with real collaboration") |
| Forced "follow facilitator" lock (cannot pan away) | Keeps everyone aligned | Removes participant autonomy. Participants who cannot scroll to a different part of the canvas feel trapped. MIRAL's community forums have many complaints about this exact issue when it was forced. | Soft sync (bring to me) without hard lock |

---

## Feature Area 4: AI Chat in Multiplayer Mode

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| AI chat visible to all participants | If the AI is the knowledge system for the workshop (as in solo mode), participants need to see its outputs to follow the facilitation | MEDIUM | Chat messages broadcast in real time to all connected clients. The AI chat panel shows the same message history to everyone. |
| Facilitator-only chat input | Only the facilitator drives the AI. Participants asking their own questions to the AI would fragment the facilitation arc and create parallel conversations that invalidate the structured 6-phase conversational flow. | LOW | Chat input box hidden/disabled for participants. Participants see the conversation but cannot type. |
| AI responses feel live to everyone | If only the facilitator sees streaming AI tokens, participants watch a blank screen and then a completed message appears — kills the "live session" feeling. | HIGH | Stream AI response tokens to all connected clients, not just the facilitator. Each token broadcast as it arrives from Gemini. |
| Clear distinction between facilitator messages and AI responses | In multiplayer, participants need to know at a glance who said what — the human facilitator, or the AI. | LOW | Existing chat UI distinguishes user and AI messages. In multiplayer, facilitator messages appear as "Facilitator" (their name), AI as the existing AI avatar. No change to the existing component architecture. |

### Differentiators (Worth Adding)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Participant reactions to AI responses | Participants cannot type, but they can signal agreement, confusion, or enthusiasm. Emoji reactions (thumbs up, light bulb, question mark) give the facilitator real-time sentiment data. | LOW | Reaction bar on each AI message. Reactions are ephemeral (not stored). Aggregated counts visible to all. Simple WebSocket event. |
| Facilitator can highlight AI message for group | When an AI message contains a key insight, facilitator can "spotlight" it — the message pulses or is pinned at the top of everyone's chat view. | MEDIUM | Spotlight event broadcasted. Highlighted message gets a visual treatment. Good for driving group attention. |

### Anti-Features (Do Not Build)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Participant chat sidebar (side channel) | Participants want to communicate with each other | A side channel during a facilitated session destroys attention and fractures the group. Professional facilitators actively prevent sidebar conversations. Butter explicitly warns against this in their facilitation guides. | Use an external tool (Slack, Teams, Zoom chat) that participants already have open. WorkshopPilot is not a communication platform. |
| Each participant gets their own AI conversation | Personalized AI per participant | Destroys the shared understanding that makes design thinking workshops produce aligned outputs. Each step's outputs must be agreed upon by the group, not individually generated. | One shared AI conversation, facilitator-driven |
| AI generates responses on its own without facilitator input | "AI auto-facilitates" the group | Removes the human facilitator's judgment about when to probe, when to move on, when to pivot. AI spontaneity in a live group session is chaotic and untrustworthy. | Facilitator types, AI responds. Same as solo mode, but group can see. |

---

## Feature Area 5: Presence and Awareness

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Unique cursor color per participant | Every multiplayer whiteboard tool (Miro, Figma, Excalidraw, Canva) assigns a unique color. Without it, cursors are anonymous and presence is meaningless. | LOW | Assign a color from a predefined palette of 15+ distinct colors on join. Consistent for the session duration. |
| Name label on cursor | UX research confirms: cursor color alone is not enough. Name (or at minimum initials) must appear beside the cursor for identification. | LOW | Small name tag follows the cursor. Disappears when cursor is idle > 3s (to reduce clutter). Reappears on movement. |
| Participant join/leave notifications | Participants and facilitator need to know when someone enters or exits. Silent joins create confusion ("was that person always there?"). | LOW | Toast notification: "Sarah joined the session" / "Tom left the session." Non-intrusive. Bottom corner. |
| Online/offline status in participant list | If a participant's connection drops, the facilitator must know. | LOW | Participant list shows green dot (online) or gray dot (disconnected). Auto-removes after 30s of disconnect without reconnect. |
| Reconnection with state recovery | Internet hiccups are common. Participants who reconnect should rejoin at the current state, not see a blank canvas. | MEDIUM | On reconnect, client receives the full current canvas state and chat history. Standard pattern for WebSocket-based tools. |

### Differentiators (Worth Adding)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Participant avatars as initials circles | More compact and visually distinct than text-only names in the participant list. Industry standard (Google Docs, Notion, Figma). | LOW | Single-character or two-character initials in a colored circle matching the participant's cursor color. |
| "Viewing" vs "Active" distinction | Participants who are scrolling/reading vs. actively typing or adding nodes can be visually distinguished — helps facilitator gauge engagement. | LOW | Track last interaction time. "Active" = interacted in last 30s. "Viewing" = 30s-2min. "Idle" = 2min+. |

### Anti-Features (Do Not Build)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Video/audio chat embedded in WorkshopPilot | "One tool for everything" | Adding WebRTC/video to a Next.js app is a separate engineering discipline. Multiplayer workshops are almost always run alongside an existing video call (Zoom, Teams, Meet). Duplicating this creates a worse version of existing tools. | Participants run their existing video call alongside WorkshopPilot. The join link is shared in the video call chat. |
| Persistent participant profiles | Store participant details for future reference | Participants are ephemeral — they join with a name, contribute, and leave. Storing their data creates GDPR obligations and complexity with no clear user benefit at this stage. | Session-scoped only. Names stored in session context, purged when session ends. |
| Participant-to-participant direct messaging | Rich social features | A workshop is a group process. Direct messages create private side conversations that undermine the facilitator's ability to manage group dynamics. | External communication tools handle this |

---

## Feature Dependencies

```
[Multiplayer Workshop Type] (new DB entity: sessions)
    └──requires──> Workshop type field (solo vs. multiplayer)
    └──requires──> Session creation UI (new "Start Multiplayer Workshop" flow)
    └──requires──> Facilitator role on session (Clerk user who created it)

[Join Link]
    └──requires──> [Multiplayer Workshop Type]
    └──generates──> Unique token stored on session record
    └──enables──> [No-Account Participant Join]

[No-Account Participant Join]
    └──requires──> [Join Link]
    └──requires──> Name entry UI at /join/[token]
    └──creates──> Ephemeral session participant (not a Clerk user)
    └──enables──> [Live Cursors] and [Participant List]

[Real-Time Canvas Sync]
    └──requires──> WebSocket infrastructure (Liveblocks, Partykit, or custom)
    └──requires──> [No-Account Participant Join] (to identify participants)
    └──enhances──> [Live Cursors] (uses same connection)
    └──NOTE──> ReactFlow multiplayer requires Yjs or managed sync layer

[Live Cursors]
    └──requires──> [Real-Time Canvas Sync] (same WebSocket connection)
    └──requires──> [No-Account Participant Join] (participant color/name)
    └──ephemeral──> Never persisted to DB

[AI Chat Visible to All]
    └──requires──> [Real-Time Canvas Sync] (same broadcast channel)
    └──requires──> Facilitator-only input enforcement (middleware or UI gate)
    └──requires──> Token streaming broadcast (AI tokens → all clients)
    └──NOTE──> Streaming to N clients simultaneously under Gemini rate limits needs validation

[Facilitator Step Progression]
    └──requires──> [Multiplayer Workshop Type]
    └──requires──> Role check: only session owner can trigger step change
    └──broadcasts──> Step change event → all clients render new step

[Participant List / Presence]
    └──requires──> [No-Account Participant Join]
    └──requires──> [Real-Time Canvas Sync] (presence channel)
    └──enhances──> [Facilitator Controls] (kick participant, see idle status)

[Private Mode for Ideation] (differentiator — high complexity)
    └──requires──> [Real-Time Canvas Sync]
    └──requires──> Server-side node authorization (which nodes visible to whom)
    └──conflicts──> Current architecture (all nodes are broadcast to all)
    └──NOTE──> Flag for deeper research before committing to v1.9 scope
```

### Dependency Notes

- **Sync layer decision is the critical path.** Everything else (cursors, chat broadcast, step sync) flows through the same WebSocket infrastructure. The choice between Liveblocks (managed), Partykit (managed), or a self-hosted Yjs+WebSocket solution gates the entire milestone. Research STACK.md for this decision.
- **AI token streaming to all clients** is a non-standard pattern. Standard Vercel AI SDK streams to one client (the requester). Broadcasting tokens to N participants requires an intermediate relay (the same WebSocket channel) or a server-sent event fan-out. This needs implementation validation before Phase 1 of the milestone.
- **Participant join without Clerk auth** means the existing auth middleware must be configured to allow `/join/[token]` and session WebSocket connections without a Clerk session. Participants are authenticated by session token, not Clerk.
- **Private Mode** (independent ideation with deferred reveal) is the only feature that requires server-side node authorization. Everything else is broadcast-all. If Private Mode is included in v1.9 scope, it is the highest-risk item and should be last.

---

## MVP Definition

### Launch With (v1.9 — Must Have)

- [ ] Multiplayer workshop type — new session entity, creation flow, facilitator role
- [ ] Share-link join flow — unique token, `/join/[token]` route, name entry, no account needed
- [ ] Participant lobby / waiting state — "waiting for facilitator to start" before session begins
- [ ] Real-time canvas sync — all nodes/edges broadcast in real time to all participants
- [ ] Live cursors — colored, named, ephemeral cursor positions for all participants
- [ ] Full canvas edit access for participants — add post-its, move nodes, use EzyDraw
- [ ] AI chat visible to all — all participants see the same conversation in real time
- [ ] AI token streaming to all — streaming AI response tokens broadcast to all participants (not just facilitator)
- [ ] Facilitator-only chat input — input hidden/disabled for participants
- [ ] Facilitator-only step progression — only facilitator can click Next/Previous Step
- [ ] Participant list panel — names, colors, online/idle status, facilitator badge
- [ ] Join/leave notifications — toast when participant joins or leaves
- [ ] Reconnection with state recovery — rejoining drops client back into current session state
- [ ] End session — facilitator deliberately ends session, all participants see "ended" screen

### Add After Validation (v1.9 Follow-On)

- [ ] "Bring everyone to me" viewport sync — facilitator snaps all viewports to their position
- [ ] Step timer — facilitator-set countdown visible to all participants
- [ ] Participant emoji reactions on AI messages — quick sentiment without text
- [ ] Idle presence indicator — visual dim for participants inactive > 2 minutes
- [ ] User-specific post-it colors — nodes created by each participant match their cursor color

### Future Consideration (v2+)

- [ ] Private mode for independent ideation (high complexity, server-side auth required)
- [ ] Breakout groups / sub-canvases for small group work
- [ ] Session recording / transcript export
- [ ] Facilitator notes panel (private to facilitator, not broadcast)
- [ ] Dot voting (already in FFP backlog — dependent on multiplayer foundation)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Sync layer decision (Liveblocks vs. Partykit vs. custom) | HIGH | MEDIUM (research) | P1 |
| Real-time canvas sync (nodes/edges) | HIGH | HIGH | P1 |
| Share link + name entry join | HIGH | LOW | P1 |
| Facilitator-only step progression | HIGH | LOW | P1 |
| AI chat visible to all + facilitator-only input | HIGH | MEDIUM | P1 |
| AI token streaming to all clients | HIGH | HIGH | P1 |
| Live cursors (ephemeral) | HIGH | MEDIUM | P1 |
| Participant list panel | MEDIUM | LOW | P1 |
| Join/leave notifications | LOW | LOW | P1 |
| Reconnection + state recovery | HIGH | MEDIUM | P1 |
| End session flow | MEDIUM | LOW | P1 |
| "Bring everyone to me" viewport sync | HIGH | MEDIUM | P2 |
| Step timer | HIGH | LOW | P2 |
| User-specific node colors | LOW | LOW | P2 |
| Emoji reactions on AI messages | LOW | LOW | P2 |
| Idle presence indicator | LOW | LOW | P2 |
| Private mode for ideation | HIGH (specific use case) | HIGH | P3 |
| Breakout groups | MEDIUM | HIGH | P3 |
| Session recording | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.9 launch
- P2: Add after P1 is stable — ideally within the same milestone
- P3: Future milestone

---

## Competitor Feature Analysis

| Feature | Miro | MURAL | FigJam | Butter | WorkshopPilot v1.9 Approach |
|---------|------|-------|--------|--------|------------------------------|
| Guest/link join (no account) | Yes — "Visitors" (name entry, limited access) | Yes — prompts name before board opens | Yes — link-based guest join | Yes — no account for attendees | Yes — name entry only, no account, full canvas access |
| Live cursors | Yes — colored, named | Yes — colored, named, avatar-forward | Yes — colored + cursor chat | Yes — via embedded whiteboard tools | Yes — colored, named, ephemeral |
| Facilitator step control | Presentation mode (frame-by-frame) | Facilitation Superpowers — "next frame" | Limited | Agenda-based step advance | Full step progression control — facilitator-only |
| AI in sessions | AI Sidekick (summary, cluster) — individual | AI clustering in beta | AI Jambot (emoji reactions, suggestions) | AI recap post-session | AI as primary facilitator, shared view, facilitator-input-only |
| Participant permissions | View/Comment/Edit per user | Facilitator Superlock, hide cursors | View/Comment/Edit | Presenter vs. Participant | One tier: everyone edits canvas, facilitator controls steps |
| "Bring everyone to me" | Yes — Attention Management | Yes — "Bring everyone to me" | No | N/A | Yes — facilitator-only broadcast viewport sync |
| Timer | Yes — visible to all | Yes — visible to all | No | Yes | Yes — facilitator-set, visible to all |
| Structured workflow | Template-based, no enforcement | Template-based, no enforcement | Template-based, no enforcement | Agenda-based, soft enforcement | Hard: 10-step design thinking arc, facilitator controls progression |
| Private ideation mode | No | Yes — "Private Mode" | No | No | Considered for v1.9 — high complexity, P3 |

---

## Sources

- [Miro Attention Management — Miro Help Center](https://help.miro.com/hc/en-us/articles/360013358479-Attention-management)
- [MURAL Facilitation Superpowers](https://www.mural.co/features/superpowers)
- [MURAL Facilitator Locking](https://learning.mural.co/lessons/keep-content-in-place-with-facilitator-locking)
- [Miro vs. MURAL for Workshop Facilitation — Facilitator School](https://www.facilitator.school/blog/miro-vs-mural)
- [Butter Workshop Facilitation Features](https://www.butter.us/compare/sessionlab-alternative)
- [ReactFlow Multiplayer Documentation](https://reactflow.dev/learn/advanced-use/multiplayer)
- [ReactFlow Collaborative Example (Yjs)](https://reactflow.dev/examples/interaction/collaborative)
- [Liveblocks Pricing — Free tier, monthly active rooms](https://liveblocks.io/pricing)
- [Liveblocks + Next.js Starter Kit on Vercel](https://vercel.com/templates/next.js/liveblocks-starter-kit)
- [Synergy Codes — ReactFlow + Yjs real-time collaboration](https://www.synergycodes.com/blog/real-time-collaboration-for-multiple-users-in-react-flow-projects-with-yjs-e-book)
- [PartyKit — multiplayer platform](https://www.partykit.io/)
- [CRDTs vs Operational Transforms — Tiny.cloud](https://www.tiny.cloud/blog/real-time-collaboration-ot-vs-crdt/)
- [Live Cursors UX best practices — Ably](https://ably.com/blog/collaborative-ux-best-practices)
- [Collaborative UX: presence indicators — SuperViz](https://dev.to/superviz/how-to-use-presence-indicators-like-live-cursors-to-enhance-user-experience-38jn)
- [Miro for Workshops and Meetings — Miro Help Center](https://help.miro.com/hc/en-us/articles/360012753200-Miro-for-workshops-meetings)
- [Dot Voting in Design Thinking — NN/G](https://www.nngroup.com/articles/dot-voting/)
- [State of Facilitation 2025 — SessionLab](https://www.sessionlab.com/state-of-facilitation/2025-report/)
- [Advanced Virtual Workshop Facilitation Tips — Design Thinking Toolkit](https://designthinkingtoolkit.co/content/advanced-facilitation-tips-for-virtual-workshops)
- [WorkshopPilot PROJECT.md — internal planning doc](/.planning/PROJECT.md)

---

*Feature research for: WorkshopPilot.ai v1.9 — Multiplayer Collaboration*
*Researched: 2026-02-26*
