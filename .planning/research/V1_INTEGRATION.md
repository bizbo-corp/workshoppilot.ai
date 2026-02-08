# Architecture Integration for v1.0 AI Facilitation

**Domain:** AI-powered design thinking facilitation
**Focus:** v1.0 feature integration with existing MVP 0.5 architecture
**Researched:** 2026-02-08
**Confidence:** HIGH

## Executive Summary

This document addresses how v1.0 AI facilitation features (dual-layer context, step-aware AI, back-and-revise with cascading updates, auto-save) integrate with the existing MVP 0.5 architecture. The existing foundation — Next.js 16.1 App Router, Neon Postgres via Drizzle, Vercel AI SDK 5 with Gemini 2.0 Flash, Clerk auth, and the current session/step/messages schema — provides solid integration points. Key architectural additions include: (1) a `contextSummaries` table for compressed conversation context, (2) an invalidation timestamp pattern for cascading updates, (3) structured output extraction using AI SDK's `generateObject()` with Zod schemas, and (4) debounced auto-save via Server Actions with optimistic UI updates.

The critical insight: **conversation is a projection of state, not the source of truth**. Structured artifacts in `workshopSteps.output` become the authoritative data that flows forward to subsequent steps. This prevents context degradation and enables proper back-and-revise functionality with clear invalidation boundaries.

## Integration Point 1: Dual-Layer Context Architecture

### Current State (MVP 0.5)

**Existing tables:**
- `sessions` (id, workshopId, startedAt, endedAt, createdAt)
- `chatMessages` (id, sessionId, stepId, messageId, role, content, createdAt)
- `workshopSteps` (id, workshopId, stepId, status, output, startedAt, completedAt, createdAt, updatedAt)

**Current behavior:**
- Messages stored per session+step in `chatMessages` table
- `workshopSteps.output` column exists as JSONB but currently unused
- AI receives full message history via `loadMessages(sessionId, stepId)`
- No summarization or context compression

**Gap:** As conversation grows across 10 steps, token budget exhausts and AI quality degrades (Context Degradation Syndrome). No mechanism for structured artifact storage or context compression.

### Integration Strategy

#### Schema Components

**1. Repurpose existing `workshopSteps.output` for structured data:**

```typescript
// src/db/schema/steps.ts (existing file, add new columns)
export const workshopSteps = pgTable('workshop_steps', {
  // ... existing fields ...
  output: jsonb('output').$type<StepOutput>(), // ALREADY EXISTS, repurpose for typed outputs

  // NEW fields to add:
  outputUpdatedAt: timestamp('output_updated_at', { mode: 'date', precision: 3 }),
  contextInvalidatedAt: timestamp('context_invalidated_at', { mode: 'date', precision: 3 }),
  stepOrder: integer('step_order').notNull(), // For invalidation queries
});
```

**Rationale:** The existing `output` column is unused. We'll use it for typed structured outputs with Zod validation. `outputUpdatedAt` tracks when output changed (for invalidation). `stepOrder` enables efficient "invalidate all steps after this one" queries.

**2. Create new `contextSummaries` table:**

```typescript
// src/db/schema/context-summaries.ts (NEW FILE)
import { pgTable, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { createPrefixedId } from '@/lib/ids';
import { sessions } from './sessions';

export const contextSummaries = pgTable(
  'context_summaries',
  {
    id: text('id').primaryKey().$defaultFn(() => createPrefixedId('cs')),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    stepId: text('step_id').notNull(), // Semantic ID: 'challenge', 'stakeholder-mapping', etc.
    summaryType: text('summary_type', {
      enum: ['conversation', 'key-decisions', 'user-inputs']
    }).notNull().$type<'conversation' | 'key-decisions' | 'user-inputs'>(),
    content: text('content').notNull(), // AI-generated summary
    tokenCount: integer('token_count'), // Approximate tokens in summary
    generatedAt: timestamp('generated_at', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    sessionStepIdx: index('context_summaries_session_step_idx').on(
      table.sessionId,
      table.stepId
    ),
  })
);
```

**Purpose:** Stores compressed conversation context per step. When Step 5 starts, AI receives:
- **Short-term:** Full messages from Step 5 (current step)
- **Long-term:** Summary from Steps 1-4 + structured outputs
- **Persistent:** All structured outputs as JSON

#### Data Flow: Structured Output Extraction

```
User completes Step 1 (Challenge)
    ↓
Frontend: User clicks "Complete Step" button
    ↓
Server Action: completeStep(sessionId, stepId)
    ↓
1. Load all messages for this session+step
    ↓
2. Call generateObject() with step-specific Zod schema
    ↓
3. AI SDK extracts structured JSON (HMW statement, problem description)
    ↓
4. Validate against Zod schema
    ↓
5. Write to workshopSteps.output
    ↓
6. Update workshopSteps.outputUpdatedAt = NOW()
    ↓
7. Update workshopSteps.status = 'complete'
    ↓
8. Trigger background job: generateContextSummary(sessionId, stepId)
    ↓
Background: Generate conversation summary via streamText()
    ↓
Background: Store in contextSummaries table
    ↓
Frontend: Navigate to Step 2
```

**Implementation:** Create `/src/lib/ai/structured-extraction.ts`:

```typescript
import { generateObject } from 'ai';
import { chatModel } from '@/lib/ai/chat-config';
import { getStepSchema } from '@/lib/workshop/step-schemas';
import type { UIMessage } from 'ai';

export async function extractStepOutput(
  sessionId: string,
  stepId: string,
  messages: UIMessage[]
): Promise<StepOutput> {
  const schema = getStepSchema(stepId); // Zod schema per step

  const { object } = await generateObject({
    model: chatModel,
    schema: schema,
    system: `Extract structured output from this design thinking conversation.
Step: ${stepId}
Extract only information explicitly discussed. Do not infer or hallucinate.`,
    messages: convertToModelMessages(messages),
  });

  return object; // Type-safe, validated StepOutput
}
```

#### Data Flow: Context Summary Generation

