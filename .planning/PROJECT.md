# WorkshopPilot.ai

## What This Is

An AI-powered digital facilitator that guides anyone from a vague idea through a structured 10-step design thinking process, producing validated product specs. The AI isn't a sidebar assistant; it's the principal guide — leading users through conversational prompts, questioning, synthesizing, and generating structured outputs at each stage. Features a split-screen layout with interactive post-it canvas for visual clustering alongside AI facilitation on Steps 2 (Stakeholder Mapping) and 4 (Research Sense Making).

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

### Active

#### v1.1 — Canvas Foundation (SHIPPED)
- [x] Split-screen layout for all 10 steps (chat left, canvas+output right)
- [x] ReactFlow canvas with custom post-it nodes (create, edit, move, color-code, group/ungroup, undo/redo)
- [x] Step 2 Stakeholder Mapping canvas — Power x Interest quadrant grid with auto-detection
- [x] Step 4 Research Sense Making canvas — Empathy Map quadrants (Said/Thought/Felt/Experienced)
- [x] AI → Canvas: [CANVAS_ITEM] markup with "Add to canvas" action buttons
- [x] Canvas → AI: AI reads canvas state silently as Tier 4 context
- [x] Mobile: tab-based switching, iOS Safari touch handling, bundle under 300KB

## Current Milestone: v1.2 Canvas Whiteboard

**Goal:** Evolve the canvas from a post-it board into a structured whiteboard with grid/swimlane layouts and AI-driven placement, starting with Journey Map (Step 6) and retrofitting Steps 2 & 4 to render structured outputs on canvas.

**Target features:**
- Step 6 Journey Map grid canvas with fixed swimlane rows and user-addable stage columns
- AI suggest-then-confirm placement — AI proposes content in specific cells, user confirms/adjusts
- Snap-to-cell behavior for canvas items within grid structures
- Steps 2 & 4 retrofit — structured output data renders as organized canvas nodes (replaces output panel content)
- User can add/remove/reorder cards within canvas sections
- Output panel remains but canvas becomes the primary structured record

#### Future — MMP (Visual & Collaborative)
- [ ] Canvas for Steps 8 Ideation and 9 Concepts
- [ ] Visual stakeholder radar chart
- [ ] Guided persona builder with per-field regeneration
- [ ] Billboard Hero exercise (text-based pitch test)
- [ ] Billboard template layouts
- [ ] Visual concept cards
- [ ] Dot voting for idea selection
- [ ] Timer function for time-boxed exercises
- [ ] Basic multi-user collaboration
- [ ] Responsive tablet support
- [ ] OAuth (Google)
- [ ] Video explanations per step
- [ ] Build Pack export (PRDs, user stories, tech specs for AI coders)

#### Future — FFP (Full Platform)
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
8. Ideation — Mind Mapping, Crazy 8s, Brain Writing (3 sub-steps)
9. Concept Development — concept sheets with SWOT, feasibility, elevator pitch
10. Validate — synthesis summary recapping the full 10-step journey

**AI facilitation model:** The AI follows a conversational arc per step: Orient → Gather → Synthesize → Refine → Validate → Complete. Context flows forward — each step's structured output becomes input for subsequent steps via hierarchical compression (short-term verbatim, long-term summaries, persistent JSON artifacts).

**Target users:** Business owners, department heads, and "dreamers" who have ideas but lack design thinking or product management experience.

**Founder context:** Michael is an experienced design thinking facilitator who has run these workshops manually. This product packages his expertise into a scalable digital tool.

## Constraints

- **Tech Stack**: Next.js 16.1.1 + React 19, Tailwind 4 + shadcn/ui, Clerk auth, Neon Postgres, Gemini API via Vercel AI SDK, Vercel hosting
- **AI Provider**: Google Gemini API (gemini-2.0-flash) — chosen for cost/capability balance
- **Entry Friction**: Must be near-zero — user types idea and starts immediately
- **Desktop-First**: MVP targets desktop browsers; mobile deferred to MMP/FFP
- **Single Player First**: v0.5 and v1.0 are single-user; collaboration starts at MMP
- **Existing Codebase**: 12,131 lines TypeScript, 15 phases shipped, production at workshoppilot.ai

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
| ReactFlow for canvas (not Tldraw/Excalidraw) | Graph-first data model (nodes+edges), MIT free, ~200KB, structured relationships queryable for AI context. Tldraw $6K/yr, Excalidraw drawing-first with manual relationship parsing | ✓ Good — 110KB gzipped, quadrant layouts, AI-canvas integration |

## Current State

**Shipped:** v1.1 Canvas Foundation (2026-02-11)
**Live at:** https://workshoppilot.ai
**Codebase:** ~14,400 lines of TypeScript across ~290 files
**Tech stack:** Clerk + Neon + Gemini + Drizzle + AI SDK 6 + ReactFlow + Zustand + Vercel — all validated in production
**Milestones:** v0.5 (shell, 2 days) + v1.0 (AI facilitation, 3 days) + v1.1 (canvas, 2 days) = 5 days total

**Known issues / tech debt:**
- Workshops table needs deletedAt column for soft delete
- Next.js middleware → proxy convention migration (non-blocking)
- Step 10 Validate produces synthesis summary only (no Build Pack export yet)
- CRON_SECRET needs to be configured in Vercel dashboard for production cron warming

**Next milestone:** v1.2 Canvas Whiteboard — structured grid/swimlane canvas, AI-driven placement, output → canvas migration

---
*Last updated: 2026-02-11 after v1.2 milestone started*
