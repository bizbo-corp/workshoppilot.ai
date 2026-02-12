---
phase: 29-visual-concept-cards
plan: 03
subsystem: ai-integration
tags: [ai, gemini, concept-generation, context-loading, evidence-based]
dependency_graph:
  requires: [gemini-retry, step-prompts, db-schema, concept-card-types]
  provides: [concept-generation-endpoint, concept-generation-prompt]
  affects: [step-9-integration, concept-card-creation-flow]
tech_stack:
  added: [concept-generation-prompt, workshop-context-queries]
  patterns: [multi-step-context-loading, placeholder-token-replacement, structured-json-output]
key_files:
  created:
    - src/app/api/ai/generate-concept/route.ts
  modified:
    - src/lib/ai/prompts/step-prompts.ts
decisions:
  - "Query sense-making (not empathize) for persona data based on artifact schema alignment"
  - "Extract persona goals/pains from arrays with .join('; ') for natural language context"
  - "Temperature 0.5 (lower than sketch prompts 0.7) for consistent structured output"
  - "Validate required concept fields before returning (conceptName, elevatorPitch, swot, feasibility)"
  - "Global regex replacements (/g) for placeholder tokens since some appear multiple times in prompt"
metrics:
  duration: 142s
  tasks: 2
  commits: 2
  files_created: 1
  files_modified: 1
  lines_added: ~345
  completed: 2026-02-12
---

# Phase 29 Plan 03: AI Concept Generation Endpoint

**One-liner:** POST /api/ai/generate-concept endpoint queries workshop context from 4 prior steps (define, sense-making, challenge, stakeholder-mapping), generates structured concept card JSON via Gemini using evidence-based prompt template.

## Overview

Created the AI concept generation API endpoint that transforms selected Crazy 8s sketches into complete concept cards with evidence-based SWOT analysis, feasibility scores, and billboard hero pitch test. The endpoint loads workshop context from multiple prior steps to ground AI-generated concepts in actual research data.

This is the "AI pre-fills concept card fields" requirement (CONCEPT-07) that enables rapid concept development from visual sketches.

## Tasks Completed

### Task 1: Create concept generation prompt template
**Commit:** `379f05a`
**Duration:** ~70s
**Files:** `src/lib/ai/prompts/step-prompts.ts`

Added `CONCEPT_GENERATION_PROMPT` exported constant with:
- **Placeholder tokens:** `{personaName}`, `{personaGoals}`, `{personaPains}`, `{hmwStatement}`, `{crazy8sTitle}`, `{slotId}`, `{keyInsights}`, `{stakeholderChallenges}`
- **Workshop context section:** Persona goals/pains, HMW statement, sketch title, research insights, stakeholder challenges
- **Structured JSON output spec:** Matches ConceptCardData shape with conceptName, elevatorPitch, usp, swot (3x4), feasibility (score+rationale x3), billboardHero
- **Evidence requirements:**
  - SWOT strengths MUST reference persona goals
  - SWOT weaknesses MUST reference persona pains
  - SWOT opportunities MUST reference research insights
  - SWOT threats MUST reference stakeholder challenges
  - Feasibility rationales MUST cite workshop data (not generic reasoning)
  - Each SWOT quadrant MUST have EXACTLY 3 items
  - Scores should be realistic (avoid default 4s/5s)
- **Output format constraint:** "Output ONLY valid JSON. No markdown, no code blocks, no explanation."

Placed after `getStepSpecificInstructions()` function at end of file (line 701).

### Task 2: Create AI concept generation API endpoint
**Commit:** `007f028`
**Duration:** ~72s
**Files:** `src/app/api/ai/generate-concept/route.ts`

Implemented POST endpoint following suggest-sketch-prompts pattern:

**Request validation:**
- Validates `workshopId`, `slotId`, `crazy8sTitle` required fields
- Returns 400 if missing
- Verifies workshop exists (404 if not found)

**Workshop context loading (4 queries):**

1. **Step 3 (define):** Extracts `hmwStatement` from artifact
   ```typescript
   eq(workshopSteps.stepId, 'define')
   artifact?.hmwStatement
   ```

2. **Step 4 (sense-making):** Extracts persona data
   ```typescript
   eq(workshopSteps.stepId, 'sense-making')
   artifact?.persona.name
   artifact?.persona.goals (array → join with '; ')
   artifact?.persona.pains (array → join with '; ')
   ```

3. **Step 1 (challenge):** Extracts research insights
   ```typescript
   eq(workshopSteps.stepId, 'challenge')
   artifact?.insights (array → join with '; ')
   ```

4. **Step 2 (stakeholder-mapping):** Extracts stakeholder challenges
   ```typescript
   eq(workshopSteps.stepId, 'stakeholder-mapping')
   artifact?.stakeholders (map to notes → join with '; ')
   ```

**Prompt building:**
- Imports `CONCEPT_GENERATION_PROMPT` from step-prompts
- Uses global regex replacements (`/g`) for all 8 placeholder tokens
- Provides fallback values: "Unknown", "Not specified", "No research insights available", "No stakeholder data available"

**AI generation:**
- Calls `generateTextWithRetry` with `google('gemini-2.0-flash')`
- Temperature 0.5 (lower than sketch prompts 0.7 for consistent structured output)
- Cleans markdown code blocks if present
- Parses JSON response

