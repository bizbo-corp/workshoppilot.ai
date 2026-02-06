# Architecture Research Summary: WorkshopPilot.ai

**Domain:** AI-powered design thinking workshop platform
**Researched:** 2026-02-07
**Overall confidence:** HIGH

## Executive Summary

WorkshopPilot.ai should follow an **orchestration architecture** where the Next.js backend acts as an intelligent state machine rather than a thin API layer. The core insight from 2026 AI system design patterns is: **treat conversation as a projection of state, not the source of truth**. This means persisting structured outputs (JSON) separately from conversation messages, implementing hierarchical context compression, and using event-driven workflows rather than synchronous request/response patterns.

The architecture consists of 5 major components: (1) Step Engine (state machine managing 10 steps × 6 phases), (2) Context Manager (hierarchical memory with compression), (3) Conversation Orchestrator (Gemini API integration with streaming), (4) Structured Output Extractor (Zod schemas → validated JSON), and (5) Data Layer (Neon Postgres with conversation scoping per step).

**Critical architectural decision:** Each step has its own scoped conversation with a context file (summary + structured JSON) that flows forward to subsequent steps. This prevents token budget exhaustion and enables clean resumability.

## Key Findings

**Architecture:** Five-layer orchestration architecture with clear separation between conversation (ephemeral), structured outputs (persistent), and context files (forward-flowing).

**Data Flow:** User message → Context Manager assembles context → Step Engine selects prompt → Conversation Orchestrator calls Gemini API → Stream response to frontend → Persist messages → Extract structured output → Generate context file → Flow to next step.

**Critical Pattern:** Hierarchical context compression with three-tier memory: (1) Short-term: recent 10-20 messages verbatim, (2) Long-term: summaries of older conversations, (3) Persistent: JSON outputs from all completed steps.

## Implications for Roadmap

Based on architecture research, the suggested build order follows dependency chains:

### Phase 1: Foundation (MVP 0.5) - 1-2 weeks
**What:** Database schema, authentication, step navigation shell
**Why first:** Everything depends on data models and user identity
**Addresses:** Core persistence layer, user access control
**Avoids:** Building features without state management

**Build order:**
1. Database schema (workshops → sessions → steps → conversations → messages)
2. Neon Postgres connection + Drizzle ORM setup
3. Clerk authentication integration
4. 10 hollow step containers with routing
5. Progress bar and basic navigation (no AI yet)

**Dependencies:** No external dependencies, can start immediately.

---

### Phase 2: Conversation Infrastructure (Early MVP 1.0) - 2-3 weeks
**What:** Gemini API integration, streaming chat UI, basic orchestration
**Why second:** Establishes core AI interaction pattern before step-specific logic
**Addresses:** Real-time conversation, message persistence
**Avoids:** Building step logic without working chat foundation

**Build order:**
1. Context Manager (basic context assembly, token counting)
2. Conversation Orchestrator (Gemini API + streaming)
3. Chat UI with Server Actions
4. Message persistence (conversations + messages tables)
5. Step Engine (minimal - just load step number, simple prompts)

**Dependencies:** Requires Phase 1 complete (database + auth).

**Critical validation:** Get one step working end-to-end before implementing all 10 steps.

---

### Phase 3: Structured Outputs (Mid MVP 1.0) - 2 weeks
**What:** Extract and persist JSON from conversations using Zod schemas
**Why third:** Enables context passing between steps (the core workflow)
**Addresses:** Data queryability, Build Pack export, step interdependencies
**Avoids:** Manual parsing of conversations, unstructured forward context

**Build order:**
1. Define Zod schemas for all 10 steps
2. Structured Output Extractor (schema-constrained generation with Gemini)
3. Context files generation (conversation summary + JSON)
4. Update Context Manager to load prior step outputs
5. Test forward context passing (Step 1 → Step 2 → Step 3)

**Dependencies:** Requires Phase 2 complete (working conversation).

**Critical validation:** Verify Step 2 can access Step 1's structured output correctly.

---

### Phase 4: Step-Specific Logic (Late MVP 1.0) - 3-4 weeks
**What:** Implement 10 design thinking steps with tailored prompts and phases
**Why fourth:** Can now build on tested infrastructure
**Addresses:** Actual workshop facilitation, step completion criteria
**Avoids:** Premature optimization before core features work

