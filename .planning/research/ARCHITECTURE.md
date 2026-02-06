# Architecture Patterns: AI-Guided Multi-Step Conversational Platform

**Domain:** Design thinking workshop facilitation platform
**Project:** WorkshopPilot.ai
**Researched:** 2026-02-07
**Confidence:** HIGH

## Executive Summary

AI-guided multi-step conversational platforms in 2026 follow an **orchestration architecture** where the backend acts as a state machine managing context, tools, and permissions rather than a simple API layer. For WorkshopPilot's 10-step design thinking workflow, the recommended architecture separates concerns into: (1) Conversation orchestration, (2) Step state management, (3) Context accumulation with compression, (4) Structured output extraction, and (5) Persistent storage with real-time sync.

**Critical insight:** The conversation is a projection of state, not the source of truth. This principle prevents runaway costs and enables proper resumability across sessions.

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND LAYER                         │
│  (Next.js App Router + React Server Components)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Step Container  │  │   Chat UI        │  │  Form/Canvas │  │
│  │  (Progress Bar)  │  │  (Streaming)     │  │  (Future)    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│           │                     │                     │          │
└───────────┼─────────────────────┼─────────────────────┼─────────┘
            │                     │                     │
            └─────────────────────┴─────────────────────┘
                                  │
┌─────────────────────────────────┼─────────────────────────────────┐
│                         ORCHESTRATION LAYER                       │
│                    (Next.js Server Actions + API Routes)          │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │              STEP ENGINE (State Machine)                     ││
│  │  - Determines current step and phase                         ││
│  │  - Loads step-specific prompt template                       ││
│  │  - Enforces sequential progression rules                     ││
│  │  - Manages step completion criteria                          ││
│  └──────────────────────────────────────────────────────────────┘│
│                                  │                                 │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │         CONTEXT MANAGER (Memory Layer)                       ││
│  │  - Assembles conversation context for Gemini                 ││
│  │  - Implements hierarchical summarization                     ││
│  │  - Manages context budget allocation                         ││
│  │  - Applies Gemini context caching strategy                   ││
│  └──────────────────────────────────────────────────────────────┘│
│                                  │                                 │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │         CONVERSATION ORCHESTRATOR                            ││
│  │  - Routes messages to Gemini API                             ││
│  │  - Streams responses to frontend                             ││
│  │  - Triggers structured output extraction                     ││
│  │  - Writes conversation turns to database                     ││
│  └──────────────────────────────────────────────────────────────┘│
│                                  │                                 │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │     STRUCTURED OUTPUT EXTRACTOR (Schema Validator)           ││
│  │  - Defines Zod schemas per step                              ││
│  │  - Extracts JSON from conversation using Gemini              ││
│  │  - Validates against schema                                  ││
│  │  - Persists structured data as step outputs                  ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                    │
└────────────────────────────────────┬───────────────────────────────┘
                                     │
┌────────────────────────────────────┼───────────────────────────────┐
│                             DATA LAYER                             │
│                         (Neon Postgres)                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Workshops   │  │  Sessions    │  │  Steps       │            │
│  │              │  │              │  │              │            │
│  │  - id        │  │  - id        │  │  - id        │            │
│  │  - user_id   │  │  - workshop  │  │  - session   │            │
│  │  - created   │  │  - current   │  │  - number    │            │
│  │              │  │    _step     │  │  - state     │            │
│  └──────────────┘  │  - state     │  │  - outputs   │            │
│                    │              │  │              │            │
│  ┌──────────────┐  └──────────────┘  └──────────────┘            │
│  │ Conversations│                                                 │
│  │              │  ┌──────────────┐  ┌──────────────┐            │
│  │  - id        │  │  Messages    │  │  Context     │            │
│  │  - step_id   │  │              │  │  Files       │            │
│  │  - summary   │  │  - id        │  │              │            │
│  │              │  │  - convo_id  │  │  - id        │            │
│  └──────────────┘  │  - role      │  │  - step_id   │            │
│                    │  - content   │  │  - summary   │            │
│                    │  - timestamp │  │  - json_data │            │
│                    │              │  │              │            │
│                    └──────────────┘  └──────────────┘            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## Component Boundaries

### 1. Frontend Layer (Next.js Client Components)

**Responsibility:** Capture user intent, display streaming responses, show progress, handle client-side interactions.

**Owns:**
- Step container UI (progress bar, navigation)
- Chat interface with streaming message display
- Form/canvas rendering (future MMP feature)
- Client-side state for UI feedback

**Communicates with:**
- Server Actions for message submission
- API routes for streaming responses
- Database via server-side data fetching

**Key pattern:** Use Server Actions to submit user messages, receive streaming responses via ReadableStream, update UI optimistically while awaiting server confirmation.

**Technologies:**
- React Server Components for initial page loads
- Client Components for interactive chat
- Server Actions for mutations
- Streaming API for real-time responses

---

### 2. Step Engine (State Machine)

**Responsibility:** Orchestrate the 10-step workflow, enforce progression rules, determine what AI prompt to use for current step phase.

**Owns:**
- Step progression logic (sequential enforcement)
- Step completion validation
- Step-specific prompt template selection
- Phase detection (Orient → Gather → Synthesize → Refine → Validate → Complete)

