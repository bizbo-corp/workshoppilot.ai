# Project Research Summary

**Project:** WorkshopPilot.ai v1.0 AI Facilitation Features
**Domain:** Multi-step AI-guided conversational platform for design thinking workshops
**Researched:** 2026-02-08
**Confidence:** HIGH

## Executive Summary

WorkshopPilot v1.0 adds AI facilitation capabilities to the existing v0.5 shell (Next.js 16.1.1 App Router, Neon Postgres, Drizzle ORM, Gemini 2.0 Flash via Vercel AI SDK 6.0.77, Clerk auth). Research reveals this requires a **dual-layer context architecture** where structured JSON artifacts and conversation summaries form the source of truth, with conversations serving as a projection of state. The critical finding: standard chat patterns break down after step 4-5 due to context degradation syndrome—attention drops from 100% on early messages to 50% at message 40 even within Gemini's 1M token window.

The recommended approach treats the backend as an **orchestration layer** managing a state machine (10 steps × 6 phases each), not a thin API. Key technologies needed: Zustand (state management with cascading updates), use-debounce (auto-save without database spam), and AI SDK 6's new `streamText` with `output` property for structured outputs. Fortunately, NO major new dependencies required—v1.0 uses the existing stack differently.

The biggest risks are: (1) **context degradation** requiring hierarchical compression from day one (architectural, can't retrofit), (2) **Gemini rate limits** with multi-dimensional tracking (RPM/TPM/RPD/IPM) that can cascade to complete failures, (3) **Neon cold starts** killing first impressions unless using correct serverless driver and health-check warming, and (4) **auto-save race conditions** corrupting data under concurrent load. All are preventable with proper architecture established in early phases.

## Key Findings

### Recommended Stack

**No major new dependencies needed—v1.0 uses existing stack differently.** The base stack (Next.js 16.1.1 + React 19 + Tailwind 4 + shadcn/ui + Clerk + Neon + Drizzle + Gemini 2.0 Flash via AI SDK 6.0.77) was validated for v0.5 and remains unchanged. Only two new packages required:

**Core technologies (existing, new usage):**
- **Vercel AI SDK 6.0.77**: Already installed; NEW usage is `streamText` with `output` property for structured outputs per step (replaces deprecated `generateObject`)
- **Zod 4.3.6**: Already installed; NEW usage is defining artifact schemas per step (HMW statement, persona, journey map)
- **Drizzle ORM 0.45.1**: Already installed; NEW tables needed for `step_artifacts` and `step_summaries`
- **Neon Postgres**: Already installed; NEW data is structured artifacts + conversation summaries
- **date-fns 4.1.0**: Already installed; NEW usage for "last saved at" timestamps

**New packages for v1.0:**
- **Zustand 5.0.3** (1.5KB): Global state for step artifacts in memory, computed/derived state for cascading context updates when user revises earlier steps. Selective subscriptions prevent unnecessary re-renders across 10 steps
- **use-debounce 10.1.0**: Debounce user input before auto-save, prevents database spam, has `maxWait` option ensuring saves happen even during continuous typing

**What NOT to install:**
- zustand-computed, derive-zustand (over-engineering for linear 10-step flow)
- react-query, swr (Next.js Server Actions already handle mutations)
- lodash.debounce (use-debounce is React-specific with hooks API)
- LangChain (adds abstraction overhead for WorkshopPilot's specific needs)
- Vector databases (context files with summaries + JSON are sufficient)

### Expected Features

**Must have (table stakes)—users expect these:**
- **Step-aware AI prompting**: Each step has dedicated system prompt with context injection from prior steps (essential for quality outputs)
- **Context memory across steps**: Dual-layer architecture with structured JSON artifacts + conversation summaries enables forward context flow
- **Structured outputs per step**: JSON schemas with Markdown rendering provide tangible deliverables (HMW statement, persona, journey map, etc.)
- **Auto-save**: Periodic saves during conversation + on step completion prevent 60% mid-workshop drop-off (critical for retention)
- **Back-and-revise navigation**: Allow revisiting prior steps with cascade context updates to subsequent steps
- **Step completion validation**: AI checks output quality before allowing progression to ensure quality

**Should have (competitive advantages)—differentiators:**
- **Orient → Gather → Synthesize → Refine → Validate → Complete arc**: Structured 6-phase conversational pattern per step ensures quality outputs
- **Synthetic user interviews (Step 3)**: AI simulates persona responses based on stakeholder map, removes biggest barrier to user research for non-experts
- **Affinity mapping automation (Step 4)**: AI auto-clusters research quotes into themes, extracts 5 pains/5 gains (replaces 2-hour manual clustering)
- **Journey map auto-generation (Step 6)**: Full journey board (4-8 stages × 5 layers) with "the dip" identified in seconds (requires strong context understanding)
- **HMW auto-suggestions (Step 7)**: Dropdown with 5 AI-generated goal options per field, validates alignment with Challenge + Journey Dip
- **Text-based mind mapping (Step 8)**: Hierarchical ideation structure without visual complexity, "I'm stuck" wildcard prompts
- **Conversational UI as primary interface**: AI leads, user responds—not "chatbot assistant" pattern. Chat is primary, forms/canvases are secondary outputs

**Defer (v2+)—not essential for launch:**
- Visual canvas tools (Tldraw/ReactFlow integration adds complexity)
- Real-time collaboration (websockets, state sync, conflict resolution—scope explosion)
- Voice input (transcription overhead; text validates flow first)
- Multi-language support (translation, cultural adaptation, testing overhead)

### Architecture Approach

AI-guided multi-step platforms require **orchestration architecture** where backend acts as state machine managing context, tools, and permissions rather than thin API layer. The critical insight: **conversation is a projection of state, not the source of truth**—this prevents runaway costs and enables resumability.

**Major components:**
1. **Step Engine (State Machine)**: Determines current step and phase, loads step-specific prompt template, enforces sequential progression rules, manages completion criteria
2. **Context Manager (Memory Layer)**: Assembles conversation context within token budget, implements hierarchical summarization (short-term: current step verbatim, long-term: prior step summaries + JSON outputs, persistent: all structured outputs in DB), applies Gemini context caching
3. **Conversation Orchestrator**: Routes messages to Gemini API, streams responses to frontend, triggers structured output extraction, persists conversation turns to database
4. **Structured Output Extractor (Schema Validator)**: Defines Zod schemas per step, extracts JSON from conversation using Gemini's schema-constrained generation, validates against schema, persists as step outputs
5. **Data Layer (Neon Postgres)**: Persists all application state (workshops, sessions, steps, conversations, messages, outputs), enables resumability

**Key patterns to follow:**
- **Orchestration over APIs**: Backend is intelligent orchestrator managing state, not thin API layer
- **Conversation as projection**: Treat conversation as view of underlying state; store structured outputs (JSON) separately from raw messages
- **Hierarchical context compression**: Keep recent 10-20 messages verbatim (short-term), compress older into summaries (long-term), store all step outputs as JSON (persistent)
- **Schema-driven structured outputs**: Define Zod schema per step, use Gemini's `responseSchema` parameter for constrained generation
- **Context caching for cost optimization**: Use Gemini's context caching for stable system prompts (7K tokens), reduces input token costs by 90%
- **Server-side streaming with persistence**: Stream responses real-time while buffering for database persistence

### Critical Pitfalls

1. **Context Degradation Syndrome in 10-Step Workshops**: AI quality degrades significantly after step 4-5 as conversation history grows. Attention drops from 100% on early messages to 50% at message 40. Models work best when relevant information sits at beginning or end of context window, struggle when buried in middle. **Prevention**: Implement hierarchical context compression with three tiers from day one (architectural decision, can't retrofit). Trigger summarization when step completes. Add memory refresh checkpoints at steps 4 and 7 where AI explicitly recaps key decisions. Use Gemini context caching for stable system prompts (90% cost savings).

2. **Gemini Rate Limit Cascade Failures**: User hits 429 "quota exceeded" errors mid-session, chat stops working, trust craters. Gemini enforces rate limits across FOUR independent dimensions (RPM, TPM, RPD, IPM)—exceeding ANY triggers 429. Free tier was slashed 50-92% in December 2025 without notice. Rate limits are per-project (all users share quota pool). **Prevention**: Implement exponential backoff with jitter on 429 responses with clear UI feedback. Use multiple Gemini projects with key rotation. Implement request queuing with position indicator. Monitor rate limit margins and throttle proactively before hitting limits. Consider Tier 1 paid plan ($50 = 66x capacity increase).

3. **Neon Cold Start Death Spiral**: Users start session after 5+ minutes of inactivity. First page load takes 3-8 seconds while Neon compute wakes from scale-to-zero. User sees spinner, assumes site is broken, refreshes (creates another cold start). Neon serverless architecture scales to zero after 5 minutes (free) or 300 seconds (paid). Cold start involves: wake compute, load data, establish connection. **Prevention**: Use `@neondatabase/serverless` driver (not node-postgres) optimized for edge environments. Configure connection timeout (`?connect_timeout=10`). Implement health-check warming via Vercel cron job pinging database every 3-4 minutes. Use PgBouncer connection pooling. Consider "always on" compute on paid plans.

4. **Structured Output Extraction Failures**: User completes step with detailed conversation, clicks "Continue," extraction fails (missing fields, markdown-wrapped JSON instead of pure JSON, partial data). Step completion hangs, user blocked from progressing. Gemini's structured output mode is reliable but not perfect—failures occur when conversation is ambiguous about field values, Gemini prioritizes conversational naturalness over schema compliance, or context window issues cause late-conversation data to be deprioritized. **Prevention**: Use explicit extraction prompts with schema. Implement retry logic with schema repair. Use temperature 0.0-0.3 for Gemini 2.5 extraction requests, temperature 1.0 for Gemini 3 (model-specific). Use `responseMimeType: "application/json"` to force JSON-only output. Show extracted data to user for confirmation before proceeding.

5. **Auto-Save Race Conditions**: Auto-save fires every 30 seconds, user completes step clicking "Continue," both saves attempt to write to same workshop/session simultaneously. Race condition: auto-save writes partial conversation, step completion reads stale conversation, generates summary missing last 2 messages, writes and transitions to next step. User arrives with incomplete context. **Prevention**: Implement optimistic locking with `version` column, increment on every update, fail if version changed. Debounce auto-save with "save in progress" flag. Disable step transition buttons during auto-save. Use database transactions with serializable isolation for step completion. Implement idempotency keys for API requests.

## Implications for Roadmap

Based on research, v1.0 should be structured into 6 phases addressing foundational concerns first, then building features incrementally. Critical architectural decisions (context compression, dual-layer architecture) must be established in early phases—they're not retrofittable.

### Phase 1: Dual-Layer Context Architecture
**Rationale:** Foundation for all AI facilitation features. Context management architecture affects database schema (step_artifacts, step_summaries tables), API design (which context gets passed to Gemini), and step navigation (summary generation on step completion). Must be architectural from day one—can't retrofit hierarchical compression after building on flat conversation history.

**Delivers:** Database schema with step_artifacts and step_summaries tables, context manager that assembles short-term (current step messages) + long-term (prior step summaries + JSON) + persistent (all structured outputs) context, Gemini context caching for stable system prompts.

**Addresses:** Context Degradation Syndrome pitfall (critical), establishes conversation-as-projection principle

**Avoids:** Building on wrong foundation (full message history forwarding), needing major refactor at step 4-5 when context degrades

### Phase 2: Step-Aware AI Prompting
**Rationale:** Each of 10 steps has different goals, outputs, validation criteria. Generic AI assistant produces low-quality outputs. Step-specific system prompts must reference prior step outputs ("Based on your persona Sarah from Step 5...") not rely on full conversation history.

**Delivers:** Step Engine as state machine managing 10 steps × 6 phases each (Orient → Gather → Synthesize → Refine → Validate → Complete), step-specific prompt templates, prompt template selection logic per phase, context injection from prior steps

**Addresses:** Step-aware AI prompting feature (must-have), Orient → Gather → Synthesize arc feature (competitive advantage)

**Uses:** Gemini 2.0 Flash via AI SDK 6.0.77 with context from Phase 1's Context Manager

**Implements:** Step Engine and Conversation Orchestrator components from architecture

### Phase 3: Structured Outputs Per Step
**Rationale:** Users need tangible deliverables (HMW statement, persona card, journey map), not just conversation. Downstream steps require structured inputs (Step 6 needs Step 5 persona as JSON, not free text). Schema-driven extraction ensures data consistency and enables type-safe context passing.

**Delivers:** Zod schemas for all 10 steps, Structured Output Extractor using AI SDK 6's `streamText` with `output` property, extraction with retry logic and schema repair, validation before persistence, confirmation UI showing extracted data to user

**Addresses:** Structured outputs per step feature (must-have), extraction failures pitfall (critical)

**Uses:** Zod 4.3.6 (already installed), Gemini's `responseSchema` parameter for constrained generation, model-specific temperature (0.0-0.3 for Gemini 2.5, 1.0 for Gemini 3)

**Implements:** Structured Output Extractor component, transactional step completion

### Phase 4: Navigation & Back-Revise
**Rationale:** Users realize mistakes in earlier steps, need to revise without restarting entire workshop. Back-navigation with cascade context updates is complex—requires dependency tracking, invalidation strategy, and prevention of race conditions between auto-save and step transitions.

**Delivers:** Back-navigation allowing step revisitation, dependency graph tracking which steps depend on which upstream outputs, cascade invalidation marking downstream steps as "needs regeneration," auto-save with debounced saves (use-debounce 10.1.0) every 2 seconds + maxWait 10 seconds, optimistic locking preventing race conditions, step transition coordination

**Addresses:** Back-and-revise navigation feature (must-have), auto-save feature (must-have), cascade invalidation failures pitfall, auto-save race conditions pitfall

**Uses:** use-debounce 10.1.0, database transactions with optimistic locking (version column), Zustand 5.0.3 for client-side artifact state with computed selectors for staleness detection

**Implements:** Auto-save with race condition prevention from day one (architectural)

### Phase 5: AI Facilitation for All 10 Steps
**Rationale:** With foundation established (context architecture, step engine, structured outputs, navigation), implement step-specific facilitation logic for each of 10 design thinking steps. Each step has unique conversational arc, output schema, and validation criteria.

**Delivers:** Step 1 (Challenge): HMW statement extraction, Step 2 (Stakeholders): hierarchical stakeholder mapping, Step 3 (User Research): synthetic AI interviews simulating persona responses, Step 4 (Research Sense Making): affinity mapping automation extracting 5 pains/5 gains, Step 5 (Persona): AI-generated persona from research evidence, Step 6 (Journey Mapping): full journey board auto-generation with "the dip" identification, Step 7 (Reframe): HMW auto-suggestions with validation, Step 8 (Ideation): text-based mind mapping with AI theme suggestions, Step 9 (Concept Development): SWOT + feasibility AI scoring, Step 10 (Validate): synthesis summary recap

**Addresses:** All competitive advantage features (synthetic interviews, affinity mapping, journey map auto-generation, HMW suggestions, mind mapping, SWOT/feasibility scoring)

**Uses:** All foundation from Phases 1-4, step-specific Zod schemas, domain-adapted conversational prompts

**Implements:** Complete 10-step workflow with AI facilitation

### Phase 6: Production Hardening
**Rationale:** Features work in development but break under production conditions (network variability, concurrent users, rate limits, cold starts). Production hardening is not optional—rate limit cascade failures and cold start death spirals destroy trust and are hard to recover from.

**Delivers:** Exponential backoff with jitter on Gemini 429 errors with UI feedback ("AI is busy, retrying in 3s..."), multiple Gemini projects with key rotation for rate limit distribution, request queuing with position indicator, rate limit margin monitoring and proactive throttling, Neon health-check warming via Vercel cron job (every 4 minutes), streaming reconnection logic for network failures, connection timeout configuration, error boundaries for graceful degradation, monitoring and alerting for rate limits/cold starts/extraction failures

**Addresses:** Gemini rate limit cascade failures pitfall (critical), Neon cold start death spiral pitfall (critical), streaming interruption failures pitfall

**Uses:** Vercel cron jobs for health-check warming, Gemini context caching (90% cost savings on system prompts), multiple API keys/projects for redundancy

**Implements:** Production reliability patterns that can't be tested in local dev (concurrent users, network variability)

### Phase Ordering Rationale

- **Phase 1 must come first**: Context architecture affects database schema, API design, and step navigation. Can't retrofit hierarchical compression after building on flat message history. This is architectural, not additive.

- **Phase 2 depends on Phase 1**: Step-specific prompts require context injection from prior steps. Context Manager must exist to assemble short-term + long-term + persistent context before Step Engine can reference it.

- **Phase 3 depends on Phases 1-2**: Structured outputs require conversation orchestration (Phase 2) and storage in step_artifacts table (Phase 1). Extraction uses context from Phase 1's Context Manager.

- **Phase 4 depends on Phases 1-3**: Back-navigation with cascade invalidation requires structured outputs (Phase 3) to track dependencies. Auto-save race condition prevention needs database schema from Phase 1.

- **Phase 5 depends on Phases 1-4**: Step-specific features require foundation (context, prompting, extraction, navigation) working correctly. Building features on broken foundation leads to quality issues discovered too late.

- **Phase 6 is last**: Production hardening addresses issues that only surface under production conditions (concurrent load, network variability, real rate limits). Can't test meaningfully until core features exist.

**Grouping strategy:** Foundation first (Phases 1-4), then features (Phase 5), then reliability (Phase 6). This avoids pitfall of building features on broken foundation, then needing major refactor when architectural issues surface.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 3 (Structured Outputs)**: Gemini structured output mode has known issues (GitHub issues #6494, #11396). May need research into fallback extraction strategies, schema compatibility across Gemini 2.5 vs 3, temperature tuning per model.
- **Phase 5 (Step 5 Persona Generation)**: AI-generated personas from evidence is complex domain—needs research into persona quality validation, traceability to research quotes, avoiding generic/hallucinated persona details.
- **Phase 5 (Step 6 Journey Map Auto-Generation)**: Full journey board (4-8 stages × 5 layers) is most complex structured output. Needs research into journey map structure patterns, "the dip" detection strategies, granular auto-suggest for cell editing.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Dual-Layer Context)**: Hierarchical summarization, context compression, database schema design are well-documented patterns with multiple high-confidence sources.
- **Phase 2 (Step-Aware Prompting)**: Step-specific system prompts, state machine for phases, prompt template selection are standard conversational AI patterns.
- **Phase 4 (Navigation & Back-Revise)**: Auto-save with debounce, optimistic locking, cascade invalidation have established patterns from 2026 state management research.
- **Phase 6 (Production Hardening)**: Exponential backoff, health-check warming, rate limit monitoring are standard production reliability patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Base stack (Next.js, Neon, Drizzle, Gemini via AI SDK 6) already deployed at workshoppilot.ai. Only 2 new packages needed (Zustand, use-debounce) with clear purpose and rationale. Verified AI SDK 6.0.77 supports structured outputs via `output` property. |
| Features | HIGH | Feature requirements derived from Obsidian specs (10-step workshop flow documented in detail). Table stakes vs differentiators validated against competitor analysis (Mural AI, IDEO U, TheyDo AI). Conversational arc pattern (Orient → Gather → Synthesize → Refine → Validate → Complete) is consistent across all steps. |
| Architecture | HIGH | Orchestration architecture validated against official Next.js docs on Server Actions, Gemini API documentation on context caching, industry patterns from WebSearch 2026. Component boundaries (Step Engine, Context Manager, Conversation Orchestrator, Structured Output Extractor) have clear responsibilities and data flow. Database schema design follows PostgreSQL best practices. |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls (context degradation, rate limits, cold starts, extraction failures, race conditions) are well-documented with HIGH confidence sources (academic research, official API docs, GitHub issues). Prevention strategies validated across multiple sources. UX pitfalls (no save/resume, can't edit previous steps) derived from general conversational AI patterns. Gemini-specific issues (temperature inconsistency Gemini 2.5 vs 3, structured output bugs) documented in Vercel AI SDK GitHub issues and official Gemini docs. |

**Overall confidence:** HIGH

Research is comprehensive with 40+ sources (official docs, academic papers, 2026 industry articles, GitHub issues, existing codebase verification). Stack decisions are minimal (only 2 new packages) and well-justified. Architecture patterns are validated against multiple sources. Pitfalls are specific with clear prevention strategies and recovery costs.

### Gaps to Address

- **Actual token usage per step**: Research provides estimates (Step 10 sees ~1,350 tokens with dual-layer context vs 10,000 with full history) but requires profiling with real conversations to validate token budget allocation (system prompt: 2K, step context: 5K, conversation history: 8K, user input: 1K, reserved: 1K).

- **Optimal summarization thresholds**: Research suggests summarization after 30 messages or 20K tokens, but optimal trigger point may need experimentation based on actual conversation patterns in 10-step workshops.

- **Gemini context caching TTL optimization**: Recommended 3600s (1 hour) cache TTL for system prompts, but optimal balance between cost savings and cache miss rate needs tuning in production.

- **Cascade invalidation UX flow**: Research identifies need for dependency tracking and invalidation, but exact UX flow (automatic regeneration vs user confirmation, show diff of changes, preserve manual edits) needs validation during implementation.

- **Extraction retry strategies**: Research recommends retry with schema repair prompt, but number of retries (1? 3?), backoff timing, and fallback to manual edit form need testing with real extraction failure patterns.

**How to handle during planning/execution:**
- Phase 1: Implement context budget allocation with monitoring/logging to measure actual usage
- Phase 3: Build extraction retry logic with configurable retry count, collect failure patterns for tuning
- Phase 4: A/B test cascade invalidation UX flows (auto-regenerate vs confirm) with early users
- Phase 6: Monitor Gemini cache hit rates and token costs, tune TTL based on production data

All gaps are tuning/optimization issues, not blocking unknowns. Core architecture and prevention strategies are clear.

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- Gemini API Documentation (ai.google.dev) — Context management, structured outputs, rate limits, context caching
- Vercel AI SDK Documentation (ai-sdk.dev) — AI SDK 6 structured outputs with `output` property, Gemini provider integration
- Next.js Documentation (nextjs.org) — Server Actions, App Router, streaming
- Neon Documentation (neon.com/docs) — Serverless driver, connection pooling, scale-to-zero behavior
- Drizzle ORM Documentation — Schema definition, migrations, edge compatibility
- Zustand Documentation (zustand.docs.pmnd.rs) — State management patterns, persist middleware

**Verified Codebase:**
- `/Users/michaelchristie/devProjects/workshoppilot.ai/package.json` — ai@6.0.77, @ai-sdk/google@3.0.22, zod@4.3.6, drizzle-orm@0.45.1 confirmed installed
- `/Users/michaelchristie/devProjects/workshoppilot.ai/src/app/api/chat/route.ts` — Current AI SDK usage with streamText
- `/Users/michaelchristie/devProjects/workshoppilot.ai/src/db/schema/` — Existing database schema patterns

**Obsidian Specifications:**
- `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/lifeOS/10_Projects/WorkshopPilot/Design Thinking/Steps/` — Detailed specs for all 10 steps with common features, conversational arc patterns

### Secondary (MEDIUM-HIGH confidence)

**Academic Research:**
- [LLM Context Window Degradation Research](https://arxiv.org/pdf/2505.06120) — Multi-turn conversation quality degradation, attention drops 50% at message 40
- [Context Length Alone Hurts Performance](https://arxiv.org/html/2510.05381v1) — 13.9%-85% degradation in retrieval accuracy as context grows

**2026 Industry Patterns:**
- [Next.js Backend for Conversational AI in 2026](https://www.sashido.io/en/blog/nextjs-backend-conversational-ai-2026) — Orchestration architecture patterns
- [Building Multi-Turn Conversations with AI Agents: The 2026 Playbook](https://medium.com/ai-simplified-in-plain-english/building-multi-turn-conversations-with-ai-agents-the-2026-playbook-45592425d1db) — State machine patterns
- [Context Engineering: The New Frontier of Production AI in 2026](https://medium.com/@mfardeen9520/context-engineering-the-new-frontier-of-production-ai-in-2026-efa789027b2a) — Hierarchical compression strategies
- [Context Window Management Strategies](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/) — Balance context carefully for multi-turn interactions

**GitHub Issues (Vercel AI SDK):**
- [Issue #6494](https://github.com/vercel/ai/issues/6494) — Gemini 2.5 JSON schema support compatibility
- [Issue #11396](https://github.com/vercel/ai/issues/11396) — Gemini 3 Preview structured output bugs (outputs internal JSON as text when tools provided)
- [Issue #11865](https://github.com/vercel/ai/issues/11865) — Stream resumption only works on page reload, not tab switch
- [Issue #10926](https://github.com/vercel/ai/issues/10926) — Streaming breaks when Chat instance replaced dynamically

### Tertiary (MEDIUM confidence)

**Community Tutorials & Guides:**
- [Structured Outputs with Vercel AI SDK](https://www.aihero.dev/structured-outputs-with-vercel-ai-sdk) — Community tutorial verified against official docs
- [use-debounce npm package](https://www.npmjs.com/package/use-debounce) — Version 10.1.0 features (maxWait, flush)
- [Autosave with React Hooks](https://www.synthace.com/blog/autosave-with-react-hooks) — Production pattern with debounce + useEffect
- [Database Race Conditions Catalogue](https://www.ketanbhatt.com/p/db-concurrency-defects) — Lost updates, dirty writes patterns
- [Cache Invalidation Strategies 2026](https://oneuptime.com/blog/post/2026-01-30-cache-invalidation-strategies/view) — Cascading invalidation patterns

**Competitor Analysis:**
- Mural AI (canvas + AI sidebar, assistant role)
- IDEO U Workshops (educational, manual exercises)
- TheyDo AI (journey canvas + AI suggestions)
- WorkshopPilot differentiators: AI as facilitator (not assistant), chat-first (not canvas), synthetic research, end-to-end automation

---
*Research completed: 2026-02-08*
*Ready for roadmap: yes*
