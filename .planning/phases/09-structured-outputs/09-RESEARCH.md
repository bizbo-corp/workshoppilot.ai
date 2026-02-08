# Phase 9: Structured Outputs - Research

**Researched:** 2026-02-08
**Domain:** Schema-driven extraction of JSON artifacts using Vercel AI SDK 6 + Gemini + Zod
**Confidence:** HIGH

## Summary

Phase 9 implements schema-driven extraction of structured JSON artifacts from conversational AI using Vercel AI SDK 6's streamText with output property, Gemini 2.0 Flash, and Zod validation. Each of the 10 design thinking steps produces a typed artifact (persona, stakeholder map, HMW statement, etc.) extracted from conversation, validated against a Zod schema, and persisted to the database.

The core pattern is: (1) Define step-specific Zod schemas matching workshop outputs, (2) Use streamText with `output: Output.object({ schema })` to extract during conversation, (3) Stream partial updates to UI for transparency, (4) Present final extracted output to user for confirmation before saving, (5) Persist validated artifact to database via existing saveStepArtifact function.

Critical architectural decision: **Extraction happens during conversation, not only at step completion**. This enables the AI to show users "here's what I'm capturing" during the Synthesize arc phase, allowing iterative refinement before final validation. This prevents the "conversation-state divergence" pitfall where users think data is captured but extraction fails later.

**Primary recommendation:** Implement step-specific Zod schemas immediately (all 10 steps), use AI SDK 6's unified streamText approach (not deprecated generateObject), and build extraction UI with user confirmation flow. The database schema (step_artifacts table with JSONB column) is already ready from Phase 7.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vercel AI SDK | 6.x (latest) | Structured output with streamText + output property | Unified API replacing deprecated generateObject, native Zod integration, partial streaming |
| Zod | 3.x (latest) | Schema definition and runtime validation | Type-safe schemas, .describe() for LLM guidance, generates JSON Schema for Gemini |
| Gemini 2.0 Flash | Current | Fast LLM with JSON Schema structured outputs | Gemini added full JSON Schema support (anyOf, $ref) in late 2025, works with Zod out-of-box |
| @ai-sdk/google | Latest | Gemini provider for AI SDK | Official integration, converts Zod to Gemini-compatible JSON Schema |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Markdown | Latest | Render extracted artifacts as formatted Markdown in UI | OUT-04 requirement: structured outputs render as Markdown |
| react-hook-form | Latest (optional) | Manual edit form if extraction fails | Fallback when extraction quality is poor or user wants manual control |

### Already Integrated (from Phase 7)
| Component | Current Use | Phase 9 Extension |
|-----------|-------------|-------------------|
| `src/lib/context/save-artifact.ts` | Save Record<string, unknown> with optimistic locking | Add Zod validation before saving typed artifacts |
| `src/db/schema/step-artifacts.ts` | JSONB artifact column with schemaVersion | Type artifacts with step-specific Zod schemas using .$type<>() |
| `src/lib/context/types.ts` | Generic ArtifactRecord type | Add step-specific artifact types (ChallengeArtifact, PersonaArtifact, etc.) |

**Installation:**
```bash
# All core dependencies already installed in Phase 5 and Phase 7
npm install react-markdown  # Only if not already present for Markdown rendering
```

## Architecture Patterns

### Recommended Project Structure
```
src/lib/schemas/
├── step-schemas.ts          # NEW: Zod schemas for all 10 step artifacts
├── index.ts                 # NEW: Re-export all schemas and types

src/lib/extraction/
├── extract-artifact.ts      # NEW: Core extraction logic using streamText
├── extraction-ui.tsx        # NEW: Confirmation UI component
└── index.ts                 # NEW: Re-export extraction utilities

src/lib/context/
├── save-artifact.ts         # EXISTS: Extend with typed artifact validation
└── types.ts                 # EXISTS: Add step-specific artifact types
```

### Pattern 1: Step-Specific Zod Schemas with LLM Guidance

**What:** Define Zod schemas matching each step's expected output structure with .describe() for AI guidance

**When to use:** Schema definition phase — create all 10 schemas upfront

