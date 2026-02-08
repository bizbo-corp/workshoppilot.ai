# Phase 7: Context Architecture - Research

**Researched:** 2026-02-08
**Domain:** Hierarchical context compression for multi-step AI facilitation
**Confidence:** HIGH

## Summary

Context Architecture implements a dual-layer system preventing "context degradation syndrome" — the documented phenomenon where AI quality drops 13.9%-85% as conversation history grows beyond 50-70 messages across a 10-step workshop. The standard approach uses three-tier hierarchical compression: (1) short-term memory keeps current step verbatim, (2) long-term memory stores previous step summaries, (3) persistent memory maintains all structured JSON outputs. This pattern is proven effective for multi-step AI agents and chatbots, achieving 50-80% token reduction while preserving response quality.

The technical stack combines Vercel AI SDK's streamText for structured extraction, Gemini 2.5 Flash with context caching (90% cost savings on repeated prompts), Drizzle ORM with JSONB columns for artifact storage, and Zod schemas for runtime validation. The architecture is designed around the principle "conversation is a projection of state, not the source of truth" — structured artifacts in the database are canonical, conversation history is ephemeral.

**Primary recommendation:** Implement hierarchical compression with database-backed artifacts from day one. This is architectural and cannot be retrofitted — it affects schema design (step_artifacts table), API structure (context injection), and step navigation (summary generation triggers).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vercel AI SDK | 6.x (use latest) | Structured output with streamText + Zod | Unified API for Gemini, native streaming, schema validation |
| @ai-sdk/google | Latest | Gemini provider for AI SDK | Official Google integration, context caching support |
| Drizzle ORM | Latest | JSONB column storage with type safety | Native PostgreSQL JSONB support, .$type<>() for compile-time safety |
| Zod | Latest | Schema definition and validation | Runtime validation, AI SDK integration, detailed error messages |
| Gemini 2.5 Flash | Current | AI model with 1M context window | Balance of speed/quality, context caching support, 90% cache discount |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @neondatabase/serverless | Latest | Edge-compatible Postgres driver | Required for Vercel serverless, prevents cold start issues |
| use-debounce | Latest | Debounced auto-save hooks | Auto-save with 2s debounce, maxWait 10s |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Gemini 2.5 Flash | Gemini 3 Pro | 3x cost, overkill for extraction, temp=1.0 requirement conflicts with extraction best practices |
| Vercel AI SDK | LangChain | More verbose, heavier framework, less idiomatic for Next.js |
| JSONB columns | Separate normalized tables | Rigid schema evolution, complex joins, over-engineering for semi-structured artifacts |
| Zod | JSON Schema | Less TypeScript integration, no AI SDK native support |

**Installation:**
```bash
npm install ai @ai-sdk/google zod @neondatabase/serverless use-debounce
```

## Architecture Patterns

### Recommended Database Schema Extension

Add to existing schema (users, workshops, workshop_steps, sessions, chat_messages):

```typescript
// New table: step_artifacts
export const stepArtifacts = pgTable(
  'step_artifacts',
  {
    id: text('id').primaryKey().$defaultFn(() => createPrefixedId('art')),
    workshopStepId: text('workshop_step_id')
      .notNull()
      .references(() => workshopSteps.id, { onDelete: 'cascade' }),
    stepId: text('step_id').notNull(), // Semantic ID (empathize, define, etc.)
    artifact: jsonb('artifact').notNull().$type<Record<string, unknown>>(),
    schema_version: text('schema_version').notNull().default('1.0'),
    extractedAt: timestamp('extracted_at', { mode: 'date', precision: 3 }).notNull().defaultNow(),
    version: integer('version').notNull().default(1), // Optimistic locking
  },
  (table) => ({
    workshopStepIdIdx: index('step_artifacts_workshop_step_id_idx').on(table.workshopStepId),
  })
);

// New table: step_summaries
export const stepSummaries = pgTable(
  'step_summaries',
  {
    id: text('id').primaryKey().$defaultFn(() => createPrefixedId('sum')),
    workshopStepId: text('workshop_step_id')
      .notNull()
      .references(() => workshopSteps.id, { onDelete: 'cascade' }),
    stepId: text('step_id').notNull(),
    summary: text('summary').notNull(),
    generatedAt: timestamp('generated_at', { mode: 'date', precision: 3 }).notNull().defaultNow(),
  },
  (table) => ({
    workshopStepIdIdx: index('step_summaries_workshop_step_id_idx').on(table.workshopStepId),
  })
);
```

