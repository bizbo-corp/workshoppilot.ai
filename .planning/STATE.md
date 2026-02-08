# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.
**Current focus:** Phase 11 - Discovery Steps 1-4 (v1.0 milestone)

## Current Position

Phase: 11 of 14 (Discovery Steps 1-4)
Plan: 2 of 3 complete
Status: In progress
Last activity: 2026-02-08 — Completed 11-02-PLAN.md

Progress: [██████████░░░░░░░░░░] 74% (10 of 14 phases complete, 2 of 3 plans in phase 11)

## Performance Metrics

**Velocity:**
- Total plans completed: 33
- Average duration: 2.8 min
- Total execution time: 2.08 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-database | 3 | 7 min | 2.3 min |
| 02-authentication-roles | 4 | 14 min | 3.5 min |
| 03-application-shell | 6 | 26 min | 4.3 min |
| 04-navigation-state | 2 | 4 min | 2.0 min |
| 05-ai-chat-integration | 2 | 9 min | 4.5 min |
| 06-production-deployment | 2 | 12 min | 6.0 min |
| 07-context-architecture | 3 | 6 min | 2.0 min |
| 08-ai-facilitation-engine | 3 | 10 min | 3.3 min |
| 09-structured-outputs | 3 | 8.5 min | 2.8 min |
| 10-navigation-persistence | 2 | 7.2 min | 3.6 min |
| 11-discovery-steps-1-4 | 2 | 4 min | 2.0 min |

**Recent Trend:**
- v0.5 milestone: 6 phases, 19 plans in 2 days
- Phase 7: Context Architecture completed (3 plans, 6 min)
- Phase 8: AI Facilitation Engine completed (3 plans, 10 min)
- Phase 9: Structured Outputs completed (3 plans, 8.5 min)
- Phase 10: Navigation & Persistence completed (2 plans, 7.2 min)
- Phase 11: Discovery Steps 1-4 in progress (2 of 3 plans, 4 min)
- Trend: Stable velocity, consistent 1-3 min per plan

*Updated after 11-02 completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting v1.0 work:

