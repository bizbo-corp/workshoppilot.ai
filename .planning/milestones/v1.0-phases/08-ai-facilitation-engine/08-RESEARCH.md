# Phase 8: AI Facilitation Engine - Research

**Researched:** 2026-02-08
**Domain:** Conversational AI with step-aware prompting and multi-phase facilitation
**Confidence:** HIGH

## Summary

Phase 8 implements step-aware AI prompting where each of the 10 design thinking steps has a dedicated system prompt that follows a 6-phase conversational arc (Orient → Gather → Synthesize → Refine → Validate → Complete). The AI references prior step outputs by name, validates quality before allowing progression, and maintains context across the entire 10-step workflow.

This research focused on three key domains:
1. **Step-Aware Prompting**: How to inject step-specific instructions and prior context into system prompts
2. **Conversational Arc Patterns**: How to structure AI facilitation through Orient → Gather → Synthesize → Refine → Validate → Complete phases
3. **Validation Strategies**: How to assess step output quality and prevent progression with incomplete work

The standard approach combines dynamic system prompts (supported by Vercel AI SDK), state machine patterns for conversational flow, and structured output validation via JSON Schema (supported by Gemini 2.0 Flash).

**Primary recommendation:** Build step-specific prompt templates as TypeScript functions that inject prior context and arc phase instructions, leverage Gemini's structured output mode for validation, and use conversation state tracking to manage arc transitions.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vercel AI SDK | 6.x | Dynamic system prompts with context injection | Template literals for dynamic prompts, streamText for conversational flows, official Google provider |
| Gemini 2.0 Flash | latest | LLM with structured outputs and JSON Schema validation | Fast, cost-effective, supports responseSchema with Zod, 1M token context window |
| Zod | 3.x | Runtime schema validation for AI outputs | Type-safe validation, integrates with Gemini structured outputs, generates JSON Schema |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ai SDK zodToJsonSchema | built-in | Convert Zod schemas to JSON Schema for Gemini | When using structured outputs with responseSchema parameter |

### Already Integrated
| Library | Current Use | Phase 8 Extension |
|---------|-------------|-------------------|
| `src/lib/ai/chat-config.ts` | Generic system prompt builder | Extend to step-specific prompts with arc phases |
| `src/lib/context/assemble-context.ts` | Three-tier context assembly | Use assembled context in step prompts |
| `src/lib/workshop/step-metadata.ts` | Step definitions with greetings | Source of step names and initial orientation content |

**Installation:**
No new dependencies required — all capabilities exist in current stack.

## Architecture Patterns

### Recommended Project Structure
```
src/lib/ai/
├── chat-config.ts           # Already exists - extend with step-specific logic
├── prompts/
│   ├── step-prompts.ts      # NEW: Step-specific system prompt templates
│   ├── arc-phases.ts        # NEW: Conversational arc phase instructions
│   └── validation-criteria.ts # NEW: Quality criteria per step
└── conversation-state.ts    # NEW: Track arc phase transitions
```

### Pattern 1: Dynamic Step-Aware System Prompts
**What:** System prompts that vary by step ID and inject prior context
**When to use:** Every chat request — system prompt must be step-aware
**Example:**
```typescript
// Source: Vercel AI SDK documentation + existing buildStepSystemPrompt
export function buildStepSystemPrompt(
  stepId: string,
  stepName: string,
  arcPhase: ArcPhase,
  persistentContext: string,
  summaries: string
): string {
  // Base step prompt with arc phase instructions
  let prompt = `You are an AI design thinking facilitator guiding the user through Step: ${stepName}.

${getArcPhaseInstructions(arcPhase)}

${getStepSpecificInstructions(stepId)}

Be encouraging, ask probing questions, and help them think deeply about their ideas.
Keep responses concise and actionable.`;

  // Add Tier 1: Persistent Memory (structured artifacts)
  if (persistentContext) {
    prompt += `\n\nPERSISTENT MEMORY (Structured outputs from completed steps):
