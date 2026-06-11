---
phase: 09-structured-outputs
plan: 01
subsystem: type-system
tags: [zod, schemas, types, validation, structured-outputs]
requires:
  - 07-context-architecture (persistent memory layer with JSONB storage)
  - 08-ai-facilitation-engine (step prompts that will extract artifacts)
provides:
  - Zod schemas for all 10 step artifact types
  - TypeScript types inferred from schemas
  - Schema lookup utilities (stepSchemaMap, getSchemaForStep)
  - Step-specific type system (StepArtifactMap, AnyStepArtifact)
affects:
  - 09-02 (extraction logic will use these schemas)
  - 09-03 (UI rendering will use typed artifacts)
  - 10-auto-save (will use typed artifacts for validation)
tech-stack:
  added:
    - Zod v4.3.6 (already installed, now actively used)
  patterns:
    - Schema-first design with .describe() for LLM guidance
    - Type inference from Zod schemas
    - Flat schema structure (max 2 levels nesting)
    - Optional secondary fields to prevent extraction failures
key-files:
  created:
    - src/lib/schemas/step-schemas.ts (10 Zod schemas + 10 inferred types)
    - src/lib/schemas/index.ts (re-exports + stepSchemaMap + getSchemaForStep)
  modified:
    - src/lib/context/types.ts (added StepArtifactMap, AnyStepArtifact)
decisions:
  - schema-descriptions:
      what: Use .describe() on every field for LLM extraction guidance
      why: AI SDK 6 uses schema descriptions to guide extraction, improving accuracy
      impact: Each field has clear guidance for what to extract
  - flat-structure:
      what: Keep schemas flat (max 2 levels nesting), 3-7 required fields
      why: Research shows flat structures extract more reliably than deep nesting
      impact: All schemas follow consistent flat pattern
  - optional-secondary:
      what: Mark secondary/nice-to-have fields as .optional()
      why: Prevents extraction failures when LLM can't find optional data
      impact: Only core essentials are required, flexibility for edge cases
  - stepSchemaMap:
      what: Create Record<string, z.ZodType> mapping step IDs to schemas
      why: Enables dynamic schema lookup for extraction engine
      impact: Extraction can get schema by step ID without hardcoded conditionals
  - backward-compatible-types:
      what: Keep ArtifactRecord as deprecated, add new StepArtifactMap
      why: Existing code (save-artifact.ts) uses ArtifactRecord
      impact: No breaking changes, new code can use typed versions
metrics:
  duration: 148s (2.5 min)
  completed: 2026-02-08
---

# Phase 9 Plan 1: Schema Definition Summary

**One-liner:** Zod schemas with .describe() for all 10 steps enable type-safe, LLM-guided artifact extraction

## What Was Built

Created the foundational type system for structured artifact extraction across all 10 design thinking steps.

### 1. Step Artifact Schemas (src/lib/schemas/step-schemas.ts)

Defined 10 Zod schemas mapping to the 10 workshop steps:

1. **challengeArtifactSchema**: Problem statement, target user, desired outcome, HMW statement, altitude
2. **stakeholderArtifactSchema**: Stakeholders array with name, category, power, interest, notes
3. **userResearchArtifactSchema**: Interview questions, insights with findings/quotes
4. **senseMakingArtifactSchema**: Themes with evidence, top 5 pains, top 5 gains
5. **personaArtifactSchema**: Name, age, role, bio, quote, goals, pains, behaviors
6. **journeyMappingArtifactSchema**: Persona name, stages (actions/thoughts/emotions), dip summary
7. **reframeArtifactSchema**: Original HMW, insights applied, refined HMW, evolution
8. **ideationArtifactSchema**: HMW prompt, ideas array, top ideas selection
9. **conceptArtifactSchema**: Name, elevator pitch, SWOT analysis, feasibility assessment
10. **validateArtifactSchema**: User flow, PRD outline with features/stories/metrics

