# Technology Stack — v1.0 AI Facilitation Features

**Project:** WorkshopPilot.ai v1.0
**Researched:** 2026-02-08
**Confidence:** HIGH

## Context: What This Research Covers

This stack research focuses ONLY on **new additions/changes for v1.0 AI facilitation features**. The base stack (Next.js 16.1.1 + React 19 + Tailwind 4 + shadcn/ui + Clerk + Neon + Drizzle + Gemini 2.0 Flash via AI SDK 6.0.77) was researched and validated for MVP 0.5 and is already deployed at workshoppilot.ai.

**v1.0 adds:**
1. Dual-layer context architecture (structured JSON artifacts + conversation summaries per step)
2. Step-aware AI prompting with system prompts that reference prior step outputs
3. Auto-save (periodic + on step completion)
4. Back-and-revise with cascading context updates

This research answers: **What stack additions/changes are needed for these NEW capabilities?**

---

## TL;DR — What to Add for v1.0

| Category | What's New | Action |
|----------|-----------|--------|
| Structured Output | Use AI SDK 6's `streamText` with `output` property | Already have AI SDK 6.0.77, use new API pattern |
| Auto-Save | use-debounce npm package | Install `use-debounce@^10.1.0` |
| Context Management | Database tables for step artifacts + summaries | Add new Drizzle schema tables (no new packages) |
| Cascading Updates | Zustand computed state pattern | Use existing Zustand, no new package |

**Key finding:** NO major new dependencies needed. v1.0 uses existing stack differently, not new stack.

---

## Core Technologies (No Changes)

The following technologies from v0.5 remain unchanged and require no action:

| Technology | Version | Purpose | v1.0 Usage |
|------------|---------|---------|------------|
| Vercel AI SDK | 6.0.77 (existing) | AI orchestration | NEW: Use `streamText` with `output` property for structured outputs per step |
| @ai-sdk/google | ^3.0.22 (existing) | Gemini provider | Same: Gemini 2.0 Flash for all chat interactions |
| Zod | ^4.3.6 (existing) | Schema validation | NEW: Define artifact schemas per step (HMW statement, persona, journey map) |
| Drizzle ORM | ^0.45.1 (existing) | Database ORM | NEW: Add tables for step_artifacts, step_summaries |
| Neon Postgres | Serverless (existing) | Database | NEW: Store structured artifacts + conversation summaries |
| Next.js | 16.1.1 (existing) | Framework | Same: Server Actions for auto-save, edge runtime for chat API |
| Zustand | Not installed yet | State management | NEW: Add for derived state and cascading context updates |

**Installation needed:** Only Zustand and use-debounce are new packages.

---

## New Packages for v1.0

### State Management

| Library | Version | Purpose | Why Needed for v1.0 |
|---------|---------|---------|---------------------|
| zustand | ^5.0.3 | Global state | Manage step artifacts in memory, computed/derived state for context cascading when user revises earlier steps. **Lightweight (1.5KB), selective subscriptions prevent unnecessary re-renders** |

**Why Zustand?** Context API would cause re-renders of all step components when any artifact changes. For 10 steps with cascading dependencies (Step 5 persona depends on Step 4 research), Zustand's selective subscriptions are critical.

**Integration point:** Zustand store mirrors database state in memory, updated via Server Actions. Step components subscribe to ONLY their dependencies (e.g., Step 6 subscribes to Step 5 persona artifact).

### Auto-Save Utilities

| Library | Version | Purpose | Why Needed for v1.0 |
|---------|---------|---------|---------------------|
| use-debounce | ^10.1.0 | Debounced value hook | Debounce user input (chat messages, artifact edits) before triggering auto-save. **Prevents database spam, reduces Neon serverless function invocations** |

**Why use-debounce?** Standard pattern for auto-save. Latest version (10.1.0) has `maxWait` option ensuring saves happen even during continuous typing, and `flush` method for save-on-unmount.

**Alternative considered:** Could hand-roll with `setTimeout`, but use-debounce handles cleanup, React 19 compatibility, and edge cases (component unmount, dependency changes).

**Integration point:** Wrap chat message content and artifact JSON in `useDebounce` hook, trigger Server Action save after 2 seconds of inactivity. Use `maxWait: 10000` to force save every 10 seconds during long typing sessions.

