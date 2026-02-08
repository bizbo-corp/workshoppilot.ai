# WorkshopPilot.ai

## What This Is

An AI-powered digital facilitator that guides anyone from a vague idea through a structured design thinking process, producing a "Build Pack" — PRDs, user stories, and tech specs formatted for AI coders to build immediately. The AI isn't a sidebar assistant; it's the principal guide, leading users through 10 design thinking steps via conversational prompts, questioning, synthesizing, and generating structured outputs at each stage. Also generates stakeholder collateral (reports, PowerPoint decks for C-suite, IT, finance).

## Core Value

Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.

## Requirements

### Validated

- ✓ Next.js project scaffold with Tailwind CSS + shadcn/ui — existing
- ✓ Logo component and landing page — existing
- ✓ Vercel deployment pipeline — existing
- ✓ Clerk authentication with facilitator/participant roles — v0.5
- ✓ Application scaffolding (header, sidebar, main area) — v0.5
- ✓ All 10 design thinking step containers (hollow — structure only) — v0.5
- ✓ Linear stepper/progress bar with step states — v0.5
- ✓ Basic navigation (next/back, sequential enforcement) — v0.5
- ✓ Database schema and Neon Postgres connection — v0.5
- ✓ Basic AI chat with Gemini streaming at each step — v0.5
- ✓ Deploy working shell to Vercel at workshoppilot.ai — v0.5

### Active

#### MVP 1.0 — Working Single-Player Product
- [ ] AI chat as primary UI (Gemini API via chat interface)
- [ ] Step 1: Challenge — extract problem, draft HMW statement
- [ ] Step 2: Stakeholder Mapping — brainstorm and prioritize stakeholders
- [ ] Step 3: User Research — synthetic user interviews, question generation
- [ ] Step 4: Research Sense Making — affinity mapping, pains/gains extraction
- [ ] Step 5: Persona Development — AI-generated persona from research
- [ ] Step 6: Journey Mapping — full board generation, dip identification
- [ ] Step 7: Reframing Challenge — HMW builder with auto-suggestions
- [ ] Step 8: Ideation — Mind Mapping + Crazy 8s (text-based)
- [ ] Step 9: Concept Development — concept sheets, SWOT, feasibility
- [ ] Step 10: Validate — flow diagrams, PRD generation, Build Pack export
- [ ] Context architecture (outputs flow forward between steps)
- [ ] Step context files (conversation summaries, structured outputs)
- [ ] Billboard Hero exercise (text-based pitch test)
- [ ] Dot voting for idea selection
- [ ] Auto-save on every significant action

#### MMP — Visual & Collaborative
- [ ] Canvas tool with post-its (Tldraw or ReactFlow)
- [ ] Split-screen mode (chat + canvas/form)
- [ ] AI auto-suggest with UI to add/edit entries
- [ ] Visual stakeholder radar chart
- [ ] Empathy map canvas
- [ ] Journey map grid UI with cell/row/column suggestions
- [ ] Guided persona builder with per-field regeneration
- [ ] Brain Writing (text-based collaborative iteration)
- [ ] Billboard template layouts
- [ ] Visual concept cards
- [ ] Timer function for time-boxed exercises
- [ ] Basic multi-user collaboration
- [ ] Responsive tablet support
- [ ] OAuth (Google)
- [ ] Video explanations per step

#### FFP — Full Platform
- [ ] AI + canvas working side-by-side (auto-suggest, auto-complete nodes)
- [ ] Real-time multiplayer (WebSockets)
- [ ] EzyDraw component (in-app sketching, sketch enhancement)
- [ ] Voice input
- [ ] Canvas-first mode for visual steps
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
- Pricing/billing system — free during validation phase

## Context

**Domain:** Design thinking facilitation — a structured process for creative problem-solving used by product teams, consultants, and innovation labs. WorkshopPilot democratizes this by replacing the human facilitator with AI.

**Existing work:** Extensive Obsidian documentation covering all 10 steps with detailed specs for R1/R2/R3 phasing, AI prompts, data models, API structures, and UI behaviors. Located at `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/lifeOS/10_Projects/WorkshopPilot/`.

**The 10 Design Thinking Steps:**
1. Challenge — extract the core problem, draft HMW statement
2. Stakeholder Mapping — identify and prioritize people/groups involved
3. User Research — gather insights (synthetic interviews for digital version)
4. Research Sense Making — synthesize into themes, pains (5), gains (5)
5. Persona Development — create research-grounded user persona
6. Journey Mapping — map current experience, find the "dip"
7. Reframing Challenge — craft focused "How Might We" statement
8. Ideation — Mind Mapping, Crazy 8s, Brain Writing, Billboard Hero
9. Concept Development — concept sheets with SWOT, feasibility, elevator pitch
10. Validate — flow diagrams, prototyping, PRD generation, Build Pack export

