# Phase 11: Discovery Steps (1-4) - Research

**Researched:** 2026-02-08
**Domain:** Design thinking discovery steps with AI facilitation and synthetic user research
**Confidence:** HIGH

## Summary

Phase 11 implements the first four design thinking steps (Challenge, Stakeholder Mapping, User Research, Sense Making) using the AI facilitation engine (Phase 8), structured outputs (Phase 9), and context architecture (Phase 7) already in place. These are the **exploration cluster** -- focused on divergent thinking, gathering raw information, and building a research foundation before synthesis begins in Steps 5-7.

The Discovery Steps follow a consistent pattern: AI guides user through the 6-phase conversational arc (Orient → Gather → Synthesize → Refine → Validate → Complete), extracts structured JSON artifacts matching Zod schemas, and saves outputs to the database for forward context flow. Steps 1-4 are unique in that they build FROM SCRATCH -- no prior step outputs exist yet, so prompts focus on expansive questioning rather than synthesis.

Step 3 (User Research) introduces **synthetic interviews** -- a 2026-standard approach where AI simulates stakeholder responses based on the challenge and stakeholder map. Research shows synthetic users are "somewhat useful for broad attitudinal questions" but responses are "one-dimensional" compared to real participants. Best practice is AI-assisted analysis of real research data, but for MVP 0.5, synthetic interviews provide speed and scalability for solo users who cannot conduct real user interviews.

Step 4 (Sense Making) uses **affinity mapping** and **clustering patterns** to organize research findings into themes, pains, and gains. The AI performs the cognitive work (grouping insights, identifying patterns) while the user validates and refines. This is the critical synthesis step that sets up Persona Development (Step 5) and Journey Mapping (Step 6).

**Primary recommendation:** Use existing AI facilitation infrastructure with step-specific prompt customizations. The heavy lifting is done -- Steps 1-4 are content and schema work, not new architecture. Focus on prompt quality, schema field descriptions, and validation criteria that ensure outputs are actionable for downstream steps.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vercel AI SDK | 6.x | Conversational AI with structured extraction | Phase 7-9 foundation, streamText + output property |
| Gemini 2.5 Flash | Current | AI model for facilitation and extraction | 1M context window, context caching, 90% cost savings |
| Zod | 4.x | Schema definition and validation | Phase 9 schemas already exist for all 10 steps |
| Drizzle ORM | Latest | Database persistence with JSONB | Phase 7 context architecture, step_artifacts table |

### Supporting (Already Configured)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| step-prompts.ts | Internal | Step-specific AI instructions | Already has prompts for Steps 1-4 |
| arc-phases.ts | Internal | 6-phase conversational arc instructions | Already defines Orient/Gather/Synthesize/Refine/Validate/Complete |
| validation-criteria.ts | Internal | Quality criteria per step | Already defines 2-4 criteria for Steps 1-4 |
| step-schemas.ts | Internal | Zod schemas for all 10 steps | Already defines challengeArtifactSchema, stakeholderArtifactSchema, userResearchArtifactSchema, senseMakingArtifactSchema |

### No New Dependencies Required
Phase 11 uses infrastructure from Phases 7-9. No new npm packages needed.

## Architecture Patterns

### Recommended Implementation Structure

Steps 1-4 UI components follow the existing pattern from Phase 10:

```
src/app/workshop/[workshopId]/step/[stepSlug]/
├── page.tsx                    # Server component, loads workshop data
└── components/
    ├── StepChatInterface.tsx   # Chat UI (already exists from Phase 5)
    ├── StepOutputPanel.tsx     # Structured output display (Phase 9)
    └── StepNavigation.tsx      # Back/Next with validation (Phase 10)
```

No new architecture needed -- this phase is **content implementation** using existing patterns.

### Pattern 1: Discovery Step Prompt Structure

**What:** Steps 1-4 share a common prompt pattern: expansive exploration without synthesis burden.

**When to use:** When customizing step-prompts.ts for Discovery cluster (already done in Phase 8).