---

## Supporting Libraries (Already Installed, New Usage)

### date-fns (Already Installed)

| Library | Version | Purpose | Why Already There | v1.0 Usage |
|---------|---------|---------|-------------------|------------|
| date-fns | ^4.1.0 | Date utilities | Existing (v0.5) | NEW: Format "last saved at" timestamps for auto-save UI indicator |

**No action needed:** Already in package.json, just use it.

---

## What NOT to Install

| Package | Why You Might Consider It | Why NOT to Use It |
|---------|---------------------------|-------------------|
| zustand-computed | Auto-computed Zustand values | Adds middleware overhead. Hand-rolling computed selectors is 5 lines of code and more explicit |
| derive-zustand | Derived stores from other stores | Over-engineering for 10-step linear flow. Single store with computed selectors is simpler |
| react-query | Auto-save mutations | Next.js Server Actions already handle this. React Query adds caching layer we don't need (database is source of truth) |
| swr | State synchronization | Same reason as React Query. Server Actions + revalidatePath handles sync |
| lodash.debounce | Debounce utility | use-debounce is React-specific with hooks API. lodash.debounce requires manual cleanup |
| immer | Immutable state updates | Zustand already uses immer-style syntax via middleware if needed. Not required for simple artifact updates |

---

## Architecture Patterns for v1.0 Features

### Pattern 1: Structured Output Generation with AI SDK 6

**What changed:** AI SDK 6 deprecated `generateObject` and `streamObject`. Use `streamText` with `output` property instead.

**v0.5 (basic chat):**
```typescript
// src/app/api/chat/route.ts (existing)
const result = streamText({
  model: chatModel,
  system: SYSTEM_PROMPT,
  messages: modelMessages,
});
```

**v1.0 (structured artifacts per step):**
```typescript
import { streamText, Output } from 'ai';
import { z } from 'zod';

// Step 1 artifact schema
const hmwStatementSchema = z.object({
  problem: z.string().describe('The core problem statement'),
  targetUser: z.string().describe('Who experiences this problem'),
  constraint: z.string().describe('Key constraint or context'),
  hmwStatement: z.string().describe('Final "How Might We" question'),
});

// Chat API with structured output
const result = streamText({
  model: chatModel,
  system: getStepSystemPrompt(stepId, priorStepArtifacts),
  messages: modelMessages,
  output: Output.object({
    schema: hmwStatementSchema,
  }),
});

// Access structured output server-side
result.onFinish(async ({ output }) => {
  // output is typed as z.infer<typeof hmwStatementSchema>
  await saveStepArtifact(sessionId, stepId, output);
});
```

**Key insight:** Each step defines its own Zod schema for the artifact it produces. System prompt includes prior artifacts as context.