**Communicates with:**
- Context Manager (provides step context)
- Database (reads/writes step state)
- Conversation Orchestrator (supplies prompt template)

**Key pattern:** State machine where each step has substates (phases), completion criteria, and defined transitions. Steps cannot be skipped; completion triggers state transition.

**Implementation:**
```typescript
// Pseudocode structure
interface StepDefinition {
  number: 1-10;
  name: string;
  phases: Phase[];
  completionCriteria: (stepOutput: StepOutput) => boolean;
  promptTemplate: (phase: Phase, context: StepContext) => string;
}

enum Phase {
  ORIENT = "orient",       // Introduce step, explain purpose
  GATHER = "gather",       // Collect information via questions
  SYNTHESIZE = "synthesize", // AI processes inputs
  REFINE = "refine",       // User reviews, edits
  VALIDATE = "validate",   // Confirm completeness
  COMPLETE = "complete"    // Mark step done, generate output
}
```

**Data flow:**
1. User enters step → Engine loads step definition
2. Engine determines current phase → Selects prompt template
3. User interacts → Phase progresses
4. Completion criteria met → Engine transitions to next step

---

### 3. Context Manager (Memory Layer)

**Responsibility:** Assemble conversation context for Gemini API within token budget, implement summarization to prevent overflow, manage context caching.

**Owns:**
- Context budget allocation (system prompt + history + current step context + user input)
- Hierarchical summarization of old messages
- Forward context from previous steps (structured outputs)
- Gemini context caching strategy

**Communicates with:**
- Conversation Orchestrator (provides assembled context)
- Database (reads conversation history, context files)
- Structured Output Extractor (retrieves step outputs)

**Key pattern:** Three-tier memory architecture:
1. **Short-term:** Current step conversation (verbatim, recent 10-20 messages)
2. **Long-term:** Summaries of previous step conversations + structured outputs
3. **Persistent:** All step outputs as JSON (retrieved selectively)

**Context assembly strategy:**
```typescript
// Token budget allocation
const CONTEXT_BUDGET = {
  systemPrompt: 2000,        // Step-specific instructions
  stepContext: 5000,         // Outputs from previous steps
  conversationHistory: 8000, // Recent conversation (or summaries)
  userInput: 1000,           // Current user message
  reserved: 1000             // Buffer for response
};

// Hierarchical summarization
interface ContextAssembly {
  systemPrompt: string;      // Static per step phase
  priorStepOutputs: object;  // JSON from completed steps
  currentStepSummary: string; // Summarized older messages
  recentMessages: Message[]; // Verbatim last 10-20 turns
  currentUserInput: string;  // User's latest message
}
```

**Gemini-specific optimization:**
- Place stable content (system prompt, step definitions) at beginning for context caching
- Place variable content (user questions) at end
- Use Gemini context caching to save 90% on cached input tokens
- Monitor `cached_content_token_count` to verify cache hits

**Summarization trigger:** When conversation exceeds 30 messages or 20K tokens, compress messages 1-20 into summary, keep messages 21+ verbatim.

---

### 4. Conversation Orchestrator

**Responsibility:** Route messages to Gemini API, stream responses back to frontend, persist conversation to database, trigger structured output extraction.

**Owns:**
- Gemini API integration
- Streaming response handling
- Conversation persistence
- Error handling and retries

**Communicates with:**
- Context Manager (receives assembled context)
- Step Engine (receives prompt template)
- Structured Output Extractor (triggers extraction)
- Database (writes messages)
- Frontend (streams responses)

**Key pattern:** Server Actions + Streaming API for real-time response delivery with server-side persistence.

**Implementation flow:**
```typescript
// Server Action for message submission
async function sendMessage(stepId: string, userMessage: string) {
  // 1. Validate step state
  const step = await getStep(stepId);

  // 2. Get assembled context from Context Manager
  const context = await contextManager.assembleContext(stepId);

  // 3. Get prompt template from Step Engine
  const prompt = stepEngine.getPrompt(step.number, step.phase);

  // 4. Call Gemini API with streaming
  const stream = await gemini.generateContentStream({
    systemInstruction: prompt,
    context: context,
    userMessage: userMessage,
  });

  // 5. Stream to frontend + buffer for database
  let fullResponse = "";
  for await (const chunk of stream) {
    fullResponse += chunk.text;
    // Stream to frontend via ReadableStream
  }

  // 6. Persist conversation turn
  await db.messages.create({
    conversationId: step.conversationId,
    role: "user",
    content: userMessage,
  });
  await db.messages.create({
    conversationId: step.conversationId,
    role: "assistant",
    content: fullResponse,
  });

  // 7. Trigger structured output extraction if phase = COMPLETE
  if (step.phase === "complete") {
    await extractStepOutput(stepId);
  }
}
```

**Error handling:**
- Retry with exponential backoff for network errors
- Fallback to shorter context if token limit exceeded
- Graceful degradation if streaming fails (return full response)

---

### 5. Structured Output Extractor (Schema Validator)

**Responsibility:** Extract structured JSON from conversation using Gemini's schema-constrained generation, validate against Zod schemas, persist as step outputs.