**AI facilitation model:** The AI follows a conversational arc per step: Orient → Gather → Synthesize → Refine → Validate → Complete. Context flows forward — each step's structured output becomes input for subsequent steps.

**Build Pack output:** The final deliverable is PRDs, user stories, and tech stack decisions formatted specifically for AI coders (Claude, Cursor, Windsurf) to ingest and build immediately. Also stakeholder collateral for C-suite, IT, finance.

**Target users:** Business owners, department heads, and "dreamers" who have ideas but lack design thinking or product management experience.

**Founder context:** Michael is an experienced design thinking facilitator who has run these workshops manually. This product packages his expertise into a scalable digital tool.

## Constraints

- **Tech Stack**: Next.js + React, Tailwind CSS + shadcn/ui, Clerk auth, Neon Postgres, Gemini APIs, Vercel hosting — already established
- **AI Provider**: Google Gemini API — chosen for cost/capability balance
- **Entry Friction**: Must be near-zero — user types idea and starts immediately, account required only for saving/collaboration
- **Desktop-First**: MVP targets desktop browsers; mobile deferred to MMP/FFP
- **Single Player First**: MVP 0.5 and 1.0 are single-user; collaboration starts at MMP
- **Existing Codebase**: Next.js 16.1.1 with full application shell deployed at workshoppilot.ai (v0.5 complete)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| AI as primary UI (not sidebar) | Design thinking requires guided facilitation, not tool assistance | ✓ Good — chat panel is primary interaction surface |
| Gemini API for AI | Cost/capability balance for conversational facilitation | ✓ Good — Gemini 2.0 Flash fast and cheap for MVP |
| Neon Postgres for database | Serverless Postgres, pairs well with Vercel | ✓ Good — edge-compatible, migrations work in build pipeline |
| Clerk for authentication | Managed auth with role support, fast to integrate | ✓ Good — production keys required custom domain (expected) |
| 4-milestone phasing (0.5 → 1.0 → MMP → FFP) | Ship scaffold first, validate architecture, then layer features | ✓ Good — v0.5 shipped in 2 days, architecture validated |
| Text-first for MVP, canvas at MMP | Reduces initial complexity; chat-based DT still delivers value | — Pending (v1.0 will test) |
| Build Pack as primary output | Differentiator — outputs feed directly into AI coding tools | — Pending (v1.0 will implement) |
| Structured JSON data model per step | Enables context passing, traceability, and export | — Pending (v1.0 will implement) |
| neon-http driver over WebSocket | Serverless-optimized, avoids connection pooling complexity | ✓ Good — works reliably in Vercel functions |
| AI SDK 5 with DefaultChatTransport | Latest API with streaming and message persistence | ✓ Good — sendMessage pattern cleaner than handleSubmit |
| Vercel Analytics + Speed Insights | Free performance monitoring from day one | ✓ Good — baseline data before real users |

## Current Milestone: v1.0 Working AI Facilitation

**Goal:** All 10 design thinking steps working end-to-end with intelligent, step-aware AI facilitation. Text-based throughout. The AI remembers everything from previous steps and builds on it — the user walks away feeling the AI understood their problem.

**Target features:**
- Step-aware AI prompts (each step knows what to produce and references prior outputs)
- Dual-layer context architecture (structured JSON artifacts + conversation summaries)
- All 10 steps functional with text-based outputs
- Ideation/visual steps as text alternatives (text mind maps, idea lists, concept descriptions)
- Back-and-revise navigation (revisit earlier steps, cascade context updates)
- Auto-save (periodic within steps + on step completion)
- Step 10 synthesis summary (full journey recap, no Build Pack export yet)

## Current State

**Shipped:** v0.5 Application Shell (2026-02-08)
**Live at:** https://workshoppilot.ai
**Codebase:** 5,451 lines of TypeScript across 137 files
**Tech stack validated:** Clerk + Neon + Gemini + Drizzle + Vercel — all working in production

**Known issues:**
- Next.js 16.1.1 "middleware" deprecation warning (non-blocking, suggests "proxy" convention)
- Gemini free tier rate limits may be insufficient for multiple concurrent users

---
*Last updated: 2026-02-08 after v1.0 milestone start*