${persistentContext}`;
  }

  // Add Tier 2: Long-term Memory (conversation summaries)
  if (summaries) {
    prompt += `\n\nLONG-TERM MEMORY (Summaries of previous step conversations):
${summaries}`;
  }

  // Add context usage instructions
  if (persistentContext || summaries) {
    prompt += `\n\nCONTEXT USAGE RULES:
- Reference prior step outputs by name when relevant (e.g., "Based on your persona Sarah from Step 5...")
- Build on prior knowledge — do not re-ask questions already answered in earlier steps
- If the user's current input contradicts a prior step output, note the discrepancy gently`;
  }

  return prompt;
}
```

### Pattern 2: Conversational Arc Phase Instructions
**What:** Each arc phase (Orient, Gather, etc.) has specific behavioral instructions
**When to use:** Arc phase transitions during a step
**Example:**
```typescript
// Source: Conversational AI design patterns research
export type ArcPhase = 'orient' | 'gather' | 'synthesize' | 'refine' | 'validate' | 'complete';

export function getArcPhaseInstructions(phase: ArcPhase): string {
  const instructions = {
    orient: `CURRENT PHASE: Orient
Your job: Welcome the user to this step, explain what it accomplishes and why it matters.
Reference relevant outputs from prior steps to show continuity.
End with a clear first question to begin gathering information.`,

    gather: `CURRENT PHASE: Gather
Your job: Ask focused questions to collect the information needed for this step's output.
Use prior step context to make questions specific and relevant.
Clarify and confirm as you go. Avoid overwhelming the user with too many questions at once.`,

    synthesize: `CURRENT PHASE: Synthesize
Your job: Present a draft of this step's structured output based on gathered information.
Show your reasoning: "Here's what I'm hearing..." or "Based on your responses..."
Ask: "Does this capture your intent?" Give the user a chance to review.`,

    refine: `CURRENT PHASE: Refine
Your job: Help the user improve the draft output.
Listen for change requests, apply them, and explain your reasoning.
Iterate until the user is satisfied with the output quality.`,

    validate: `CURRENT PHASE: Validate
Your job: Check the output against this step's quality criteria.
Provide constructive feedback if criteria aren't met.
Suggest specific improvements if needed.
Once criteria are met, confirm readiness to complete the step.`,

    complete: `CURRENT PHASE: Complete
Your job: Congratulate the user on completing this step.
Briefly summarize what was accomplished and how it will be used in future steps.
Prepare them for the next step in the workshop.`
  };

  return instructions[phase];
}
```

### Pattern 3: Step-Specific Quality Validation
**What:** Each step has quality criteria the AI checks before allowing progression
**When to use:** During the Validate arc phase
**Example:**
```typescript
// Source: LLM evaluation criteria research + design thinking best practices
export interface ValidationCriteria {
  stepId: string;
  criteria: {
    name: string;
    description: string;
    checkPrompt: string; // What the AI should verify
  }[];
}

export const STEP_VALIDATION_CRITERIA: ValidationCriteria[] = [
  {
    stepId: 'challenge',
    criteria: [
      {
        name: 'Specificity',
        description: 'HMW statement is neither too broad nor too narrow',
        checkPrompt: 'Does this HMW avoid being a vague vision statement (too broad) or a specific feature request (too narrow)?'
      },
      {
        name: 'Target User',
        description: 'HMW identifies a specific user or stakeholder',
        checkPrompt: 'Does this HMW clearly identify who it is for?'
      },
      {
        name: 'Measurable Outcome',
        description: 'HMW implies a measurable outcome or benefit',
        checkPrompt: 'Does this HMW suggest a concrete outcome that could be validated?'
      }
    ]
  },
  {
    stepId: 'persona',
    criteria: [
      {
        name: 'Research Grounding',
        description: 'Persona traits trace back to Step 4 pains/gains',
        checkPrompt: 'Are the persona\'s pains and gains directly from the research findings in Step 4?'
      },
      {
        name: 'Specificity',
        description: 'Persona has concrete details (name, role, context)',
        checkPrompt: 'Does the persona feel like a real person with specific details, not a generic archetype?'
      },
      {
        name: 'Actionability',
        description: 'Persona provides enough detail to inform design decisions',
        checkPrompt: 'Could a designer use this persona to make specific product decisions?'
      }
    ]
  }
  // ... criteria for other steps
];
```

### Pattern 4: State Machine for Arc Transitions
**What:** Track which arc phase the conversation is in and when to transition
**When to use:** Track state per step conversation, transition based on user input
**Example:**
```typescript
// Source: State machine chatbot patterns research
export interface ConversationState {
  sessionId: string;
  stepId: string;
  currentPhase: ArcPhase;
  gatheringComplete: boolean;
  draftCreated: boolean;
  validationPassed: boolean;
}