**Validation:**
- Checks required fields exist: `conceptName`, `elevatorPitch`, `swot`, `feasibility`
- Returns 500 with error if validation fails

**Error handling:**
- Parse error: Returns 500 with "Failed to parse AI response"
- AI error: Returns 500 with "Failed to generate concept"
- Top-level error: Returns 500 with error message

**Response format:**
```typescript
{ concept: { /* ConceptCardData fields */ } }
```

**Configuration:**
- `export const maxDuration = 30;` (same as sketch prompts for AI timeout)

## Verification Results

✅ TypeScript compilation passes with zero errors
✅ Production build succeeds
✅ CONCEPT_GENERATION_PROMPT exported from step-prompts.ts (line 701)
✅ /api/ai/generate-concept/route.ts exports POST and maxDuration
✅ Route queries all 4 steps:
  - `define` (line 63)
  - `sense-making` (line 95)
  - `challenge` (line 141)
  - `stakeholder-mapping` (line 177)
✅ Prompt includes evidence requirements for SWOT and feasibility
✅ Response structure matches ConceptCardData fields
✅ Route appears in Next.js build output

## Deviations from Plan

None - plan executed exactly as written.

## Key Technical Details

**Step ID alignment:**
Plan specified querying "Step 4 (empathize / sense-making)" for persona data. The actual step ID is `'sense-making'` (not `'empathize'`), which is correct based on the artifact schemas.

**Context extraction pattern:**
```typescript
// HMW: Direct string
hmwStatement = (artifact?.hmwStatement as string) || '';

// Persona goals: Array → string
const goals = persona?.goals as string[] | undefined;
if (goals && Array.isArray(goals)) {
  personaGoals = goals.join('; ');
}

// Insights: Array → string
const insights = artifact?.insights as string[] | undefined;
if (insights && Array.isArray(insights)) {
  keyInsights = insights.join('; ');
}

// Stakeholder challenges: Extract from notes field
const stakeholders = artifact?.stakeholders as Array<Record<string, unknown>>;
const challenges = stakeholders.map((s) => s?.notes as string).filter((n) => n && n.length > 0);
stakeholderChallenges = challenges.join('; ');
```

**Prompt token replacement:**
```typescript
const prompt = CONCEPT_GENERATION_PROMPT
  .replace(/{personaName}/g, personaName || 'Unknown')
  .replace(/{personaGoals}/g, personaGoals || 'Not specified')
  // ... 6 more tokens
```

Global regex (`/g`) ensures all occurrences replaced (tokens appear in both context section and evidence requirements).

**JSON cleaning:**
```typescript
let cleanedText = result.text.trim();
if (cleanedText.startsWith('```')) {
  cleanedText = cleanedText
    .replace(/```json?\n?/g, '')
    .replace(/```\n?/g, '');
}
const concept = JSON.parse(cleanedText);
```

Handles Gemini sometimes returning markdown-wrapped JSON despite prompt instruction.

## Impact

This plan completes the AI generation layer for Phase 29. The endpoint:

1. **Bridges Crazy 8s sketches → Concept Cards:** Takes sketch title + workshop context, returns complete structured concept
2. **Evidence-based generation:** AI must cite actual workshop data (persona pains/goals, research insights, stakeholder challenges) in SWOT/feasibility
3. **Quality constraints:** Enforces exactly 3 items per SWOT quadrant, realistic scores, specific rationales

Next plans will:
- Integrate this endpoint into Step 9 canvas UI (29-04)
- Wire up "Generate from sketch" button on ConceptCardNode
- Handle loading states and error fallback in client

## Self-Check

Verified all claims:

✅ **Files created:**
```bash
[ -f "src/app/api/ai/generate-concept/route.ts" ] && echo "FOUND: route.ts"
```
Output: `FOUND: route.ts`

✅ **Files modified:**
```bash
git diff 379f05a~1 379f05a --stat | grep step-prompts
```
Output: `src/lib/ai/prompts/step-prompts.ts | 66 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++`

✅ **Commits exist:**
```bash
git log --oneline --all | grep -E "(379f05a|007f028)"
```
Output:
```
007f028 feat(29-03): create AI concept generation API endpoint
379f05a feat(29-03): add concept generation prompt template
```

✅ **Prompt exported:**
```bash
grep "export const CONCEPT_GENERATION_PROMPT" src/lib/ai/prompts/step-prompts.ts
```
Output: `export const CONCEPT_GENERATION_PROMPT = ...`

✅ **Route exports:**
```bash
grep -E "export (const maxDuration|async function POST)" src/app/api/ai/generate-concept/route.ts
```
Output:
```
export const maxDuration = 30;
export async function POST(req: Request) {
```

✅ **Context queries verified:**
```bash
grep "workshopSteps.stepId" src/app/api/ai/generate-concept/route.ts | grep -E "(define|sense-making|challenge|stakeholder-mapping)"
```
Output: All 4 step IDs found

## Self-Check: PASSED

All files created, commits exist, exports verified, context queries correct, TypeScript compiles, build succeeds.

---

*Completed: 2026-02-12 | Duration: 142s | Commits: 379f05a, 007f028*