### Pattern 1: Three-Tier Context Assembly

**What:** Hierarchical context compression assembling different memory tiers for each AI request.

**When to use:** Every AI SDK streamText call in workshop steps.

**Example:**
```typescript
// Assemble hierarchical context for current step
async function assembleStepContext(workshopId: string, currentStepId: string) {
  // Tier 1: Persistent memory (all structured artifacts)
  const allArtifacts = await db
    .select()
    .from(stepArtifacts)
    .innerJoin(workshopSteps, eq(stepArtifacts.workshopStepId, workshopSteps.id))
    .where(eq(workshopSteps.workshopId, workshopId))
    .orderBy(asc(workshopSteps.createdAt));

  // Tier 2: Long-term memory (previous step summaries)
  const previousSummaries = await db
    .select()
    .from(stepSummaries)
    .innerJoin(workshopSteps, eq(stepSummaries.workshopStepId, workshopSteps.id))
    .where(
      and(
        eq(workshopSteps.workshopId, workshopId),
        ne(stepSummaries.stepId, currentStepId)
      )
    );

  // Tier 3: Short-term memory (current step messages verbatim)
  const currentMessages = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.sessionId, sessionId),
        eq(chatMessages.stepId, currentStepId)
      )
    )
    .orderBy(asc(chatMessages.createdAt));

  // Assemble context prompt
  return {
    persistentContext: allArtifacts.map(a =>
      `Step ${a.stepId}: ${JSON.stringify(a.artifact)}`
    ).join('\n\n'),
    summaries: previousSummaries.map(s =>
      `Step ${s.stepId} summary: ${s.summary}`
    ).join('\n\n'),
    messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
  };
}
```

### Pattern 2: Structured Extraction with AI SDK Output Property

**What:** Use streamText with output property for schema-constrained generation, deprecated generateObject.

**When to use:** Extracting step artifacts from conversation at step completion.

**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const stakeholderSchema = z.object({
  name: z.string().describe('Stakeholder name'),
  role: z.string().describe('Their role/title'),
  influence: z.enum(['high', 'medium', 'low']).describe('Influence level'),
  interest: z.enum(['high', 'medium', 'low']).describe('Interest level'),
});

const extractionResult = await streamText({
  model: google('gemini-2.5-flash'),
  system: `Extract structured data from the conversation. Return only JSON.`,
  messages: conversationHistory,
  output: {
    schema: z.object({
      stakeholders: z.array(stakeholderSchema),
    }),
  },
  temperature: 0.1, // Low temperature for extraction accuracy
});

// Access structured output
for await (const partialObject of extractionResult.partialOutputStream) {
  console.log('Partial extraction:', partialObject);
}

const { object } = await extractionResult.finalOutputStream;
// object is typed as { stakeholders: Array<{ name, role, influence, interest }> }
```

### Pattern 3: Conversation Summarization with Prompt Engineering

**What:** AI-generated summaries of completed step conversations for long-term memory tier.

**When to use:** Triggered when user completes a step (clicks "Continue to Next Step").

**Example:**
```typescript
// Source: Best practices from https://www.lakera.ai/blog/prompt-engineering-guide
const summaryPrompt = `
INSTRUCTIONS:
Summarize the following conversation from Step ${stepName} in 3-4 bullet points.
Focus on: (1) key decisions made, (2) user's specific inputs, (3) final outputs.
Use clear, concise language. Do NOT include conversational pleasantries.

CONSTRAINTS:
- Maximum 150 words
- Bullet point format
- Factual only, no interpretation
- Reference specific values (names, numbers, quotes)

OUTPUT FORMAT:
- Bullet point 1
- Bullet point 2
- Bullet point 3

CONVERSATION:
${conversationHistory}
`;