export function getNextArcPhase(
  currentPhase: ArcPhase,
  state: ConversationState
): ArcPhase {
  // Simple linear progression with conditional logic
  const transitions: Record<ArcPhase, () => ArcPhase> = {
    orient: () => 'gather',
    gather: () => state.gatheringComplete ? 'synthesize' : 'gather',
    synthesize: () => state.draftCreated ? 'refine' : 'synthesize',
    refine: () => 'validate', // User decides when to move to validation
    validate: () => state.validationPassed ? 'complete' : 'refine',
    complete: () => 'complete' // Terminal state
  };

  return transitions[currentPhase]();
}
```

### Anti-Patterns to Avoid

**Anti-Pattern: Implicit Arc Phases**
- **What:** Expecting the AI to naturally follow Orient → Gather → Synthesize without explicit instructions
- **Why it fails:** LLMs are stateless — they don't maintain phase awareness between messages without explicit prompting
- **Do instead:** Inject arc phase instructions into every system prompt based on tracked conversation state

**Anti-Pattern: Generic Validation ("Is this good?")**
- **What:** Asking the AI to validate without specific criteria
- **Why it fails:** LLMs default to positive reinforcement; generic validation yields false positives
- **Do instead:** Provide explicit quality criteria as checkPrompt instructions in the system prompt

**Anti-Pattern: Context Overload**
- **What:** Injecting all 10 steps' artifacts and summaries into every prompt
- **Why it fails:** Token limits, context degradation, relevance dilution
- **Do instead:** Use tiered context (Phase 7 architecture) — only inject relevant prior steps' persistent artifacts and summaries

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON Schema generation from TypeScript types | Manual schema objects | Zod schemas + zodToJsonSchema | Type safety, runtime validation, automatic schema generation, Gemini 2.0 integration |
| Context window token counting | String length estimation | LLM provider's token counting API | Accurate across different tokenizers (GPT vs Gemini), prevents unexpected truncation |
| Prompt template composition | String concatenation | Template functions with type-safe parameters | Prevents injection vulnerabilities, enforces required fields, easier testing |
| Conversation state persistence | In-memory state tracking | Database-backed state with phase column | Survives server restarts, enables conversation resume, audit trail for debugging |
| Arc phase transitions | Complex conditional logic | Finite state machine library (XState optional) | Prevents invalid state transitions, easier visualization, testable |

**Key insight:** Conversational AI in production requires state management beyond what in-memory objects can provide. The Phase 7 context architecture (database-backed artifacts, summaries, and messages) is the foundation — Phase 8 builds on it by adding conversation state tracking for arc phases.

## Common Pitfalls

### Pitfall 1: Context Degradation in Long Conversations
**What goes wrong:** After 4-5 back-and-forth exchanges, the AI "forgets" earlier conversation context or loses track of the current arc phase.

**Why it happens:**
- Short-term message history grows unbounded (Tier 3 context)
- No explicit state tracking for arc phase
- System prompt doesn't reinforce current phase on every request

**How to avoid:**
- Track arc phase in database (new column in chatMessages or separate conversationState table)
- Re-inject arc phase instructions in system prompt on every chat request
- Use Phase 7's summary generation to compress long conversations (prevent Tier 3 bloat)

**Warning signs:**
- AI re-asks questions already answered
- AI says "Let's move to synthesis" when already in Refine phase
- User complains "it forgot what I just said"

### Pitfall 2: False Positive Validation
**What goes wrong:** AI marks step as "complete" when output doesn't meet quality criteria. User progresses with incomplete/low-quality work.

**Why it happens:**
- Generic validation prompt ("Is this good?")
- LLMs have positive bias — they want to be helpful and affirming
- No explicit quality checklist in the prompt

**How to avoid:**
- Provide specific validation criteria as system prompt instructions
- Use structured outputs (Gemini responseSchema) to enforce quality checks return specific pass/fail per criterion
- Require AI to provide evidence: "This meets Criterion X because..."

**Warning signs:**
- Downstream steps reference missing data from prior steps
- User-generated artifacts lack required fields
- Validation phase completes in <1 AI response (should involve back-and-forth)

### Pitfall 3: Treating LLMs as Authorities
**What goes wrong:** AI confidently makes up "best practices" or invents design thinking rules that don't exist. User accepts them as truth.

**Why it happens:**
- No grounding in actual design thinking methodology
- Hallucination during Orient and Validate phases
- Prompts don't constrain AI to specific frameworks

**How to avoid:**
- Include design thinking principles in step-specific prompts (from Obsidian docs)
- Use structured outputs for artifacts (Zod schemas enforce required fields)
- Validate AI-generated content against hardcoded step definitions in step-metadata.ts
- Phase 11-13 implementation should include methodology grounding in prompts

**Warning signs:**
- AI suggests steps that don't exist in the 10-step workflow
- AI invents new frameworks ("Use the RICE-SWOT hybrid method...")
- Artifacts don't match expected structure from step-metadata.ts mockOutputContent

### Pitfall 4: Lost in the Middle (Long Context Problem)
**What goes wrong:** In steps with lots of prior context (Steps 7-10), the AI ignores information buried in the middle of the context window, only using the beginning and end.

**Why it happens:**
- Gemini (and all LLMs) have "lost in the middle" attention patterns
- Context is ordered chronologically (Step 1, 2, 3... 9) but Step 9 may need Step 5's persona more than Step 2's stakeholders

**How to avoid:**
- Order context by relevance, not chronology (most relevant context at beginning and end)
- For Steps 7-10: place persona (Step 5), HMW (Step 7), and journey map dip (Step 6) at the beginning
- Use summaries for less-critical steps to reduce middle-context bloat
- Consider context window limits: Gemini 2.0 Flash degrades around 130k tokens (60-70% of 1M theoretical max)

**Warning signs:**
- AI asks for information that was provided in middle steps
- AI references Step 1 and Step 9 but ignores Step 5
- Context assembly exceeds 100k tokens (trigger for relevance-based reordering)

### Pitfall 5: Arc Phase Whiplash
**What goes wrong:** AI jumps between arc phases erratically (Orient → Synthesize → Gather) instead of following the intended flow.

**Why it happens:**
- User input doesn't clearly signal phase transitions ("Actually, change that" during Gather phase)
- No explicit state tracking — AI guesses phase from conversation history
- System prompt doesn't lock the current phase

**How to avoid:**
- Track arc phase explicitly in database (conversationState table or chatMessages metadata)
- System prompt states current phase clearly: "CURRENT PHASE: Gather"
- User intent detection: "change that" during Gather → stay in Gather, "change that" after draft shown → move to Refine
- Provide UI hints: Show current arc phase in chat interface ("Gathering information...")

**Warning signs:**
- AI says "Let me draft this" before asking enough questions (skipping Gather)
- AI asks clarifying questions after presenting a draft (regressing from Synthesize to Gather)
- User confusion: "Wait, I thought we were done with that part?"

## Code Examples

Verified patterns from official sources:

### Dynamic System Prompt with Context Injection
```typescript
// Source: Vercel AI SDK Prompts documentation
// Location: src/lib/ai/chat-config.ts (extend existing buildStepSystemPrompt)