**Source:** [AI SDK Core: Generating Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data), [AI SDK 6 announcement](https://vercel.com/blog/ai-sdk-6)

### Pattern 2: Dual-Layer Context (Artifacts + Summaries)

**Problem:** 10-step conversation history explodes context window. Step 10 doesn't need all messages from Step 1-9, just the structured outputs.

**Solution:** Store two things per step:
1. **Structured artifact** (JSON) — HMW statement, persona, journey map
2. **Conversation summary** (text) — 2-3 sentence summary of what happened in that step's chat

**Database schema (NEW):**
```typescript
// src/db/schema/step-artifacts.ts (NEW FILE)
export const stepArtifacts = pgTable('step_artifacts', {
  id: text('id').primaryKey().$defaultFn(() => createPrefixedId('art')),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  stepId: text('step_id').notNull(), // 'challenge', 'stakeholders', etc.
  artifactType: text('artifact_type').notNull(), // 'hmw_statement', 'persona', etc.
  data: text('data').notNull(), // JSON.stringify(zod validated object)
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
});

export const stepSummaries = pgTable('step_summaries', {
  id: text('id').primaryKey().$defaultFn(() => createPrefixedId('sum')),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  stepId: text('step_id').notNull(),
  summary: text('summary').notNull(), // AI-generated 2-3 sentence summary
  createdAt: timestamp('created_at', { mode: 'date', precision: 3 })
    .notNull()
    .defaultNow(),
});
```

**Context passing pattern:**
```typescript
// src/lib/ai/context-builder.ts (NEW FILE)
async function buildStepContext(sessionId: string, currentStepOrder: number) {
  // Fetch all artifacts from completed steps BEFORE current step
  const priorArtifacts = await db.query.stepArtifacts.findMany({
    where: and(
      eq(stepArtifacts.sessionId, sessionId),
      // Only artifacts from earlier steps
    ),
  });

  // Fetch summaries (not full message history)
  const priorSummaries = await db.query.stepSummaries.findMany({
    where: eq(stepSummaries.sessionId, sessionId),
  });

  // Build system prompt
  return `
You are facilitating Step ${currentStepOrder} of the design thinking process.

PRIOR WORK SUMMARY:
${priorSummaries.map(s => `- Step ${s.stepId}: ${s.summary}`).join('\n')}

KEY ARTIFACTS FROM EARLIER STEPS:
${priorArtifacts.map(a => `- ${a.artifactType}: ${JSON.parse(a.data)}`).join('\n')}

YOUR TASK FOR THIS STEP:
[Step-specific instructions]
  `.trim();
}
```

**Key insight:** AI sees STRUCTURED OUTPUTS from prior steps, not full conversation history. Dramatically reduces token usage.

**Source:** [Context Management for Deep Agents](https://blog.langchain.com/context-management-for-deepagents/), [Context Window Management Strategies](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/)

### Pattern 3: Auto-Save with Debounce

**Two save triggers:**
1. **Periodic** — Save every 2 seconds of chat inactivity (debounced)
2. **On milestone** — Save immediately when step completes or advances

**Client-side pattern:**
```typescript
// src/components/workshop/chat-panel.tsx (MODIFIED)
'use client';

import { useDebounce } from 'use-debounce';
import { useEffect } from 'react';
import { saveMessageDraft } from '@/actions/workshop-actions';

export function ChatPanel({ sessionId, stepId }) {
  const { messages } = useChat({ /* ... */ });

  // Debounce messages state (2 second delay, 10 second max wait)
  const [debouncedMessages] = useDebounce(messages, 2000, { maxWait: 10000 });

  // Auto-save when debounced messages change
  useEffect(() => {
    if (debouncedMessages.length > 0) {
      saveMessageDraft(sessionId, stepId, debouncedMessages);
    }
  }, [debouncedMessages, sessionId, stepId]);

  return (
    <div>
      {/* Chat UI */}
      <AutoSaveIndicator lastSaved={lastSavedAt} />
    </div>
  );
}
```

**Server Action:**
```typescript
// src/actions/workshop-actions.ts (MODIFIED)
'use server';

export async function saveMessageDraft(
  sessionId: string,
  stepId: string,
  messages: UIMessage[]
) {
  // Upsert messages (idempotent based on messageId)
  await saveMessages(sessionId, stepId, messages);

  // Return last saved timestamp for UI
  return { lastSaved: new Date().toISOString() };
}
```

**UI indicator pattern:**
```typescript
// src/components/workshop/auto-save-indicator.tsx (NEW FILE)
import { formatDistanceToNow } from 'date-fns';

export function AutoSaveIndicator({ lastSaved }: { lastSaved: Date | null }) {
  if (!lastSaved) return null;

  return (
    <div className="text-xs text-muted-foreground">
      Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
    </div>
  );
}
```

**Key insight:** Debounce prevents database spam during typing. `maxWait` ensures save happens even during long sessions. `flush()` method can be called on step completion for immediate save.

**Source:** [use-debounce npm](https://www.npmjs.com/package/use-debounce), [Autosave with React Hooks](https://www.synthace.com/blog/autosave-with-react-hooks), [Smarter Forms: useAutoSave Hook](https://darius-marlowe.medium.com/smarter-forms-in-react-building-a-useautosave-hook-with-debounce-and-react-query-d4d7f9bb052e)

### Pattern 4: Cascading Context Updates with Zustand

**Problem:** User goes back to Step 3, revises persona. Steps 4-10 artifacts may now be outdated and need regeneration flags.

**Solution:** Zustand store tracks artifact dependencies. When artifact changes, derived state marks dependent artifacts as "stale."

**Zustand store pattern:**
```typescript
// src/stores/workshop-store.ts (NEW FILE)
import { create } from 'zustand';

interface StepArtifact {
  stepId: string;
  data: any;
  updatedAt: Date;
  isStale: boolean; // Flag for "needs regeneration"
}

interface WorkshopStore {
  artifacts: Record<string, StepArtifact>;

  // Update artifact (triggers staleness cascade)
  updateArtifact: (stepId: string, data: any) => void;

  // Computed: Get artifacts a step depends on
  getDependencies: (stepId: string) => StepArtifact[];

  // Mark downstream artifacts as stale
  markDownstreamStale: (stepId: string) => void;
}

export const useWorkshopStore = create<WorkshopStore>((set, get) => ({
  artifacts: {},

  updateArtifact: (stepId, data) => {
    set((state) => ({
      artifacts: {
        ...state.artifacts,
        [stepId]: {
          stepId,
          data,
          updatedAt: new Date(),
          isStale: false,
        },
      },
    }));

    // Cascade staleness to dependent steps
    get().markDownstreamStale(stepId);
  },

  getDependencies: (stepId) => {
    // Define dependency graph
    const dependencies: Record<string, string[]> = {
      'journey-mapping': ['persona', 'research-synthesis'],
      'reframe': ['journey-mapping', 'challenge'],
      'ideation': ['reframe'],
      // ... etc
    };

    return (dependencies[stepId] || [])
      .map(depId => get().artifacts[depId])
      .filter(Boolean);
  },

  markDownstreamStale: (stepId) => {
    const stepOrder = getStepOrder(stepId);

    set((state) => {
      const newArtifacts = { ...state.artifacts };

      // Mark all artifacts from LATER steps as stale
      Object.keys(newArtifacts).forEach(id => {
        if (getStepOrder(id) > stepOrder) {
          newArtifacts[id] = {
            ...newArtifacts[id],
            isStale: true,
          };
        }
      });

      return { artifacts: newArtifacts };
    });
  },
}));
```

**Component usage:**
```typescript
// src/app/workshop/[sessionId]/step/[stepId]/page.tsx
export function StepPage() {
  const currentArtifact = useWorkshopStore(
    state => state.artifacts[currentStepId]
  );

  const dependencies = useWorkshopStore(
    state => state.getDependencies(currentStepId)
  );

  // Show warning if current artifact is stale
  if (currentArtifact?.isStale) {
    return (
      <Alert>
        Earlier steps changed. This artifact may be outdated.
        <Button onClick={regenerateArtifact}>Regenerate</Button>
      </Alert>
    );
  }

  // Pass dependencies to AI as context
  // ...
}
```

**Key insight:** Zustand's selective subscriptions mean only components that ACTUALLY depend on changed artifacts re-render. Not all 10 steps.

**Alternative considered:** React Context would work, but triggers re-renders of entire component tree. For 10 steps with complex UIs, this is a performance problem.

**Source:** [React State Management Cascading Updates](https://react-epic.gitbook.io/react-epic/docs/cascadingupdate), [Zustand Derived State](https://app.studyraid.com/en/read/11947/381036/selectors-and-derived-state), [Top React State Management Tools 2026](https://www.syncfusion.com/blogs/post/react-state-management-libraries)

---

## Installation Commands

```bash
# New dependencies for v1.0
npm install zustand use-debounce

# Verify existing dependencies are at correct versions
npm list ai @ai-sdk/google zod drizzle-orm

# Expected output:
# ai@6.0.77
# @ai-sdk/google@3.0.22
# zod@4.3.6
# drizzle-orm@0.45.1
```

---

## Database Schema Changes

**New tables needed for v1.0:**

```bash
# Generate new migration
npm run db:generate

# Migration file: drizzle/0001_add_step_artifacts.sql
```

**Schema files to create:**

1. `src/db/schema/step-artifacts.ts` — Step artifact storage (JSON data)
2. `src/db/schema/step-summaries.ts` — Conversation summaries per step

**Existing tables to modify:** NONE (no breaking changes)

---

## Configuration Changes

### Environment Variables

**No new env vars needed.** All v1.0 features use existing:
- `DATABASE_URL` (Neon)
- `GOOGLE_GENERATIVE_AI_API_KEY` (Gemini)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` (Clerk)

### AI SDK Configuration

**Update chat config for step-aware prompts:**

```typescript
// src/lib/ai/chat-config.ts (MODIFIED)
import { google } from '@ai-sdk/google';

export const chatModel = google('gemini-2.0-flash');

// NEW: Step-specific system prompts
export function getStepSystemPrompt(
  stepId: string,
  priorArtifacts: any[]
): string {
  const basePrompt = STEP_PROMPTS[stepId] || DEFAULT_PROMPT;

  if (priorArtifacts.length === 0) {
    return basePrompt;
  }

  // Inject prior artifacts into system prompt
  const contextSection = priorArtifacts
    .map(a => `${a.type}: ${JSON.stringify(a.data, null, 2)}`)
    .join('\n\n');

  return `${basePrompt}\n\nPRIOR WORK:\n${contextSection}`;
}

const STEP_PROMPTS: Record<string, string> = {
  challenge: 'You are facilitating the Challenge step...',
  stakeholders: 'You are facilitating Stakeholder Mapping...',
  // ... etc
};
```

---

## Version Compatibility

| Package | Current Version | v1.0 Requirement | Compatible? |
|---------|----------------|------------------|-------------|
| AI SDK (ai) | 6.0.77 | 6.0.x (for `output` property) | ✓ Yes |
| @ai-sdk/google | 3.0.22 | 3.0.x | ✓ Yes |
| Zod | 4.3.6 | 4.x | ✓ Yes |
| Drizzle ORM | 0.45.1 | 0.45.x | ✓ Yes |
| Next.js | 16.1.1 | 16.x (Server Actions) | ✓ Yes |
| React | 19.2.0 | 19.x | ✓ Yes |
| use-debounce | Not installed | 10.x | N/A (will install) |
| zustand | Not installed | 5.x | N/A (will install) |

**No breaking changes required.** All existing packages are compatible with v1.0 features.

---

## Migration from v0.5 to v1.0

| v0.5 Pattern | v1.0 Pattern | Breaking? |
|--------------|--------------|-----------|
| Generic system prompt | Step-specific prompts with artifact context | No — backward compatible, just extends |
| No structured output | `streamText` with `output: Output.object()` | No — AI SDK 6 supports both |
| No auto-save | Debounced auto-save with use-debounce | No — additive feature |
| No state management | Zustand store for artifacts | No — optional, doesn't affect existing code |
| chat_messages table only | Add step_artifacts + step_summaries tables | No — new tables, existing table unchanged |

**Migration effort:** LOW. All changes are additive, not breaking.

---

## Alternatives Considered

### Structured Output Generation

| Recommended | Alternative | Why Not Alternative |
|-------------|-------------|---------------------|
| AI SDK 6 `streamText` with `output` | Keep using v0.5 generic chat | Can't extract structured artifacts. Requires manual parsing of chat messages (error-prone, brittle) |
| Zod schemas per step | JSON Schema | Zod is already installed, integrates with TypeScript better, AI SDK docs use Zod as primary example |
| `Output.object()` | Deprecated `generateObject()` | AI SDK 6 deprecated it, will be removed in future version. Migration now prevents breaking changes later |

### State Management for Cascading Updates

| Recommended | Alternative | Why Not Alternative |
|-------------|-------------|---------------------|
| Zustand | React Context | Context triggers re-renders of all children. 10 steps with complex UIs = performance issue. Zustand has selective subscriptions |
| Zustand | Jotai | Jotai's atom model is overkill for linear 10-step flow. Zustand's single store is simpler, easier to debug |
| Zustand | Redux Toolkit | Redux adds boilerplate (actions, reducers, slices). Zustand is <100 lines for this use case, Redux would be 500+ |
| Hand-rolled computed selectors | zustand-computed middleware | Middleware adds dependency, computed selectors are 5 lines of code. YAGNI (You Aren't Gonna Need It) |

### Auto-Save Utilities

| Recommended | Alternative | Why Not Alternative |
|-------------|-------------|---------------------|
| use-debounce npm | Hand-rolled setTimeout | use-debounce handles cleanup, React 19 compatibility, edge cases (unmount, dependency changes). Reinventing wheel |
| use-debounce | lodash.debounce | lodash.debounce requires manual cleanup with useEffect. use-debounce is hooks-native |
| use-debounce | @react-hook/debounce | use-debounce has more features (maxWait, flush, isPending), more downloads (1390 dependents), more recent updates |
| Debounce (2s) + maxWait (10s) | Throttle only | Throttle saves TOO often during continuous typing. Debounce + maxWait balances responsiveness and database load |

### Context Management

| Recommended | Alternative | Why Not Alternative |
|-------------|-------------|---------------------|
| Artifacts + summaries dual-layer | Full message history | 10 steps × 20 messages/step = 200 messages in context. Exceeds Gemini context window, costs $$ tokens |
| Database storage | In-memory only | User refreshes page, loses everything. Database persistence is mandatory |
| JSON column in Postgres | NoSQL database (MongoDB) | Adding MongoDB doubles database complexity. Postgres JSONB is sufficient for structured artifacts |

---

## Performance Considerations

### 1. Debounce Timing Tradeoffs

| Setting | Pros | Cons | Recommendation |
|---------|------|------|----------------|
| 500ms debounce | Very responsive, feels instant | Hammers database, expensive on Neon serverless | ❌ Too aggressive |
| 2000ms debounce | Balanced, standard pattern | Slight delay before "saved" indicator | ✓ Recommended |
| 5000ms debounce | Minimal DB load | User might lose 5s of work on crash | ❌ Too conservative |
| No maxWait | Cleanest implementation | Continuous typing never saves | ❌ Dangerous |
| 10s maxWait | Ensures periodic saves | Slightly complex | ✓ Recommended |

**Chosen:** 2s debounce, 10s maxWait. Balances responsiveness and database load.

### 2. Zustand Store Size

**Concern:** 10 steps × large artifacts = memory bloat?

**Analysis:**
- Persona artifact: ~500 bytes JSON
- Journey map artifact: ~2KB JSON
- Total for 10 steps: ~10KB

**Verdict:** Not a concern. Even with 100 workshops open (unlikely), only 1MB.

### 3. Context Window Token Usage

**v0.5 (full message history):**
- Step 10 sees all messages from Steps 1-9
- ~200 messages × 50 tokens/message = 10,000 tokens input per request
- Cost: $$ (Gemini pricing per million tokens)

**v1.0 (artifacts + summaries):**
- Step 10 sees 9 summaries + 9 artifacts
- ~9 × 50 tokens (summary) + 9 × 100 tokens (artifact) = 1,350 tokens input
- Cost: $ (87% token reduction)

**Verdict:** Dual-layer context dramatically reduces token usage and cost.

---

## Testing Checklist for v1.0 Stack Integration

- [ ] `streamText` with `output: Output.object()` returns typed structured data
- [ ] Zod schema validation catches malformed AI outputs
- [ ] use-debounce triggers save after 2s inactivity
- [ ] use-debounce `maxWait` forces save during 10s+ typing session
- [ ] Zustand store updates trigger ONLY dependent component re-renders
- [ ] Cascading staleness marks downstream artifacts when upstream changes
- [ ] Database stores artifacts as JSON in step_artifacts table
- [ ] Summaries persist to step_summaries table
- [ ] System prompts include prior artifacts formatted correctly
- [ ] Auto-save indicator shows "Saved X seconds ago" with date-fns

---

## Sources

### AI SDK 6 Structured Output (HIGH confidence)

- [AI SDK Core: Generating Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) — Official docs, deprecation notice for generateObject
- [AI SDK 6 announcement](https://vercel.com/blog/ai-sdk-6) — Official Vercel blog, unification of generateText and generateObject
- [AI SDK Core: streamText reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) — Official API docs with output property
- [Structured Outputs with Vercel AI SDK](https://www.aihero.dev/structured-outputs-with-vercel-ai-sdk) — Community tutorial (MEDIUM confidence, verified with official docs)

### Context Management (HIGH confidence)

- [Context Management for Deep Agents](https://blog.langchain.com/context-management-for-deepagents/) — Compression and trimming strategies
- [Context Window Management Strategies](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/) — Balance context carefully for multi-turn interactions
- [Working With Message Histories in AI SDK](https://www.aihero.dev/vercel-ai-sdk-messages-array) — Message persistence patterns
- [AI SDK UI: Chatbot Message Persistence](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence) — Official persistence guide

### Auto-Save Patterns (HIGH confidence)

- [use-debounce npm](https://www.npmjs.com/package/use-debounce) — Package docs, version 10.1.0 confirmed
- [use-debounce GitHub](https://github.com/xnimorz/use-debounce) — Source code, features (maxWait, flush)
- [Autosave with React Hooks](https://www.synthace.com/blog/autosave-with-react-hooks) — Production pattern with debounce + useEffect
- [Smarter Forms: useAutoSave Hook with Debounce](https://darius-marlowe.medium.com/smarter-forms-in-react-building-a-useautosave-hook-with-debounce-and-react-query-d4d7f9bb052e) — Real-world implementation (MEDIUM confidence)
- [React Hooks in Action: Auto-Save](https://stackademic.com/blog/react-hooks-in-action-implementing-auto-save-with-custom-hooks-b0be405766c5) — Custom hook pattern

### State Management (HIGH confidence)

- [Top React State Management Tools 2026](https://www.syncfusion.com/blogs/post/react-state-management-libraries) — Zustand and Jotai recommended
- [React State Management Cascading Updates](https://react-epic.gitbook.io/react-epic/docs/cascadingupdate) — Avoiding cascading useEffect chains
- [Zustand Derived State](https://app.studyraid.com/en/read/11947/381036/selectors-and-derived-state) — Computed values pattern
- [Zustand Third-Party Libraries](https://zustand.docs.pmnd.rs/integrations/third-party-libraries) — Official docs on middleware (zustand-computed)
- [Understanding Zustand](https://blog.msar.me/understanding-zustand-a-lightweight-state-management-library-for-react) — Lightweight state management overview

### Existing Codebase (verified with Read tool)

- `/src/app/api/chat/route.ts` — Current AI SDK usage with streamText
- `/src/lib/ai/chat-config.ts` — chatModel and SYSTEM_PROMPT
- `/src/db/schema/chat-messages.ts` — Existing message persistence
- `/src/db/schema/sessions.ts` — Session structure
- `/package.json` — ai@6.0.77, @ai-sdk/google@3.0.22, zod@4.3.6, drizzle-orm@0.45.1 confirmed

---

## Confidence Assessment

| Area | Confidence | Reasoning |
|------|-----------|-----------|
| AI SDK 6 structured output | HIGH | Official docs, current version 6.0.77 installed, deprecation explicit |
| use-debounce for auto-save | HIGH | Standard pattern, 1390 npm dependents, version 10.1.0 stable |
| Zustand for cascading state | HIGH | Explicitly designed for selective subscriptions, 2026 state management leader |
| Dual-layer context pattern | MEDIUM | Validated by LangChain/DeepAgent docs but not AI SDK specific. Needs testing with Gemini context limits |
| Database schema additions | HIGH | Drizzle ORM patterns established in v0.5, JSON column storage standard |

---

## Summary: What to Do Next

**For MVP 1.0 AI facilitation features:**

1. **Install new packages:**
   ```bash
   npm install zustand use-debounce
   ```

2. **Create new schema files:**
   - `src/db/schema/step-artifacts.ts`
   - `src/db/schema/step-summaries.ts`
   - Run `npm run db:generate` to create migration

3. **Modify existing files:**
   - `src/lib/ai/chat-config.ts` — Add step-specific prompt builder
   - `src/app/api/chat/route.ts` — Add `output: Output.object()` to streamText
   - `src/components/workshop/chat-panel.tsx` — Add useDebounce for auto-save

4. **Create new files:**
   - `src/stores/workshop-store.ts` — Zustand store for artifacts and cascading
   - `src/lib/ai/context-builder.ts` — Build system prompts from artifacts
   - `src/lib/ai/step-schemas.ts` — Zod schemas for each step's artifact
   - `src/components/workshop/auto-save-indicator.tsx` — UI indicator

**No breaking changes.** All additions are backward compatible with v0.5.

---

*Stack research for: WorkshopPilot.ai v1.0 AI Facilitation Features*
*Researched: 2026-02-08*
*Next research: MMP canvas tools (Tldraw vs ReactFlow) — deferred until v1.0 validates text-based approach*