```
Step completion triggers background job
    ↓
Server: generateContextSummary(sessionId, stepId)
    ↓
1. Load all messages for session+step
    ↓
2. Call streamText() with summarization prompt
    ↓
3. Prompt: "Summarize this conversation in 3-5 bullet points.
   Focus on decisions made, user inputs, and key insights."
    ↓
4. Stream response, buffer complete text
    ↓
5. Insert into contextSummaries table
    ↓
6. Approximate token count (content.length / 4)
```

**Implementation:** Create `/src/lib/ai/context-summarization.ts`:

```typescript
import { streamText, convertToModelMessages } from 'ai';
import { chatModel } from '@/lib/ai/chat-config';
import { db } from '@/db/client';
import { contextSummaries } from '@/db/schema';
import { loadMessages } from './message-persistence';

export async function generateContextSummary(
  sessionId: string,
  stepId: string
): Promise<void> {
  const messages = await loadMessages(sessionId, stepId);

  const result = streamText({
    model: chatModel,
    system: `You are summarizing a design thinking conversation.
Extract key decisions, user inputs, and insights.
Format as 3-5 bullet points. Be concise but preserve critical context.`,
    messages: convertToModelMessages(messages),
  });

  let summary = '';
  for await (const chunk of result.stream) {
    summary += chunk.text;
  }

  await db.insert(contextSummaries).values({
    sessionId,
    stepId,
    summaryType: 'conversation',
    content: summary.trim(),
    tokenCount: Math.ceil(summary.length / 4), // Rough estimate
  });
}
```

#### Data Flow: Next Step Context Injection

```
User navigates to Step 5 (Persona Development)
    ↓
Server: /workshop/[sessionId]/step/5/page.tsx (SSR)
    ↓
1. Load current step messages: loadMessages(sessionId, 'persona')
    ↓
2. Load prior context: loadPriorContext(sessionId, 'persona')
    ↓
   2a. Fetch structured outputs from Steps 1-4
   2b. Fetch conversation summaries from Steps 1-4
    ↓
3. Assemble context string for AI system prompt
    ↓
4. Pass to ChatPanel (will be injected server-side in API route)
    ↓
Frontend: ChatPanel sends messages to /api/chat
    ↓
API Route: Inject prior context into system prompt
    ↓
streamText({
  model: chatModel,
  system: `${STEP_PROMPT_TEMPLATE}

PRIOR CONTEXT FROM PREVIOUS STEPS:
${priorContext}`,
  messages: currentStepMessages
})
```

**Implementation:** Create `/src/lib/ai/context-assembly.ts`:

```typescript
import { db } from '@/db/client';
import { workshopSteps, contextSummaries, sessions } from '@/db/schema';
import { eq, and, inArray, asc } from 'drizzle-orm';
import { STEPS, getStepById } from '@/lib/workshop/step-metadata';

export async function loadPriorContext(
  sessionId: string,
  currentStepId: string
): Promise<string> {
  const currentStep = getStepById(currentStepId);
  if (!currentStep || currentStep.order === 1) {
    return ''; // No prior context for Step 1
  }

  // Get all prior steps (order < current)
  const priorSteps = STEPS.filter(s => s.order < currentStep.order);

  // Load session to get workshopId
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { workshop: true },
  });

  if (!session) return '';

  // Load structured outputs
  const outputs = await db.query.workshopSteps.findMany({
    where: and(
      eq(workshopSteps.workshopId, session.workshop.id),
      inArray(workshopSteps.stepId, priorSteps.map(s => s.id))
    ),
  });

  // Load summaries
  const summaries = await db.query.contextSummaries.findMany({
    where: and(
      eq(contextSummaries.sessionId, sessionId),
      inArray(contextSummaries.stepId, priorSteps.map(s => s.id))
    ),
    orderBy: asc(contextSummaries.generatedAt),
  });

  // Assemble context string
  let context = '';
  for (const step of priorSteps) {
    const output = outputs.find(o => o.stepId === step.id);
    const summary = summaries.find(s => s.stepId === step.id);

    context += `\n--- ${step.name} (Step ${step.order}) ---\n`;
    if (output?.output) {
      context += `OUTPUT: ${JSON.stringify(output.output, null, 2)}\n`;
    }
    if (summary) {
      context += `SUMMARY: ${summary.content}\n`;
    }
  }

  return context;
}
```

### Schema Migration Plan

**Phase 1:** Add new columns to existing tables (non-breaking)
```sql
ALTER TABLE workshop_steps
  ADD COLUMN output_updated_at TIMESTAMP(3),
  ADD COLUMN context_invalidated_at TIMESTAMP(3),
  ADD COLUMN step_order INTEGER;
```

**Phase 2:** Backfill step_order from stepDefinitions
```sql
UPDATE workshop_steps ws
SET step_order = sd.order
FROM step_definitions sd
WHERE ws.step_id = sd.id;

ALTER TABLE workshop_steps
  ALTER COLUMN step_order SET NOT NULL;
```

**Phase 3:** Create new table
```sql
CREATE TABLE context_summaries (...);
```

**Phase 4:** Add index for invalidation queries
```sql
CREATE INDEX workshop_steps_workshop_order_idx
  ON workshop_steps(workshop_id, step_order);
```

### Integration Points with Existing Code

**Modified files:**
- `/src/db/schema/steps.ts` — Add new columns
- `/src/db/schema/index.ts` — Export contextSummaries
- `/src/app/api/chat/route.ts` — Inject prior context into system prompt

**New files:**
- `/src/db/schema/context-summaries.ts` — New table definition
- `/src/lib/ai/structured-extraction.ts` — Extract outputs with Zod
- `/src/lib/ai/context-summarization.ts` — Generate summaries
- `/src/lib/ai/context-assembly.ts` — Load and format prior context
- `/src/lib/workshop/step-schemas.ts` — Zod schemas for all 10 steps
- `/src/app/actions/complete-step.ts` — Server Action for step completion

### Token Budget Management

**Target:** Stay under 50K tokens per request (Gemini 2.0 Flash context window: 1M tokens)

**Allocation strategy:**
- **System prompt + step instructions:** ~2K tokens
- **Prior context (summaries + outputs):** ~10K tokens (avg 1K per prior step)
- **Current step messages:** ~30K tokens (allows ~100-150 back-and-forth messages)
- **Reserve:** ~8K tokens for response generation