**Example:**
```typescript
// Step 1 (Challenge) - NO PRIOR CONTEXT
PRIOR CONTEXT USAGE:
This is Step 1 — no prior outputs to reference yet. Set the foundation for the entire workshop.

// Step 2 (Stakeholder Mapping) - REFERENCES STEP 1 ONLY
PRIOR CONTEXT USAGE:
Reference the Challenge (Step 1) to identify who is mentioned in the HMW statement and who else might be involved.

// Step 3 (User Research) - REFERENCES STEPS 1-2
PRIOR CONTEXT USAGE:
Reference the Stakeholder Map (Step 2) to identify which user types to research.
Reference the Challenge (Step 1) to keep research focused on the HMW problem area.

// Step 4 (Sense Making) - REFERENCES STEP 3 HEAVILY
PRIOR CONTEXT USAGE:
Reference User Research insights (Step 3) heavily — every theme, pain, and gain must trace back to specific findings.
Reference the Challenge (Step 1) to ensure sense-making stays relevant to the core problem.
```

**Key insight:** Forward context flow starts light (Step 1 has none), grows incrementally (Step 2 uses Step 1), and becomes heavy by Step 4 (uses Steps 1-3 extensively).

### Pattern 2: Synthetic Interview Generation (Step 3)

**What:** AI simulates stakeholder responses based on challenge context and stakeholder map.

**When to use:** Step 3 User Research when user cannot conduct real interviews.

**Example:**
```typescript
// Synthetic Interview Approach (from Obsidian spec)
// Step 3: User Research - Phase 1 (Crawl/MVP)

// 1. AI generates interview questions (3-5) based on stakeholder map
const interviewQuestions = await streamText({
  model: google('gemini-2.5-flash'),
  system: `You are a user research expert. Based on the challenge and stakeholder map,
  generate 3-5 open-ended interview questions that will uncover:
  - Current behaviors and pain points
  - Desired outcomes and goals
  - Context and constraints

  Avoid leading questions or solution suggestions.`,
  messages: conversationHistory,
  output: {
    schema: z.object({
      questions: z.array(z.string()).min(3).max(5)
    })
  }
});

// 2. User selects which stakeholders to "interview" (from Step 2 map)
// 3. AI simulates each stakeholder's responses to the questions

const syntheticResponses = await streamText({
  model: google('gemini-2.5-flash'),
  system: `You are roleplaying as: ${stakeholder.name} (${stakeholder.role}).

  Context: ${challengeStatement}
  Your role: ${stakeholder.category} stakeholder with ${stakeholder.power} power and ${stakeholder.interest} interest.

  Answer the following interview questions from this stakeholder's perspective.
  Be realistic, specific, and grounded in the challenge context.
  Express frustrations, goals, and current workarounds naturally.`,
  messages: interviewQuestions.map(q => ({ role: 'user', content: q }))
});

// 4. Capture responses as "research insights" with source attribution
const insights = {
  finding: "[Observation from synthetic interview]",
  source: stakeholder.name,
  quote: "[Verbatim from AI roleplay]"
};
```

**Warning:** Research shows synthetic users produce "one-dimensional" responses compared to real participants. Communicate to users that synthetic interviews are a **starting point**, not a replacement for real user research. Include capability to paste real interview transcripts as an alternative path.

### Pattern 3: Affinity Mapping and Clustering (Step 4)

**What:** AI-assisted clustering of research insights into themes with evidence.

**When to use:** Step 4 Sense Making to organize research findings.

**Example:**
```typescript
// Affinity Mapping Approach (from research + Obsidian spec)
// Step 4: Research Sense Making

const themesExtraction = await streamText({
  model: google('gemini-2.5-flash'),
  system: `You are a Senior User Researcher performing affinity mapping.

  TASK: Analyze the research insights from Step 3 and cluster them into themes.

  PROCESS:
  1. Group related observations into logical themes (2-5 themes maximum)
  2. For each theme, identify supporting evidence from specific research findings
  3. Distinguish between PAINS (current frustrations) and GAINS (desired outcomes)
  4. Extract 5 top pains and 5 top gains with evidence

  CRITICAL: Every pain and gain must trace back to specific research findings.
  Do NOT invent generic insights -- ground everything in the research data.`,
  messages: conversationHistory,
  output: {
    schema: senseMakingArtifactSchema // From step-schemas.ts
  },
  temperature: 0.1 // Low for factual extraction
});

// Schema fields guide extraction:
// - themes: array with name + evidence array
// - pains: array of strings with evidence
// - gains: array of strings with evidence
```