const { text: summary } = await generateText({
  model: google('gemini-2.5-flash'),
  prompt: summaryPrompt,
  temperature: 0.1, // Low temperature for factual accuracy
});
```

### Pattern 4: Gemini Context Caching for System Prompts

**What:** Cache stable system prompts and step definitions to reduce input token costs by 90%.

**When to use:** System prompts, step templates, domain knowledge that doesn't change per request.

**Example:**
```typescript
// Source: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-overview
// Implicit caching (automatic, enabled by default on Vertex AI)
// Requires minimum 2,048 tokens to cache
// Default TTL: 60 minutes

const stepSystemPrompt = `
You are an AI facilitator for Step ${stepNumber}: ${stepName}.

STEP DEFINITION:
${stepDefinition} // ~500 tokens

10 DESIGN THINKING STEPS OVERVIEW:
${allStepDefinitions} // ~1,500 tokens

FACILITATION PRINCIPLES:
${facilitationGuidelines} // ~500 tokens

Total: ~2,500 tokens (exceeds 2,048 minimum)
This content is cached automatically, reducing cost by 90% on subsequent requests.
`;

const result = await streamText({
  model: google('gemini-2.5-flash'),
  system: stepSystemPrompt, // Cached if >2,048 tokens
  messages: currentStepMessages,
});
```

### Pattern 5: Optimistic Locking for Race Condition Prevention

**What:** Version column prevents lost updates when auto-save and step completion overlap.

**When to use:** All writes to workshop_steps, step_artifacts, step_summaries.

**Example:**
```typescript
// Source: https://reintech.io/blog/implementing-optimistic-locking-postgresql
// Add version column to tables (already shown in schema)