import { google } from '@ai-sdk/google';
import { getArcPhaseInstructions, getStepSpecificInstructions } from './prompts/step-prompts';
import type { ArcPhase } from './conversation-state';

export function buildStepSystemPrompt(
  stepId: string,
  stepName: string,
  arcPhase: ArcPhase,
  persistentContext: string,
  summaries: string
): string {
  // Step-specific base instructions
  let prompt = `You are an AI design thinking facilitator guiding the user through Step: ${stepName}.

${getArcPhaseInstructions(arcPhase)}

${getStepSpecificInstructions(stepId)}

Be encouraging, ask probing questions, and help them think deeply about their ideas.
Keep responses concise and actionable.`;

  // Add Tier 1: Persistent Memory (structured artifacts)
  if (persistentContext) {
    prompt += `\n\nPERSISTENT MEMORY (Structured outputs from completed steps):
${persistentContext}`;
  }

  // Add Tier 2: Long-term Memory (conversation summaries)
  if (summaries) {
    prompt += `\n\nLONG-TERM MEMORY (Summaries of previous step conversations):
${summaries}`;
  }

  // Add context usage instructions
  if (persistentContext || summaries) {
    prompt += `\n\nCONTEXT USAGE RULES:
- Reference prior step outputs by name when relevant (e.g., "Based on your persona Sarah from Step 5...")
- Build on prior knowledge — do not re-ask questions already answered in earlier steps
- If the user's current input contradicts a prior step output, note the discrepancy gently`;
  }

  return prompt;
}
```

### Structured Output Validation with Gemini
```typescript
// Source: Gemini Structured Outputs documentation
// NEW: src/lib/ai/validation.ts