**Monitoring:** Log token counts per request, add warning at 40K tokens.

**Compression triggers:**
- If current step exceeds 50 messages, auto-summarize older messages
- Keep most recent 20 messages verbatim, summarize earlier ones

## Integration Point 2: Step-Aware AI Prompting

### Current State (MVP 0.5)

**System prompt location:** `/src/lib/ai/chat-config.ts`

```typescript
export const SYSTEM_PROMPT = `You are an AI facilitator...`; // Generic, not step-aware
```

**Problem:** Same prompt used for all 10 steps. Doesn't reference step definition, prior context, or step-specific methodology.

### Integration Strategy

#### Dynamic System Prompt Construction

**Move from static to dynamic prompt assembly:**

```typescript
// src/lib/ai/prompt-templates.ts (NEW FILE)
import { getStepById } from '@/lib/workshop/step-metadata';
import { getStepPromptTemplate } from './step-prompt-templates';

const BASE_FACILITATION_PROMPT = `You are an AI facilitator guiding a design thinking workshop.
Your role is to ask focused questions, synthesize insights, and help users progress through each step.
Be concise (1-3 sentences per response), use bullet points for clarity, and build on prior context.`;

export function buildStepSystemPrompt(
  stepId: string,
  priorContext: string
): string {
  const step = getStepById(stepId);
  if (!step) throw new Error(`Invalid step ID: ${stepId}`);

  const template = getStepPromptTemplate(stepId); // Step-specific instructions

  return `${BASE_FACILITATION_PROMPT}

CURRENT STEP: ${step.name} (Step ${step.order} of 10)
OBJECTIVE: ${step.description}

${template}

${priorContext ? `PRIOR CONTEXT FROM PREVIOUS STEPS:\n${priorContext}` : ''}

FACILITATION STYLE:
- Ask focused questions to extract insights
- Build on what was learned in previous steps
- Guide user through the methodology, don't do the work for them
- Keep responses concise (1-3 sentences)
- Use bullet points for clarity
`;
}
```

#### Step-Specific Prompt Templates

**Create template per step with facilitation phases:**

```typescript
// src/lib/ai/step-prompt-templates.ts (NEW FILE)
const STEP_TEMPLATES: Record<string, string> = {
  challenge: `
FACILITATION PHASES:
1. ORIENT: Welcome user, explain this step's purpose (1-2 sentences)
2. GATHER: Ask about the problem they're solving, who's affected, why it matters
3. SYNTHESIZE: Reflect back what you heard, identify the core problem
4. REFINE: Help them articulate a clear problem statement
5. VALIDATE: Draft a How Might We statement, get user confirmation
6. COMPLETE: Summarize the HMW and transition to next step