**Best practice:** Affinity mapping works best as a **collaborative workshop** where the team builds clusters jointly. For MVP 0.5 (solo user), AI automates the clustering but user must validate and refine. Consider adding UI for manual reorganization in future releases.

### Pattern 4: Validation Criteria Usage (All Steps)

**What:** Each step has 2-4 validation criteria that AI checks before allowing completion.

**When to use:** During Validate phase of conversational arc.

**Example:**
```typescript
// From validation-criteria.ts (Phase 8)
// Step 1 (Challenge) criteria:
{
  name: "Specificity",
  description: "Challenge is neither too broad nor too narrow",
  checkPrompt: "Is the HMW statement specific enough to be actionable but broad enough to allow creative solutions?"
}

{
  name: "Target User Identified",
  description: "HMW clearly identifies who the user is",
  checkPrompt: "Does the HMW statement explicitly name or describe the target user group?"
}

// AI uses checkPrompt to self-evaluate during Validate phase
// If criteria not met, AI provides feedback and prompts refinement
// User cannot complete step until validation passes (soft gating per Phase 9-03)
```

### Anti-Patterns to Avoid

- **Synthesis too early:** Steps 1-3 are GATHERING, not synthesizing. Don't extract themes in Step 3 -- that's Step 4's job. Each step has a clear boundary.
- **Skipping validation criteria:** Allowing users to proceed with incomplete artifacts breaks downstream steps. Step 5 (Persona) needs Step 4 pains/gains -- if those are missing, persona will be generic.
- **Forcing synthetic-only research:** Give users the option to paste real research data. Synthetic is faster, but real is better when available.
- **Generic AI responses:** "Tell me about your problem" is too vague. Use context from prior steps to make questions specific: "Based on your HMW about helping PMs track tasks, who are the core users?"

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Conversational arc structure | Custom state machine | arc-phases.ts (Phase 8) | Already defines 6-phase arc with behavioral instructions. Don't rebuild. |
| Step-specific prompts | Inline prompt strings | step-prompts.ts (Phase 8) | Centralized, version-controlled, avoids circular dependencies. |
| Schema validation | Manual JSON checks | Zod schemas from step-schemas.ts (Phase 9) | Already defined for all 10 steps with .describe() for LLM guidance. |
| Affinity mapping UI | Custom drag-drop canvas | AI-assisted text clustering (MVP), defer canvas to MMP | Complex UI premature for MVP 0.5. Text-based clustering with AI analysis is sufficient. |
| Synthetic interview generation | Hardcoded Q&A templates | LLM roleplay with context injection | Templates are rigid. LLM adapts to challenge context and stakeholder characteristics. |
| Context assembly | Manual string concatenation | assembleStepContext from Phase 7 | Hierarchical compression (persistent + long-term + short-term) already implemented. |

**Key insight:** Phases 7-9 built the AI facilitation engine. Phase 11 is **content implementation** -- writing prompts, defining schemas (already done), and wiring UI. Don't reinvent infrastructure.

## Common Pitfalls

### Pitfall 1: Synthetic Interview Believability Gap

**What goes wrong:** AI-generated stakeholder responses feel generic, one-dimensional, or inconsistent with the challenge context. User loses trust in the research quality and skips to later steps with weak foundation.

**Why it happens:** Synthetic users "respond with much more internal consistency than real people" and lack the contradictions, confusion, or hesitation that real humans express. LLMs can generate plausible-sounding responses but struggle with:
- Emotional nuance (frustration, excitement, uncertainty)
- Contextual details specific to the stakeholder's role
- Contradictory statements that real humans make
- Domain-specific jargon or constraints

**How to avoid:**
- Inject rich context into synthetic interview prompts: stakeholder role, power/interest levels, challenge statement, industry context
- Use temperature 0.7-0.9 for synthetic interviews (higher creativity) vs 0.1 for extraction (factual accuracy)
- Prompt AI to include realistic details: "Express hesitation when uncertain, mention specific tools or processes they use, include frustrations with current workarounds"
- Communicate clearly to users: "These are AI-generated simulations. For best results, conduct real interviews when possible."
- Provide alternative path: allow users to paste real interview transcripts or research data