**Owns:**
- Per-step Zod schema definitions
- Schema-driven extraction prompts
- Validation logic
- Step output persistence

**Communicates with:**
- Conversation Orchestrator (triggered after step completion)
- Database (writes step outputs, context files)
- Context Manager (provides outputs to future steps)

**Key pattern:** Use Gemini's structured output mode with JSON Schema to enforce extraction compliance. Two-stage process: conversational gathering → structured extraction.

**Schemas per step:**
```typescript
// Example: Step 1 (Challenge)
const Step1OutputSchema = z.object({
  rawProblem: z.string().describe("User's initial problem description"),
  coreProblem: z.string().describe("AI-extracted core problem"),
  hmwStatement: z.string().describe("How Might We statement"),
  stakeholdersHinted: z.array(z.string()).describe("Early stakeholder mentions"),
});

// Example: Step 2 (Stakeholder Mapping)
const Step2OutputSchema = z.object({
  stakeholders: z.array(z.object({
    name: z.string(),
    role: z.string(),
    influence: z.enum(["high", "medium", "low"]),
    interest: z.enum(["high", "medium", "low"]),
    priority: z.number().min(1).max(10),
  })),
  primaryStakeholder: z.string(),
});

// ... schemas for steps 3-10
```

**Extraction flow:**
```typescript
async function extractStepOutput(stepId: string) {
  const step = await getStep(stepId);
  const conversation = await getConversationHistory(step.conversationId);
  const schema = getSchemaForStep(step.number);

  // Use Gemini with schema-constrained output
  const extraction = await gemini.generateContent({
    systemInstruction: `Extract structured data from this conversation.`,
    context: conversation,
    responseSchema: zodToJsonSchema(schema), // Convert Zod to JSON Schema
  });

  // Validate extraction
  const validated = schema.parse(extraction);

  // Persist as step output
  await db.steps.update(stepId, {
    outputs: validated,
    completed: true,
  });

  // Generate context file (summary + structured data)
  await db.contextFiles.create({
    stepId: stepId,
    summary: await summarizeConversation(conversation),
    jsonData: validated,
  });
}
```

**Validation strategy:**
- Use Zod for runtime validation
- Provide clear schema descriptions for better extraction
- Retry extraction once if validation fails
- Manual override option for edge cases (future feature)

---

### 6. Data Layer (Neon Postgres)

**Responsibility:** Persist all application state, enable resumability, support queries for admin dashboard and analytics.

**Owns:**
- All persistent data (workshops, sessions, steps, conversations, messages, outputs)
- Transactional integrity
- Query optimization

**Communicates with:**
- All orchestration layer components (read/write operations)

**Schema design:**

```sql
-- Workshops (top-level container)
CREATE TABLE workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Clerk user ID
  title TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions (instance of a workshop run)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1,
  state JSONB, -- Session-level metadata
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Steps (each of 10 design thinking steps)
CREATE TABLE steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL, -- 1-10
  phase TEXT DEFAULT 'orient', -- orient, gather, synthesize, refine, validate, complete
  outputs JSONB, -- Structured data extracted from conversation
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  UNIQUE(session_id, step_number)
);

-- Conversations (per-step conversation container)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID REFERENCES steps(id) ON DELETE CASCADE,
  summary TEXT, -- Hierarchical summary for context compression
  created_at TIMESTAMP DEFAULT NOW()
);

-- Messages (individual conversation turns)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  token_count INTEGER -- For context budget tracking
);

-- Context Files (summaries + structured outputs for forward context)
CREATE TABLE context_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID REFERENCES steps(id) ON DELETE CASCADE,
  summary TEXT NOT NULL, -- Human-readable summary
  json_data JSONB NOT NULL, -- Structured outputs
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sessions_workshop ON sessions(workshop_id);
CREATE INDEX idx_steps_session ON steps(session_id);
CREATE INDEX idx_conversations_step ON conversations(step_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_context_files_step ON context_files(step_id);
```

**Query patterns:**
- Get current session state: `SELECT * FROM sessions WHERE id = ? JOIN steps ON ...`
- Get conversation history: `SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp`
- Get all prior step outputs: `SELECT json_data FROM context_files WHERE step_id IN (SELECT id FROM steps WHERE session_id = ? AND step_number < ?)`
- Admin dashboard: `SELECT users.id, COUNT(sessions.id) FROM workshops JOIN sessions ...`

**Partitioning consideration:** For scale (not MVP), partition `messages` table by `conversation_id` to prevent DynamoDB-style 400KB item limits and improve query performance.

---

## Data Flow: Complete Request Cycle

### User submits message in Step 3 (User Research)

