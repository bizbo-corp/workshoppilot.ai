# WorkshopPilot.ai

## What This Is

An AI-powered digital facilitator that guides anyone from a vague idea through a structured 10-step design thinking process, producing validated product specs. The AI isn't a sidebar assistant; it's the principal guide — leading users through conversational prompts, questioning, synthesizing, and generating structured outputs at each stage. Features a split-screen layout with interactive canvas: structured whiteboards for stakeholder rings (Step 2), empathy map zones (Step 4), and journey map swimlanes (Step 6), with AI suggest-then-confirm placement. Includes EzyDraw — an in-app drawing tool with pencil, shapes, UI kit, speech bubbles, and emoji — powering visual mind maps (Step 8a), Crazy 8s sketch grids (Step 8b), and AI-generated concept cards with SWOT analysis and feasibility ratings (Step 9).

## Core Value

Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.

## Requirements

### Validated

- ✓ Next.js project scaffold with Tailwind CSS + shadcn/ui — existing
- ✓ Logo component and landing page — existing
- ✓ Vercel deployment pipeline — existing
- ✓ Clerk authentication with facilitator/participant roles — v0.5
- ✓ Application scaffolding (header, sidebar, main area) — v0.5
- ✓ All 10 design thinking step containers — v0.5
- ✓ Linear stepper/progress bar with step states — v0.5
- ✓ Basic navigation (next/back, sequential enforcement) — v0.5
- ✓ Database schema and Neon Postgres connection — v0.5
- ✓ Basic AI chat with Gemini streaming at each step — v0.5
- ✓ Deploy working shell to Vercel at workshoppilot.ai — v0.5
- ✓ Hierarchical context architecture (short-term + long-term + persistent) — v1.0
- ✓ Step-specific AI prompts with 6-phase conversational arc — v1.0
- ✓ Schema-driven structured output extraction per step (Zod) — v1.0
- ✓ Back-revise navigation with cascade invalidation — v1.0
- ✓ Auto-save (debounced 2s, maxWait 10s, optimistic locking) — v1.0
- ✓ All 10 design thinking steps functional end-to-end — v1.0
- ✓ Step 8 Ideation sub-steps (Mind Mapping, Crazy 8s, Brain Writing) — v1.0
- ✓ Step reset with cascade invalidation — v1.0
- ✓ Rate limit handling (exponential backoff, user feedback) — v1.0
- ✓ Cold start prevention (Vercel cron warming) — v1.0
- ✓ Streaming error recovery (retry button) — v1.0
- ✓ Split-screen canvas layout with ReactFlow post-it nodes — v1.1
- ✓ Step-specific canvas quadrants (Power x Interest, Empathy Map) — v1.1
- ✓ AI-canvas bidirectional integration ([CANVAS_ITEM] markup, Tier 4 context) — v1.1
- ✓ Mobile canvas support (tab switching, touch handling, <300KB bundle) — v1.1
- ✓ Grid/swimlane canvas for Step 6 Journey Map with dynamic columns — v1.2
- ✓ AI suggest-then-confirm placement with preview nodes — v1.2
- ✓ Concentric ring layout for Step 2 Stakeholder Mapping — v1.2
- ✓ Empathy map zone layout for Step 4 Sense Making — v1.2
- ✓ Canvas-only layout for Steps 2 & 4 with lazy artifact migration — v1.2
- ✓ EzyDraw drawing tool: pencil, shapes, UI kit, speech bubbles, emoji, text, eraser, select/move/resize, undo/redo, PNG export — v1.3
- ✓ Drawing-canvas integration: save as image nodes, re-edit via double-click, dual storage (vector JSON + PNG in Vercel Blob) — v1.3
- ✓ Step 8a Mind Map canvas: visual node graph with HMW center, theme branches, dagre auto-layout, AI-suggested themes — v1.3
- ✓ Step 8b Crazy 8s canvas: 8 sketch slots, tap → EzyDraw → image on card, AI sketch prompts, idea selection — v1.3
- ✓ Step 8 streamlined flow: Mind Mapping → Crazy 8s → Idea Selection (Brain Writing removed) — v1.3
- ✓ Step 9 visual concept cards: AI-generated cards with sketch, elevator pitch, SWOT, feasibility ratings, billboard hero — v1.3
- ✓ UX polish: post-it drag feedback, cursor states, panel borders/grips, canvas dot grid, chat auto-scroll, journey map dedup fix — v1.4
- ✓ Output panel retirement: hidden for users, localhost-only dev toggle in footer — v1.4
- ✓ AI personality (soul.md): sharp consultant + charismatic tone, message brevity, canvas bridging across all 10 steps — v1.4
- ✓ PawPal seed data: complete 10-step workshop fixture with canvas state, CLI seed script — v1.4
- ✓ Workshop management: multi-select delete on dashboard with soft delete protection — v1.4
- ✓ E2E testing: Playwright test walks all 10 steps with real Gemini AI, 5 bugs fixed — v1.4
- ✓ Full olive theme (light + dark mode) across all app surfaces — zero hardcoded gray/blue/white remaining — v1.5
- ✓ Landing page with hero section, value propositions, testimonials, sticky header, and sign-in CTA — v1.5
- ✓ Pricing page with three tiers (Single Use $9, Facilitator $29/mo, Annual $249/yr) — hidden from nav — v1.5
- ✓ Step 10 outputs shell with Build Pack deliverable cards (PRD, Stakeholder PPT, User Stories, Tech Specs) and "Coming Soon" labels — v1.5
- ✓ Production auth: sign-in button visible, Clerk configured for workshoppilot.ai, email/password + Google OAuth + Apple sign-in — v1.6
- ✓ Olive theme gap closure: guide nodes, canvas guides, synthesis scores all on olive token system — v1.6
- ✓ Step transitions with 150ms CSS fade-in (no framer-motion), loading skeletons for dashboard and chat — v1.6
- ✓ Consistent hover/active states: card lifts, btn-lift utility, olive sidebar hovers — v1.6
- ✓ Toast notifications for all user actions (rename, delete, extract, appearance, errors) with olive Sonner theming — v1.6
- ✓ Micro-interactions on cards, buttons, sidebar elements with 150ms transitions — v1.6