- **Phase 7+**: Dual-layer context architecture (structured JSON + summaries) prevents context degradation after step 4-5
- **Phase 7+**: Hierarchical compression with 3 tiers (short-term verbatim, long-term summaries, persistent JSON) is architectural, can't retrofit
- **Phase 7 Plan 1**: JSONB storage for artifacts with placeholder Record<string, unknown> until Phase 9 adds Zod schemas
- **Phase 7 Plan 1**: Unique constraint on workshopStepId enforces one artifact/summary per workshop step
- **Phase 7 Plan 1**: Optimistic locking on step_artifacts via version column enables Phase 10 concurrent update detection
- **Phase 7 Plan 1**: schemaVersion column enables future artifact schema evolution without breaking old workshops
- **Phase 7 Plan 2**: Three separate queries for context assembly (efficient for small result sets, clearer than complex joins)
- **Phase 7 Plan 2**: Empty context tiers return empty strings (not placeholder text - don't waste tokens)
- **Phase 7 Plan 2**: AI summarization gracefully degrades (fallback message doesn't block step completion)
- **Phase 7 Plan 3**: Synchronous summary generation on step completion (reliability > speed for context propagation)
- **Phase 7 Plan 3**: Summary generation failure doesn't block step completion (logged error, step still marked complete)
- **Phase 7 Plan 3**: workshopId required in chat API for context assembly (breaking change for client)
- **Phase 8+**: Step-aware prompting with 6-phase arc (Orient → Gather → Synthesize → Refine → Validate → Complete)
- **Phase 8 Plan 1**: Step prompts kept self-contained without importing step-metadata.ts to avoid circular dependencies
- **Phase 8 Plan 1**: Validation criteria use specific checkPrompt questions instead of generic quality assessments
- **Phase 8 Plan 1**: Prior context usage documented per step to guide AI on which outputs to reference
- **Phase 8 Plan 1**: Steps grouped by cluster - Discovery (1-4) exploration, Definition (5-7) synthesis with heavy prior context, Ideation/Validation (8-10) creativity grounded in research
- **Phase 8 Plan 3**: buildStepSystemPrompt expanded to 6 parameters (added arcPhase, stepDescription) to support arc-phase-aware prompts
- **Phase 8 Plan 3**: Orient phase includes step purpose explanation in role section (satisfies AIE-03 requirement)
- **Phase 8 Plan 3**: Validation criteria injected during Validate phase only (not shown in other phases to avoid prompt clutter)
- **Phase 8 Plan 3**: Chat API reads arc phase from database via getCurrentArcPhase on every request (database is source of truth)
- **Phase 8 Plan 3**: System prompts now contain 9 information layers (role, arc phase, step instructions, validation criteria, persistent memory, long-term memory, context rules, general guidance)
- **Phase 9 Plan 1**: Zod schemas use .describe() on every field to guide LLM extraction (improves AI SDK 6 accuracy)
- **Phase 9 Plan 1**: Flat schema structure (max 2 levels nesting) based on research showing better extraction reliability
- **Phase 9 Plan 1**: Secondary fields marked .optional() to prevent extraction failures when LLM can't find optional data
- **Phase 9 Plan 1**: stepSchemaMap enables dynamic schema lookup without hardcoded conditionals
- **Phase 9 Plan 1**: StepArtifactMap provides step-specific typing, ArtifactRecord preserved for backward compatibility
- **Phase 9 Plan 2**: AI SDK 6 streamText + Output.object pattern (not deprecated generateObject), output is PromiseLike
- **Phase 9 Plan 2**: Extraction retry logic injects previous error message into prompt for schema repair (3 total attempts)
- **Phase 9 Plan 2**: Temperature 0.1 for extraction increases determinism and reduces hallucination
- **Phase 9 Plan 2**: saveStepArtifact optional validation parameter (defaults false) maintains backward compatibility
- **Phase 9 Plan 2**: Extraction endpoint maxDuration 60s (vs 30s chat) for complex extractions with retry
- **Phase 9 Plan 3**: Manual extraction trigger via Extract Output button (not automatic) — safer for initial implementation
- **Phase 9 Plan 3**: Soft navigation gating — Skip to Next (outline) vs Next (primary) — doesn't hard-block users
- **Phase 9 Plan 3**: Generic formatArtifactAsMarkdown iterates keys, not 10 separate formatters
- **Phase 9+**: Schema-driven extraction using Zod + AI SDK 6's streamText with output property
- **Phase 10 Plan 1**: Auto-save failures are logged but silent (no user-facing errors to avoid disrupting conversation flow)
- **Phase 10 Plan 1**: 2s debounce delay with 10s maxWait balances UX (feels responsive) and database load
- **Phase 10 Plan 1**: Flush-on-unmount handles save-before-navigate case automatically (no explicit navigation hooks needed)
- **Phase 10 Plan 1**: needs_regeneration status clears timestamps like not_started (step must be re-completed)
- **Phase 10 Plan 1**: use-debounce library chosen over lodash.debounce for React lifecycle integration
- **Phase 10 Plan 2**: Back-navigation to completed steps is VIEW ONLY by default (prevents accidental invalidation)
- **Phase 10 Plan 2**: Only clicking "Revise This Step" triggers cascade invalidation (explicit user action required)
- **Phase 10 Plan 2**: Revised step resets to in_progress with arcPhase: orient (user re-enters editing mode)
- **Phase 10 Plan 2**: needs_regeneration steps preserve artifacts as starting points for regeneration
- **Phase 10 Plan 2**: Amber visual indicators (border-amber-500) distinguish needs_regeneration from other statuses
- **Phase 10 Plan 2**: Complete steps show confirmed artifact, needs_regeneration shows artifact but unconfirmed
- **Phase 10+**: Auto-save with debounce (2s, maxWait 10s) + optimistic locking prevents race conditions
- **Phase 10+**: Cascade invalidation via explicit revision action, view-only back-navigation prevents accidents
- **Phase 11 Plan 1**: Summary generation embedded in advanceToNextStep server action (ensures summary exists before next step loads)
- **Phase 11 Plan 1**: Message-count heuristic for arc transitions (0-2=orient, 3-8=gather, 9-14=synthesize, 15-18=refine, 19-22=validate, 23+=complete)
- **Phase 11 Plan 1**: Fire-and-forget arc transition calls from client (non-critical, should not block chat UX)
- **Phase 11 Plan 1**: Conditional DB writes for arc transitions (only write when phase changes, reduces load)
- **Phase 11 Plan 2**: Step 1 AI drafts 3 HMW variants at different altitudes (specific/balanced/broad) with tradeoff explanations
- **Phase 11 Plan 2**: Step 2 AI uses proactive prompting with domain-specific stakeholder categories
- **Phase 11 Plan 2**: Step 3 AI facilitates synthetic interviews by roleplaying stakeholders from Step 2
- **Phase 11 Plan 2**: Step 4 AI requires evidence traceability with source attribution for every theme/pain/gain
- **Phase 11 Plan 2**: All 4 Discovery steps include BOUNDARY instructions preventing premature synthesis
- **Phase 11 Plan 2**: Synthetic interview quality guidance ensures stakeholders sound different with contradictions/mixed feelings
- **Phase 11-13**: Group steps into natural clusters (Discovery 1-4, Definition 5-7, Ideation/Validation 8-10)

### Pending Todos

- Workshops table needs deletedAt column for soft delete (from v0.5)
- Next.js middleware → proxy convention migration (non-blocking from v0.5)

### Blockers/Concerns

**From research (addressed in roadmap):**
- Context degradation syndrome: Solved by Phase 7 hierarchical context architecture
- Gemini rate limit cascade failures: Addressed in Phase 14 production hardening
- Neon cold start death spiral: Addressed in Phase 14 with health-check warming
- Auto-save race conditions: Prevented in Phase 10 with optimistic locking

**Current concerns:**
- Phase count is higher (8 phases vs typical 5-8) due to foundational complexity — acceptable for "standard" depth given v1.0's architectural requirements
- Steps 5-7 (Phase 12) and 8-10 (Phase 13) are grouped, may need refinement during planning if individual step complexity is high
- Production hardening (Phase 14) can't be tested meaningfully until features exist — may discover issues late

## Session Continuity

Last session: 2026-02-08 (Phase 11 in progress)
Stopped at: Completed 11-02-PLAN.md
Resume file: None

**Next action:** Continue Phase 11 with plan 03 (Discovery Steps artifacts and UI)

---
*Last updated: 2026-02-08T07:13:41Z after 11-01 completion*