```
1. Frontend (Chat UI)
   └─> User types question → Click send

2. Server Action (sendMessage)
   └─> Validate step state
   └─> Call Context Manager

3. Context Manager
   └─> Retrieve Step 1 & 2 outputs (HMW statement, stakeholders)
   └─> Retrieve Step 3 conversation history (last 15 messages)
   └─> Check token budget: 35,000 / 200,000 → OK
   └─> Assemble context:
       {
         systemPrompt: "Step 3: User Research phase. Generate interview questions...",
         priorOutputs: { hmw: "...", stakeholders: [...] },
         recentMessages: [ ... ],
         userInput: "What should I ask about user pain points?"
       }

4. Step Engine
   └─> Determine phase: "gather" (collecting questions)
   └─> Load prompt template: user_research_gather.txt
   └─> Return prompt to orchestrator

5. Conversation Orchestrator
   └─> Call Gemini API:
       POST /v1/models/gemini-2.0-flash:streamGenerateContent
       {
         system_instruction: [prompt from Step Engine],
         contents: [context from Context Manager],
       }
   └─> Stream response to frontend:
       "Here are suggested interview questions:\n1. When do you..."
   └─> Buffer full response for database

6. Frontend (Chat UI)
   └─> Display streaming response in real-time
   └─> Show typing indicator during streaming

7. Conversation Orchestrator (after stream completes)
   └─> Persist messages to database:
       INSERT INTO messages (conversation_id, role, content, token_count)
       VALUES (?, 'user', ?, ?), (?, 'assistant', ?, ?)

8. (If step phase = COMPLETE)
   └─> Trigger Structured Output Extractor
   └─> Extract JSON matching Step 3 schema
   └─> Validate with Zod
   └─> Persist to steps.outputs
   └─> Generate context file (summary + JSON)
   └─> Mark step complete
   └─> Update session.current_step = 4
```

## Architecture Patterns to Follow

### Pattern 1: Orchestration Over APIs

**What:** Backend is not a thin API layer but an intelligent orchestrator that manages state, permissions, and workflows.

**Why:** Multi-step AI workflows require decision logic (which step, which phase, which prompt), security (permission checks before tool execution), and auditability (logging all state transitions).

**How:**
- Use Next.js Server Actions for orchestrated mutations
- Implement Step Engine as state machine, not simple CRUD
- Enforce business rules server-side (step completion, sequential progression)

**Example:**
```typescript
// Bad: Thin API
export async function POST(request: Request) {
  const body = await request.json();
  await gemini.generateContent(body.prompt);
}

// Good: Orchestration
export async function sendMessage(stepId: string, message: string) {
  const step = await validateStepAccess(stepId);
  if (!step.canProceed) throw new Error("Complete previous step first");

  const context = await contextManager.assemble(step);
  const prompt = stepEngine.getPrompt(step.number, step.phase);
  const response = await gemini.generate({ prompt, context });

  await persistConversation(step.conversationId, message, response);
  await checkStepCompletion(step);
}
```

---

### Pattern 2: Conversation as Projection, Not Source

**What:** Treat conversation history as a view of underlying state, not the authoritative data source.

**Why:** Prevents runaway token costs, enables resumability, supports auditing, allows re-generation of conversations from structured state.

**How:**
- Store structured outputs (JSON) separately from conversation messages
- Use context files (summaries + JSON) as forward context, not raw messages
- Implement conversation summarization for old messages
- Persist both raw messages AND extracted structured data

**Example:**
```typescript
// Bad: Pass all raw messages forward
const context = await db.messages.findMany({
  where: { sessionId },
  orderBy: { timestamp: 'asc' }
});

// Good: Use structured outputs + summaries
const context = {
  completedSteps: await db.contextFiles.findMany({
    where: { stepNumber: { lt: currentStep } }
  }), // Returns { summary, jsonData }
  currentStepRecent: await db.messages.findMany({
    where: { stepId: currentStepId },
    orderBy: { timestamp: 'desc' },
    take: 15 // Only recent messages
  })
};
```

---

### Pattern 3: Hierarchical Context Compression

**What:** Implement tiered summarization where older content gets progressively compressed while recent content stays verbatim.

**Why:** Maintains conversational continuity without exhausting context windows. Gemini Flash has 200K tokens, but conversations accumulate 30K+ tokens after 15 turns.

**How:**
- Keep recent 10-20 messages verbatim (short-term memory)
- Compress older messages into summaries (long-term memory)
- Store all step outputs as structured JSON (persistent memory)
- Dynamically allocate context budget based on current phase

**Compression formula:**
```
Total context budget: 200,000 tokens (Gemini Flash)
Allocation:
  - System prompt (stable): 2,000 tokens → CACHE THIS
  - Step definitions (stable): 5,000 tokens → CACHE THIS
  - Prior step outputs: 5,000 tokens (JSON is compact)
  - Current step summary: 3,000 tokens
  - Recent messages (verbatim): 10,000 tokens
  - User input: 1,000 tokens
  - Reserved for response: 50,000 tokens
  = Total input: ~26,000 tokens (13% of budget)
```

**Trigger summarization when:**
- Conversation exceeds 30 messages
- Token count exceeds 20,000
- User navigates away and returns (summarize on re-entry)

---

### Pattern 4: Schema-Driven Structured Outputs

**What:** Define Zod schemas for each step's output, use Gemini's structured output mode to extract JSON matching schema.

**Why:** Ensures data consistency, enables type-safe context passing, prevents hallucinated fields, supports validation and error handling.

**How:**
- Create Zod schema per step (10 schemas total)
- Convert to JSON Schema for Gemini API
- Use Gemini's `responseSchema` parameter for constrained generation
- Validate extraction with Zod before persisting

