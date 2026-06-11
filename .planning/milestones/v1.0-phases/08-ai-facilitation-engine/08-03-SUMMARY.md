---
phase: 08-ai-facilitation-engine
plan: 03
type: summary
completed: 2026-02-08
duration: 2min
subsystem: ai-facilitation
tags: [ai, prompts, arc-phases, validation, context-injection, system-prompts]

requires:
  - 08-01-step-prompts
  - 08-02-arc-tracking
  - 07-03-chat-integration

provides:
  - step-aware-chat-api
  - arc-phase-aware-prompts
  - validation-criteria-injection
  - step-purpose-explanation

affects:
  - 09-structured-extraction
  - 10-auto-save
  - 11-step-completion

tech-stack:
  added: []
  patterns:
    - arc-phase-aware-prompting
    - step-specific-instructions
    - validation-criteria-injection
    - orient-phase-purpose-explanation

key-files:
  created: []
  modified:
    - src/lib/ai/chat-config.ts
    - src/app/api/chat/route.ts

decisions:
  - id: AIE-07
    decision: "buildStepSystemPrompt accepts 6 parameters: stepId, stepName, arcPhase, stepDescription, persistentContext, summaries"
    rationale: "Signature evolution to support arc phase awareness while preserving existing context injection"
    alternatives: "Pass options object (rejected: explicit params clearer for 6 params)"
    impact: "All callers must update to pass arcPhase and stepDescription"

  - id: AIE-08
    decision: "Orient phase includes step purpose explanation in role section"
    rationale: "Satisfies AIE-03 requirement: AI must explain step purpose during Orient phase"
    alternatives: "Inject as separate section (rejected: role section is first thing AI reads)"
    impact: "Every step conversation starts with purpose explanation during Orient"

  - id: AIE-09
    decision: "Validation criteria injected during Validate phase only"
    rationale: "Quality criteria relevant only when validating readiness to complete step"
    alternatives: "Show criteria during all phases (rejected: would clutter prompt unnecessarily)"
    impact: "AI receives checklist during Validate phase to assess output quality"

  - id: AIE-10
    decision: "Chat API reads arc phase from database via getCurrentArcPhase"
    rationale: "System prompt must reflect current conversation state for accurate AI behavior"
    alternatives: "Client passes arcPhase (rejected: database is source of truth)"
    impact: "Every chat request queries workshopSteps table for current arcPhase"

  - id: AIE-11
    decision: "Step description looked up from STEPS metadata (step-metadata.ts)"
    rationale: "Step descriptions hardcoded per user decision (not fetched from DB)"
    alternatives: "Fetch from database (rejected: user preference for hardcoded metadata)"
    impact: "Step descriptions consistent across all workshop instances"
---

# Phase 08 Plan 03: Prompt Assembly & Integration Summary

**One-liner:** Wired step-specific prompts, arc phase tracking, and validation criteria into chat API - every AI response is now step-aware and arc-phase-aware.

## What Was Built

### Enhanced System Prompt Builder (src/lib/ai/chat-config.ts)

**Updated buildStepSystemPrompt function:**
- Signature expanded from 4 to 6 parameters (added arcPhase, stepDescription)
- Imports from three prompt modules: step-prompts, arc-phases, validation-criteria
- Re-exports ArcPhase type for convenience

**Prompt assembly structure (in order):**
1. **Role section:** AI facilitator identity + step name
2. **Orient phase special:** If arcPhase === 'orient', inject step purpose explanation (AIE-03)
3. **Arc phase instructions:** Behavioral guidance from getArcPhaseInstructions(arcPhase)
4. **Step instructions:** Design thinking methodology from getStepSpecificInstructions(stepId)
5. **Validate phase special:** If arcPhase === 'validate', inject quality criteria checklist
6. **Persistent memory (Tier 1):** Structured artifacts from completed steps
7. **Long-term memory (Tier 2):** AI summaries from previous steps
8. **Context usage rules:** How to reference prior knowledge
9. **General guidance:** Behavioral reminders (encouraging, concise, one question at a time)

**Result:** System prompts now contain 9 information layers (up from 3), all contextually injected based on current step and arc phase.

### Wired Chat API (src/app/api/chat/route.ts)

**Added imports:**
- `getCurrentArcPhase` from conversation-state.ts
- `STEPS` from step-metadata.ts (for step description lookup)

**Updated request handling:**
1. Assemble three-tier context (unchanged)
2. **NEW:** Read arcPhase from database via getCurrentArcPhase(workshopId, stepId)
3. **NEW:** Look up stepDescription from STEPS metadata
4. Pass all 6 parameters to buildStepSystemPrompt
5. Stream response (unchanged)

**Result:** Every chat request produces a system prompt tailored to current step and arc phase. During Orient phase, AI explains step purpose. During Validate phase, AI checks quality criteria.

## Integration Points

### Upstream Dependencies (Wave 1)
- **Plan 08-01:** getStepSpecificInstructions, getArcPhaseInstructions, getValidationCriteria
- **Plan 08-02:** getCurrentArcPhase reads from workshopSteps.arcPhase column
- **Phase 7:** assembleStepContext provides persistent artifacts and summaries