**Build order:**
1. Upgrade Step Engine to full state machine (phase detection)
2. Create step-specific prompt templates (10 steps × 6 phases = 60 prompts)
3. Implement completion criteria per step
4. Build Steps 1-5 (Challenge through Persona Development)
5. Build Steps 6-10 (Journey Mapping through Validation)
6. Implement context compression (hierarchical summarization)

**Dependencies:** Requires Phase 3 complete (structured outputs working).

**Likely needs deeper research:** Prompt engineering for each step's conversational arc, completion criteria tuning.

---

### Phase 5: Optimization (Post MVP 1.0) - Ongoing
**What:** Cost reduction, performance improvements, scale preparation
**Why last:** Optimize only after core value proven
**Addresses:** Operating costs, response latency, scale readiness
**Avoids:** Premature optimization

**Build order:**
1. Gemini context caching (save 90% on input token costs)
2. Background extraction jobs (async step completion)
3. Advanced summarization (embedding-based compression if needed)
4. Database query optimization (indexes, connection pooling)

**Dependencies:** All core features working.

**Research flags:** Actual token usage patterns will determine if advanced compression is needed.

---

## Phase Ordering Rationale

**Why Foundation first:** Everything depends on data persistence and user identity. Building features without these creates technical debt.

**Why Conversation Infrastructure before Step Logic:** Testing the orchestration pattern with one simple step is faster than debugging 10 complex steps simultaneously. Validates architecture early.

**Why Structured Outputs before Step-Specific Logic:** The 10 steps are interdependent (Step 2 needs Step 1's output). Must prove context passing works before implementing all steps.

**Why Step-Specific Logic comes late:** Most complex phase (60 prompts, completion criteria, phase detection). Benefits from tested infrastructure underneath.

**Why Optimization is last:** Cost and performance issues only matter if the product provides value. Ship working MVP first, optimize based on real usage patterns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Component boundaries | HIGH | Well-documented patterns from Next.js + AI system design 2026 |
| Data flow | HIGH | Verified with Gemini official docs, SashidoIO architecture guide |
| Build order dependencies | HIGH | Clear dependency chain: data → conversation → extraction → step logic |
| Context compression strategy | MEDIUM | Hierarchical summarization is proven, but thresholds need tuning |
| Scalability projections | MEDIUM | Based on general patterns, not WorkshopPilot-specific benchmarks |
| Gemini API integration | HIGH | Official documentation, context caching well-documented |
| Database schema | HIGH | Verified against AWS DynamoDB chatbot patterns, PostgreSQL best practices |

---

## Gaps to Address in Implementation

**Needs experimentation:**
- Actual token usage per step (profile with real conversations)
- Optimal context compression thresholds (may need A/B testing)
- Step completion criteria (when is "enough" conversation?)
- Gemini context caching TTL tuning (balance cost vs cache miss rate)

**Defer to later phases:**
- Advanced summarization techniques (embedding-based, semantic deduplication)
- Multi-user collaboration patterns (conflict resolution, real-time sync)
- Analytics schema (usage tracking, workshop metrics)

**Unknowns that won't block MVP:**
- Exact Gemini API rate limits at scale (can implement queuing later)
- Long-term conversation retention policy (archive after 90 days?)
- Build Pack export format optimization (start with JSON, refine later)

---

## Ready for Roadmap Creation

Research complete with HIGH confidence in architecture patterns. The roadmap should structure phases according to the 5-phase build order above:

1. Foundation (database, auth, routing) - MUST be first
2. Conversation Infrastructure (Gemini, streaming, chat UI) - MUST be second
3. Structured Outputs (Zod schemas, extraction, context files) - MUST be third
4. Step-Specific Logic (10 steps, prompts, phases) - MUST be fourth
5. Optimization (caching, background jobs, compression) - Can be ongoing

**Key architectural risks mitigated:**
- Token budget exhaustion → Hierarchical compression + context caching
- Unstructured context passing → Zod schemas + validated JSON extraction
- Poor resumability → Conversation scoped per step with persistent state
- High costs → Gemini context caching (90% savings), smart summarization
- Monolithic complexity → Clear component boundaries with single responsibilities

**Files created:**
- `/Users/michaelchristie/devProjects/workshoppilot.ai/.planning/research/ARCHITECTURE.md` (complete architecture specification)
- `/Users/michaelchristie/devProjects/workshoppilot.ai/.planning/research/ARCHITECTURE_SUMMARY.md` (this summary with roadmap implications)

---

**Last updated:** 2026-02-07
**Ready for:** Roadmap creation (phase structure, dependency ordering, build sequence)