### Active

#### Future — MMP (Visual & Solo Polish)
- [ ] First-run onboarding tour (guided welcome highlighting chat, canvas, steps, navigation)
- [ ] Visual stakeholder radar chart
- [ ] Guided persona builder with per-field regeneration
- [ ] Billboard Hero exercise (text-based pitch test + EzyDraw visuals)
- [ ] Billboard template layouts
- [ ] Timer function for time-boxed exercises
- [ ] Responsive tablet support
- [ ] Video explanations per step
- [ ] Build Pack export (PRDs, user stories, tech specs for AI coders) — actual generation for Step 10 deliverables

#### Future — FFP (Full Platform)
- [ ] Dot voting for idea selection
- [ ] Basic multi-user collaboration
- [ ] Brain Writing with real collaboration (multi-user)
- [ ] Real-time multiplayer (WebSockets)
- [ ] EzyDraw AI Enhance (rough sketch → clean wireframe)
- [ ] AI + canvas working side-by-side (auto-suggest, auto-complete nodes)
- [ ] Voice input
- [ ] AI pattern analysis and gap detection
- [ ] Concept comparison (side-by-side evaluation)
- [ ] A/B billboard variant generation
- [ ] Advanced stakeholder management collateral (PowerPoint, reports)
- [ ] Mobile participant mode
- [ ] SSO/2FA authentication
- [ ] Workshop marketplace / multiple templates

### Out of Scope

- Native mobile apps — web-first, assess demand later
- Offline mode — requires significant architecture changes for minimal MVP value
- White-label solution — premature before product-market fit
- Video conferencing integration — rely on external tools (Zoom, etc.)
- Multi-language support — English first, internationalize later
- Custom branding per organization — FFP at earliest
- Pricing/billing integration — pricing page is informational only; no payment processing in v1.5

## Context