**Example:**
```typescript
// Source: Zod documentation + Gemini structured output best practices
import { z } from 'zod';

// Challenge Step (Step 1): HMW statement artifact
export const challengeArtifactSchema = z.object({
  problemStatement: z
    .string()
    .describe('Clear description of the core problem users face, not a solution in disguise'),
  targetUser: z
    .string()
    .describe('Specific user or stakeholder group this problem affects'),
  desiredOutcome: z
    .string()
    .describe('Measurable outcome or benefit that would indicate success'),
  hmwStatement: z
    .string()
    .describe('Complete How Might We statement: "How might we [action] for [who] so that [outcome]?"'),
  altitude: z
    .enum(['specific', 'balanced', 'broad'])
    .describe('Scope level: specific (feature-focused), balanced (problem-focused), or broad (vision-level)'),
});

// Persona Step (Step 5): User persona artifact
export const personaArtifactSchema = z.object({
  name: z.string().describe('Persona name (e.g., "Sarah the Product Manager")'),
  age: z.number().min(18).max(100).describe('Age in years'),
  role: z.string().describe('Job title or primary role'),
  location: z.string().describe('Geographic location (city/region)'),
  bio: z
    .string()
    .describe('2-3 sentence background story grounded in Step 4 research findings'),
  quote: z
    .string()
    .describe('One defining sentence in their voice that captures their perspective'),
  goals: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe('Primary and secondary goals (from Step 4 gains)'),
  pains: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe('Key frustrations and pain points (from Step 4 pains)'),
  behaviors: z
    .array(z.string())
    .min(2)
    .describe('Observable behavior patterns relevant to the problem space'),
});

// Stakeholder Mapping Step (Step 2): Stakeholder grid artifact
export const stakeholderArtifactSchema = z.object({
  stakeholders: z.array(
    z.object({
      name: z.string().describe('Stakeholder name or role'),
      category: z
        .enum(['core', 'direct', 'indirect'])
        .describe('Priority level: core (primary user), direct (affected), indirect (peripheral)'),
      power: z
        .enum(['high', 'medium', 'low'])
        .describe('Influence level over the solution'),
      interest: z
        .enum(['high', 'medium', 'low'])
        .describe('Level of interest in the solution'),
      notes: z
        .string()
        .optional()
        .describe('Additional context about this stakeholder'),
    })
  ),
});

// Type inference for TypeScript usage
export type ChallengeArtifact = z.infer<typeof challengeArtifactSchema>;
export type PersonaArtifact = z.infer<typeof personaArtifactSchema>;
export type StakeholderArtifact = z.infer<typeof stakeholderArtifactSchema>;
```

### Pattern 2: Extraction During Conversation (Synthesize Arc Phase)

**What:** Use streamText with output property during Synthesize phase to extract while showing user what's being captured

**When to use:** Triggered when arc phase transitions from Gather → Synthesize

**Example:**
```typescript
// Source: AI SDK 6 streamText with output property
import { streamText, Output } from 'ai';
import { google } from '@ai-sdk/google';
import { challengeArtifactSchema } from '@/lib/schemas/step-schemas';

export async function extractChallengeArtifact(
  conversationHistory: Array<{ role: string; content: string }>,
  onPartialUpdate?: (partial: unknown) => void
) {
  const result = streamText({
    model: google('gemini-2.0-flash'),
    system: `Extract the structured Challenge artifact from the conversation.
Use the user's exact words where possible. If information is missing, use null or empty strings.`,
    messages: conversationHistory,
    output: Output.object({
      schema: challengeArtifactSchema,
    }),
    temperature: 0.1, // Low temperature for extraction accuracy
  });

  // Stream partial updates to UI for transparency
  if (onPartialUpdate) {
    for await (const partialObject of result.partialOutputStream) {
      onPartialUpdate(partialObject);
    }
  }

  // Wait for final validated output
  const finalOutput = await result.object;
  return finalOutput;
}
```

### Pattern 3: User Confirmation UI with Markdown Rendering

**What:** Display extracted artifact to user with "Looks good" / "Edit" confirmation before persisting

**When to use:** After extraction completes, before saving to database (OUT-03 requirement)

**Example:**
```typescript
// Source: Human-in-the-loop workflow patterns
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';

interface ArtifactConfirmationProps {
  artifact: Record<string, unknown>;
  stepName: string;
  onConfirm: (artifact: Record<string, unknown>) => Promise<void>;
  onEdit: () => void;
}