**Example:**
```typescript
// Step 4: Research Sense Making
const Step4Schema = z.object({
  themes: z.array(z.object({
    name: z.string(),
    description: z.string(),
    frequency: z.number(),
  })),
  pains: z.array(z.object({
    description: z.string(),
    severity: z.enum(["high", "medium", "low"]),
    affectedStakeholders: z.array(z.string()),
  })).length(5), // Exactly 5 pains
  gains: z.array(z.object({
    description: z.string(),
    value: z.enum(["high", "medium", "low"]),
    affectedStakeholders: z.array(z.string()),
  })).length(5), // Exactly 5 gains
});

// Extract using schema-constrained generation
const output = await gemini.generateContent({
  prompt: "Extract insights from the user research conversation",
  context: conversationHistory,
  responseSchema: zodToJsonSchema(Step4Schema),
});

const validated = Step4Schema.parse(output); // Throws if invalid
```

---

### Pattern 5: Context Caching for Cost Optimization

**What:** Use Gemini's context caching to store stable prompt content (system instructions, step definitions) and reuse across requests.

**Why:** Reduces input token costs by 90% on cached content. For WorkshopPilot, system prompts are ~7K tokens and identical across conversation turns within a step.

**How:**
- Place stable content at beginning of prompt (system instruction, step definition)
- Place variable content at end (user input)
- Use Gemini's `cachedContent` API for explicit caching
- Monitor `cached_content_token_count` to verify cache hits

**Gemini caching structure:**
```typescript
// Create cached content (once per step)
const cachedContent = await gemini.cacheContent({
  model: "gemini-2.0-flash",
  contents: [
    { role: "system", parts: [{ text: stepDefinition }] },
    { role: "system", parts: [{ text: designThinkingPrinciples }] },
  ],
  ttl: "3600s", // 1 hour cache
});

// Use cached content in subsequent requests
const response = await gemini.generateContent({
  cachedContent: cachedContent.name,
  contents: [
    { role: "user", parts: [{ text: userMessage }] }
  ],
});

// Verify cache hit
if (response.usageMetadata.cachedContentTokenCount > 0) {
  console.log("Cache hit! Saved", response.usageMetadata.cachedContentTokenCount, "tokens");
}
```

**Cache invalidation:** Regenerate cache when step advances (new system prompt) or after TTL expires.

---

### Pattern 6: Server-Side Streaming with Persistence

**What:** Stream AI responses to frontend in real-time while buffering full response for database persistence.

**Why:** Better UX (user sees response forming), lower perceived latency, enables "stop generation" feature, but still maintains complete conversation history.

**How:**
- Use Next.js API routes with ReadableStream for streaming
- Buffer chunks in server memory during streaming
- Persist complete response after stream finishes
- Handle stream interruptions gracefully

**Implementation:**
```typescript
// API route for streaming
export async function POST(request: Request) {
  const { stepId, message } = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = "";

      // Get streaming response from Gemini
      const geminiStream = await gemini.generateContentStream({...});

      for await (const chunk of geminiStream) {
        const text = chunk.text;
        fullResponse += text;

        // Send to frontend
        controller.enqueue(new TextEncoder().encode(text));
      }

      // After stream completes, persist to database
      await db.messages.create({
        conversationId,
        role: "assistant",
        content: fullResponse,
      });

      controller.close();
    }
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Passing Entire Conversation History Forward

**What:** Including all messages from all steps in every Gemini request.

**Why bad:** Exhausts token budget rapidly (Step 10 would have 300+ messages), costs 10x more than necessary, introduces irrelevant context that degrades AI quality.

**Instead:** Use hierarchical summarization + structured outputs. Only pass recent messages from current step + JSON outputs from prior steps.

**Example cost:**
```
Bad approach (all messages):
  Step 1: 20 messages × 500 tokens = 10,000 tokens
  Step 2: 20 messages × 500 tokens = 10,000 tokens
  ...
  Step 10: 200 messages × 500 tokens = 100,000 tokens
  COST: $0.50 per request (input tokens only)

Good approach (summaries + outputs):
  Steps 1-9 summaries: 5,000 tokens
  Steps 1-9 JSON outputs: 3,000 tokens
  Step 10 recent messages: 10,000 tokens
  COST: $0.09 per request (80% reduction)
```

---

### Anti-Pattern 2: Client-Side Prompt Construction

**What:** Allowing frontend to construct prompts or directly call Gemini API.

**Why bad:** Security risk (API key exposure), no permission checks, no auditability, difficult to update prompts, enables prompt injection attacks.

**Instead:** All prompts constructed server-side via Step Engine. Frontend only submits user messages, server assembles full context.

---

### Anti-Pattern 3: Synchronous Step Transitions

**What:** Blocking user while AI generates summary → extracts JSON → validates → updates database.

**Why bad:** Poor UX (long wait times), single point of failure, difficult to show progress, can't cancel operations.

**Instead:** Use background jobs for extraction. Mark step "pending completion" immediately, extract in background, notify user when ready.

**Implementation:**
```typescript
// User clicks "Complete Step"
async function completeStep(stepId: string) {
  // 1. Immediate feedback
  await db.steps.update(stepId, {
    phase: "complete",
    status: "processing"
  });

  // 2. Queue background extraction
  await queue.add("extract-step-output", { stepId });

  // 3. Return immediately
  return { status: "processing" };
}