**Warning signs:**
- Synthetic responses all sound similar across different stakeholders
- Lack of specific examples or concrete details
- No contradictions or messy human behavior
- Users saying "this doesn't sound like my actual users"

### Pitfall 2: Premature Synthesis in Discovery Steps

**What goes wrong:** Step 2 (Stakeholder Mapping) starts extracting themes and pain points. Step 3 (User Research) attempts to build personas. User reaches Step 4 (Sense Making) and realizes prior steps already did the synthesis work, creating redundancy and confusion.

**Why it happens:** AI facilitation prompts are too eager to "help" by jumping ahead. Design thinking has a clear sequence: gather raw data FIRST (Steps 1-3), THEN synthesize (Step 4), THEN build artifacts (Steps 5-7). Breaking this sequence produces shallow insights because synthesis happens before sufficient data exists.

**How to avoid:**
- Enforce clear boundaries in step prompts:
  - Steps 1-3: "Focus on gathering information. Do NOT synthesize into themes or personas yet."
  - Step 4: "NOW is the time to synthesize. Reference raw data from Step 3 heavily."
- Validation criteria should check for scope creep: "Does this step stay within its gathering role?"
- Arc phase instructions (Synthesize phase) should be context-aware: in Steps 1-3, "synthesize" means summarizing what was said, NOT extracting themes
- Use specific language: "capture observations" (Step 3) vs "cluster into themes" (Step 4)

**Warning signs:**
- Step 3 output includes "themes" or "patterns" (that's Step 4's job)
- Step 2 stakeholder map attempts to prioritize solutions (that's Step 8's job)
- Users feeling like they're repeating work in later steps
- Downstream steps lack material to work with because synthesis already happened

### Pitfall 3: Weak Evidence Chain from Research to Insights

**What goes wrong:** Step 4 produces pain points and gains that sound plausible but don't actually trace back to specific research findings from Step 3. Step 5 builds a persona with traits unsupported by research. By Step 7, the reframed HMW is disconnected from actual user needs.

**Why it happens:** LLMs are prone to "hallucinating" plausible-sounding insights that fit the pattern but aren't grounded in provided context. Without explicit prompting to cite evidence, AI will generate generic UX insights ("users want simplicity") instead of specific findings ("PM stakeholders mentioned spending 2 hours/week manually updating status reports").

Affinity mapping research shows "every participant should have their voice heard" -- but AI clustering can deprioritize minority viewpoints or edge cases if they don't fit clean themes.

**How to avoid:**
- Explicit evidence requirements in schemas: senseMakingArtifactSchema.themes requires `evidence: array of strings`
- Validation criteria: "Research Grounding - do all pains/gains trace to specific Step 3 insights?"
- Prompt engineering: "For each pain point, cite the specific research finding (quote and source) that supports it"
- UI showing evidence chain: display pain point alongside supporting quotes from Step 3
- Temperature 0.1 for extraction to minimize hallucination
- Include validation phase where user reviews extracted pains/gains against original research

**Warning signs:**
- Generic pain points that could apply to any project ("users want faster performance")
- Pains/gains don't reference specific stakeholder types from Step 2
- Persona traits (Step 5) contradict research data from Steps 3-4
- User says "that's not what my research showed"
- Evidence arrays in themes are empty or vague

### Pitfall 4: Altitude Misalignment in Challenge Statement (Step 1)

**What goes wrong:** User completes Step 1 with either (a) challenge too broad ("How might we improve education?") making later steps unfocused, or (b) challenge too narrow ("How might we add a blue export button?") constraining creativity in ideation.

**Why it happens:** The "Goldilocks zone" (from Step 1 Obsidian spec) is subjective and hard to assess without experience. Users arrive with strong convictions:
- Founders with solutions in mind frame challenges as feature requests
- Domain experts frame challenges at system level (too broad)
- Technical users frame challenges as implementation details (too narrow)

AI struggles to push back on user conviction without seeming adversarial.

**How to avoid:**
- Draft multiple HMW variants at different altitudes: show user 3 versions (narrow, balanced, broad) and explain tradeoffs
- Validation criterion: "Altitude Check - does this HMW allow creative solutions without being unsolvable?"
- Specific prompting: "That sounds like a solution. What is the underlying pain point?" (from Step 1 spec)
- Examples in Orient phase: show good vs bad HMW statements with explanations
- Optional `altitude` field in challengeArtifactSchema (enum: specific/balanced/broad) for self-assessment
- Allow revision after Step 7 (Reframe) -- that's when research insights improve understanding