**Key characteristics:**
- Every field uses `.describe()` with clear LLM extraction guidance
- Flat structure (max 2 levels: object → nested object for SWOT, PRD outline only)
- 3-7 required fields per schema (core essentials only)
- Secondary fields marked `.optional()` to prevent extraction failures
- TypeScript types inferred via `z.infer<typeof schema>`

### 2. Schema Exports & Utilities (src/lib/schemas/index.ts)

- Re-exports all 10 schemas and types
- `stepSchemaMap`: Record mapping step IDs to Zod schemas
- `getSchemaForStep(stepId)`: Lookup function for dynamic schema access

### 3. Updated Context Types (src/lib/context/types.ts)

- `StepArtifactMap`: Maps step IDs to typed artifacts
- `AnyStepArtifact`: Union of all artifact types
- `ArtifactRecord`: Preserved as deprecated for backward compatibility

## Task Commits

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create Zod schemas for all 10 step artifacts | 6b6a086 | step-schemas.ts, index.ts |
| 2 | Update context types with step-specific artifact types | 48cade9 | types.ts |

## Deviations from Plan

None - plan executed exactly as written.

## Key Technical Details

### Schema Design Philosophy

**LLM-Friendly Descriptions:**
Every field includes a `.describe()` with specific guidance for what to extract. Example:
```typescript
hmwStatement: z.string().describe(
  'Complete How Might We statement: How might we [action] for [who] so that [outcome]?'
)
```

**Flat Over Deep:**
Nested objects limited to 2 levels max. Journey stages are a flat array of objects, not nested sub-stages.

**Required vs Optional Strategy:**
- Required: Core fields that define the artifact (e.g., persona.name, persona.role, persona.bio)
- Optional: Secondary enrichment (e.g., persona.age, persona.location, persona.behaviors)

This prevents extraction failures when the LLM can't confidently extract optional details.

### Type System Integration

**Type Inference:**
```typescript
export type ChallengeArtifact = z.infer<typeof challengeArtifactSchema>;
```

All types are inferred from schemas, ensuring single source of truth.

**Dynamic Lookup:**
```typescript
const schema = getSchemaForStep('challenge');
if (schema) {
  const result = schema.parse(data); // Type-safe parsing
}
```

**Step-Specific Typing:**
```typescript
type StepArtifactMap = {
  'challenge': ChallengeArtifact;
  'stakeholder-mapping': StakeholderArtifact;
  // ... 8 more
};
```

Enables type-safe artifact handling per step without type assertions.

## Dependencies

**Requires (from previous phases):**
- Phase 7: JSONB storage for artifacts (step_artifacts table)
- Phase 8: Step prompts that will extract these artifacts

**Provides (for future phases):**
- OUT-01 foundation: Schema-driven extraction
- OUT-02 foundation: Type-safe validation
- OUT-03 foundation: Structured artifact rendering

**Affects (future plans):**
- Plan 09-02: Extraction engine will use `getSchemaForStep()` + AI SDK 6
- Plan 09-03: UI components will use typed artifacts for rendering
- Phase 10: Auto-save will validate artifacts against schemas before storage

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Ready for 09-02:** Yes
- All 10 schemas defined and tested
- Schema lookup utilities functional
- Type system integrated with existing context types
- No breaking changes to existing code

## Self-Check: PASSED

**Files created:**
- ✓ src/lib/schemas/step-schemas.ts (exists, 479 lines)
- ✓ src/lib/schemas/index.ts (exists, 86 lines)

**Files modified:**
- ✓ src/lib/context/types.ts (exists, updated)

**Commits:**
- ✓ 6b6a086 (Task 1: Create Zod schemas)
- ✓ 48cade9 (Task 2: Update context types)

**Verification:**
- ✓ `npx tsc --noEmit` passes with zero errors
- ✓ 10 schema objects exported
- ✓ 10 type aliases exported
- ✓ stepSchemaMap has 10 entries
- ✓ getSchemaForStep function exists
- ✓ StepArtifactMap and AnyStepArtifact exported
