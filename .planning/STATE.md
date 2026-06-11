---
gsd_state_version: 1.0
milestone: v0.5
milestone_name: Journey Flow + Low-Fidelity Prototype Pipeline
status: unknown
last_updated: "2026-06-11T01:33:37.116Z"
progress:
  total_phases: 40
  completed_phases: 40
  total_plans: 117
  completed_plans: 117
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-11)

**Core value:** Anyone with a vague idea can produce validated, AI-ready product specs without design thinking knowledge — the AI facilitator replaces the human facilitator.
**Current focus:** Milestone v2.1 — Journey Flow + Low-Fidelity Prototype Pipeline

## Current Position

Phase: 64 — AI Baseline Generation
Plan: 04 complete (4/4)
Status: Phase 64 complete — all 4 plans shipped; GEN-01 through GEN-05 user-facing behavior verified
Last activity: 2026-06-11 — 64-04 executed (3/3 tasks): concept loading, ScopeChooser + generation wiring, checkpoint approved by user

## Performance Metrics

**By Milestone:**

| Milestone | Phases | Plans | Duration |
|-----------|--------|-------|----------|
| v0.5 | 6 | 19 | 2 days |
| v1.0 | 8 | 25 | 3 days |
| v1.1 | 6 | 15 | 2 days |
| v1.2 | 4 | 9 | 2 days |
| v1.3 | 5 | 23 | 1 day |
| v1.4 | 6 | 13 | 1 day |
| v1.5 | 4 | 9 | 2 days |
| v1.6 | 2 | 5 | 1 day |
| v1.7 | 4 | 7 | <1 day |
| v1.8 | 7 | 11 | 2 days |
| v1.9 | 5 | 12 | 3 days |
| v2.0 | 4 | 7 | 2 days |
| **Total shipped** | **62** | **155** | **22 days** |
| Phase 62.1-fix-cross-workshop-dialogue-leak-and-duplicate-greetings P03 | 3 | 3 tasks | 4 files |
| Phase 62.2 P02 | 4min | 2 tasks | 3 files |
| Phase 63-journey-flow-editor-core P02 | 2min | 2 tasks | 3 files |
| Phase 63-journey-flow-editor-core P03 | 2min | 2 tasks | 2 files |
| Phase 64-ai-baseline-generation P02 | 2min | 2 tasks | 1 file |
| Phase 64-ai-baseline-generation P03 | 2 | 2 tasks | 3 files |
| Phase 64 P04 | continuation | 3 tasks | 3 files |

## Accumulated Context

### Decisions

- Phase 62.1: hotfix for cross-workshop dialogue leak + duplicate greetings, inserted as decimal patch under v2.0 (precedent: Phase 13.1)
- DIAG-01: plan A ships fresh-generation logging only; replay logging is Plan B's responsibility
- hoisted let requestId: string | null = null in /api/chat POST handler so Plan B can reuse same binding for won-greeting fresh-gen path
- dialogue_feedback table has no sessionId/participantId columns; admin UI reads these from contextSnapshot instead
- TTL cleanup for chat_request_logs deferred to follow-up cron job (no vercel.json/cron infra in repo)
- AI SDK v5 generates assistant message id client-side; response_message_id stays null in onFinish — admin UI unaffected (joins by scope+timestamp); fix path: backfill via autoSaveMessages or streamText messageId override
- [Phase 62.1-fix-cross-workshop-dialogue-leak-and-duplicate-greetings]: HALL-01: Replace 'recover the closest version' license with ABSENCE PROTOCOL hard stop in stakeholder-mapping prompt — model must output single refusal line when prior context is missing
- [Phase 62.1-fix-cross-workshop-dialogue-leak-and-duplicate-greetings]: Sentinel string injected at context layer (assembleStepContext) when deps are non-empty but DB returns 0 rows — defense in depth independent of prompt layer
  - [Phase 62.1-fix-cross-workshop-dialogue-leak-and-duplicate-greetings]: Skip abortSignal for __step_start__ (greeting) requests — placeholder already inserted, stream must complete server-side to fill it; consumeStream() added alongside
  - [Phase 62.1-fix-cross-workshop-dialogue-leak-and-duplicate-greetings]: fillGreetingPlaceholder uses greetingClaim.messageId (deterministic placeholder id) not assistantMessageId — AI SDK v5 returns empty string from onFinish server-side
  - [Phase 62.1-fix-cross-workshop-dialogue-leak-and-duplicate-greetings]: GREET-01 + SCOPE-01 complete — DB-lock greeting singleton, 409/404 scope assertion, stop() cleanup, composite key, migration 0024 all shipped
  - [Phase 62.2 Plan 01 complete]: Server-side message-id resolved via AI SDK v6 generateMessageId — three 62.1 workarounds removed (empty-id filter, post-stream backfill, deterministic placeholder as canonical id); chat_request_logs.response_message_id now populated at insert time; all 6 ACs verified