export function ArtifactConfirmation({
  artifact,
  stepName,
  onConfirm,
  onEdit
}: ArtifactConfirmationProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  // Convert artifact to readable Markdown
  const artifactMarkdown = formatArtifactAsMarkdown(artifact, stepName);

  const handleConfirm = async () => {
    setIsConfirming(true);
    await onConfirm(artifact);
    setIsConfirming(false);
  };

  return (
    <div className="border rounded-lg p-4 bg-muted/50">
      <h3 className="font-semibold mb-2">Here's what I captured:</h3>

      {/* Render as formatted Markdown (OUT-04) */}
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown>{artifactMarkdown}</ReactMarkdown>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleConfirm}
          disabled={isConfirming}
          className="btn-primary"
        >
          {isConfirming ? 'Saving...' : 'Looks good'}
        </button>
        <button onClick={onEdit} className="btn-secondary">
          Edit
        </button>
      </div>
    </div>
  );
}

function formatArtifactAsMarkdown(artifact: Record<string, unknown>, stepName: string): string {
  // Convert artifact to Markdown based on step type
  // Example for Challenge:
  return `
## ${stepName} Output

**Problem Statement:**
${artifact.problemStatement}

**How Might We:**
${artifact.hmwStatement}

**Target User:**
${artifact.targetUser}

**Desired Outcome:**
${artifact.desiredOutcome}
  `.trim();
}
```

### Pattern 4: Retry Logic with Schema Repair

**What:** If extraction fails validation, provide error details to AI and retry

**When to use:** When Zod validation fails on extracted artifact (OUT-02 requirement)

**Example:**
```typescript
// Source: Structured output retry patterns + AI SDK error handling
import { z } from 'zod';

export async function extractWithRetry<T extends z.ZodType>(
  schema: T,
  conversationHistory: Array<{ role: string; content: string }>,
  maxRetries: number = 2
): Promise<z.infer<T>> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Build prompt with error context if retrying
      const systemPrompt = attempt === 0
        ? `Extract structured data matching the provided schema.`
        : `Previous extraction failed validation. Errors: ${lastError?.message}
Fix these errors and try again. Pay special attention to required fields and data types.`;

      const result = await streamText({
        model: google('gemini-2.0-flash'),
        system: systemPrompt,
        messages: conversationHistory,
        output: Output.object({ schema }),
        temperature: 0.1,
      });

      const extracted = await result.object;

      // Validate with Zod (should pass since AI SDK validates, but double-check)
      const validated = schema.parse(extracted);
      return validated;

    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        // Final attempt failed — throw error for graceful fallback
        throw new ExtractionError(
          `Failed to extract valid artifact after ${maxRetries + 1} attempts`,
          lastError
        );
      }

      // Continue to next retry
      console.warn(`Extraction attempt ${attempt + 1} failed, retrying...`, error);
    }
  }

  throw new Error('Extraction failed unexpectedly');
}

class ExtractionError extends Error {
  constructor(message: string, public cause: Error) {
    super(message);
    this.name = 'ExtractionError';
  }
}
```

### Pattern 5: Typed Artifact Storage with Schema Versioning

**What:** Store validated artifacts with TypeScript type safety and schema version tracking

**When to use:** After user confirms artifact, before persisting to database

**Example:**
```typescript
// Source: Drizzle JSONB with .$type<>() + existing saveStepArtifact pattern
import { saveStepArtifact } from '@/lib/context/save-artifact';
import { challengeArtifactSchema, type ChallengeArtifact } from '@/lib/schemas/step-schemas';

export async function saveValidatedArtifact(
  workshopStepId: string,
  stepId: string,
  artifact: Record<string, unknown>
) {
  // Determine schema based on stepId
  const schema = getSchemaForStep(stepId);

  // Validate against step-specific schema
  const validated = schema.parse(artifact);

  // Save with schema version for future evolution
  await saveStepArtifact(
    workshopStepId,
    stepId,
    validated,
    '1.0' // Schema version enables migration when schemas change
  );
}