import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { z } from 'zod';
import { zodToJsonSchema } from 'ai';

// Validation result schema
const ValidationResultSchema = z.object({
  overallPassed: z.boolean().describe('True if all criteria are met'),
  criteriaResults: z.array(
    z.object({
      criterionName: z.string(),
      passed: z.boolean(),
      reasoning: z.string().describe('Why this criterion passed or failed'),
      suggestion: z.string().optional().describe('How to improve if failed')
    })
  )
});

export async function validateStepOutput(
  stepId: string,
  outputContent: string,
  persistentContext: string
): Promise<z.infer<typeof ValidationResultSchema>> {
  // Get criteria for this step
  const criteria = getValidationCriteriaForStep(stepId);

  const criteriaPrompts = criteria.map(c =>
    `- ${c.name}: ${c.checkPrompt}`
  ).join('\n');

  const result = await generateText({
    model: google('gemini-2.0-flash'),
    prompt: `You are validating the output of a design thinking step.

OUTPUT TO VALIDATE:
${outputContent}

PRIOR CONTEXT (for reference):
${persistentContext}

VALIDATION CRITERIA:
${criteriaPrompts}

For each criterion, determine if it passes and explain why. Provide suggestions for improvement if it fails.`,
    output: {
      schema: ValidationResultSchema
    }
  });

  return result.output;
}
```

### Arc Phase State Tracking
```typescript
// Source: State machine chatbot patterns research
// NEW: src/lib/ai/conversation-state.ts

export type ArcPhase = 'orient' | 'gather' | 'synthesize' | 'refine' | 'validate' | 'complete';

export interface ConversationState {
  sessionId: string;
  stepId: string;
  currentPhase: ArcPhase;
  phaseHistory: ArcPhase[];
  createdAt: Date;
  updatedAt: Date;
}

export async function getCurrentArcPhase(
  sessionId: string,
  stepId: string
): Promise<ArcPhase> {
  // Query conversation state from database
  const state = await db
    .select()
    .from(conversationStates)
    .where(
      and(
        eq(conversationStates.sessionId, sessionId),
        eq(conversationStates.stepId, stepId)
      )
    )
    .limit(1);

  // Default to 'orient' for new conversations
  return state[0]?.currentPhase || 'orient';
}