### Downstream Impact (Future Phases)
- **Phase 9:** Structured extraction will extend system prompts with Zod schema instructions
- **Phase 10:** Auto-save will trigger on user input, AI continues to facilitate with current prompt
- **Phase 11:** Step completion will transition arc phase, triggering prompt updates

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Enhanced buildStepSystemPrompt with arc phase and step instructions | 931de8e | src/lib/ai/chat-config.ts |
| 2 | Wired arc phase and step description into chat API | f892c6b | src/app/api/chat/route.ts |

## Verification Results

**Build & Type Safety:**
- ✓ `npx tsc --noEmit` passes with zero errors
- ✓ `npm run build` succeeds
- ✓ All imports resolve correctly

**Code Integration:**
- ✓ Chat API imports and calls getCurrentArcPhase
- ✓ Chat API imports STEPS and looks up stepDescription
- ✓ buildStepSystemPrompt accepts 6 parameters
- ✓ Orient phase includes step description with purpose explanation instruction
- ✓ Validate phase injects validation criteria checklist
- ✓ Step-specific instructions injected for every request
- ✓ Existing context injection (persistent artifacts, summaries) preserved
- ✓ GENERIC_SYSTEM_PROMPT still exported as fallback

**Success Criteria:**
- ✓ Every chat request produces system prompt with step-specific instructions + arc phase guidance + prior context
- ✓ Orient phase includes step purpose explanation (satisfies AIE-03)
- ✓ Validate phase includes quality criteria checklist
- ✓ Arc phase read from database (not hardcoded)
- ✓ No regression in existing chat functionality (streaming, persistence, error handling)

## Deviations from Plan

None - plan executed exactly as written.

## Known Limitations & Future Work

### Arc Phase Transitions (Not Implemented)
**Current state:** Arc phase defaults to 'orient' for new steps. System prompts correctly reflect current phase, but no mechanism to transition phases yet.

**What's missing:**
- AI doesn't trigger phase transitions (Orient → Gather → Synthesize → Refine → Validate → Complete)
- Client doesn't send transition requests
- No detection of conversational milestones ("Ready to see a draft?" → Synthesize phase)

**Future implementation (Phase 11+ or gap closure):**
Two possible approaches:
1. **Client-driven:** Client detects user/AI signals and calls transitionArcPhase API
2. **AI-driven:** AI includes phase transition in response metadata, client persists it

**Why deferred:**
- Plan 08-03 scope: Get prompts right first (done)
- Phase transitions are separate concern requiring conversation analysis logic
- Current implementation supports manual transitions via transitionArcPhase (from Plan 08-02)
- System is arc-phase-aware; transitions can be added without refactoring

### Validation Criteria Enforcement (Not Implemented)
**Current state:** Validation criteria appear in system prompt during Validate phase. AI evaluates them conversationally.

**What's missing:**
- No programmatic validation (AI's assessment not parsed)
- Step completion doesn't check if validation passed
- User can progress even if criteria not met

**Future implementation (Phase 11+):**
- Structured extraction (Phase 9) could capture AI's validation assessment
- Step completion API could require validation pass before allowing progression
- Client could display validation status in UI

**Why deferred:**
- MVP 1.0 scope: AI-guided validation is sufficient for initial release
- Programmatic enforcement requires structured outputs (Phase 9 dependency)
- Current approach allows flexible, conversational validation

## Next Phase Readiness

**Phase 8 Complete:** This was the final plan of Phase 8 (AI Facilitation Engine).

**Phase 9 Prerequisites (Structured Extraction):**
- ✓ Step-aware prompts established (Plan 08-01)
- ✓ Arc phase tracking in database (Plan 08-02)
- ✓ Chat API wired to step and arc phase context (Plan 08-03)
- ✓ Validation criteria defined per step (Plan 08-01)
- Ready for: Zod schema definitions and AI SDK 6 structured extraction integration

**Gap Analysis:**
No blockers for Phase 9. Structured extraction will extend system prompts with schema instructions and parse AI outputs into validated JSON artifacts.

**Recommended next steps:**
1. Execute Phase 9 (Structured Extraction Engine)
2. Consider gap closure for arc phase transitions (if needed before Phase 11)
3. Consider manual testing of Orient/Validate phase prompts to validate behavior

## Performance Notes

**Execution time:** 2 minutes (normal for integration task)

**System prompt length implications:**
- System prompts now significantly longer (9 information layers)
- Estimated token cost per request: ~800-1500 tokens (depending on context tiers)
- Gemini 2.0 Flash context window: 1M tokens (plenty of headroom)
- Consider: Monitor prompt token usage in production, may need compression if approaching limits

**Database queries per chat request:**
- +1 query: getCurrentArcPhase (workshopSteps lookup)
- Existing: 3 queries from assembleStepContext (Phase 7)
- Total: 4 queries per chat request
- Impact: Minimal (all indexed lookups on small result sets)

## Self-Check: PASSED

**Created files verified:**
- None (modification-only plan)

**Modified files verified:**
- ✓ src/lib/ai/chat-config.ts exists and modified
- ✓ src/app/api/chat/route.ts exists and modified

**Commits verified:**
- ✓ 931de8e exists (Task 1: buildStepSystemPrompt enhancement)
- ✓ f892c6b exists (Task 2: chat API wiring)

---

*Phase 8 (AI Facilitation Engine) complete. All 3 plans executed successfully. Ready for Phase 9 (Structured Extraction Engine).*