STRUCTURED OUTPUT TO EXTRACT:
- problemStatement: string (2-3 sentences)
- targetUser: string (who's experiencing the problem)
- coreChallenge: string (one sentence)
- hmwStatement: string (How might we [action] for [user] so that [outcome]?)

ASK OPEN QUESTIONS:
- "What problem are you trying to solve?"
- "Who is experiencing this problem?"
- "Why does this problem matter?"
- "What happens if it's not solved?"

AVOID:
- Jumping to solutions
- Assuming user context
- Generic responses
`,

  'stakeholder-mapping': `
FACILITATION PHASES:
1. ORIENT: Explain stakeholder mapping and why it matters
2. GATHER: Brainstorm all people/groups involved (users, decision-makers, influencers, blockers)
3. SYNTHESIZE: Categorize by power and interest
4. REFINE: Prioritize top 3-5 key stakeholders
5. VALIDATE: Confirm categorization makes sense for user's context
6. COMPLETE: Summarize stakeholder landscape

STRUCTURED OUTPUT TO EXTRACT:
- stakeholders: Array<{name: string, role: string, power: 'high'|'medium'|'low', interest: 'high'|'medium'|'low', influence: string}>
- keyStakeholders: string[] (top 3-5 names)

REFERENCE PRIOR CONTEXT:
- Use the targetUser from Challenge step
- Connect stakeholders to the HMW statement

ASK PROBING QUESTIONS:
- "Who will use this solution?"
- "Who has budget authority?"
- "Who could block this?"
- "Who needs to be kept informed?"

AVOID:
- Generic stakeholder lists
- Missing critical decision-makers
- Conflating users with stakeholders
`,

  // Templates for remaining 8 steps would follow similar pattern
  // Each with: facilitation phases, structured output schema, key questions, what to avoid
};

export function getStepPromptTemplate(stepId: string): string {
  return STEP_TEMPLATES[stepId] || STEP_TEMPLATES.challenge;
}
```

**Rationale:** Each step has unique facilitation goals. Step 1 extracts the problem, Step 3 conducts synthetic interviews, Step 8 generates ideas. Generic prompts dilute effectiveness.

#### Integration with Existing Chat Route

**Modify `/src/app/api/chat/route.ts`:**

```typescript
import { streamText, convertToModelMessages } from 'ai';
import { chatModel } from '@/lib/ai/chat-config';
import { saveMessages } from '@/lib/ai/message-persistence';
import { loadPriorContext } from '@/lib/ai/context-assembly';
import { buildStepSystemPrompt } from '@/lib/ai/prompt-templates';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, sessionId, stepId } = await req.json();

    if (!sessionId || !stepId) {
      return new Response(
        JSON.stringify({ error: 'sessionId and stepId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // NEW: Load prior context and build dynamic prompt
    const priorContext = await loadPriorContext(sessionId, stepId);
    const systemPrompt = buildStepSystemPrompt(stepId, priorContext);

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: chatModel,
      system: systemPrompt, // Dynamic, step-aware (changed from static SYSTEM_PROMPT)
      messages: modelMessages,
    });

    result.consumeStream();

    return result.toUIMessageStreamResponse({
      sendReasoning: false,
      originalMessages: messages,
      onFinish: async ({ messages: responseMessages }) => {
        await saveMessages(sessionId, stepId, responseMessages);
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

**Impact:** Minimal changes to existing code. Chat route gets step-aware prompts by calling new utility functions.

#### Prompt Template Storage Decision

**Option A: Hardcoded in code (RECOMMENDED)**
- Pro: Version controlled, type-safe, fast to load
- Pro: Deploy via git, no database migration needed
- Con: Requires code deploy to update prompts

**Option B: Database storage in `stepDefinitions` table**
- Pro: Update prompts without deploy
- Con: Harder to version control, requires migration
- Con: Adds database query on every request

**Decision:** Hardcode templates in `/src/lib/ai/step-prompt-templates.ts` for v1.0. The `stepDefinitions.promptTemplate` column exists but remains unused. Move to database storage in v2.0 if prompt iteration requires frequent non-code updates.

## Integration Point 3: Back-and-Revise with Cascading Updates

### Current State (MVP 0.5)

**Navigation:** Linear forward-only via `StepNavigation` component
- User can click "Next Step" to advance
- Sequential enforcement: cannot skip to Step 5 without completing Steps 1-4
- No "Edit Step 2" or "Go Back" functionality

**Problem:** User cannot revise earlier steps. Once Step 5 is complete, user cannot go back to Step 2, change their stakeholder mapping, and have Steps 3-5 recognize the context changed.

### Cascading Update Challenge

**Scenario:**
1. User completes Steps 1-5
2. User navigates back to Step 2, changes stakeholder list
3. Steps 3-5 were based on old stakeholder context
4. **Question:** How do Steps 3-5 know their context is now stale?

**Solution:** Invalidation timestamps with lazy regeneration

### Integration Strategy

#### Invalidation Tracking (using existing schema additions)

**Schema additions already covered in Integration Point 1:**
- `outputUpdatedAt`: When this step's structured output was last updated
- `contextInvalidatedAt`: When prior context this step depends on changed
- `stepOrder`: For efficient invalidation queries

**Invalidation rule:** If `contextInvalidatedAt > outputUpdatedAt`, this step's output is stale.

#### Data Flow: User Revises Step 2

```
User clicks "Edit Step 2" in sidebar (or navigates to step 2)
    ↓
Navigate to /workshop/[sessionId]/step/2
    ↓
User changes conversation, modifies stakeholder list
    ↓
User clicks "Complete Step" (re-completion)
    ↓
Server Action: completeStep(sessionId, 'stakeholder-mapping')
    ↓
1. Extract new structured output
    ↓
2. Update workshopSteps SET
     output = newOutput,
     outputUpdatedAt = NOW(),
     status = 'complete'
   WHERE stepId = 'stakeholder-mapping'
    ↓
3. Invalidate downstream steps:
   UPDATE workshopSteps
   SET contextInvalidatedAt = NOW()
   WHERE workshopId = [id]
     AND stepOrder > 2
     AND status = 'complete'
    ↓
4. Update workshop.updatedAt = NOW()
    ↓
Frontend: Show visual indicator "⚠ Context changed" on Steps 3-10
```

**Implementation:** `/src/app/actions/complete-step.ts`

```typescript
'use server';

import { db } from '@/db/client';
import { workshopSteps, sessions } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { getStepById } from '@/lib/workshop/step-metadata';
import { loadMessages } from '@/lib/ai/message-persistence';
import { extractStepOutput } from '@/lib/ai/structured-extraction';
import { generateContextSummary } from '@/lib/ai/context-summarization';

export async function completeStep(
  sessionId: string,
  stepId: string
): Promise<void> {
  const step = getStepById(stepId);
  if (!step) throw new Error(`Invalid step ID: ${stepId}`);

  // 1. Load messages and extract structured output
  const messages = await loadMessages(sessionId, stepId);
  const output = await extractStepOutput(sessionId, stepId, messages);

  // 2. Load session to get workshopId
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { workshop: true },
  });

  if (!session) throw new Error('Session not found');

  // 3. Update this step
  const now = new Date();
  await db
    .update(workshopSteps)
    .set({
      output,
      outputUpdatedAt: now,
      status: 'complete',
      completedAt: now,
    })
    .where(and(
      eq(workshopSteps.workshopId, session.workshop.id),
      eq(workshopSteps.stepId, stepId)
    ));

  // 4. Invalidate downstream steps (all steps with order > current)
  await db
    .update(workshopSteps)
    .set({ contextInvalidatedAt: now })
    .where(and(
      eq(workshopSteps.workshopId, session.workshop.id),
      gt(workshopSteps.stepOrder, step.order),
      eq(workshopSteps.status, 'complete')
    ));

  // 5. Generate context summary (fire-and-forget, non-blocking)
  generateContextSummary(sessionId, stepId).catch(err =>
    console.error('Summary generation failed:', err)
  );
}
```

#### Visual Indicator: Stale Context Warning

**Modify `/src/components/layout/workshop-sidebar.tsx` to show invalidation:**

```typescript
'use client';

import { AlertCircle } from 'lucide-react';

// ... in the step mapping ...