**Domain:** Design thinking facilitation — a structured process for creative problem-solving used by product teams, consultants, and innovation labs. WorkshopPilot democratizes this by replacing the human facilitator with AI.

**Existing work:** Extensive Obsidian documentation covering all 10 steps with detailed specs for R1/R2/R3 phasing, AI prompts, data models, API structures, and UI behaviors. Located at `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/lifeOS/10_Projects/WorkshopPilot/`.

**The 10 Design Thinking Steps:**
1. Challenge — extract the core problem, draft HMW statement
2. Stakeholder Mapping — identify and prioritize people/groups (concentric ring canvas)
3. User Research — gather insights (synthetic interviews for digital version)
4. Research Sense Making — synthesize into themes, pains/gains (empathy map canvas)
5. Persona Development — create research-grounded user persona
6. Journey Mapping — map current experience, find the "dip" (swimlane grid canvas)
7. Reframing Challenge — craft focused "How Might We" statement
8. Ideation — Mind Map canvas → Crazy 8s sketch grid with EzyDraw → Idea Selection
9. Concept Development — AI-generated concept cards with sketch, SWOT, feasibility on canvas
10. Validate — synthesis summary recapping the full 10-step journey

**AI facilitation model:** The AI follows a conversational arc per step: Orient → Gather → Synthesize → Refine → Validate → Complete. Context flows forward — each step's structured output becomes input for subsequent steps via hierarchical compression (short-term verbatim, long-term summaries, persistent JSON artifacts).

**Target users:** Business owners, department heads, and "dreamers" who have ideas but lack design thinking or product management experience.

**Founder context:** Michael is an experienced design thinking facilitator who has run these workshops manually. This product packages his expertise into a scalable digital tool.

## Constraints