function getSchemaForStep(stepId: string): z.ZodType {
  const schemaMap: Record<string, z.ZodType> = {
    'challenge': challengeArtifactSchema,
    'stakeholder-mapping': stakeholderArtifactSchema,
    'persona': personaArtifactSchema,
    // ... other steps
  };

  return schemaMap[stepId] || z.object({});
}
```

### Anti-Patterns to Avoid

**Anti-Pattern: Extraction Only at Step Completion**
- **What:** Wait until user clicks "Complete Step" to extract artifact
- **Why it fails:** User has no visibility into what was captured, can't refine during conversation, extraction failures block progression
- **Do instead:** Extract during Synthesize arc phase, show draft to user, allow refinement in Refine phase

**Anti-Pattern: Using Deprecated generateObject**
- **What:** Use standalone generateObject function for extraction
- **Why it fails:** Deprecated in AI SDK 6, will be removed in future versions, no tool calling integration
- **Do instead:** Use streamText with output property for unified, future-proof API

**Anti-Pattern: Overly Strict Schemas**
- **What:** Make all fields required, use narrow types, no flexibility
- **Why it fails:** Extraction fails when conversation doesn't cover all fields, frustrates users who want to skip optional details
- **Do instead:** Mark secondary fields as optional, use reasonable defaults, validate core fields only

**Anti-Pattern: No User Confirmation**
- **What:** Auto-save extracted artifact without showing user
- **Why it fails:** AI misinterprets conversation, user doesn't realize data is wrong until later, trust erodes
- **Do instead:** Always show extracted output with "Looks good" confirmation (OUT-03 requirement)

**Anti-Pattern: Silent Extraction Failures**
- **What:** Extraction fails validation, no fallback, step blocks
- **Why it fails:** Users stuck with no recourse, support burden increases
- **Do instead:** Provide manual edit form as graceful fallback (OUT-02 requirement: retry logic)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON Schema generation from Zod | Manual JSON Schema objects | Zod native support in AI SDK 6 + @ai-sdk/google | AI SDK auto-converts Zod to Gemini-compatible JSON Schema, handles edge cases (anyOf, $ref) |
| Partial streaming UI updates | Custom SSE parser for incremental JSON | AI SDK partialOutputStream | Handles incomplete JSON, provides type-safe partial objects, streams validated chunks |
| Artifact Markdown rendering | Template literals or custom formatters | react-markdown with custom components | Handles edge cases (escaping, nested formatting), extensible with React components |
| Schema validation error messages | JSON.parse try/catch with generic errors | Zod .parse() with detailed error paths | Provides field-level error paths ("hmwStatement is required"), actionable for retry prompts |
| Retry logic with exponential backoff | Custom setTimeout loops | AI SDK built-in error handling + simple retry wrapper | AI SDK handles stream errors, custom wrapper adds schema-specific retry with error context |
| Type-safe artifact access | Runtime type assertions with any casts | Zod .parse() + TypeScript type inference | Compile-time safety + runtime validation, prevents type errors in downstream code |

**Key insight:** Structured outputs are a solved problem in 2026. AI SDK 6 + Gemini + Zod integration handles 90% of complexity (schema conversion, streaming, validation). The remaining 10% is domain-specific (step schemas, confirmation UI, retry prompts). Don't rebuild what's already standardized.

## Common Pitfalls

### Pitfall 1: Conversation-State Divergence

**What goes wrong:** AI says "I've captured your persona" in conversation, user continues to next step, clicks "View Persona" in sidebar — UI shows empty or incomplete data. Database has no artifact, or artifact is missing fields discussed.

**Why it happens:**
- Extraction runs asynchronously after conversation, timing mismatch
- AI responds optimistically before extraction completes
- Extraction fails validation but conversation succeeded
- No user confirmation step — user assumes AI success means data saved

**How to avoid:**
- Never let AI claim "captured" or "saved" — use tentative language: "Here's what I'm hearing..."
- Extract during Synthesize phase and show draft to user in UI
- Make confirmation explicit: show artifact + "Looks good?" button
- Don't transition to next step until artifact is confirmed AND saved
- Show both conversation history and structured output in UI (dual views)

**Warning signs:**
- Users reporting "AI said it saved but I don't see anything"
- Discrepancy between conversation content and artifact field counts
- Step navigation showing "incomplete" status after user thinks they finished
- Support tickets: "Where did my persona go?"

### Pitfall 2: Extraction Reliability Failures

**What goes wrong:** Extraction produces incomplete JSON (missing required fields), incorrect types (string instead of number), or malformed data (HMW statement is just "How might we?"). Zod validation fails, retry logic exhausted, user stuck.

**Why it happens:**
- Conversation is ambiguous about field values (never explicitly stated stakeholder "power")
- Schema too strict (requires 5 goals but user only mentioned 2)
- AI hallucination during extraction (invents data not in conversation)
- Temperature too high for extraction (randomness introduces errors)
- Gemini JSON Schema edge case (nested arrays with refs not fully supported)

**How to avoid:**
- Use temperature 0.0-0.2 for extraction (not main conversation temp)
- Mark secondary fields as optional in schema
- Use .describe() extensively to guide AI field interpretation
- Implement retry with error context: "Field 'power' is required. Check the conversation for influence level."
- Provide manual edit form as fallback when retries fail
- Test extraction with varied conversation styles (terse, verbose, ambiguous)

**Warning signs:**
- Zod validation errors in logs showing missing required fields
- Users reporting "it keeps asking me the same questions"
- Extraction succeeds but data quality is poor (generic values, repeated text)
- High retry rates (>20% of extractions require retry)

### Pitfall 3: Schema Evolution Breaking Old Workshops

**What goes wrong:** Phase 13 adds new required field to PersonaArtifact schema. Old workshops (created in Phase 9-12) have personas without this field. User revisits old workshop — app crashes trying to parse artifact, or new field shows as undefined breaking UI.

**Why it happens:**
- Schema versioning not enforced (all artifacts use "1.0" forever)
- No migration strategy when schemas change
- Runtime assumes current schema version for all artifacts
- TypeScript types don't match database reality for old data

**How to avoid:**
- Use schemaVersion column (already in step_artifacts table from Phase 7)
- Implement version-aware parsers: if version 1.0, use v1 schema; if 2.0, use v2 schema
- When schema changes, increment version and add migration logic
- Use Zod .passthrough() for old data to preserve unknown fields
- Provide schema upgrade path: old artifact + migration function → new artifact

**Warning signs:**
- Zod validation errors when loading old workshops
- Users reporting "my old persona is broken"
- Type errors in UI components rendering artifacts
- Database query returns data but parsing fails

### Pitfall 4: Overly Complex Schemas Breaking Extraction

**What goes wrong:** Define deeply nested schema with 15 fields, 3 levels of nesting, conditional logic. Extraction fails frequently, AI gets confused, users never get clean artifacts.

**Why it happens:**
- Schema complexity exceeds AI's reliable extraction capability
- Gemini JSON Schema subset doesn't support all Zod features (conditional, discriminated unions)
- Too many required fields creates fragile extraction (one missing field fails entire artifact)
- Deeply nested objects hard for AI to populate consistently

**How to avoid:**
- Keep schemas flat when possible (2 levels max nesting)
- Limit required fields to core essentials (3-5 fields)
- Use optional for secondary data
- Split complex artifacts into multiple smaller schemas if needed
- Test schema with AI before deploying: does extraction succeed 95%+ of time?
- Prefer arrays of simple objects over deeply nested structures

**Warning signs:**
- Extraction success rate <80%
- Retry logic frequently exhausted
- Users reporting "it never gets it right"
- Validation errors always on same complex nested field

### Pitfall 5: No Graceful Fallback for Extraction Failures

**What goes wrong:** Retry logic exhausted after 3 attempts. UI shows error message: "Extraction failed". User stuck — can't save manually, can't skip step, can't progress. Workshop abandonment.

**Why it happens:**
- No manual edit form as fallback (OUT-02 says "retry logic" but also needs human escape hatch)
- All-or-nothing approach: either AI extracts perfectly or failure
- No partial save option (save what was extracted, mark missing fields)
- UI doesn't provide actionable next step

**How to avoid:**
- Provide manual edit form when extraction fails: pre-populate with partial data, let user fill gaps
- Allow user to skip extraction and continue (mark step as "draft" needing review)
- Show extraction attempts and errors transparently: "AI tried 3 times but couldn't capture [field]. Want to enter it manually?"
- Track extraction failures to identify problematic steps/schemas
- Consider hybrid approach: AI suggests, user edits before confirming

**Warning signs:**
- High workshop abandonment at specific steps
- Support tickets asking "how do I fix extraction errors?"
- Users repeatedly starting new workshops instead of fixing broken ones
- Error logs showing repeated extraction failures on same step

## Code Examples

Verified patterns from official sources:

### Gemini Structured Output with AI SDK 6
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
import { streamText, Output } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const recipeSchema = z.object({
  recipe: z.object({
    name: z.string(),
    ingredients: z.array(
      z.object({
        name: z.string(),
        amount: z.string(),
      })
    ),
    steps: z.array(z.string()),
  }),
});

const result = streamText({
  model: google('gemini-2.0-flash'),
  prompt: 'Generate a lasagna recipe.',
  output: Output.object({
    schema: recipeSchema,
  }),
});

// Stream partial updates
for await (const partialObject of result.partialOutputStream) {
  console.log('Partial:', partialObject);
}

// Get final validated output
const finalRecipe = await result.object;
```