async function saveStepArtifact(workshopStepId: string, artifact: Record<string, unknown>) {
  return await db.transaction(async (tx) => {
    // Read current version
    const [currentStep] = await tx
      .select({ version: workshopSteps.version })
      .from(workshopSteps)
      .where(eq(workshopSteps.id, workshopStepId));

    // Write with version check
    const result = await tx
      .update(stepArtifacts)
      .set({
        artifact,
        extractedAt: new Date(),
        version: currentStep.version + 1,
      })
      .where(
        and(
          eq(stepArtifacts.workshopStepId, workshopStepId),
          eq(stepArtifacts.version, currentStep.version) // Fails if version changed
        )
      );

    if (result.rowsAffected === 0) {
      throw new Error('Optimistic lock failure: artifact was modified by another request');
    }

    return result;
  });
}
```

### Anti-Patterns to Avoid

- **Naive full-history approach:** Passing entire conversation history (all 10 steps) to every AI request. This hits context degradation syndrome after step 4-5, degrading AI quality by 13.9%-85%.
- **Value copying instead of references:** Storing persona data in journey map artifact instead of persona_id reference. When persona is revised, downstream artifacts become stale with no way to detect.
- **Post-hoc summarization:** Waiting until token limit is approached to generate summaries. Summarize on step completion for consistent, high-quality summaries while conversation is still fresh.
- **Client-side state as source of truth:** Storing artifacts in Zustand/localStorage. Server components and database must be canonical source, client is projection.
- **Synchronous extraction blocking conversation:** Making user wait 3-5 seconds for extraction before they can continue chatting. Extract asynchronously, show progress, allow continuation.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured extraction from conversation | Custom regex/parsing of AI text | AI SDK streamText with output property + Zod | Handles schema validation, partial streaming, error recovery. Hand-rolled parsing fails on edge cases (markdown formatting, missing fields). |
| Conversation summarization | Template-based text truncation | AI-generated summaries with prompt engineering | Preserves semantic meaning, adapts to conversation structure. Templates lose context nuance. |
| Context window token counting | String.length or word count | AI SDK usage tracking (inputTokens, outputTokens) | Tokenization is model-specific (Gemini uses SentencePiece). Character count is wildly inaccurate. |
| Debounced auto-save | Custom setTimeout/clearTimeout | use-debounce hook or useDebouncedCallback | Handles React re-renders, cleanup, edge cases (component unmount). Custom debounce has closure bugs. |
| Optimistic locking | Application-level "dirty" flags | Database version column with transaction check | Prevents lost updates across serverless function instances. App-level flags don't work in distributed systems. |
| JSONB schema validation | Manual JSON.parse try/catch | Drizzle .$type<>() + Zod runtime validation | Compile-time type safety + runtime validation. Manual parsing loses type inference and has inconsistent error handling. |

**Key insight:** Context management for multi-step AI is a solved problem in 2026. The pattern is well-documented: hierarchical compression with short-term verbatim + long-term summaries + persistent artifacts. Custom solutions underperform because they miss edge cases (context degradation, token counting, race conditions) that only surface at scale.

## Common Pitfalls

### Pitfall 1: Context Degradation Syndrome

**What goes wrong:** AI quality degrades significantly after step 4-5 as conversation history grows. Users reach step 7-8 and the AI asks questions already answered in step 2, suggests ideas that contradict earlier decisions, or loses track of the project's core problem.

**Why it happens:** LLMs do not use context uniformly. Performance becomes unreliable as input length grows, even within advertised limits. Effective capacity is 60-70% of maximum. Models work best when relevant information sits at very beginning or end of context, but struggle with middle content ("lost in the middle" phenomenon). In a 10-step workshop with 5-7 conversational turns per step, you accumulate 50-70 messages. Even with Gemini's 1M token window, retrieval accuracy degrades 13.9%-85% as context grows.

**How to avoid:** Implement hierarchical context compression from day one:
1. Short-term memory: Current step messages verbatim
2. Long-term memory: Previous step summaries (3-4 bullet points each)
3. Persistent memory: All structured JSON outputs

Trigger summarization when step completes, not when token limit approaches. Use step-specific prompts that reference structured outputs explicitly: `"The user's HMW statement from Step 7 is: {hmw_statement}"` rather than relying on AI to retrieve from context.

**Warning signs:**
- AI asks questions already answered in earlier steps
- Suggestions contradict previous structured outputs
- Step completion taking longer (token processing overhead)
- Summaries becoming generic rather than specific
- Extracted JSON missing fields discussed earlier in conversation

### Pitfall 2: Extraction Reliability Failures

**What goes wrong:** User completes step with detailed conversation. Extraction attempts return incomplete JSON (missing fields), markdown-wrapped JSON instead of pure JSON, or partial data from early conversation missing later additions. Step completion hangs or proceeds with incomplete artifacts.

**Why it happens:** Gemini's structured output mode is reliable but not perfect. Failures occur when:
- Conversation is ambiguous about field values (never explicitly stated "high influence")
- Context window issues deprioritize late-conversation data
- Schema is too strict (required fields not always applicable)
- Temperature conflicts (Gemini 3 defaults to 1.0, but extraction traditionally uses 0.0-0.3)

Gemini uses OpenAPI 3.0 schema subset, not full JSON Schema, leading to validation mismatches.

**How to avoid:**
- Use explicit extraction prompts: "Based on conversation, extract exactly this JSON structure: {schema}. Do not include markdown, only pure JSON."
- Implement retry logic with schema repair: if validation fails, send repair prompt with error details
- Use Zod schema validation with detailed error messages
- For Gemini 2.5, use temperature 0.0-0.3 for extraction (not main conversation)
- Use responseMimeType: "application/json" to force JSON-only output
- Show extracted data to user for confirmation before proceeding

**Warning signs:**
- Step completion button stays disabled after conversation concludes
- Database contains null/incomplete structured outputs
- Zod validation failures in logs
- JSON parsing errors
- Extracted data missing information clearly discussed

### Pitfall 3: Auto-Save Race Conditions

**What goes wrong:** User actively chatting in step 4. Auto-save fires every 30s. User completes step and clicks "Continue to Step 5" triggering step completion save. Both saves write to same workshop/session simultaneously. Race condition results in incomplete context from step 4 flowing to step 5.

**Why it happens:** Multiple concurrent write paths without coordination:
- Periodic auto-save timer
- Step completion save
- User navigating back and updating previous step

Databases experience lost updates when concurrent transactions update same row without proper locking. Drizzle ORM doesn't automatically prevent race conditions. Vercel serverless functions can create multiple parallel executions if user rapidly clicks or has network retries.

**How to avoid:**
- Implement optimistic locking: add version column, increment on every update, fail transaction if version changed
- Debounce auto-save with "save in progress" flag to prevent overlapping saves
- Disable step transition buttons during auto-save
- Use database transactions with serializable isolation for step completion
- Implement idempotency keys for API requests to prevent duplicate processing

**Warning signs:**
- Step summaries occasionally missing recent conversation turns
- Users reporting "my last message didn't save"
- Database showing rapid succession of updates to same row
- Inconsistent structured outputs (sometimes complete, sometimes partial)
- Navigation transitions leaving incomplete data in previous step

### Pitfall 4: Conversation-State Divergence

**What goes wrong:** AI confirms in conversation: "Great, I've captured 5 pain points." User continues to next step. Clicks "View Pain Points" in sidebar — UI shows only 3. Database query shows structured_output JSON has only 3 entries. Conversation diverged from database state.

**Why it happens:**
- Conversation is projection of state, but extraction happens asynchronously
- Timing issue: AI responds before extraction completes
- Extraction failure: AI conversation succeeded, extraction failed (rate limit, timeout, validation error)
- Partial extraction: Gemini extracts 3 confidently, omits 2 ambiguous ones

Chat interface shows success, data layer shows failure.

**How to avoid:**
- Never let AI claim "captured" or "saved" in conversation — use non-committal language
- Make extraction explicit and user-confirmable: show extracted data in UI before transitioning
- Implement optimistic UI: show extraction in progress with success/failure feedback
- Use transactional step completion: conversation + extraction + database write must all succeed
- Provide manual edit capability if extraction is wrong
- Show both views: conversation history tab + structured data tab

**Warning signs:**
- Users saying "AI said it captured X but I only see Y"
- Discrepancy between conversation content and structured output counts
- Step navigation blocked because structured output incomplete
- Users re-asking questions already answered
- Support requests: "Where did my data go?"

### Pitfall 5: Gemini Rate Limit Cascade Failures

**What goes wrong:** User deep in step 8, making progress. Suddenly hits 429 "quota exceeded" errors. Chat stops working. Progress may be lost. User refreshes, tries again, gets another 429. Trust craters.

**Why it happens:** Gemini API enforces rate limits across FOUR independent dimensions: RPM (requests per minute), TPM (tokens per minute), RPD (requests per day), IPM (images per minute). Exceeding ANY single dimension triggers 429 errors. Multi-dimensional tracking makes limits unpredictable. Free tier was slashed 50-92% in December 2025 without notice. Rate limits are per-project, so all users share same quota pool.

**How to avoid:**
- Implement exponential backoff with jitter (1s, 2s, 4s, 8s) on 429 responses
- Clear UI feedback: "AI is busy, retrying in 3s..."
- Use Gemini context caching to reduce TPM consumption by 90%
- Monitor rate limit margins and throttle proactively
- Consider Tier 1 paid plan ($50 spend = 66x capacity: 15 RPM → 1000 RPM)
- Pre-calculate token budgets per step to stay within TPM limits

**Warning signs:**
- 429 errors in production logs
- Users reporting "chat stopped working" after extended sessions
- Error spikes correlating with traffic increases
- Multiple users hitting limits simultaneously

## Code Examples

Verified patterns from official sources:

### Gemini Provider Configuration
```typescript
// Source: https://ai.google.dev/gemini-api/docs/vercel-ai-sdk-example
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// Environment variable: GOOGLE_GENERATIVE_AI_API_KEY
// Google provider automatically looks for this env var

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google('gemini-2.5-flash'),
    messages,
  });

  return result.toDataStreamResponse();
}
```

### JSONB Column with Type Safety
```typescript
// Source: https://orm.drizzle.team/docs/column-types/pg
import { jsonb, pgTable, text } from 'drizzle-orm/pg-core';

