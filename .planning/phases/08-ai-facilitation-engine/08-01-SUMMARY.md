---
phase: 08-ai-facilitation-engine
plan: 01
subsystem: ai
tags: [prompt-engineering, gemini, design-thinking, conversational-ai, validation]

# Dependency graph
requires:
  - phase: 07-context-architecture
    provides: Three-tier context assembly (persistent artifacts, summaries, messages)
provides:
  - Step-specific prompt instructions for all 10 design thinking steps
  - Arc phase behavioral instructions (Orient, Gather, Synthesize, Refine, Validate, Complete)
  - Quality validation criteria per step with specific checkPrompt questions
affects: [08-02-chat-api, 08-03-state-tracking, 09-artifact-schemas]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Step-specific prompt templates with STEP GOAL, DESIGN THINKING PRINCIPLES, GATHERING REQUIREMENTS, PRIOR CONTEXT USAGE"
    - "Arc phase instructions for conversational flow guidance"
    - "Validation criteria with yes/no checkPrompt questions (not generic 'Is this good?')"

key-files:
  created:
    - src/lib/ai/prompts/arc-phases.ts
    - src/lib/ai/prompts/step-prompts.ts
    - src/lib/ai/prompts/validation-criteria.ts
  modified: []

key-decisions:
  - "Step prompts kept self-contained without importing step-metadata.ts to avoid circular dependencies"
  - "Validation criteria use specific checkPrompt questions instead of generic quality assessments"
  - "Prior context usage documented per step to guide AI on which outputs to reference"
  - "Steps grouped by cluster: Discovery (1-4) exploration, Definition (5-7) synthesis with heavy prior context, Ideation/Validation (8-10) creativity grounded in research"

patterns-established:
  - "Pattern: Each step gets STEP GOAL (what it produces), DESIGN THINKING PRINCIPLES (methodology), GATHERING REQUIREMENTS (info to collect), PRIOR CONTEXT USAGE (which prior steps to reference)"
  - "Pattern: Arc phases provide behavioral guidance (Orient welcomes and asks first question, Gather collects info, Synthesize presents draft, Refine iterates, Validate checks quality, Complete congratulates)"
  - "Pattern: Validation criteria have name, description, and checkPrompt (specific yes/no question the AI evaluates)"

# Metrics
duration: 4min
completed: 2026-02-08
---

# Phase 8 Plan 1: Step-Specific Prompts & Validation Criteria Summary

**Created prompt templates for all 10 design thinking steps with 6-phase conversational arc instructions and quality validation criteria**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-08T06:48:55Z
- **Completed:** 2026-02-08T06:52:55Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Step-specific instructions for all 10 design thinking steps with methodology grounding
- Six-phase conversational arc (Orient → Gather → Synthesize → Refine → Validate → Complete) with behavioral guidance per phase
- Quality validation criteria for all 10 steps with 2-4 specific checkPrompt questions each
- Self-contained prompt content layer (no circular dependencies with step-metadata.ts)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create arc phase instructions and step-specific prompt templates** - `3fc1767` (feat)
   - Arc phases: Orient, Gather, Synthesize, Refine, Validate, Complete
   - Step-specific instructions for all 10 steps
   - Each step includes: STEP GOAL, DESIGN THINKING PRINCIPLES, GATHERING REQUIREMENTS, PRIOR CONTEXT USAGE

2. **Task 2: Create validation criteria per step** - `8c30cab` (feat)
   - ValidationCriterion interface: name, description, checkPrompt
   - 2-4 specific criteria per step with yes/no checkPrompt questions
   - All 10 steps covered with quality-specific validation

## Files Created/Modified

- `src/lib/ai/prompts/arc-phases.ts` - Arc phase instructions for conversational flow (Orient → Complete)
- `src/lib/ai/prompts/step-prompts.ts` - Step-specific prompt templates for all 10 design thinking steps
- `src/lib/ai/prompts/validation-criteria.ts` - Quality validation criteria per step with checkPrompt questions

## Decisions Made

- **Step prompts kept self-contained:** No imports from step-metadata.ts to avoid circular dependencies. Step IDs are hardcoded strings matching metadata IDs.
- **Specific checkPrompt questions:** Each validation criterion uses a specific yes/no question the AI can evaluate (e.g., "Does this HMW avoid being a vague vision statement?") rather than generic "Is this good?" prompts.
- **Prior context usage per step:** Each step documents which prior step outputs to reference (e.g., persona step says "Reference Step 4 pains/gains to ground persona traits").
- **Cluster-based instruction depth:** Discovery steps (1-4) focus on exploration, Definition steps (5-7) emphasize synthesis with heavy prior context reference, Ideation/Validation steps (8-10) balance creativity with research grounding.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - straightforward content creation following research patterns from 08-RESEARCH.md.

## Next Phase Readiness

**Ready for Phase 8 Plan 2 (Chat API Integration):**
- Prompt templates ready to inject into system prompts
- Arc phase instructions ready for conversation state tracking
- Validation criteria ready for Validate phase implementation

**Foundation for Phase 9 (Artifact Schemas):**
- Step-specific instructions document what each step produces
- Validation criteria will guide Zod schema requirements

**No blockers.**

## Self-Check: PASSED

All created files verified on disk:
- ✓ src/lib/ai/prompts/arc-phases.ts
- ✓ src/lib/ai/prompts/step-prompts.ts
- ✓ src/lib/ai/prompts/validation-criteria.ts

All commits verified in git log:
- ✓ 3fc1767 (Task 1)
- ✓ 8c30cab (Task 2)

---
*Phase: 08-ai-facilitation-engine*
*Completed: 2026-02-08*