export async function transitionArcPhase(
  sessionId: string,
  stepId: string,
  newPhase: ArcPhase
): Promise<void> {
  // Update conversation state
  await db
    .update(conversationStates)
    .set({
      currentPhase: newPhase,
      updatedAt: new Date()
    })
    .where(
      and(
        eq(conversationStates.sessionId, sessionId),
        eq(conversationStates.stepId, stepId)
      )
    );
}
```

### Step-Specific Prompt Instructions
```typescript
// Source: Design thinking methodology + Obsidian step specs
// NEW: src/lib/ai/prompts/step-prompts.ts

export function getStepSpecificInstructions(stepId: string): string {
  const instructions: Record<string, string> = {
    'challenge': `STEP GOAL: Extract the core problem and draft a How Might We (HMW) statement.

DESIGN THINKING PRINCIPLES:
- Avoid solutions disguised as problems ("We need an app" is a solution, not a problem)
- Find the Goldilocks zone: not too broad ("fix poverty") nor too narrow ("blue buttons")
- HMW format: "How might we [action] for [who] so that [outcome]?"

GATHERING REQUIREMENTS:
- What is the problem they're solving?
- Who is it for?
- What outcome would success look like?`,

    'persona': `STEP GOAL: Create a research-grounded user persona.

DESIGN THINKING PRINCIPLES:
- Personas MUST be grounded in research from Step 4 (pains/gains)
- Every persona trait should trace back to research evidence
- Avoid "Frankenstein Personas" — don't combine conflicting traits from different user types
- Make them specific enough to be interesting but realistic enough to be valid

REQUIRED PERSONA FIELDS:
- Name, Age, Role, Location
- Bio (2-3 sentences rooted in research observations)
- Quote (one defining sentence in their voice)
- Pains (from Step 4 research)
- Gains (from Step 4 research)
- Behaviors (observable patterns from research)`,

    'reframe': `STEP GOAL: Craft a focused How Might We statement based on research insights.

DESIGN THINKING PRINCIPLES:
- Reference the Journey Map dip (Step 6) — this is where the opportunity lives
- Reference the Persona (Step 5) — make it specific to their needs
- Reframe with research evidence, not assumptions
- HMW should be narrower and more focused than the original Challenge (Step 1)

GATHERING REQUIREMENTS:
- Which stage of the journey map is the biggest pain point?
- What immediate goal should the persona achieve?
- What deeper outcome would make this meaningful?`,

    // ... instructions for other steps
  };

  return instructions[stepId] || 'No specific instructions for this step.';
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic chatbot prompt for all steps | Step-specific prompts with arc phase instructions | 2026 (conversational AI maturity) | AI maintains context and purpose across 10-step workflow |
| Manual validation ("does this look good?") | Structured validation with explicit criteria + LLM-as-judge | 2025-2026 (LLM evaluation tools maturity) | Quality control before progression, fewer low-quality outputs |
| Stateless chat (each message independent) | State-tracked conversations with phase awareness | 2026 (death of sessionless AI) | AI remembers arc phase, prevents whiplash and regression |
| Prompt engineering alone | Context engineering (prompt + data curation + state management) | 2026 (context engineering paradigm) | Reliability, provenance, token efficiency in production systems |
| String concatenation for prompts | Type-safe prompt template functions | 2024-2026 (prompt engineering maturation) | Prevents injection, enforces required fields, testable |

**Deprecated/outdated:**
- **Generic system prompts**: Replaced by step-aware dynamic prompts with context injection (Vercel AI SDK supports this natively)
- **In-memory conversation state**: Replaced by database-backed state tracking (survives restarts, enables resume)
- **Manual JSON Schema writing**: Replaced by Zod schema generation (type-safe, automatic conversion to Gemini responseSchema)

## Open Questions

Things that couldn't be fully resolved:

1. **Arc Phase Transition Detection**
   - What we know: AI can detect user intent ("change that" vs "looks good") via prompt engineering
   - What's unclear: Optimal balance between automatic transitions vs explicit user control (e.g., "Next" button)
   - Recommendation: Start with hybrid approach — AI suggests transitions ("Ready to see a draft?"), user confirms via response or UI button. Monitor conversation logs to refine.

2. **Optimal Context Ordering for Steps 7-10**
   - What we know: "Lost in the middle" problem means chronological ordering isn't optimal
   - What's unclear: Which prior steps are most relevant for each step (requires domain knowledge)
   - Recommendation: Phase 11-13 implementation should experiment with relevance-based ordering. Start with hypothesis: Step 7 (Reframe) needs Steps 1, 5, 6 at top; Step 9 (Concept) needs Steps 5, 7 at top.

3. **Token Budget for Context Window**
   - What we know: Gemini 2.0 Flash degrades around 130k tokens (60-70% of 1M max)
   - What's unclear: Actual token consumption for 10 steps of artifacts + summaries + messages
   - Recommendation: Implement token counting in Phase 9 (when artifacts are structured). Set warning threshold at 100k tokens, trigger aggressive summarization at 120k.

4. **Validation Failure Recovery**
   - What we know: AI can detect quality issues via structured validation
   - What's unclear: Best UX for "you can't progress yet" — frustrating if not handled well
   - Recommendation: Frame validation failures as coaching, not blocking. "This is a good start, but let's strengthen [criterion] by [specific suggestion]." Track validation attempts to prevent infinite loops.

## Sources

### Primary (HIGH confidence)
- [Vercel AI SDK: System Prompts](https://ai-sdk.dev/docs/foundations/prompts) - Dynamic system prompt implementation
- [Vercel AI SDK: Prompt Engineering](https://ai-sdk.dev/docs/advanced/prompt-engineering) - Best practices for instruction clarity and examples
- [Gemini Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output) - JSON Schema validation with responseSchema
- Existing codebase: `src/lib/ai/chat-config.ts`, `src/lib/context/assemble-context.ts`, `src/app/api/chat/route.ts`

### Secondary (MEDIUM confidence)
- [Conversational AI Design in 2026](https://botpress.com/blog/conversation-design) - Step-based workflow design patterns
- [Context Engineering Guide](https://www.promptingguide.ai/guides/context-engineering-guide) - Context as infrastructure approach
- [AI Context Engineering in 2026: Why Prompt Engineering Is No Longer Enough](https://sombrainc.com/blog/ai-context-engineering-guide) - Context engineering paradigm shift
- [Guiding AI Conversations through Dynamic State Transitions](https://promptengineering.org/guiding-ai-conversations-through-dynamic-state-transitions/) - State machine patterns for chatbots
- [LLM Evaluation Metrics: The Ultimate LLM Evaluation Guide](https://www.confident-ai.com/blog/llm-evaluation-metrics-everything-you-need-for-llm-evaluation) - Validation criteria and quality assessment
- [Evaluating LLM Agents in Multi-Step Workflows (2026 Guide)](https://www.codeant.ai/blogs/evaluate-llm-agentic-workflows) - Step efficiency and multi-step evaluation
- [Context Window Management: Strategies for Long-Context AI Agents and Chatbots](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/) - Token limits and context degradation
- [The Death of Sessionless AI: How Conversation Memory Will Evolve from 2026–2030](https://medium.com/@aniruddhyak/the-death-of-sessionless-ai-how-conversation-memory-will-evolve-from-2026-2030-9afb9943bbb5) - State-aware conversation trends

### Tertiary (LOW confidence)
- [Evaluating Multi-Step Conversational AI is Hard](https://eointravers.com/blog/convo-evals/) - Evaluation challenges (practical insights but limited scope)
- [How to Use AI for Workshops: A Facilitator Guide](https://miro.com/ai/ai-workshop/) - AI-enhanced workshop design (vendor content)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vercel AI SDK and Gemini structured outputs are well-documented and already integrated
- Architecture: HIGH - Dynamic prompts and state tracking are established patterns, existing Phase 7 foundation is solid
- Pitfalls: MEDIUM - Based on research findings and best practices, but not all verified in this specific use case

**Research date:** 2026-02-08
**Valid until:** 60 days (2026-04-08) — Stable domain (prompt engineering, Vercel AI SDK, Gemini API), but conversational AI patterns evolving rapidly