// Define artifact schema with Zod
const hmwArtifactSchema = z.object({
  problem_core: z.string(),
  target_user: z.string(),
  outcome: z.string(),
  altitude: z.enum(['specific', 'balanced', 'broad']),
});

type HMWArtifact = z.infer<typeof hmwArtifactSchema>;

// Drizzle schema with type safety
export const stepArtifacts = pgTable('step_artifacts', {
  id: text('id').primaryKey(),
  artifact: jsonb('artifact').$type<HMWArtifact>(), // Compile-time type safety
});

// Runtime validation on insert
const validated = hmwArtifactSchema.parse(userInput); // Throws if invalid
await db.insert(stepArtifacts).values({
  id: createId(),
  artifact: validated, // TypeScript knows this is HMWArtifact
});
```

### Debounced Auto-Save Hook
```typescript
// Source: https://darius-marlowe.medium.com/smarter-forms-in-react-building-a-useautosave-hook-with-debounce-and-react-query-d4d7f9bb052e
import { useDebouncedCallback } from 'use-debounce';
import { useEffect } from 'react';

export function useAutoSave(data: any, onSave: (data: any) => Promise<void>) {
  const debouncedSave = useDebouncedCallback(
    async (value) => {
      await onSave(value);
    },
    2000, // 2s debounce
    { maxWait: 10000 } // Force save after 10s even if still typing
  );

  useEffect(() => {
    debouncedSave(data);
  }, [data, debouncedSave]);

  return debouncedSave;
}