### Zod Schema with Descriptions for AI Guidance
```typescript
// Source: https://zod.dev/api + Gemini structured output best practices
import { z } from 'zod';

export const personaSchema = z.object({
  name: z
    .string()
    .describe('Persona name (e.g., "Sarah the Product Manager")'),
  age: z
    .number()
    .min(18)
    .max(100)
    .describe('Age in years'),
  role: z
    .string()
    .describe('Job title or primary role'),
  bio: z
    .string()
    .describe('2-3 sentence background story grounded in research findings'),
  goals: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe('Primary and secondary goals'),
  pains: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe('Key frustrations and pain points'),
  behaviors: z
    .array(z.string())
    .optional()
    .describe('Observable behavior patterns (optional)'),
});

export type Persona = z.infer<typeof personaSchema>;
```

### Error Handling with onFinish Callback
```typescript
// Source: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text
import { streamText, Output } from 'ai';

const result = streamText({
  model: google('gemini-2.0-flash'),
  output: Output.object({ schema: mySchema }),
  messages: conversationHistory,
  onFinish: async ({ object, finishReason, totalUsage }) => {
    console.log('Extraction complete:', object);
    console.log('Tokens used:', totalUsage);

    if (finishReason === 'stop') {
      // Successful extraction
      await saveArtifact(object);
    } else {
      // Handle non-standard completion
      console.warn('Extraction incomplete:', finishReason);
    }
  },
  onError: ({ error }) => {
    console.error('Streaming error:', error);
  },
});
```