**Warning signs:**
- HMW statement includes technology choices ("using blockchain")
- HMW statement is a vision statement ("make the world better")
- Step 8 (Ideation) produces only incremental variations (too narrow) or generic approaches (too broad)
- User struggling to identify concrete stakeholders (too broad) or stakeholders are all internal team members (too narrow)

### Pitfall 5: Stakeholder Map Incompleteness (Step 2)

**What goes wrong:** User completes Step 2 with only obvious stakeholders (direct users). Missing: buyers, regulators, internal team, influencers. Step 3 research misses critical perspectives. Step 9 SWOT analysis reveals threats from unconsidered stakeholders.

**Why it happens:** Users naturally focus on who USES the solution (core stakeholders) and forget who DECIDES, INFLUENCES, or BLOCKS (direct/indirect stakeholders). The radar chart model (Core/Direct/Indirect) from Step 2 spec requires thinking beyond end users.

From Step 2 spec: "Users might forget internal stakeholders (Devs, Investors). The AI should prompt for these."

**How to avoid:**
- AI proactive prompting: "You've identified end users. What about decision-makers, funders, regulators, or internal team members?"
- Checklist approach: "Let's go through categories: Users, Buyers, Decision-makers, Influencers, Regulators, Internal Team, Partners. Who fits each?"
- Validation criterion: "Coverage - are Core, Direct, AND Indirect categories populated?"
- Reference challenge context: "Your HMW mentions [domain]. Are there domain-specific regulators or gatekeepers?"
- Examples from similar domains: "In EdTech, stakeholders often include students, teachers, parents, school admins, and district buyers"

**Warning signs:**
- Stakeholder map has <5 stakeholders total (likely incomplete)
- All stakeholders are "core" category (missing periphery)
- Step 3 research questions feel one-dimensional (only asking end users)
- Step 9 SWOT "Threats" section reveals stakeholders not mapped in Step 2
- User surprised by blockers or influencers late in the process

## Code Examples

Verified patterns from official sources and existing codebase:

### Step 1 (Challenge) - HMW Extraction with Altitude Check

```typescript
// Source: Existing step-prompts.ts + challengeArtifactSchema
// Step 1 conversational flow

// Arc Phase: Synthesize (draft HMW variants)
const hmwVariants = await streamText({
  model: google('gemini-2.5-flash'),
  system: `${getStepSpecificInstructions('challenge')}

  Based on the conversation, draft 3 HMW statement variants at different altitudes:
  1. Specific (narrow focus)
  2. Balanced (moderate scope)
  3. Broad (wider impact)

  Explain tradeoffs and recommend which altitude best fits the user's goals.`,
  messages: conversationHistory,
  output: {
    schema: z.object({
      specific: z.string().describe('Narrow HMW focusing on specific user moment'),
      balanced: z.string().describe('Moderate HMW balancing specificity and flexibility'),
      broad: z.string().describe('Wide HMW addressing systemic opportunity'),
      recommendation: z.string().describe('Which altitude you recommend and why')
    })
  }
});

// Arc Phase: Complete (extract final artifact)
const challengeArtifact = await streamText({
  model: google('gemini-2.5-flash'),
  system: 'Extract the final Challenge artifact based on user's selected HMW.',
  messages: conversationHistory,
  output: {
    schema: challengeArtifactSchema // From step-schemas.ts
  },
  temperature: 0.1 // Low for extraction accuracy
});

// Save to database (step_artifacts table)
await saveStepArtifact(workshopStepId, 'challenge', challengeArtifact.object);
```

### Step 3 (User Research) - Synthetic Interview Generation

```typescript
// Source: Research on synthetic users + Step 3 spec
// Generate interview questions based on challenge and stakeholders