{steps.map((step) => {
  const isStale = step.contextInvalidatedAt &&
                  step.outputUpdatedAt &&
                  step.contextInvalidatedAt > step.outputUpdatedAt;

  return (
    <SidebarMenuItem key={step.id}>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link href={`/workshop/${sessionId}/step/${step.order}`}>
          <span>{step.name}</span>
          {isStale && (
            <AlertCircle
              className="ml-auto h-4 w-4 text-warning"
              title="Context changed — consider reviewing"
            />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
})}
```

**User experience:**
- User sees ⚠ warning icon next to Steps 3-10 after editing Step 2
- Clicking warning shows: "You changed earlier steps. This step's outputs may be outdated. Review?"
- User can click step to re-run with updated context
- OR user can continue and ignore warning (outputs remain but flagged)

#### Regeneration Strategy: Lazy (for v1.0)

**Lazy regeneration (RECOMMENDED for v1.0):**
- Invalidate timestamps immediately
- Show warnings in UI
- User manually reviews and re-completes steps
- Pro: User control, no surprise AI costs
- Con: User burden to fix

**Eager regeneration (defer to v2.0):**
- When Step 2 changes, auto-regenerate Steps 3-10 outputs
- Pro: Everything stays consistent
- Con: Expensive (9 AI calls), slow, user loses control

**Decision:** Lazy regeneration for v1.0. Add eager regeneration as optional "Auto-update downstream steps" toggle in v2.0.

#### Conversation History Handling

**Question:** When user goes back to Step 2, do they see the old conversation or start fresh?

**Answer:** Show old conversation (immutable history) BUT allow continuation.

**Implementation:**
- `chatMessages` table is append-only (never delete)
- When user revisits Step 2, load all existing messages
- User sees full conversation history
- User can send new messages to revise
- On "Complete Step" button, extract structured output from ALL messages (old + new)

**Trade-off:** Conversation grows unbounded. For MVP 1.0, acceptable. For production, add message archival (move old messages to cold storage after 90 days).

## Integration Point 4: Auto-Save

### Current State (MVP 0.5)

**Save points:**
- Messages saved via `onFinish` callback in `/api/chat` route after each AI response
- Workshop creation via Server Action
- Step navigation updates step status

**Gaps:**
- No periodic auto-save during typing
- No save on browser close/refresh
- No optimistic UI updates for saves

### Integration Strategy

#### Save Trigger Points

1. **Periodic auto-save (every 2 seconds while typing)** — debounced
2. **On AI response completion (existing via `onFinish`)** — already working
3. **On browser close/refresh (via `beforeunload` event)** — new
4. **On navigation away from step** — new

#### Implementation: Debounced Auto-Save

**Install dependency:**
```bash
npm install use-debounce
```

**Modify `ChatPanel` component:**

```typescript
// src/components/workshop/chat-panel.tsx
'use client';

import { useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { saveMessagesDraft } from '@/app/actions/save-messages-draft';

export function ChatPanel({ stepOrder, sessionId, initialMessages }: ChatPanelProps) {
  const step = getStepByOrder(stepOrder);
  const { messages } = useChat({ ... });

  // Debounced auto-save: triggers 2 seconds after last message change
  const debouncedSave = useDebouncedCallback(
    async (msgs: UIMessage[]) => {
      try {
        await saveMessagesDraft(sessionId, step.id, msgs);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    },
    2000 // 2 second debounce
  );

  // Auto-save when messages change
  useEffect(() => {
    if (messages.length > 0) {
      debouncedSave(messages);
    }
  }, [messages, debouncedSave]);

  // Save on unmount (navigation away)
  useEffect(() => {
    return () => {
      if (messages.length > 0) {
        saveMessagesDraft(sessionId, step.id, messages);
      }
    };
  }, [sessionId, step.id, messages]);

  // ... rest of component
}
```

**Server Action:** `/src/app/actions/save-messages-draft.ts`

```typescript
'use server';

import { saveMessages } from '@/lib/ai/message-persistence';
import type { UIMessage } from 'ai';

export async function saveMessagesDraft(
  sessionId: string,
  stepId: string,
  messages: UIMessage[]
): Promise<void> {
  // Reuse existing saveMessages function (handles deduplication)
  await saveMessages(sessionId, stepId, messages);
}
```

**Rationale:** Reuse existing `saveMessages()` logic which already handles deduplication via `messageId` comparison. No duplicate writes.

#### Implementation: Browser Close/Refresh Save

**Add to `ChatPanel`:**

```typescript
// Save on browser close/refresh
useEffect(() => {
  const handleBeforeUnload = () => {
    // Use navigator.sendBeacon for reliable save on page unload
    const payload = JSON.stringify({
      sessionId,
      stepId: step.id,
      messages,
    });
    navigator.sendBeacon('/api/save-on-close', payload);
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [sessionId, step.id, messages]);
```

**API Route:** `/src/app/api/save-on-close/route.ts`

```typescript
import { saveMessages } from '@/lib/ai/message-persistence';

export async function POST(req: Request) {
  try {
    const { sessionId, stepId, messages } = await req.json();
    await saveMessages(sessionId, stepId, messages);
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Save on close failed:', error);
    return new Response('Error', { status: 500 });
  }
}
```

**Trade-off:** `navigator.sendBeacon()` has size limits (~64KB). If message array is large, may fail. For MVP 1.0, acceptable. For production, add fallback to regular fetch with keepalive.

#### Optimistic UI Updates

**For step completion, use React's `useOptimistic` hook:**

```typescript
// src/components/workshop/step-navigation.tsx
'use client';

import { useOptimistic, useTransition } from 'react';
import { completeStep } from '@/app/actions/complete-step';

export function StepNavigation({ sessionId, currentStepOrder, currentStepId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<string>('in_progress');

  const handleComplete = async () => {
    startTransition(async () => {
      setOptimisticStatus('complete'); // Optimistic update
      try {
        await completeStep(sessionId, currentStepId);
        // If success, optimistic state syncs with server
      } catch (error) {
        console.error('Complete step failed:', error);
        // If error, optimistic state reverts
      }
    });
  };

  return (
    <Button onClick={handleComplete} disabled={isPending}>
      {optimisticStatus === 'complete' ? '✓ Completed' : 'Complete Step'}
    </Button>
  );
}
```

**Benefit:** User sees instant feedback ("✓ Completed") while server processes. If server fails, UI reverts with error message.

### Schema Requirements

**No schema changes needed.** Auto-save reuses existing `chatMessages` table and `saveMessages()` deduplication logic.

### Error Handling

**Network failure during auto-save:**
- Store unsaved messages in localStorage as fallback
- On reconnect, attempt to flush from localStorage to server
- Show "⚠ Not saved — check connection" warning

**Implementation:** Add error boundary around auto-save:

```typescript
const debouncedSave = useDebouncedCallback(async (msgs) => {
  try {
    await saveMessagesDraft(sessionId, step.id, msgs);
    localStorage.removeItem(`unsaved_${sessionId}_${step.id}`);
  } catch (error) {
    console.error('Auto-save failed:', error);
    localStorage.setItem(`unsaved_${sessionId}_${step.id}`, JSON.stringify(msgs));
  }
}, 2000);
```

## Integration Point 5: Full Data Flow (End-to-End)

### Context Flow Diagram

```
┌────────────────────────────────────────────────────────────────┐
│  USER INTERACTION                                               │
└────────────┬───────────────────────────────────────────────────┘
             │
             ↓
┌────────────────────────────────────────────────────────────────┐
│  FRONTEND: ChatPanel (Client Component)                         │
│  - useChat() hook from AI SDK                                   │
│  - Auto-save with useDebouncedCallback (2s)                     │
│  - sendMessage() on user input                                  │
└────────────┬───────────────────────────────────────────────────┘
             │
             ↓
┌────────────────────────────────────────────────────────────────┐
│  API ROUTE: /api/chat (POST)                                    │
│  1. Load prior context: loadPriorContext(sessionId, stepId)     │
│  2. Build system prompt: buildStepSystemPrompt(stepId, context) │
│  3. Stream AI response: streamText({ system, messages })        │
│  4. On finish: saveMessages(sessionId, stepId, messages)        │
└────────────┬───────────────────────────────────────────────────┘
             │
             ↓
┌────────────────────────────────────────────────────────────────┐
│  AI SDK: streamText()                                           │
│  - Sends request to Gemini API                                  │
│  - Streams response back to frontend                            │
│  - Triggers onFinish callback with full conversation            │
└────────────┬───────────────────────────────────────────────────┘
             │
             ↓
┌────────────────────────────────────────────────────────────────┐
│  DATABASE: Message Persistence                                  │
│  - saveMessages() deduplicates by messageId                     │
│  - INSERT into chatMessages table                               │
└─────────────────────────────────────────────────────────────────┘

             ┌───────────────────────────────────────┐
             │  USER CLICKS "COMPLETE STEP"          │
             └───────────┬───────────────────────────┘
                         │
                         ↓
┌────────────────────────────────────────────────────────────────┐
│  SERVER ACTION: completeStep(sessionId, stepId)                 │
│  1. Load messages from chatMessages                             │
│  2. Extract structured output: generateObject({ schema })       │
│  3. Validate with Zod schema                                    │
│  4. UPDATE workshopSteps SET output, outputUpdatedAt            │
│  5. Invalidate downstream: UPDATE workshopSteps SET invalidated │
│  6. Background: generateContextSummary()                        │
└────────────┬───────────────────────────────────────────────────┘
             │
             ↓
┌────────────────────────────────────────────────────────────────┐
│  DATABASE: Structured Output Storage                            │
│  - UPDATE workshop_steps.output (JSONB)                         │
│  - UPDATE workshop_steps.output_updated_at                      │
│  - UPDATE downstream steps.context_invalidated_at               │
└─────────────────────────────────────────────────────────────────┘

             ┌───────────────────────────────────────┐
             │  BACKGROUND JOB                       │
             └───────────┬───────────────────────────┘
                         │
                         ↓
┌────────────────────────────────────────────────────────────────┐
│  CONTEXT SUMMARIZATION: generateContextSummary()                │
│  1. Load all messages for session+step                          │
│  2. Call streamText() with summarization prompt                 │
│  3. INSERT into contextSummaries table                          │
└─────────────────────────────────────────────────────────────────┘

             ┌───────────────────────────────────────┐
             │  USER NAVIGATES TO NEXT STEP          │
             └───────────┬───────────────────────────┘
                         │
                         ↓
┌────────────────────────────────────────────────────────────────┐
│  SSR: /workshop/[sessionId]/step/[nextStepId]/page.tsx          │
│  1. Load current step messages: loadMessages(sessionId, stepId) │
│  2. Pass to ChatPanel as initialMessages                        │
│  (Prior context loaded server-side in /api/chat route)          │
└────────────┬───────────────────────────────────────────────────┘
             │
             ↓
┌────────────────────────────────────────────────────────────────┐
│  NEXT STEP CONVERSATION                                         │
│  - AI system prompt includes prior context                      │
│  - AI references decisions from previous steps                  │
│  - Conversation grounded in workshop history                    │
└─────────────────────────────────────────────────────────────────┘
```

### Data Tables Involved

**Reads:**
- `sessions` — Fetch session metadata
- `workshops` — Fetch workshop details
- `workshopSteps` — Load structured outputs, check status/invalidation
- `chatMessages` — Load conversation history per step
- `contextSummaries` — Load compressed context from prior steps
- `stepDefinitions` — Get step metadata (order, name, description)

**Writes:**
- `chatMessages` — Insert new messages (on every AI response + auto-save)
- `workshopSteps` — Update output, status, timestamps, invalidation
- `contextSummaries` — Insert summaries after step completion
- `workshops` — Update updated_at timestamp

**Hot tables:** `chatMessages` (high write volume), `workshopSteps` (frequent updates)

**Index requirements:**
- `chatMessages`: Composite index on (sessionId, stepId) — ✓ ALREADY EXISTS
- `workshopSteps`: Index on (workshopId, stepOrder) — ⚠ NEEDS ADDING
- `contextSummaries`: Composite index on (sessionId, stepId) — ✓ WILL BE ADDED

## New Components Needed

### Backend Modules

**1. `/src/lib/ai/structured-extraction.ts`**
- Purpose: Extract structured JSON from conversations using AI SDK's `generateObject()`
- Exports: `extractStepOutput(sessionId, stepId, messages): Promise<StepOutput>`
- Dependencies: AI SDK, Zod schemas, step metadata

**2. `/src/lib/ai/context-summarization.ts`**
- Purpose: Generate conversation summaries for context compression
- Exports: `generateContextSummary(sessionId, stepId): Promise<void>`
- Dependencies: AI SDK streamText, database

**3. `/src/lib/ai/context-assembly.ts`**
- Purpose: Load and format prior context for injection into system prompts
- Exports: `loadPriorContext(sessionId, currentStepId): Promise<string>`
- Dependencies: Database queries, step metadata

**4. `/src/lib/ai/prompt-templates.ts`**
- Purpose: Build dynamic step-aware system prompts
- Exports: `buildStepSystemPrompt(stepId, priorContext): string`
- Dependencies: Step metadata, prompt templates

**5. `/src/lib/workshop/step-schemas.ts`**
- Purpose: Zod schemas for structured outputs per step
- Exports: `getStepSchema(stepId): ZodSchema`, individual schemas per step
- Dependencies: Zod

**6. `/src/lib/workshop/step-prompt-templates.ts`**
- Purpose: Step-specific facilitation prompt templates
- Exports: `getStepPromptTemplate(stepId): string`
- Dependencies: None (static templates)

### Server Actions

**7. `/src/app/actions/complete-step.ts`**
- Purpose: Server Action for step completion with extraction and invalidation
- Exports: `completeStep(sessionId, stepId): Promise<void>`
- Dependencies: All lib/ai modules, database

**8. `/src/app/actions/save-messages-draft.ts`**
- Purpose: Server Action for auto-save during typing
- Exports: `saveMessagesDraft(sessionId, stepId, messages): Promise<void>`
- Dependencies: Message persistence module

### API Routes

**9. `/src/app/api/save-on-close/route.ts`**
- Purpose: API endpoint for navigator.sendBeacon() saves on browser close
- Handler: POST handler saving messages
- Dependencies: Message persistence module

### Database Schema

**10. `/src/db/schema/context-summaries.ts`**
- Purpose: New database table schema for context summaries
- Exports: `contextSummaries` table definition
- Dependencies: Drizzle ORM

## Modified Components

### 1. `/src/app/api/chat/route.ts`
**Changes:**
- Import `loadPriorContext` and `buildStepSystemPrompt`
- Load prior context before streamText()
- Build dynamic system prompt with context
- Pass step-aware prompt to AI

### 2. `/src/components/workshop/chat-panel.tsx`
**Changes:**
- Install and import `use-debounce`
- Add auto-save with debounce hook
- Add save-on-unmount hook
- Add save-on-beforeunload hook
- (Optional) Add save status indicator

### 3. `/src/components/workshop/step-navigation.tsx`
**Changes:**
- Add "Complete Step" button
- Import `useOptimistic` and `useTransition`
- Call `completeStep()` Server Action on click
- Show loading/success states with optimistic UI

### 4. `/src/components/layout/workshop-sidebar.tsx`
**Changes:**
- Import `AlertCircle` from lucide-react
- Query workshop steps to check invalidation timestamps
- Show warning icon for stale steps
- Add tooltip explaining invalidation

### 5. `/src/db/schema/steps.ts`
**Changes:**
- Add `outputUpdatedAt` timestamp column
- Add `contextInvalidatedAt` timestamp column
- Add `stepOrder` integer column
- Add index on (workshopId, stepOrder)

### 6. `/src/db/schema/index.ts`
**Changes:**
- Export new `contextSummaries` table
- Export updated `workshopSteps` types

## Schema Changes Summary

### New Tables

**1. `context_summaries`**
```sql
CREATE TABLE context_summaries (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  summary_type TEXT NOT NULL CHECK (summary_type IN ('conversation', 'key-decisions', 'user-inputs')),
  content TEXT NOT NULL,
  token_count INTEGER,
  generated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX context_summaries_session_step_idx ON context_summaries(session_id, step_id);
```

### Modified Tables

**1. `workshop_steps` — Add columns**
```sql
ALTER TABLE workshop_steps
  ADD COLUMN output_updated_at TIMESTAMP(3),
  ADD COLUMN context_invalidated_at TIMESTAMP(3),
  ADD COLUMN step_order INTEGER;

-- Backfill step_order from step_definitions
UPDATE workshop_steps ws
SET step_order = sd.order
FROM step_definitions sd
WHERE ws.step_id = sd.id;

ALTER TABLE workshop_steps
  ALTER COLUMN step_order SET NOT NULL;

CREATE INDEX workshop_steps_workshop_order_idx ON workshop_steps(workshop_id, step_order);
```

### Migration Files

**Drizzle migration:**
```bash
npx drizzle-kit generate
# Generates migration file: drizzle/0001_add_v1_context_features.sql
npx drizzle-kit push
```

## Build Order (Considering Dependencies)

### Phase 1: Schema Foundation
**Goal:** Database schema ready for v1.0 features
**Duration:** 1 day
**Dependencies:** None

1. Create `context-summaries.ts` schema file
2. Modify `steps.ts` to add new columns
3. Update `schema/index.ts` exports
4. Generate and run Drizzle migration
5. Test schema changes with sample data

### Phase 2: Structured Output Extraction
**Goal:** Extract and store structured outputs per step
**Duration:** 2 days
**Dependencies:** Phase 1

1. Create Zod schemas in `step-schemas.ts` (all 10 steps)
2. Create `structured-extraction.ts` with `extractStepOutput()`
3. Create `complete-step.ts` Server Action
4. Test extraction with sample conversations
5. Verify JSON writes to `workshop_steps.output`

### Phase 3: Context Summarization
**Goal:** Generate and store conversation summaries
**Duration:** 1 day
**Dependencies:** Phase 2

1. Create `context-summarization.ts` with `generateContextSummary()`
2. Integrate into `complete-step.ts` as background job
3. Test summarization quality with real conversations
4. Verify writes to `context_summaries` table

### Phase 4: Prior Context Loading
**Goal:** Assemble context from prior steps for AI injection
**Duration:** 1 day
**Dependencies:** Phase 3

1. Create `context-assembly.ts` with `loadPriorContext()`
2. Write query logic to fetch outputs + summaries
3. Format context string for prompt injection
4. Unit test context assembly with sample data

### Phase 5: Step-Aware Prompts
**Goal:** Dynamic system prompts per step with prior context
**Duration:** 3 days (prompt engineering is iterative)
**Dependencies:** Phase 4

1. Create `step-prompt-templates.ts` with all 10 templates
2. Create `prompt-templates.ts` with `buildStepSystemPrompt()`
3. Modify `/api/chat/route.ts` to use dynamic prompts
4. Test AI responses reference prior context correctly
5. Iterate on prompt templates based on quality

### Phase 6: Cascading Invalidation
**Goal:** Invalidate downstream steps when prior steps change
**Duration:** 1 day
**Dependencies:** Phase 2

1. Add invalidation logic to `complete-step.ts`
2. Query to update `context_invalidated_at` for downstream steps
3. Add index on (workshopId, stepOrder) for efficient queries
4. Test re-completion of Step 2 invalidates Steps 3-10

### Phase 7: Auto-Save
**Goal:** Debounced auto-save and save-on-close
**Duration:** 1 day
**Dependencies:** None (uses existing saveMessages())

1. Install `use-debounce` package
2. Create `save-messages-draft.ts` Server Action
3. Modify `ChatPanel` to add auto-save hooks
4. Create `/api/save-on-close` route
5. Test auto-save triggers and deduplication

### Phase 8: Step Completion UI
**Goal:** "Complete Step" button with optimistic updates
**Duration:** 1 day
**Dependencies:** Phase 2

1. Modify `StepNavigation` to add Complete button
2. Implement `useOptimistic` for instant feedback
3. Call `completeStep()` Server Action on click
4. Show loading/success states
5. Test error handling and rollback

### Phase 9: Invalidation Warnings
**Goal:** Show visual indicators for stale steps
**Duration:** 0.5 day
**Dependencies:** Phase 6

1. Modify `WorkshopSidebar` to check invalidation timestamps
2. Add warning icons (AlertCircle) for stale steps
3. Add tooltip explaining invalidation
4. Test warning appears after editing earlier step

### Phase 10: Integration Testing
**Goal:** Validate full workflow across all features
**Duration:** 2 days
**Dependencies:** All phases

1. Test Steps 1-3 completion with structured outputs
2. Verify Step 3 AI references Step 1-2 context
3. Edit Step 2, verify Steps 3-10 invalidated
4. Test auto-save during typing
5. Test browser close/refresh saves messages
6. Load testing: 10 steps with 50+ messages each
7. Token budget monitoring

### Total Duration: ~13.5 days

**Critical path:** Phase 1 → 2 → 3 → 4 → 5 (longest at 3 days for prompts)

**Parallelizable:**
- Phase 7 (auto-save) can start after Phase 1
- Phase 8 (step completion UI) can start after Phase 2
- Phase 9 (warnings) can start after Phase 6

**Optimized timeline with parallelization:** ~10 days

## Anti-Patterns to Avoid

### 1. Full Conversation History in Every Prompt
**Wrong:** Send all messages from Steps 1-10 on every AI request
**Why:** Token budget exhaustion, context degradation, high cost
**Instead:** Hierarchical context (current verbatim, prior as summaries + outputs)

### 2. Regenerating All Outputs on Edit
**Wrong:** When Step 2 changes, auto-regenerate Steps 3-10 in background
**Why:** Expensive (8-9 AI calls), slow, loss of user control
**Instead:** Lazy invalidation with timestamps and visual warnings

### 3. Storing Summaries in Message Content
**Wrong:** Store AI summaries as special "system" messages in chatMessages
**Why:** Pollutes conversation history, complex queries, no structure
**Instead:** Separate contextSummaries table with typed summaryType

### 4. Client-Side Structured Extraction
**Wrong:** Extract structured data in frontend with regex
**Why:** Unreliable, insecure (exposes API keys), no validation
**Instead:** Server-side extraction with AI SDK's generateObject() and Zod

### 5. Blocking Step Completion on Summarization
**Wrong:** User clicks "Complete Step", UI blocks until summary generates
**Why:** Poor UX, error-prone, unnecessary coupling
**Instead:** Fire-and-forget background job for summarization

### 6. No Deduplication in Auto-Save
**Wrong:** Every auto-save writes duplicate messages to database
**Why:** Database bloat, query performance degradation
**Instead:** Check existing messageId values before insert

### 7. Hardcoded Step Order in Invalidation Logic
**Wrong:** `if (stepId === 'challenge') invalidateSteps(['stakeholder-mapping', ...])`
**Why:** Brittle, error-prone, not scalable
**Instead:** Query-based invalidation using stepOrder column

## Sources

### Primary Sources (HIGH confidence)

**Vercel AI SDK:**
- [AI SDK Core: Generating Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)
- [AI SDK Core: generateObject](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-object)
- [Structured Data Extraction | Vercel Academy](https://vercel.com/academy/ai-sdk/structured-data-extraction)

**Gemini API:**
- [Context caching | Gemini API](https://ai.google.dev/gemini-api/docs/caching)
- [Gemini API Context Caching: Complete Guide](https://www.aifreeapi.com/en/posts/gemini-api-context-caching-reduce-cost)

**Next.js Integration:**
- [Data Fetching: Server Actions and Mutations | Next.js](https://nextjs.org/docs/14/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Implementing Optimistic Updates in Next.js](https://jb.desishub.com/blog/implementing-optimistic-update)

### Secondary Sources (MEDIUM-HIGH confidence)

**Multi-Step Conversation Patterns:**
- [How to Ensure Consistency in Multi-Turn AI Conversations](https://www.getmaxim.ai/articles/how-to-ensure-consistency-in-multi-turn-ai-conversations/)
- [Building Multi-Turn Conversations with AI Agents: The 2026 Playbook](https://medium.com/ai-simplified-in-plain-english/building-multi-turn-conversations-with-ai-agents-the-2026-playbook-45592425d1db)
- [LLMs Get Lost In Multi-Turn Conversation](https://arxiv.org/pdf/2505.06120)

**Context Summarization:**
- [A practical guide to AI conversation summarization](https://www.eesel.ai/blog/ai-conversation-summarization)
- [Building an AI Summarizer for Complex Support Conversations](https://blog.gopenai.com/building-an-ai-summarizer-for-complex-support-conversations-a-step-by-step-guide-5ad6bcb7e435)

**Auto-Save Patterns:**
- [Autosaving Entries - Build an AI-Powered Fullstack Next.js App](https://frontendmasters.com/courses/fullstack-app-next-v3/autosaving-entries/)
- [Implementing Optimistic UI in React.js/Next.js](https://dev.to/olaleyeblessing/implementing-optimistic-ui-in-reactjsnextjs-4nkk)

---
*Architecture integration research for: WorkshopPilot.ai v1.0*
*Researched: 2026-02-08*
*Confidence: HIGH*