// Background worker
async function extractStepOutputWorker(stepId: string) {
  try {
    const output = await extractStructuredOutput(stepId);
    await db.steps.update(stepId, {
      outputs: output,
      status: "completed",
      completed: true
    });

    // Notify frontend via WebSocket or polling
    await notifyClient(stepId, "complete");
  } catch (error) {
    await db.steps.update(stepId, { status: "error" });
    await notifyClient(stepId, "error", error);
  }
}
```

---

### Anti-Pattern 4: Storing Only Raw Conversations

**What:** Only persisting message text without extracting structured data.

**Why bad:** Can't query for insights (e.g., "show all workshops with >5 stakeholders"), difficult to generate reports, no API for exporting Build Packs, requires re-parsing conversations every time.

**Instead:** Extract and persist structured JSON at step completion. Store both raw messages (for conversation history) AND structured outputs (for queryability).

---

### Anti-Pattern 5: Global Context Without Step Scoping

**What:** Treating entire workshop as single conversation with global context.

**Why bad:** Steps have different purposes (research vs ideation vs validation), mixing contexts confuses AI, impossible to resume mid-workshop, difficult to implement "regenerate step" feature.

**Instead:** Scope conversations per step. Each step has its own conversation_id, loads context from prior steps via context files, but maintains clean boundaries.

---

## Suggested Build Order (Dependency Graph)

### Phase 1: Foundation (MVP 0.5)

**Goal:** Establish data models, authentication, basic navigation.

```
1. Database schema + Neon connection
   └─> workshops, sessions, steps tables

2. Clerk authentication
   └─> User signup/login
   └─> Role-based access (facilitator/participant)

3. Step containers (hollow)
   └─> 10 step pages with routing
   └─> Progress bar component
   └─> Next/back navigation (no AI yet)

4. Basic state persistence
   └─> Create session
   └─> Save current step
   └─> Resume session
```

**Dependencies:** Database must exist before authentication (store user sessions). Authentication must exist before step navigation (protect routes).

---

### Phase 2: Conversation Infrastructure (Early MVP 1.0)

**Goal:** Build orchestration layer without step-specific logic.

```
5. Context Manager (basic)
   └─> Assemble context from database
   └─> Token counting
   └─> Simple prompt templates

6. Conversation Orchestrator
   └─> Gemini API integration
   └─> Streaming response handling
   └─> Message persistence (conversations, messages tables)

7. Chat UI
   └─> Message input
   └─> Streaming display
   └─> Server Action integration

8. Step Engine (minimal)
   └─> Load step number
   └─> Basic prompt per step
   └─> No phase detection yet
```

**Dependencies:** Context Manager must exist before Orchestrator (provides context). Orchestrator must exist before Chat UI (handles submissions). Step Engine can be built in parallel.

---

### Phase 3: Structured Outputs (Mid MVP 1.0)

**Goal:** Extract and persist JSON from conversations.

```
9. Zod schemas for all 10 steps
   └─> Define output structure per step

10. Structured Output Extractor
    └─> Schema-constrained extraction
    └─> Validation with Zod
    └─> Persistence to steps.outputs

11. Context files generation
    └─> Conversation summarization
    └─> JSON + summary storage

12. Forward context passing
    └─> Context Manager loads prior outputs
    └─> Include in Gemini requests
```

**Dependencies:** Schemas must be defined before Extractor. Extractor must work before Context Files. Context Files must exist before Forward Context.

---

### Phase 4: Step-Specific Logic (Late MVP 1.0)

**Goal:** Implement the 10 design thinking steps with tailored prompts and phases.

```
13. Step Engine (full)
    └─> Phase detection per step
    └─> Step-specific prompt templates
    └─> Completion criteria validation

14. Step 1-10 implementations
    └─> Custom prompts per step
    └─> Phase transitions (Orient → Gather → ...)
    └─> Completion logic

15. Context compression
    └─> Hierarchical summarization
    └─> Recent vs old message handling
    └─> Gemini context caching
```

**Dependencies:** Step Engine full version needs Structured Outputs working (for completion criteria). Step implementations depend on full Step Engine. Context compression can be built incrementally.

---

### Phase 5: Optimization (Post MVP 1.0)

**Goal:** Reduce costs, improve performance.

```
16. Gemini context caching
    └─> Cache system prompts
    └─> Monitor cache hits

17. Background extraction jobs
    └─> Queue system (BullMQ or Vercel Queue)
    └─> Async step completion

18. Advanced summarization
    └─> Embedding-based compression
    └─> Semantic deduplication