const interviewQuestions = await streamText({
  model: google('gemini-2.5-flash'),
  system: `${getStepSpecificInstructions('user-research')}

  Challenge: ${challengeStatement}
  Stakeholders: ${stakeholderList}

  Generate 3-5 open-ended interview questions to uncover:
  - Current behaviors and pain points
  - Desired outcomes and goals
  - Context, constraints, and workarounds

  Questions must be:
  - Open-ended (not yes/no)
  - Non-leading (don't suggest solutions)
  - Specific to the challenge context`,
  output: {
    schema: z.object({
      questions: z.array(z.string()).min(3).max(5)
    })
  }
});

// Simulate stakeholder responses (synthetic interview)
const syntheticInterview = await streamText({
  model: google('gemini-2.5-flash'),
  system: `You are roleplaying as: ${stakeholder.name}, ${stakeholder.role}

  Challenge context: ${challengeStatement}
  Your stakeholder profile:
  - Category: ${stakeholder.category} (core/direct/indirect)
  - Power: ${stakeholder.power}
  - Interest: ${stakeholder.interest}
  - Notes: ${stakeholder.notes}

  Answer the interview questions from this stakeholder's realistic perspective.
  Include:
  - Specific examples and concrete details
  - Frustrations with current solutions
  - Goals and desired outcomes
  - Hesitation or uncertainty where realistic
  - Domain-specific context and constraints

  Be natural and realistic -- real people contradict themselves, express mixed feelings, and ramble.`,
  messages: interviewQuestions.questions.map(q => ({
    role: 'user',
    content: q
  })),
  temperature: 0.8 // Higher for creative, realistic responses
});

// Capture insights with source attribution
const insights = syntheticInterview.responses.map((response, idx) => ({
  finding: response.summary,
  source: stakeholder.name,
  quote: response.excerpt
}));
```

### Step 4 (Sense Making) - Affinity Mapping and Clustering

```typescript
// Source: Research on affinity mapping + senseMakingArtifactSchema
// AI-assisted clustering of research findings

const themeClusters = await streamText({
  model: google('gemini-2.5-flash'),
  system: `${getStepSpecificInstructions('sense-making')}

  ${getArcPhaseInstructions('synthesize')}

  Research insights from Step 3:
  ${JSON.stringify(researchInsights)}

  Perform affinity mapping:
  1. Group related observations into 2-5 themes
  2. For each theme, list specific evidence (quotes, findings, sources)
  3. Identify top 5 pains (current frustrations users face)
  4. Identify top 5 gains (desired outcomes users seek)

  CRITICAL: Every pain and gain must cite specific research evidence.
  Do NOT invent generic insights -- trace everything to Step 3 data.`,
  output: {
    schema: senseMakingArtifactSchema // From step-schemas.ts
  },
  temperature: 0.1 // Low for factual extraction
});

// Validation check: evidence traceability
const validationResult = await streamText({
  model: google('gemini-2.5-flash'),
  system: `Validation check: Do all pains and gains trace to specific research findings?

  Themes: ${JSON.stringify(themeClusters.themes)}
  Pains: ${JSON.stringify(themeClusters.pains)}
  Gains: ${JSON.stringify(themeClusters.gains)}
  Original Research: ${JSON.stringify(researchInsights)}

  For each pain/gain, verify it has supporting evidence from the research.
  Flag any that seem invented or generic.`,
  output: {
    schema: z.object({
      validated: z.boolean(),
      issues: z.array(z.string()),
      feedback: z.string()
    })
  }
});

if (!validationResult.validated) {
  // Show feedback to user, prompt for refinement
  // Don't allow step completion until validation passes
}
```

### Context Assembly for Discovery Steps

```typescript
// Source: Phase 7 context architecture patterns
// Steps 1-4 use progressively more context