### Type-Safe Artifact Storage with Drizzle
```typescript
// Source: Existing codebase src/lib/context/save-artifact.ts + Drizzle JSONB docs
import { db } from '@/db/client';
import { stepArtifacts } from '@/db/schema';
import { personaSchema, type Persona } from '@/lib/schemas/step-schemas';

export async function savePersonaArtifact(
  workshopStepId: string,
  artifact: unknown
) {
  // Runtime validation with Zod
  const validatedPersona = personaSchema.parse(artifact);

  // TypeScript knows validatedPersona is Persona type
  await db.insert(stepArtifacts).values({
    workshopStepId,
    stepId: 'persona',
    artifact: validatedPersona, // Type-safe: Persona matches .$type<Persona>()
    schemaVersion: '1.0',
    version: 1,
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| generateObject / streamObject | streamText with output property | AI SDK 6 (2025) | Unified API, tool calling + structured output in same request |
| Manual JSON Schema writing | Zod schemas auto-converted to JSON Schema | AI SDK 5-6 (2024-2025) | Type safety, less boilerplate, automatic Gemini compatibility |
| Post-conversation extraction | Inline extraction during Synthesize phase | Conversational AI patterns (2025-2026) | User sees what's captured, can refine, prevents divergence |
| Silent save on completion | User confirmation with preview | Human-in-the-loop patterns (2026) | Trust, transparency, error recovery |
| Generic "extraction failed" errors | Schema-aware retry with error context | Structured output maturity (2025-2026) | Higher success rates, actionable feedback |
| Single schema version forever | Schema versioning with migration | Production best practices (2026) | Backward compatibility, schema evolution without breaking old data |

**Deprecated/outdated:**
- **generateObject() and streamObject()**: Explicitly deprecated in AI SDK 6, use streamText with output property
- **zod-to-json-schema library**: Use Zod v4 native .toJSONSchema() method instead (fixes Gemini compatibility issues)
- **Extraction without temperature control**: Use low temperature (0.0-0.2) for extraction, separate from conversation temperature
- **Implicit extraction**: 2026 best practice is explicit user confirmation before saving

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal Extraction Timing**
   - What we know: Can extract during Synthesize phase or at step completion
   - What's unclear: Should extraction trigger automatically when AI detects "gathering complete" or require explicit user action ("Show me what you captured" button)?
   - Recommendation: Start with automatic during Synthesize phase (arc transition), monitor user feedback for confusion, add manual trigger if needed

2. **Partial Artifact Persistence**
   - What we know: Users may want to save progress mid-step (auto-save)
   - What's unclear: Should partial/incomplete artifacts be saved (violates schema), or only save when validation passes?
   - Recommendation: Only save validated artifacts to step_artifacts table, use separate draft storage (chatMessages metadata) for partial progress

3. **Schema Complexity Limits**
   - What we know: Very complex schemas reduce extraction reliability
   - What's unclear: Exact threshold (how many fields, nesting levels) before reliability degrades
   - Recommendation: Keep schemas <10 top-level fields, <3 nesting levels. Test each schema with AI before deploying, target 95% extraction success rate.

4. **Manual Edit Form Design**
   - What we know: Need fallback when extraction fails
   - What's unclear: Should form be pre-populated with failed extraction attempt (risky if data is wrong) or blank slate?
   - Recommendation: Show failed extraction as "AI's best guess" with clear warning, let user edit or start fresh. Track which fields failed validation to highlight them.

5. **Multi-Concept Artifacts**
   - What we know: Step 9 (Concept Development) may generate multiple concepts, not just one
   - What's unclear: Should schema support array of concepts, or one artifact per concept with multiple saves?
   - Recommendation: Start with one-artifact-per-step constraint (matches unique constraint in database), Phase 11-13 can extend to multiple artifacts if needed

## Sources

### Primary (HIGH confidence)
- [AI SDK Core: Generating Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) - streamText with output property, partial streaming
- [AI SDK Core: streamText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) - onFinish callback, error handling, output types
- [Gemini API Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output) - JSON Schema support, responseMimeType, limitations
- [Zod API Documentation](https://zod.dev/api) - Schema definition, optional fields, type inference
- [AI SDK 6 Migration Guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0) - generateObject deprecation, Output API
- [Google Blog: Gemini API Structured Outputs](https://blog.google/technology/developers/gemini-api-structured-outputs/) - JSON Schema support announcement (late 2025)

### Secondary (MEDIUM confidence)
- [Structured Outputs: Schema-Validated Data Extraction](https://mbrenndoerfer.com/writing/structured-outputs-schema-validated-data-extraction-language-models) - Retry logic, validation patterns
- [Why Your Zod Schemas Break With Gemini](https://heyhuy.com/blog/gemini-structured-mode/) - Zod v4 compatibility
- [Human-in-the-Loop AI Workflows](https://addyosmani.com/blog/ai-coding-workflow/) - Confirmation patterns, review gates
- [Confirmation Dialog UX Best Practices](https://blog.logrocket.com/ux-design/double-check-user-actions-confirmation-dialog/) - When to use confirmations, button design
- [Zod Schema Validation with Optional Fields](https://joodi.medium.com/understanding-zod-schema-validation-with-optional-fields-db4f982f8cec) - Optional vs required field patterns

### Tertiary (LOW confidence)
- Design thinking workshop artifact examples from search results - Used to inform schema field names, not authoritative for schema structure

### Internal Project Sources
- `.planning/phases/07-context-architecture/07-RESEARCH.md` - step_artifacts table schema, JSONB storage, optimistic locking (HIGH confidence)
- `.planning/phases/08-ai-facilitation-engine/08-RESEARCH.md` - Arc phase patterns, Synthesize timing (HIGH confidence)
- `src/lib/context/save-artifact.ts` - Existing artifact persistence with version control (HIGH confidence)
- `src/lib/workshop/step-metadata.ts` - Step definitions, mockOutputContent structure (HIGH confidence)
- `src/app/api/chat/route.ts` - Current chat implementation, streamText usage (HIGH confidence)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - AI SDK 6 + Gemini + Zod integration is well-documented and mature
- Architecture patterns: HIGH - streamText with output property is official AI SDK 6 approach, Zod patterns are standard
- Extraction timing: MEDIUM - During-conversation extraction is emerging best practice but not universally standardized
- Schema design: HIGH - Zod patterns and Gemini JSON Schema limitations are documented
- Retry logic: MEDIUM - General pattern established, step-specific tuning requires testing
- Confirmation UX: MEDIUM - Human-in-the-loop patterns established, specific UI design requires user testing

**Research date:** 2026-02-08
**Valid until:** ~45 days (2026-03-25) — AI SDK 6 is stable (released 2025), Gemini structured outputs are mature (added late 2025), but best practices for extraction UX are still evolving