```

**Dependencies:** All core features must work before optimization. Optimization is incremental, not blocking.

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **Database** | Single Neon Postgres instance | Connection pooling (Prisma/Drizzle) | Read replicas, partition messages table |
| **Gemini API** | Direct calls | Rate limiting, request queuing | Dedicated Cloud project, batch processing |
| **Context caching** | Optional | Required (90% cost savings) | Required + custom cache layer (Redis) |
| **Conversation storage** | Store all messages | Summarize after 30 days | Archive old conversations to cold storage |
| **Real-time streaming** | HTTP streaming | WebSocket fallback for reliability | Dedicated WebSocket service (Pusher/Ably) |
| **Step extraction** | Synchronous | Background jobs (Vercel Queue) | Dedicated worker pool, job prioritization |
| **Session state** | In-database | In-memory cache (Redis) | Distributed cache with session affinity |

**Critical scaling decision:** Messages table will grow unbounded. Implement retention policy (archive messages >90 days old) and partition by `conversation_id` for query performance.

---

## Integration Points

### Clerk Authentication

**What:** Manages user authentication, roles (facilitator/participant), and session tokens.

**Integration:**
- Middleware protects all `/workshop/*` routes
- Server Actions use `auth()` to get user ID
- Database stores `user_id` from Clerk in workshops table
- Admin dashboard filters by Clerk role

**Key pattern:**
```typescript
import { auth } from "@clerk/nextjs/server";

export async function createWorkshop(title: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return await db.workshops.create({
    data: { userId, title }
  });
}
```

---

### Neon Postgres

**What:** Serverless Postgres database with auto-scaling and branching.

**Integration:**
- Use Drizzle ORM or Prisma for type-safe queries
- Connection string from Neon dashboard → environment variable
- Enable connection pooling for Vercel serverless functions
- Use Neon branches for development/staging/production

**Key pattern:**
```typescript
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function getSession(id: string) {
  const [session] = await sql`
    SELECT * FROM sessions WHERE id = ${id}
  `;
  return session;
}
```

---

### Gemini API

**What:** Google's LLM API for conversational AI and structured outputs.

**Integration:**
- Use `@google/generative-ai` SDK
- API key from Google AI Studio → environment variable
- Use `gemini-2.0-flash` for speed/cost balance
- Enable context caching for production

**Key pattern:**
```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function generateResponse(prompt: string) {
  const result = await model.generateContentStream({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return result.stream;
}
```

---

### Vercel Deployment

**What:** Hosting platform for Next.js with edge functions and automatic deployments.

**Integration:**
- GitHub integration for automatic deploys on push
- Environment variables for API keys (Clerk, Neon, Gemini)
- Edge Runtime for API routes (lower latency)
- Vercel Analytics for monitoring

**Deployment considerations:**
- API routes have 60s timeout on Hobby, 300s on Pro (important for long Gemini responses)
- Serverless functions have 50MB limit (fine for JSON responses)
- Edge functions can't use Node.js APIs (use regular serverless for DB calls)

---

## Technology Recommendations

| Category | Recommended | Version | Why |
|----------|-------------|---------|-----|
| **Frontend Framework** | Next.js | 16.1.1 | Already in use, App Router for Server Components |
| **UI Library** | React | 19.2.0 | Already in use, paired with Next.js |
| **Styling** | Tailwind CSS | 4.x | Already in use, rapid styling |
| **Component Library** | shadcn/ui | Latest | Already in use, accessible components |
| **Database** | Neon Postgres | Latest | Serverless, Vercel-optimized |
| **ORM** | Drizzle | 0.36+ | Type-safe, edge-compatible (alternative: Prisma) |
| **Authentication** | Clerk | Latest | Role support, easy Next.js integration |
| **AI Provider** | Gemini API | 2.0 Flash | Cost/capability balance, context caching |
| **Schema Validation** | Zod | 3.x | Type-safe schemas, runtime validation |
| **Streaming** | Native Web Streams | N/A | Built into Next.js, no library needed |
| **State Management** | React Server Components + Server Actions | N/A | Reduces client-side state complexity |
| **Background Jobs** | Vercel Queue (future) | N/A | Native Vercel integration for async work |

**Not recommended:**
- **LangChain:** Adds abstraction overhead for WorkshopPilot's specific needs. Direct Gemini API is simpler.
- **Vector databases:** Not needed for MVP. Context files (summaries + JSON) are sufficient for context passing.
- **Redis:** Not needed until 10K+ users. Database is fast enough for current scale.
- **tRPC:** Server Actions provide type-safe RPC without additional framework.

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| **Multi-step orchestration patterns** | HIGH | Official Next.js docs on Server Actions, industry patterns from WebSearch (2026), verified with SashidoIO architecture guide |
| **Gemini context management** | HIGH | Official Google Gemini documentation (ai.google.dev), context caching best practices verified |
| **Conversation-to-JSON extraction** | HIGH | Gemini structured outputs documented, Zod schema patterns widely adopted (2026) |
| **Database schema design** | HIGH | PostgreSQL best practices, verified against AWS DynamoDB chatbot patterns (partitioning strategy) |
| **Context compression techniques** | MEDIUM | WebSearch findings on hierarchical summarization, verified across multiple sources but not Gemini-specific |
| **Scalability projections** | MEDIUM | Extrapolated from general patterns, not WorkshopPilot-specific benchmarks |

**Gaps to address in implementation:**
- Actual token usage per step (requires profiling with real conversations)
- Optimal summarization thresholds (may need experimentation)
- Gemini API rate limits at scale (requires load testing)
- Context caching TTL tuning (optimize cost vs cache miss rate)

---

## Sources

### Official Documentation (HIGH confidence)
- [Gemini API Long Context Documentation](https://ai.google.dev/gemini-api/docs/long-context) - Official best practices for context management
- [Next.js Backend for Conversational AI in 2026](https://www.sashido.io/en/blog/nextjs-backend-conversational-ai-2026) - Architecture patterns for Next.js AI orchestration

### 2026 Industry Patterns (MEDIUM-HIGH confidence)
- [Building Multi-Turn Conversations with AI Agents: The 2026 Playbook](https://medium.com/ai-simplified-in-plain-english/building-multi-turn-conversations-with-ai-agents-the-2026-playbook-45592425d1db)
- [AI System Design Patterns for 2026: Architecture That Scales](https://zenvanriel.nl/ai-engineer-blog/ai-system-design-patterns-2026/)
- [Context Engineering: The New Frontier of Production AI in 2026](https://medium.com/@mfardeen9520/context-engineering-the-new-frontier-of-production-ai-in-2026-efa789027b2a)
- [Context Window Management: Strategies for Long-Context AI Agents and Chatbots](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/)
- [Context Window Overflow in 2026: Fix LLM Errors Fast](https://redis.io/blog/context-window-overflow/)

### Structured Outputs & Schema Extraction (HIGH confidence)
- [OpenAI Structured Outputs Documentation](https://platform.openai.com/docs/guides/structured-outputs) - Pattern applies to Gemini as well
- [Parsing LLM Structured Outputs in LangChain: A Comprehensive Guide](https://medium.com/@juanc.olamendy/parsing-llm-structured-outputs-in-langchain-a-comprehensive-guide-f05ffa88261f)
- [Prompt Patterns for Structured Data Extraction from Unstructured Text](https://www.cs.wm.edu/~dcschmidt/PDF/Prompt_Patterns_for_Structured_Data_Extraction_from_Unstructured_Text___Final.pdf)

### Multi-Agent & Workflow Orchestration (MEDIUM confidence)
- [LangGraph vs CrewAI vs AutoGen: The Complete Multi-Agent AI Orchestration Guide for 2026](https://dev.to/pockit_tools/langgraph-vs-crewai-vs-autogen-the-complete-multi-agent-ai-orchestration-guide-for-2026-2d63)
- [Agentic AI Orchestration in 2026: Automating Workflows at Scale](https://onereach.ai/blog/agentic-ai-orchestration-enterprise-workflow-automation/)
- [Agent Workflows: Multi-Step Orchestration Guide | LlamaIndex](https://www.llamaindex.ai/workflows)

### Database Design (MEDIUM-HIGH confidence)
- [Amazon DynamoDB data models for generative AI chatbots](https://aws.amazon.com/blogs/database/amazon-dynamodb-data-models-for-generative-ai-chatbots/) - Partitioning strategy for message tables
- [Unified Chat History and Logging System: A Comprehensive Approach to AI Conversation Management](https://medium.com/@mbonsign/unified-chat-history-and-logging-system-a-comprehensive-approach-to-ai-conversation-management-dc3b5d75499f)

### Next.js AI Patterns (HIGH confidence)
- [Mastering Chat History & State in Next.js: The Ultimate Guide to Building Persistent AI Apps](https://dev.to/programmingcentral/mastering-chat-history-state-in-nextjs-the-ultimate-guide-to-building-persistent-ai-apps-maf)
- [Real-time AI in Next.js: How to stream responses with the Vercel AI SDK](https://blog.logrocket.com/nextjs-vercel-ai-sdk-streaming/)
- [Adding AI Chat Features to a Modern Next.js Application](https://getstream.io/blog/ai-chat-nextjs/)

### Context Compression Techniques (MEDIUM confidence)
- [How to Build Context Compression](https://oneuptime.com/blog/post/2026-01-30-context-compression/view)
- [AI tech can compress LLM chatbot conversation memory by 3-4 times](https://techxplore.com/news/2025-11-ai-tech-compress-llm-chatbot.html) - KVzip technique
- [The Complete Guide to Managing Conversation History in Multi-Agent AI Systems](https://medium.com/@_Ankit_Malviya/the-complete-guide-to-managing-conversation-history-in-multi-agent-ai-systems-0e0d3cca6423)

---

## Implementation Readiness

**Ready to implement:**
- Database schema (complete design, no unknowns)
- Step Engine state machine (clear state transitions)
- Conversation Orchestrator (well-documented Gemini API)
- Structured Output Extractor (Zod + Gemini schemas)

**Needs experimentation:**
- Context compression thresholds (requires profiling real conversations)
- Gemini context caching TTL optimization (balance cost vs cache misses)
- Optimal background job timing (test extraction latency)

**Defer to post-MVP:**
- Advanced summarization (embedding-based, semantic deduplication)
- Real-time multiplayer (WebSockets, conflict resolution)
- Analytics and reporting (query optimization, dashboards)

---

**Last updated:** 2026-02-07
**Confidence:** HIGH overall, MEDIUM on optimization specifics