- **Tech Stack**: Next.js 16.1.1 + React 19, Tailwind 4 + shadcn/ui, Clerk auth, Neon Postgres, Gemini API via Vercel AI SDK, Vercel hosting
- **AI Provider**: Google Gemini API (gemini-2.0-flash) — chosen for cost/capability balance
- **Entry Friction**: Must be near-zero — user types idea and starts immediately
- **Desktop-First**: MVP targets desktop browsers; mobile deferred to MMP/FFP
- **Single Player First**: v0.5-v1.4 are single-user; collaboration deferred to FFP
- **Existing Codebase**: ~46,000 lines TypeScript across ~264 files, 42 phases shipped (8 milestones), production at workshoppilot.ai

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| AI as primary UI (not sidebar) | Design thinking requires guided facilitation, not tool assistance | ✓ Good — chat panel is primary interaction surface |
| Gemini API for AI | Cost/capability balance for conversational facilitation | ✓ Good — Gemini 2.0 Flash fast and cheap |
| Neon Postgres for database | Serverless Postgres, pairs well with Vercel | ✓ Good — edge-compatible, cold starts mitigated by cron warming |
| Clerk for authentication | Managed auth with role support, fast to integrate | ✓ Good |
| 4-milestone phasing (0.5 → 1.0 → MMP → FFP) | Ship scaffold first, validate architecture, then layer features | ✓ Good — v0.5 shipped in 2 days, v1.0 in 3 more |
| Text-first for MVP, canvas at MMP | Reduces initial complexity; chat-based DT still delivers value | ✓ Good — all 10 steps work text-only |
| Hierarchical context compression | Prevents context degradation across 10 steps | ✓ Good — stays under token limits at Step 10 |
| 6-phase conversational arc per step | Structured facilitation ensures quality outputs | ✓ Good — consistent user experience |
| Zod schemas for structured outputs | Type-safe extraction with validation and retry | ✓ Good — reliable artifact production |
| Exponential backoff for rate limits | Prevents cascade failures under concurrent load | ✓ Good — graceful degradation with user feedback |
| Vercel cron for Neon warming | Prevents cold start death spiral (5-min scale-to-zero) | ✓ Good — requires CRON_SECRET setup |
| neon-http driver over WebSocket | Serverless-optimized, avoids connection pooling complexity | ✓ Good |
| AI SDK 6 with DefaultChatTransport | Latest API with streaming and message persistence | ✓ Good |
| Vercel Analytics + Speed Insights | Free performance monitoring from day one | ✓ Good |
| ReactFlow for canvas (not Tldraw/Excalidraw) | Graph-first data model (nodes+edges), MIT free, ~200KB, structured relationships queryable for AI context | ✓ Good — 110KB gzipped, quadrant layouts, AI-canvas integration |
| Semantic IDs for grid columns/rows | String IDs survive reordering operations, array indices break on add/remove | ✓ Good — clean column management |
| Custom snap logic (not ReactFlow built-in) | ReactFlow snapGrid has multi-select bug (#1579) | ✓ Good — custom cell-boundary snap works reliably |
| Preview nodes with isPreview flag | Suggest-then-confirm UX without complex state machine | ✓ Good — clean accept/reject flow |
| Concentric rings for stakeholder mapping | More meaningful than 4-quadrant grid; importance tiers map naturally to ring distance | ✓ Good — intuitive visualization |
| Lazy migration (client-side seeding) | No DB writes until user interacts; existing data migrates silently | ✓ Good — zero-migration deployment |
| Canvas-only layout for Steps 2 & 4 | Canvas is sole source of truth; output panel was redundant | ✓ Good — cleaner UX |
| EzyDraw as standalone modal (not ReactFlow extension) | Drawing needs different tools than graph editing; modal outputs image to canvas node | ✓ Good — clean separation, dual storage works well |
| Konva.js for EzyDraw (not tldraw SDK) | ~98KB vs ~500KB for tldraw; Konva gives fine-grained control for custom tools | ✓ Good — bundle budget preserved |
| Pull EzyDraw from FFP to v1.3 | Sketching is fundamental to Ideation exercises (Crazy 8s). Text descriptions miss the essence of design thinking | ✓ Good — visual ideation transforms Step 8/9 experience |
| Skip Brain Writing in v1.3 | Brain Writing needs real multi-user collaboration to deliver value; AI simulation insufficient for visual mode | ✓ Good — deferred to FFP |
| Defer all collaboration to FFP | Solo workshop experience must be polished first; multi-user adds complexity without validating core value | ✓ Good — focus on personal tool quality |
| Sharp consultant + charismatic AI personality | Direct, efficient facilitation with "you got this!" energy; matches founder's facilitation style | ✓ Good — consistent across all 10 steps |
| Output panel as localhost-only dev tool | Canvas is the user-facing view; output panel is debug info for developer only | ✓ Good — bug icon toggle in footer |
| Soft delete for workshops | deletedAt column, NULL = active, ownership validation prevents cross-user deletion | ✓ Good — simple, recoverable |
| BYPASS_AUTH for E2E testing | Always use clerkMiddleware, just skip route protection; auth() returns {userId: null} | ✓ Good — clean test isolation |
| Server action redirect for step navigation | redirect() from server action instead of router.push; revalidatePath interferes with client nav | ✓ Good — idiomatic Next.js pattern |
| Single long E2E test pattern | Single test maintains page state across all 10 steps; serial tests had state boundary issues | ✓ Good — reliable, 1.6 min |
| Dual storage for drawings (vector JSON + PNG) | Vector JSON enables re-editing, PNG enables fast display and canvas integration | ✓ Good — no Konva imports for display |
| Dagre for mind map auto-layout | Tree layout algorithm prevents node overlap without manual positioning | ✓ Good — handles 3 levels cleanly |
| AI concept generation from workshop context | Queries 4 prior steps for evidence-based SWOT/feasibility, not generic output | ✓ Good — grounded in actual workshop data |
| Olive theme token substitution pattern | bg-white→bg-card, bg-gray→bg-background, text-gray→text-foreground; consistent across 30+ components | ✓ Good — zero hardcoded colors remaining |
| Landing page as server components | Standalone sections composed in page.tsx; keeps client surface minimal | ✓ Good — fast initial load |
| Pricing page hidden from nav | Accessible via direct URL only; informational with no payment processing | ✓ Good — sets expectations without cluttering UX |
| Step 10 deliverable cards always disabled | Enabling requires only disabled=false + onDownload; no layout restructuring | ✓ Good — extensible for future Build Pack export |
| Direct SynthesisSummaryView import in StepContainer | Bypasses orphaned OutputAccordion/OutputPanel chain from Phase 31 retirement | ✓ Good — clean render path fix |
| Ghost sign-in button (no background/border) | Blends with header, single modal handles sign-in + sign-up via Clerk internal toggle | ✓ Good — clean, minimal auth entry point |
| MutationObserver for Clerk errors → sonner toasts | Clerk renders errors inline; observer detects and fires toast, hides original with sr-only | ✓ Good — consistent error UX |
| AuthGuard in-place modal (not redirect) | Protected pages show sign-in modal where user is, rather than redirecting to / | ✓ Good — no jarring navigation |
| socialButtonsVariant blockButton | Full-width Google/Apple buttons with provider name text, not icon-only | ✓ Good — clear social auth options |
| CSS transition fade-in (not framer-motion) | 150ms opacity transition via useEffect + requestAnimationFrame — zero bundle cost | ✓ Good — lightweight, snappy |
| Static skeletons (animate-none) | Override shadcn Skeleton pulse with static gray blocks — no shimmer distraction | ✓ Good — calm loading states |
| Sonner CSS override for olive toasts | [data-sonner-toast][data-type] attribute selectors override richColors with olive palette | ✓ Good — brand-consistent feedback |
| .btn-lift CSS utility | translateY(-1px) hover + box-shadow, reset on active — applied via className | ✓ Good — tactile button feel |
| NEXT_REDIRECT guard for error toasts | Check error.digest?.startsWith('NEXT_REDIRECT') and rethrow; real errors get toast.error | ✓ Good — clean server action error handling |

## Current Milestone: v1.7 Build Pack

**Goal:** Make the workshop produce tangible, AI-coder-ready output — PRD, Tech Specs, and a workshop presentation — so users walk away with something they can act on.

**Target features:**
- Step 10 completion flow with AI-guided final review → workshop marked "complete"
- Outputs page with deliverable cards (PRD, Tech Specs, Workshop Presentation)
- AI-generated PRD and Tech Specs from 10 steps of workshop data (Markdown + JSON)
- On-demand server-side PDF/PPT workshop presentation (summary per step)
- Dashboard routing: completed workshops → outputs page
- Detail views with rendered markdown, copy-to-clipboard, download

## Current State

**Shipped:** v1.6 Production Polish (2026-02-25)
**Live at:** https://workshoppilot.ai
**Codebase:** ~46,000 lines of TypeScript across ~264 files
**Tech stack:** Clerk + Neon + Gemini + Drizzle + AI SDK 6 + ReactFlow + Konva.js + Zustand + Playwright + Vercel — all validated in production
**Milestones:** v0.5 (shell, 2 days) + v1.0 (AI facilitation, 3 days) + v1.1 (canvas, 2 days) + v1.2 (whiteboard, 2 days) + v1.3 (visual ideation, 1 day) + v1.4 (polish, 1 day) + v1.5 (launch ready, 2 days) + v1.6 (production polish, 1 day) = 14 days total

**Known issues / tech debt:**
- Next.js middleware → proxy convention migration (non-blocking)
- Step 10 Build Pack deliverable cards are shell only (no actual document generation yet)
- CRON_SECRET needs to be configured in Vercel dashboard for production cron warming
- Mobile grid optimization deferred (may need tablet-first approach)
- E2E back-navigation testing deferred (forward-only tested)
- /api/dev/seed-workshop build error (pre-existing, TypeError on width property)
- isPublicRoute in proxy.ts defined but unused (pricing works via default-allow)
- First-run onboarding tour deferred from v1.6 (ONBD-01/02/03 — Phase 41 not started)
- TODO in sign-up-modal.tsx: configure first name/last name as required in Clerk Dashboard
- ClerkProvider uses hardcoded #6b7a2f (Clerk API requires hex) — slightly different from app olive tokens

---
*Last updated: 2026-02-25 after v1.6 milestone shipped*