async function assembleDiscoveryStepContext(
  workshopId: string,
  currentStepId: string
) {
  // Step 1: No prior context
  if (currentStepId === 'challenge') {
    return {
      persistentContext: '',
      summaries: '',
      messages: await getCurrentStepMessages(workshopId, currentStepId)
    };
  }

  // Step 2: Reference Challenge artifact
  if (currentStepId === 'stakeholder-mapping') {
    const challenge = await getStepArtifact(workshopId, 'challenge');
    return {
      persistentContext: `Challenge Statement: ${challenge.hmwStatement}`,
      summaries: '',
      messages: await getCurrentStepMessages(workshopId, currentStepId)
    };
  }

  // Step 3: Reference Challenge + Stakeholder Map
  if (currentStepId === 'user-research') {
    const challenge = await getStepArtifact(workshopId, 'challenge');
    const stakeholders = await getStepArtifact(workshopId, 'stakeholder-mapping');
    return {
      persistentContext: `
        Challenge: ${challenge.hmwStatement}
        Stakeholders: ${JSON.stringify(stakeholders.stakeholders)}
      `,
      summaries: '',
      messages: await getCurrentStepMessages(workshopId, currentStepId)
    };
  }

  // Step 4: Reference all prior artifacts (Challenge + Stakeholders + Research)
  if (currentStepId === 'sense-making') {
    const challenge = await getStepArtifact(workshopId, 'challenge');
    const stakeholders = await getStepArtifact(workshopId, 'stakeholder-mapping');
    const research = await getStepArtifact(workshopId, 'user-research');
    return {
      persistentContext: `
        Challenge: ${challenge.hmwStatement}
        Stakeholders: ${stakeholders.stakeholders.length} identified
        Research Insights: ${JSON.stringify(research.insights)}
      `,
      summaries: await getPreviousStepSummaries(workshopId, ['challenge', 'stakeholder-mapping', 'user-research']),
      messages: await getCurrentStepMessages(workshopId, currentStepId)
    };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual stakeholder brainstorming | AI-prompted stakeholder discovery with category checklist | 2025-2026 | Reduces blind spots, prompts for often-forgotten stakeholders (regulators, internal team) |
| Real-only user research | Synthetic interviews as MVP option, real research as enhancement | 2025-2026 | Enables solo users to proceed without recruiting participants, speeds discovery phase |
| Manual affinity mapping with post-its | AI-assisted clustering with human validation | 2024-2026 | 50-70% time savings, AI does cognitive grouping work, human validates quality |
| Template-based interview questions | Context-aware question generation from challenge + stakeholders | 2025-2026 | Questions tailored to specific challenge context instead of generic UX templates |
| Separate pain/gain lists | Structured themes with evidence arrays | 2024-2025 | Traceability from insights to themes to persona traits, prevents hallucinated pains |

**Deprecated/outdated:**
- Post-it note physical workshops as only option: Digital-first with AI assistance is now standard for remote/solo work
- Generic persona templates not grounded in research: 2026 best practice requires evidence chain from research to persona traits
- Yes/no interview questions: Open-ended, story-focused questions are design thinking standard
- Stakeholder mapping without power/interest dimensions: Power-interest grid is established framework (not just a list)

## Open Questions

Things that couldn't be fully resolved:

1. **Synthetic interview quality threshold**
   - What we know: Synthetic users are "one-dimensional" compared to real participants, best for broad attitudinal questions
   - What's unclear: At what point does synthetic interview quality become misleading rather than helpful?
   - Recommendation: For MVP 0.5, use synthetic interviews with clear disclaimer. Add capability to paste real transcripts. Test with users to assess quality perception.

2. **Optimal stakeholder count for Step 2**
   - What we know: Need Core, Direct, Indirect categories populated (validation criterion)
   - What's unclear: Is there an optimal number per category? Too many stakeholders makes Step 3 research unwieldy.
   - Recommendation: Start with 5-10 total stakeholders, prioritize 2-3 for synthetic interviews in Step 3.

3. **Affinity mapping theme count**
   - What we know: senseMakingArtifactSchema allows 2-5 themes
   - What's unclear: Does 2 themes indicate insufficient research depth, or is simplicity better for downstream steps?
   - Recommendation: Guide toward 3-4 themes as sweet spot. Flag if only 1-2 (may need more research) or 6+ (over-clustering).

4. **Real research integration path**
   - What we know: Users should be able to paste real interview transcripts or survey results
   - What's unclear: How to blend real + synthetic research in the same workshop? Should UI treat them differently?
   - Recommendation: Step 3 offers two paths: "Conduct synthetic interviews" OR "Paste real research data". Both feed into Step 4 clustering. Don't blend in MVP 0.5.

## Sources

### Primary (HIGH confidence)
- [Synthetic Users: AI-Powered User Research](https://www.syntheticusers.com/) - Core concept for Step 3 synthetic interviews
- [What are Synthetic Users? The 2026 Guide](https://www.articos.com/blog/what-are-synthetic-users/) - Synthetic user limitations and best practices
- [AI vs Researched Personas | IxDF](https://www.interaction-design.org/literature/article/ai-vs-researched-personas) - Evidence that human-created personas with AI assistance are optimal
- [Affinity Mapping: 5 Steps for UX Research Data Synthesis](https://www.userinterviews.com/blog/affinity-mapping-ux-research-data-synthesis) - Step 4 affinity mapping process
- [Affinity Diagrams | IxDF](https://www.interaction-design.org/literature/article/affinity-diagrams-learn-how-to-cluster-and-bundle-ideas-and-facts) - Clustering methodology
- [Affinity Diagramming: Collaboratively Sort UX Findings - NN/G](https://www.nngroup.com/articles/affinity-diagram/) - Team collaboration best practices
- [Top 6 AI Prompts for Design Thinking in 2026](https://stratpilot.ai/top-ai-prompts-for-design-thinking-in-2026/) - AI facilitation prompting patterns
- [Exploring Generative AI Conversational Cues for Real-Time Collaborative Ideation](https://dl.acm.org/doi/fullHtml/10.1145/3635636.3656184) - Facilitation strategy analysis (36% dig deeper, 30% new dimension, 12% ideation strategy)

### Secondary (MEDIUM confidence)
- [The Rise of AI-Native User Research | Greylock](https://greylock.com/greymatter/ai-user-research/) - Trends in AI-assisted research
- [Synthetic Users: AI "Participants" - NN/G](https://www.nngroup.com/videos/ai-generated-users/) - Nielsen Norman Group perspective on synthetic users
- [Online Affinity Mapping: 9 Tips for Actionable Insights](https://condens.io/blog/online-affinity-mapping-UX-Research/) - Digital affinity mapping tools and techniques
- [LLM Structured Output Extraction Best Practices](https://agenta.ai/blog/the-guide-to-structured-outputs-and-function-calling-with-llms) - Zod schema usage for extraction

### Internal Project Sources (HIGH confidence)
- `/Users/michaelchristie/Library/Mobile Documents/iCloud~md~obsidian/Documents/lifeOS/10_Projects/WorkshopPilot/Design Thinking/Steps/01_Challenge.md` - Step 1 domain spec
- `/Users/michaelchristie/Library/Mobile Documents/iCloud~md~obsidian/Documents/lifeOS/10_Projects/WorkshopPilot/Design Thinking/Steps/02_Stakeholder_Mapping.md` - Step 2 domain spec
- `/Users/michaelchristie/Library/Mobile Documents/iCloud~md~obsidian/Documents/lifeOS/10_Projects/WorkshopPilot/Design Thinking/Steps/03_User_Research.md` - Step 3 domain spec with synthetic interview approach
- `/Users/michaelchristie/Library/Mobile Documents/iCloud~md~obsidian/Documents/lifeOS/10_Projects/WorkshopPilot/Design Thinking/Steps/04_Research_Sense_Making.md` - Step 4 domain spec with affinity mapping
- `.planning/phases/08-ai-facilitation-engine/08-01-PLAN.md` - Step prompts, arc phases, validation criteria
- `.planning/phases/09-structured-outputs/09-01-PLAN.md` - Zod schemas for all 10 steps
- `.planning/phases/07-context-architecture/07-RESEARCH.md` - Context assembly, hierarchical compression patterns
- `src/lib/ai/prompts/step-prompts.ts` - Existing prompts for Steps 1-4
- `src/lib/schemas/step-schemas.ts` - Existing schemas: challengeArtifactSchema, stakeholderArtifactSchema, userResearchArtifactSchema, senseMakingArtifactSchema
- `src/lib/workshop/step-metadata.ts` - Step IDs, names, descriptions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, all infrastructure from Phases 7-9
- Architecture patterns: HIGH - Existing patterns apply, content implementation only
- Synthetic interviews: MEDIUM - 2026 research shows limitations, best practices still emerging
- Affinity mapping: HIGH - Well-established UX research methodology with AI assistance patterns
- Discovery step flow: HIGH - Design thinking sequence is standard, grounded in methodology

**Research date:** 2026-02-08
**Valid until:** ~60 days (2026-04-08) — Design thinking methodology stable, AI facilitation patterns evolving but mature