// Usage
function WorkshopStep() {
  const [messages, setMessages] = useState([]);

  useAutoSave(messages, async (msgs) => {
    await fetch('/api/save-messages', {
      method: 'POST',
      body: JSON.stringify({ messages: msgs }),
    });
  });
}
```

### Hierarchical Context Assembly for AI Request
```typescript
// Combines all three memory tiers into single context object
async function buildStepContext(workshopId: string, currentStepId: string) {
  const context = await assembleStepContext(workshopId, currentStepId);

  const systemPrompt = `
You are facilitating Step ${currentStepId} of a design thinking workshop.

PERSISTENT MEMORY (Structured Artifacts from All Steps):
${context.persistentContext}

LONG-TERM MEMORY (Previous Step Summaries):
${context.summaries}

Now continue the conversation for the current step.
  `;

  const result = await streamText({
    model: google('gemini-2.5-flash'),
    system: systemPrompt,
    messages: context.messages, // Short-term memory (current step verbatim)
  });

  return result.toDataStreamResponse();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| generateObject, streamObject | streamText with output property | AI SDK 6 (2025) | Unified API, better streaming, tool integration in same request |
| Full conversation history to AI | Hierarchical compression (3 tiers) | 2024-2025 | 50-80% token reduction, prevents context degradation |
| Manual JSON parsing | Zod + AI SDK native validation | AI SDK 4+ (2024) | Type safety, detailed errors, partial streaming |
| Character/word count for tokens | AI SDK usage tracking | AI SDK 3+ (2023) | Accurate model-specific tokenization |
| Node.js postgres driver | @neondatabase/serverless | Neon serverless (2023) | Edge compatibility, no cold start issues |
| Single-tier context | Multi-tier (verbatim + summaries + artifacts) | 2025-2026 | Maintains quality across long sessions |

**Deprecated/outdated:**
- `generateObject()` and `streamObject()`: Replaced by streamText with output property (AI SDK 6)
- Passing temperature to Gemini 3 structured generation: Keep default 1.0, don't override (causes loops/degradation)
- Using responseMimeType without schema: Use AI SDK output property instead for validation
- Zustand for React Server Components state: Causes hydration mismatches, use database as source of truth

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal summary trigger timing**
   - What we know: Trigger on step completion is standard
   - What's unclear: Should summaries also generate on user back-navigation to earlier steps, or only on forward progression?
   - Recommendation: Start with completion-only, add navigation triggers if user testing shows need

2. **Context cache TTL tuning**
   - What we know: Default TTL is 60 minutes, minimum 2,048 tokens required
   - What's unclear: Optimal TTL for workshop sessions (typical duration 45-90 minutes)
   - Recommendation: Use default 60 minutes initially, monitor cache hit rates, extend if sessions commonly exceed 60 min

3. **Artifact schema versioning strategy**
   - What we know: Schema evolution is necessary as product evolves
   - What's unclear: Migration strategy when artifact schemas change (user has old v1 artifact, new code expects v2)
   - Recommendation: Store schema_version in step_artifacts table, implement version-aware parsers

4. **Summary length optimization**
   - What we know: 3-4 bullet points, ~150 words is recommended
   - What's unclear: Does summary quality degrade for steps with very long conversations (20+ turns)?
   - Recommendation: Start with fixed 150-word limit, monitor extraction quality, add adaptive sizing if needed

## Sources

### Primary (HIGH confidence)
- [AI SDK Core: streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) - Context flow, message formats, token management
- [AI SDK Core: Generating Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) - Output property, Zod integration, partial streaming
- [Gemini API Context Caching Overview](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/context-cache/context-cache-overview) - TTL, minimum tokens, cost savings
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing) - Context caching costs (90% discount on 2.5, 75% on 2.0)
- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits) - Four dimensions (RPM/TPM/RPD/IPM), tier structure
- [Drizzle ORM PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg) - JSONB with .$type<>() for type safety
- [Gemini with Vercel AI SDK](https://ai.google.dev/gemini-api/docs/vercel-ai-sdk-example) - Provider configuration, API key setup

### Secondary (MEDIUM confidence)
- [Context Window Management: Strategies for Long-Context AI Agents and Chatbots](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/) - Hierarchical summarization, short-term verbatim + long-term summaries
- [Prompt Compression Techniques](https://medium.com/@kuldeep.paul08/prompt-compression-techniques-reducing-context-window-costs-while-improving-llm-performance-afec1e8f1003) - 70-94% cost savings, extractive vs abstractive
- [How to Build Context Compression](https://oneuptime.com/blog/post/2026-01-30-context-compression/view) - Hierarchical tree structure, 18:1 reduction ratios
- [Context Engineering: The Definitive 2025 Guide](https://www.flowhunt.io/blog/context-engineering/) - RAG, summarization, structured inputs
- [Prompt Engineering Best Practices](https://www.lakera.ai/blog/prompt-engineering-guide) - Output contracts, structured prompts, INSTRUCTIONS/INPUTS/CONSTRAINTS/OUTPUT FORMAT pattern
- [The 2026 Guide to Prompt Engineering](https://www.ibm.com/think/prompt-engineering) - Success criteria, specificity, temperature 0.1 for summarization
- [Optimistic Locking in PostgreSQL](https://reintech.io/blog/implementing-optimistic-locking-postgresql) - Version column pattern, transaction checks
- [Drizzle ORM Best Practices Guide](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717) - JSONB type safety, Zod integration
- [Smarter Forms in React: Building a useAutoSave Hook](https://darius-marlowe.medium.com/smarter-forms-in-react-building-a-useautosave-hook-with-debounce-and-react-query-d4d7f9bb052e) - Debounce patterns, auto-save implementation

### Tertiary (LOW confidence)
- [Gemini API Context Caching: Complete Guide to Reducing Costs](https://www.aifreeapi.com/en/posts/gemini-api-context-caching-reduce-cost) - Community guide, marked for verification
- [Gemini API Rate Limits Explained: Complete 2026 Guide](https://www.aifreeapi.com/en/posts/gemini-api-rate-limit-explained) - Community aggregation, verify with official docs

### Internal Project Sources
- `.planning/research/PITFALLS.md` - Context degradation syndrome, rate limits, race conditions (HIGH confidence, project-specific research)
- `.planning/codebase/ARCHITECTURE.md` - Existing system architecture patterns
- `src/db/schema/steps.ts` - Current workshop_steps, stepDefinitions schema
- `src/db/schema/chat-messages.ts` - Current chatMessages schema

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries have official documentation, AI SDK + Gemini integration is well-documented
- Architecture patterns: HIGH - Hierarchical compression is well-established, multiple authoritative sources agree
- Pitfalls: HIGH - Context degradation, rate limits, race conditions all documented in official sources + project research
- Code examples: HIGH - All examples sourced from official documentation (AI SDK, Drizzle, Gemini API)
- Optimal tuning values: MEDIUM - Summary length, TTL settings require testing in production

**Research date:** 2026-02-08
**Valid until:** ~30 days (2026-03-08) — AI SDK and Gemini API are stable, but rate limits and pricing can change without notice (see December 2025 free tier changes)
