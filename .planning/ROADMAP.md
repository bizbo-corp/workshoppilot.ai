# Roadmap: WorkshopPilot.ai

## Milestones

- ✅ **v0.5 Application Shell** - Phases 1-6 (shipped 2026-02-08)
- 🚧 **v1.0 Working AI Facilitation** - Phases 7-14 (in progress)
- 📋 **MMP Visual & Collaborative** - Phases TBD (planned)

## Overview

MVP 1.0 transforms the v0.5 application shell into a complete AI-powered design thinking facilitator. This requires building foundational context architecture first (Phase 7: dual-layer memory that prevents context degradation after step 4-5), then layering on AI facilitation capabilities (Phase 8: step-aware prompting with 6-phase conversational arc), structured outputs (Phase 9: JSON artifacts with Zod schemas per step), and navigation (Phase 10: back-revise with cascade updates). With the foundation established, implement step-specific facilitation logic for all 10 design thinking steps across three grouped phases (11-13: Discovery, Definition, Ideation/Validation). Finally, harden for production (Phase 14: rate limit handling, cold start prevention, streaming reconnection).

This phase ordering is intentional and research-validated: context architecture must be architectural from day one (can't retrofit hierarchical compression), AI prompting depends on context injection, structured outputs depend on prompting, navigation depends on outputs, steps depend on foundation, and production hardening is only testable after features exist.

## Phases

<details>
<summary>✅ v0.5 Application Shell (Phases 1-6) - SHIPPED 2026-02-08</summary>

### Phase 1: Foundation & Environment
**Goal**: Project scaffold with database, environment management, and type safety
**Plans**: 3 plans

Plans:
- [x] 01-01: Database setup with Neon Postgres
- [x] 01-02: Development environment and tooling
- [x] 01-03: Type system and validation infrastructure

### Phase 2: Authentication & Authorization
**Goal**: User accounts with role-based access control
**Plans**: 3 plans

Plans:
- [x] 02-01: Clerk integration and user management
- [x] 02-02: Role-based permissions (facilitator/participant)
- [x] 02-03: Anonymous sessions and migration

### Phase 3: Application Shell
**Goal**: Core UI structure and navigation
**Plans**: 3 plans

Plans:
- [x] 03-01: Layout system and responsive design
- [x] 03-02: Workshop routing and navigation
- [x] 03-03: Step containers and progress indicators

### Phase 4: Workshop Data Layer
**Goal**: Workshop and session persistence
**Plans**: 3 plans

Plans:
- [x] 04-01: Workshop CRUD operations
- [x] 04-02: Session management and state
- [x] 04-03: Step state persistence

### Phase 5: Basic AI Integration
**Goal**: AI chat connected at each step
**Plans**: 4 plans

Plans:
- [x] 05-01: Gemini API integration
- [x] 05-02: Chat UI components (shadcn-chat)
- [x] 05-03: Message persistence and streaming
- [x] 05-04: Step-scoped conversation history

### Phase 6: Production Deployment
**Goal**: Live at workshoppilot.ai with monitoring
**Plans**: 3 plans

Plans:
- [x] 06-01: Vercel deployment and env verification
- [x] 06-02: Error boundaries and graceful degradation
- [x] 06-03: Analytics and performance monitoring

</details>

### 🚧 v1.0 Working AI Facilitation (In Progress)

**Milestone Goal:** All 10 design thinking steps working end-to-end with intelligent, step-aware AI facilitation. Text-based throughout. The AI remembers everything from previous steps and builds on it — the user walks away feeling the AI understood their problem.

#### Phase 7: Context Architecture
**Goal**: Dual-layer context system preventing context degradation syndrome
**Depends on**: Phase 6 (v0.5 foundation)
**Requirements**: CTX-01, CTX-02, CTX-03, CTX-04
**Success Criteria** (what must be TRUE):
  1. System stores structured JSON artifacts per step in step_artifacts table
  2. System generates conversation summaries when steps are completed
  3. AI receives hierarchical context (short-term verbatim + long-term summaries + persistent JSON) when starting each step
  4. Context window stays under 15K tokens at Step 10 (vs 50K+ with naive full-history approach)
  5. Gemini context caching works for system prompts reducing input token costs by 90%
**Plans**: TBD

Plans:
- [ ] 07-01: TBD during planning
- [ ] 07-02: TBD during planning
- [ ] 07-03: TBD during planning

#### Phase 8: AI Facilitation Engine
**Goal**: Step-aware AI prompting with 6-phase conversational arc
**Depends on**: Phase 7 (context system must exist to inject prior step outputs)
**Requirements**: AIE-01, AIE-02, AIE-03, AIE-04, AIE-05
**Success Criteria** (what must be TRUE):
  1. Each step has dedicated system prompt that references prior step outputs by name
  2. AI follows Orient → Gather → Synthesize → Refine → Validate → Complete arc per step
  3. AI explains step purpose and references prior outputs when orienting user
  4. AI validates step output quality before allowing progression
  5. User can observe AI building on prior context (e.g., "Based on your persona Sarah from Step 5...")
**Plans**: TBD

Plans:
- [ ] 08-01: TBD during planning
- [ ] 08-02: TBD during planning

#### Phase 9: Structured Outputs
**Goal**: Schema-driven extraction of JSON artifacts per step
**Depends on**: Phase 8 (extraction depends on prompting quality and context)
**Requirements**: OUT-01, OUT-02, OUT-03, OUT-04
**Success Criteria** (what must be TRUE):
  1. Each step produces a typed JSON artifact matching its Zod schema
  2. System extracts structured outputs from conversation with retry logic and schema repair
  3. User sees extracted output and confirms before step completion
  4. Structured outputs render as formatted Markdown in the UI
  5. Extraction failures are handled gracefully with fallback to manual edit form
**Plans**: TBD

Plans:
- [ ] 09-01: TBD during planning
- [ ] 09-02: TBD during planning

#### Phase 10: Navigation & Persistence
**Goal**: Back-revise navigation with auto-save and cascade updates
**Depends on**: Phase 9 (cascade invalidation requires structured outputs to track dependencies)
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04
**Success Criteria** (what must be TRUE):
  1. User can navigate back to any completed step and view its output
  2. User can revise earlier steps; downstream steps are marked as needing regeneration
  3. System auto-saves conversation every 2 seconds (debounced, maxWait 10s) and on step completion
  4. User can resume a workshop from where they left off after closing browser
  5. Auto-save race conditions are prevented via optimistic locking
**Plans**: TBD

Plans:
- [ ] 10-01: TBD during planning
- [ ] 10-02: TBD during planning

#### Phase 11: Discovery Steps (1-4)
**Goal**: First 4 steps that gather and understand the problem
**Depends on**: Phase 10 (requires foundation working)
**Requirements**: S01-01, S01-02, S02-01, S02-02, S03-01, S03-02, S03-03, S04-01, S04-02
**Success Criteria** (what must be TRUE):
  1. User can complete Step 1 Challenge and system produces HMW statement with problem core, target user, altitude check
  2. User can complete Step 2 Stakeholder Mapping and system produces hierarchical stakeholder list (Core/Direct/Indirect)
  3. User can complete Step 3 User Research where AI generates interview questions and simulates stakeholder responses as synthetic interviews
  4. User can complete Step 4 Research Sense Making where AI clusters research quotes into themes and extracts 5 top pains and 5 top gains with evidence
  5. All 4 steps follow Orient → Gather → Synthesize → Refine → Validate → Complete arc
**Plans**: TBD

Plans:
- [ ] 11-01: TBD during planning
- [ ] 11-02: TBD during planning
- [ ] 11-03: TBD during planning
- [ ] 11-04: TBD during planning

#### Phase 12: Definition Steps (5-7)
**Goal**: Steps that define persona, journey, and reframe the challenge
**Depends on**: Phase 11 (Step 5 needs Step 4 research, Step 6 needs Step 5 persona, Step 7 needs Step 6 journey dip)
**Requirements**: S05-01, S05-02, S06-01, S06-02, S07-01, S07-02
**Success Criteria** (what must be TRUE):
  1. User can complete Step 5 Persona Development where AI synthesizes research into persona with name, role, bio, quote, pains, gains traced back to Step 4 themes
  2. User can complete Step 6 Journey Mapping where AI auto-generates journey map (4-8 stages × 5 layers) based on persona and identifies "the dip" (biggest pain point)
  3. User can complete Step 7 Reframing Challenge where AI suggests HMW statement components with options for each field and validates alignment with challenge, persona, and journey dip
  4. Persona pains/gains trace back to Step 4 research themes (not hallucinated)
  5. Journey dip identification is evidence-based from persona pains and research insights
**Plans**: TBD

Plans:
- [ ] 12-01: TBD during planning
- [ ] 12-02: TBD during planning
- [ ] 12-03: TBD during planning

#### Phase 13: Ideation & Validation Steps (8-10)
**Goal**: Steps that generate ideas, develop concepts, and synthesize journey
**Depends on**: Phase 12 (Step 8 needs Step 7 HMW, Step 9 needs Step 8 ideas, Step 10 synthesizes all steps)
**Requirements**: S08-01, S08-02, S08-03, S09-01, S09-02, S10-01, S10-02
**Success Criteria** (what must be TRUE):
  1. User can complete Step 8 Ideation where AI facilitates text-based mind mapping with themes, user can add their own ideas alongside AI suggestions, and AI facilitates brain writing (building on existing ideas)
  2. User can complete Step 9 Concept Development where AI generates concept sheet with name, elevator pitch, USP, SWOT analysis, and feasibility scores with rationale
  3. User can complete Step 10 Validate where AI generates synthesis summary recapping the full 10-step journey
  4. Step 10 summary includes key outputs from each step (challenge, stakeholders, research, persona, journey, HMW, ideas, concept)
  5. User can observe their full journey from vague idea to validated concept in the Step 10 summary
**Plans**: TBD

Plans:
- [ ] 13-01: TBD during planning
- [ ] 13-02: TBD during planning
- [ ] 13-03: TBD during planning

#### Phase 14: Production Hardening
**Goal**: Rate limit handling, cold start prevention, and streaming reconnection
**Depends on**: Phase 13 (production issues only surface under load with real features)
**Requirements**: PROD-01, PROD-02, PROD-03
**Success Criteria** (what must be TRUE):
  1. System handles Gemini 429 rate limit errors with exponential backoff, jitter, and clear UI feedback ("AI is busy, retrying in 3s...")
  2. System prevents Neon cold start delays via health-check warming (Vercel cron job pinging database every 4 minutes)
  3. System handles streaming interruptions gracefully with reconnection logic
  4. Multiple concurrent users can complete workshops without rate limit cascade failures
  5. First page load after 5+ minutes inactivity is fast (no 3-8 second cold start)
**Plans**: TBD

Plans:
- [ ] 14-01: TBD during planning
- [ ] 14-02: TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Environment | v0.5 | 3/3 | Complete | 2026-02-07 |
| 2. Authentication & Authorization | v0.5 | 3/3 | Complete | 2026-02-07 |
| 3. Application Shell | v0.5 | 3/3 | Complete | 2026-02-08 |
| 4. Workshop Data Layer | v0.5 | 3/3 | Complete | 2026-02-08 |
| 5. Basic AI Integration | v0.5 | 4/4 | Complete | 2026-02-08 |
| 6. Production Deployment | v0.5 | 3/3 | Complete | 2026-02-08 |
| 7. Context Architecture | v1.0 | 0/TBD | Not started | - |
| 8. AI Facilitation Engine | v1.0 | 0/TBD | Not started | - |
| 9. Structured Outputs | v1.0 | 0/TBD | Not started | - |
| 10. Navigation & Persistence | v1.0 | 0/TBD | Not started | - |
| 11. Discovery Steps (1-4) | v1.0 | 0/TBD | Not started | - |
| 12. Definition Steps (5-7) | v1.0 | 0/TBD | Not started | - |
| 13. Ideation & Validation Steps (8-10) | v1.0 | 0/TBD | Not started | - |
| 14. Production Hardening | v1.0 | 0/TBD | Not started | - |

---
*Last updated: 2026-02-08 after v1.0 milestone roadmap creation*