- [Phase 62.2]: Phase 62.2 Plan 02: AC-1/2/4/wire-through/AC-6 codified in scripts/verify-message-id-resolution.ts (verify-sentinel.ts pattern); 62.1 Known Limitations closed with audit trail preserved
- [v2.1 Roadmap]: 5 phases (63-67) derived from 23 requirements. Brief's suggested phase breakdown followed — natural delivery boundaries matched. Phase 64 depends on Phase 63; Phase 65 depends on Phase 63; Phase 66 depends on both 63 and 65; Phase 67 depends on Phase 66.
- [Phase 63 Plan 01]: Title prefix 'Journey Flow:' kept distinct from 'Journey Map:' — old mapper is parked not deleted; overwriting its build-pack row would be silent data loss.
- [Phase 63 Plan 01]: deleteNode cascades edge removal (filters sourceNodeId AND targetNodeId) — orphan edges break ReactFlow rendering; this was a known gap in old mapper.
- [Phase 63 Plan 01]: Plain db client (not dbWithRetry) used in save route — matches both other save routes; fast-path writes are established exception per 63-RESEARCH.md OQ-3.
- [Phase 63-journey-flow-editor-core]: JourneyFlowEdge endpoint circles use var(--background) not hardcoded white — olive token compliance
- [Phase 63-journey-flow-editor-core]: Priority dot colors use CSS vars (destructive/primary/muted-foreground) inline style — no hardcoded palette colors
- [Phase 63-journey-flow-editor-core]: keyElements blank-line filter deferred to onOpenChange close callback to avoid eating the newline user just typed
- [Phase 63-journey-flow-editor-core]: spinner icon alias used in JourneyFlowToolbar (not loader-circle) — matches phosphor-icons registration in icon.tsx
- [Phase 63-journey-flow-editor-core]: JourneyFlowCanvasToolbar rendered outside ReactFlow div so it is unaffected by canvas zoom/pan transforms
- [Phase 63-journey-flow-editor-core Plan 04]: Outer/inner component split in journey-flow-content — outer provides JourneyFlowStoreProvider, inner consumes hooks; prevents hook-before-provider runtime error
- [Phase 63-journey-flow-editor-core Plan 04]: Autosave skips flush when nodes.length === 0 — prevents overwriting valid prior state on first-mount before user adds a node
- [Phase 63-journey-flow-editor-core Plan 04]: Phase 63 complete — all 4 plans shipped; route pattern (Next 16 async params + Clerk auth + resolveClerkParticipant isReadOnly) established as template for future output routes
- [Phase 64-01]: ARCHETYPE_TO_INTENT is the single reconciled concept — FlowArchetype (7 values) = structural pattern, StrategicIntent (5 values) = product category for Phase 66 dispatch
- [Phase 64-01]: detectArchetype() uses direct keyword overrides for funnel/tool before intent scoring — handles cases where detectStrategicIntent() doesn't reach marketing-site/tool threshold
- [Phase 64-01]: All new JourneyFlowState fields are optional — _schemaVersion stays at 1; Phase 66 guards with ?? fallback
- [Phase 64-02]: Feature-scope guard: LLM returning >4 screen nodes throws to heuristic fallback (heuristic always produces exactly 3)
- [Phase 64-02]: Belt-and-braces two-sided floor: detectTwoSided keyword check runs after both LLM and heuristic paths — GEN-05 holds even when LLM misses it
- [Phase 64-02]: Cache hit requires nodes.length > 0 AND state.testScope === requested scope — prevents cross-scope cache hits
- [Phase 64-03]: All icon references reused existing registry entries (workflow/map/target/sparkles/refresh/info) — no new phosphor imports needed for 64-03 UI work
- [Phase 64]: [Phase 64-04]: Autosave timer cleared AND isDirty set false before fetch — closes window where re-render during await could re-queue debounce for old nodes
- [Phase 64]: [Phase 64-04]: handleRegenerate always confirms — no heuristic to detect edits; executeRegenerate defaults testScope to 'journey' when missing (start-from-scratch has no stored scope)
- [Phase 64]: [Phase 64-04]: Phase 64 complete — all 4 plans shipped; GEN-01 through GEN-05 user-facing behavior verified via human checkpoint

### Roadmap Evolution

- Phase 62.2 added: AI SDK v5 Message-ID Server-Side Resolution (follow-up to 62.1; eliminates three workarounds rooted in AI SDK v5 server-side empty-id behavior — see .planning/phases/62.2-ai-sdk-v5-message-id-resolution/62.2-CONTEXT.md)
- v2.1 roadmap created: phases 63-67 covering Journey Flow editor core, AI baseline generation, validation guidance wiring, low-fi prototype prompt, and parking the old mapper

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-06-11
Stopped at: Completed 64-04-PLAN.md — generation wiring, ScopeChooser entry state, regenerate confirm flow; all six verification steps approved by user
Resume file: None
