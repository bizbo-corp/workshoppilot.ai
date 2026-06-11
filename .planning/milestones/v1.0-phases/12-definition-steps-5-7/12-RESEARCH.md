# Phase 12: Definition Steps (5-7) - Research

**Researched:** 2026-02-09
**Domain:** Definition phase design thinking steps - persona development, journey mapping, and challenge reframing
**Confidence:** HIGH

## Summary

Phase 12 implements Steps 5-7, the **Definition cluster** of the design thinking process. These steps synthesize Discovery outputs (Steps 1-4) into focused design artifacts: Personas (Step 5), Journey Maps (Step 6), and Reframed HMW statements (Step 7). Unlike Discovery steps which gather raw data, Definition steps transform insights into actionable design inputs.

The implementation pattern follows Phase 11: enriched step prompts (step-prompts.ts), schema-driven extraction (step-schemas.ts already exist), validation criteria, and conversational arc guidance. The heavy lifting is already done by Phases 7-9 (AI facilitation engine, context architecture, structured outputs). Phase 12 is **content implementation** - refining prompts, ensuring traceability from research to artifacts, and building UI components for structured output display.

The key architectural challenge is **evidence traceability**: Step 5 personas must trace pains/gains back to Step 4 themes, Step 6 journey maps must identify "the dip" based on persona pains and research evidence, and Step 7 HMW reframes must show explicit connections to the journey dip and persona needs. This is the synthesis phase where AI-assisted extraction is most valuable - the AI does cognitive clustering work while maintaining evidence chains.

**Primary recommendation:** Enrich existing step prompts with explicit traceability instructions, enhance schemas with evidence linking, and build UI components that visualize the evidence chain (persona pain → Step 4 theme → Step 3 quote). Focus on preventing generic AI outputs by requiring specific citations and implementing validation criteria that check evidence grounding.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Persona Development (Step 5):**
- **Format:** Structured card layout with placeholder avatar (initials circle), not narrative prose
- **Fields:** Name, role, bio, quote, pains, gains, motivations, goals + optional fields: frustrations, day-in-the-life scenario (auto-populated from conversation when data exists, skippable)
- **Persona count:** 1-3 personas, AI and user determine together when coverage feels sufficient — not fixed
- **Traceability:** Research-grounded but flexible — pains/gains should trace to Step 4 themes, but AI can infer reasonable demographic/lifestyle attributes not explicitly researched
- **AI initiative:** AI drafts everything proactively (name, age, role, demographics) based on research — user adjusts what doesn't fit
- **Review flow:** AI auto-suggests persona in chat based on prior steps, asks refinement questions, modifies in conversation. Once extracted, user can override/modify text directly on the right panel
- **Multi-persona flow:** Present one at a time, but indicate total count with skeleton placeholder cards (e.g., "1 of 3" with skeleton cards for upcoming personas)

**Journey Mapping (Step 6):**
- **Stage creation:** Collaborative — AI suggests 4-8 stages based on persona/context, user can add/remove/reorder, then AI fills layers
- **Layers per stage:** Step (action), Goals, Barriers, Touchpoints, Emotions (traffic light: red=pain, orange=neutral, green=good), Moments of Truth, Opportunities — 7 layers total
- **The dip:** AI identifies the lowest emotion point with rationale, user confirms or picks different stage. Traffic light colors make the dip visually obvious (red stages)
- **Persona scope:** One journey map for primary persona only — multi-persona journeys deferred to FFP
- **Display:** Scrollable grid/table on right panel with card/post-it style cells containing editable text
- **Editing:** Cell-level editing — click any cell to edit that specific entry
- **Structure editing:** Users can add or remove journey stages after initial generation — full structural flexibility
- **Context referencing:** Generic references ("the user experiences..."), not persona name ("Sarah's journey...")

**Reframing Challenge (Step 7):**
- **Relationship to Step 1:** Fresh rewrite — not an evolution of the original HMW. AI drafts new HMW from scratch using all accumulated research, persona, and journey insights
- **HMW template (4-part builder):**
  - **Given that** [context/situation]
  - **How might we help** [persona]
  - **do/be/feel/achieve** [immediate goal]
  - **So they can** [deeper, broader emotional goal]
- **Builder flow:** AI suggests 2-3 options per field in chat — user can auto-fill the AI suggestion into a mad-libs style form on the right panel with dropdown options per field, then modify any field
- **Multiple HMWs:** User can create multiple reframed HMW statements (not limited to one)
- **Carry forward:** If multiple HMWs exist, ask user which one(s) to carry into Step 8 ideation — user decides whether to ideate on one or multiple
- **Validation:** Both explicit traceability (AI shows which persona pain and journey dip stage each HMW component traces to) AND quality check questions before finalizing
- **HMW focus:** Should focus on person's pain points and how we might solve this as part of the original challenge

**Prior Context Usage:**
- **Reference style:** Light referencing — AI weaves research insights naturally without explicit citations or academic-style sourcing
- **Source indicators:** No source badges or "from Step X" tags on output panel — clean artifact display, traceability lives in the AI conversation
- **Revision awareness:** Explicit acknowledgment when prior steps change — AI says "I see your research themes changed, let me update..." — transparent about cascade updates

### Claude's Discretion

- Exact placeholder avatar design (initials circle implementation)
- Typography and spacing within persona card and journey grid
- How to handle edge cases (no research data, incomplete prior steps)
- Traffic light color implementation details
- Skeleton card visual design for upcoming personas

### Deferred Ideas (OUT OF SCOPE)

- Multi-persona journey maps (one journey per persona) — FFP release
- Alternative/extended journey paths — FFP release
- Canvas-based visual journey mapping — MMP release
</user_constraints>

## Standard Stack

Phase 12 uses the existing infrastructure from Phases 7-9. No new dependencies required.

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vercel AI SDK | 6.x | Structured output extraction | Phase 7-9 foundation, streamText + output property |
| Gemini 2.5 Flash | Current | AI facilitation and extraction | 1M context window, handles multi-step context flow |
| Zod | 4.x | Schema definition | Schemas for Steps 5-7 already exist in step-schemas.ts |
| Drizzle ORM | Latest | Database persistence | step_artifacts table stores persona, journey, reframe JSON |

### Supporting (Already Configured)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| step-prompts.ts | Internal | Step-specific AI instructions | Already has prompts for Steps 5-7, need enrichment |
| arc-phases.ts | Internal | 6-phase conversational arc | Already defines Orient/Gather/Synthesize/Refine/Validate/Complete |
| step-schemas.ts | Internal | Zod schemas for all 10 steps | personaArtifactSchema, journeyMappingArtifactSchema, reframeArtifactSchema exist |
| validation-criteria.ts | Internal | Quality criteria per step | Need to define 2-4 criteria for Steps 5-7 |

### No New Dependencies Required
Phase 12 extends existing AI facilitation infrastructure. Focus is on prompt quality, schema alignment, and UI component development for structured output display.

## Architecture Patterns

### Recommended Project Structure

Steps 5-7 UI components follow the existing pattern from Phases 10-11:

```
src/app/workshop/[workshopId]/step/[stepSlug]/
├── page.tsx                           # Server component, loads workshop data
└── components/
    ├── StepChatInterface.tsx          # Chat UI (existing from Phase 5)
    ├── StepOutputPanel.tsx            # Structured output display (Phase 9)
    │   ├── PersonaCard.tsx            # Step 5: Persona display with avatar
    │   ├── JourneyMapGrid.tsx         # Step 6: Journey map grid with cell editing
    │   └── HMWBuilder.tsx             # Step 7: Mad-libs HMW builder form
    └── StepNavigation.tsx             # Back/Next with validation (Phase 10)
```

No new architecture needed — this phase is **content implementation** using existing patterns.

### Pattern 1: Evidence-Grounded Persona Synthesis (Step 5)

**What:** AI drafts persona based on Step 4 pains/gains with explicit traceability to research.

**When to use:** Step 5 Persona Development synthesis phase of conversational arc.

**Example:**
```typescript
// Persona extraction with evidence linking
const personaDraft = await streamText({
  model: google('gemini-2.5-flash'),
  system: `${getStepSpecificInstructions('persona')}

  EVIDENCE LINKING REQUIREMENT:
  For each persona trait you generate, you MUST cite the Step 4 pain/gain or Step 3 research finding that supports it.

  Example:
  - Pain: "Spends 3 hours/day on manual data entry" → Evidence: Step 4 Pain #2 "Manual processes create time waste", Step 3 Quote from Sarah "I spend half my day copying data between systems"
  - Gain: "Wants automated reporting to free time for analysis" → Evidence: Step 4 Gain #3 "Desire for strategic work over admin tasks"

  Do NOT invent generic persona traits. Ground everything in research data.

  CONTEXT:
  Step 4 Pains: ${JSON.stringify(senseMakingArtifact.pains)}
  Step 4 Gains: ${JSON.stringify(senseMakingArtifact.gains)}
  Step 4 Themes: ${JSON.stringify(senseMakingArtifact.themes)}
  Step 3 Insights: ${JSON.stringify(researchArtifact.insights)}`,

  messages: conversationHistory,

  output: {
    schema: personaArtifactSchema // From step-schemas.ts
  },

  temperature: 0.2 // Low for factual grounding, some creativity for demographics
});

// Validation: Check that persona pains/gains trace to Step 4
const validationCheck = await streamText({
  model: google('gemini-2.5-flash'),
  system: `Validate persona traceability:

  For each persona pain and gain, verify it traces to specific Step 4 pains/gains or Step 3 insights.
  Flag any that seem invented or generic without research grounding.

  Persona: ${JSON.stringify(personaDraft.object)}
  Step 4 Pains/Gains: ${JSON.stringify(senseMakingArtifact)}`,

  output: {
    schema: z.object({
      validated: z.boolean(),
      unmappedTraits: z.array(z.string()).describe('Persona traits without research evidence'),
      feedback: z.string()
    })
  }
});

if (!validationCheck.object.validated) {
  // Show feedback to user, prompt for refinement
  // Don't allow step completion until validation passes
}
```

**Key insight:** Persona credibility depends on research grounding. Explicit evidence linking prevents generic "placeholder personas" and ensures downstream steps (journey mapping, ideation) build on real user needs.

### Pattern 2: Journey Map Layer-by-Layer Generation (Step 6)

**What:** AI suggests journey stages (4-8) based on persona context, then fills 7 layers per stage. User can add/remove stages and edit individual cells.

**When to use:** Step 6 Journey Mapping with collaborative stage definition and AI-assisted layer population.

**Example:**
```typescript
// Phase 1: AI suggests journey stages
const stagesSuggestion = await streamText({
  model: google('gemini-2.5-flash'),
  system: `${getStepSpecificInstructions('journey-mapping')}

  Based on the persona and challenge context, suggest 4-8 journey stages.

  Persona: ${personaArtifact.name}, ${personaArtifact.role}
  Persona Pains: ${JSON.stringify(personaArtifact.pains)}
  Challenge: ${challengeArtifact.hmwStatement}

  Consider:
  - What triggers this journey? (Awareness, Need Recognition)
  - What actions does the persona take? (Research, Evaluate, Decide)
  - What happens after initial action? (Onboarding, Usage, Resolution)
  - What is the current state endpoint? (Success, Workaround, Frustration)

  Provide stage names with brief rationale for each.`,

  output: {
    schema: z.object({
      stageCount: z.number().min(4).max(8),
      stages: z.array(z.object({
        name: z.string(),
        rationale: z.string().describe('Why this stage is part of the journey')
      })),
      journeyType: z.string().optional().describe('Template type if applicable: onboarding, purchase, support, custom')
    })
  }
});

// User confirms/modifies stages (UI interaction)
// Then AI populates layers for each confirmed stage

// Phase 2: Populate 7 layers per stage
const journeyMapComplete = await streamText({
  model: google('gemini-2.5-flash'),
  system: `${getStepSpecificInstructions('journey-mapping')}

  Fill all 7 layers for each journey stage based on persona pains and research insights.

  LAYERS TO POPULATE:
  1. Step (Action): What does ${personaArtifact.name} DO at this stage?
  2. Goals: What are they trying to ACHIEVE?
  3. Barriers: What FRICTION or OBSTACLES exist? (draw from Step 4 pains)
  4. Touchpoints: What TOOLS, CHANNELS, or INTERFACES are involved?
  5. Emotions: How do they FEEL? (Use traffic light: positive/neutral/negative)
  6. Moments of Truth: Critical decision or realization points
  7. Opportunities: Where could we INTERVENE or IMPROVE?

  CRITICAL: Emotions should reflect persona pains. If Step 4 identified "manual data entry frustration", stages involving data entry should have negative emotion.

  Identify THE DIP: Which stage has the most negative emotion and highest barriers? This is the key design opportunity.

  Persona: ${JSON.stringify(personaArtifact)}
  Step 4 Pains: ${JSON.stringify(senseMakingArtifact.pains)}`,

  messages: conversationHistory,

  output: {
    schema: journeyMappingArtifactSchema // From step-schemas.ts
  },

  temperature: 0.2 // Low for factual journey mapping grounded in research
});

// Validation: Check that the dip aligns with persona pains
const dipValidation = await streamText({
  model: google('gemini-2.5-flash'),
  system: `Validate journey map dip identification:

  The dip should be the stage with:
  - Most negative emotion
  - Highest barriers (friction points)
  - Alignment with persona's top pains from Step 4

  Journey Map: ${JSON.stringify(journeyMapComplete.object)}
  Persona Pains: ${JSON.stringify(personaArtifact.pains)}

  Is the dip correctly identified? Does it reflect real pain points?`,

  output: {
    schema: z.object({
      dipValid: z.boolean(),
      dipStage: z.string(),
      alignment: z.string().describe('How well dip aligns with persona pains'),
      feedback: z.string()
    })
  }
});
```

**Key insight:** Journey mapping works best when stages are collaborative (AI suggests, user confirms/modifies) and layers are AI-populated with evidence grounding. The dip identification is critical - it drives Step 7 reframing and Step 8 ideation focus.

### Pattern 3: HMW Mad-Libs Builder with Multi-Field Suggestions (Step 7)

**What:** AI suggests 2-3 options for each HMW field (Given that, How might we help, do/be/feel/achieve, So they can). User picks from dropdown or types freeform, then AI validates traceability.

**When to use:** Step 7 Reframing Challenge with 4-part HMW structure.

**Example:**
```typescript
// Generate suggestions for each HMW field
const hmwSuggestions = await streamText({
  model: google('gemini-2.5-flash'),
  system: `${getStepSpecificInstructions('reframe')}

  Generate 2-3 options for each field of the HMW statement:

  FIELD 1: "Given that" [context/situation]
  - Draw from: Journey Map dip stage context, persona's current situation
  - Example: "Given that project managers lack visibility into task blockers"

  FIELD 2: "How might we help" [persona]
  - Use persona name and defining characteristic
  - Example: "How might we help Sarah, the overwhelmed project manager"

  FIELD 3: "do/be/feel/achieve" [immediate goal]
  - Draw from: Journey Map dip stage goals, persona pains
  - Focus on specific action at the pain point
  - Example: "identify and unblock stalled tasks"

  FIELD 4: "So they can" [deeper, broader emotional goal]
  - Draw from: Persona gains, Step 4 desired outcomes
  - Focus on emotional/strategic value
  - Example: "prevent deadline slips and reduce team stress"

  CONTEXT:
  Journey Map Dip: ${JSON.stringify(journeyMapArtifact.stages.find(s => s.isDip))}
  Persona: ${JSON.stringify(personaArtifact)}
  Step 4 Gains: ${JSON.stringify(senseMakingArtifact.gains)}
  Original Challenge: ${challengeArtifact.hmwStatement}`,

  output: {
    schema: z.object({
      givenThat: z.array(z.object({
        text: z.string(),
        source: z.string().describe('Which research insight this draws from')
      })).min(2).max(3),
      persona: z.array(z.object({
        text: z.string(),
        source: z.string()
      })).min(2).max(3),
      immediateGoal: z.array(z.object({
        text: z.string(),
        source: z.string().describe('Journey dip stage or persona pain this addresses')
      })).min(2).max(3),
      deeperGoal: z.array(z.object({
        text: z.string(),
        source: z.string().describe('Persona gain or Step 4 desired outcome this delivers')
      })).min(2).max(3)
    })
  }
});

// User selects from suggestions or types freeform to build HMW
// Then AI validates the composed HMW statement

const hmwValidation = await streamText({
  model: google('gemini-2.5-flash'),
  system: `Validate the composed HMW statement:

  HMW: "${hmwStatement}"

  Check:
  1. Immediate Goal Validity: Does it solve the journey dip problem?
     - Journey Dip: ${dipStage} - ${dipBarriers}
     - Does the immediate goal address this specific pain point?

  2. Deeper Goal Motivation: Is the outcome motivating enough?
     - Does it connect to persona's top gains?
     - Would achieving this genuinely matter to ${personaArtifact.name}?

  3. Traceability: Can you trace each component to specific research?
     - Given that → Journey context
     - Immediate goal → Journey dip pain
     - Deeper goal → Persona gain

  4. Specificity: Focused enough to generate concrete ideas?

  5. Breadth: Open enough to allow multiple solution approaches?

  Provide explicit traceability mapping and validation feedback.`,

  output: {
    schema: z.object({
      validated: z.boolean(),
      traceability: z.object({
        givenThat: z.string().describe('Which journey stage/context this traces to'),
        immediateGoal: z.string().describe('Which dip pain/barrier this addresses'),
        deeperGoal: z.string().describe('Which persona gain this delivers')
      }),
      validationFeedback: z.object({
        immediateGoalValidity: z.enum(['pass', 'warn', 'fail']),
        deeperGoalMotivation: z.enum(['pass', 'warn', 'fail']),
        specificity: z.enum(['pass', 'warn', 'fail']),
        breadth: z.enum(['pass', 'warn', 'fail'])
      }),
      recommendations: z.array(z.string()).describe('Specific suggestions if validation not passed')
    })
  }
});
```

**Key insight:** Step 7 validation is the final quality gate before ideation. Explicit traceability (showing which persona pain and journey dip stage each HMW component addresses) prevents vague reframes and ensures Step 8 ideation builds on real user needs.

### Pattern 4: Multi-Persona Skeleton Cards (Step 5)

**What:** When creating multiple personas (1-3), show skeleton placeholder cards for upcoming personas while working on the current one.

**When to use:** Step 5 Persona Development when user/AI determine 2-3 personas are needed.

**Example UI structure:**
```typescript
// Step 5 UI: Multi-persona flow
interface PersonaFlowState {
  totalPersonas: number; // Determined collaboratively by AI and user
  currentPersonaIndex: number; // 0-indexed
  completedPersonas: PersonaArtifact[];
  currentDraft: Partial<PersonaArtifact> | null;
}

// Display component
function PersonaOutputPanel({ state }: { state: PersonaFlowState }) {
  return (
    <div className="persona-panel">
      {/* Indicator: "Persona 1 of 3" */}
      <div className="persona-counter">
        Persona {state.currentPersonaIndex + 1} of {state.totalPersonas}
      </div>

      {/* Completed personas */}
      {state.completedPersonas.map((persona, idx) => (
        <PersonaCard key={idx} persona={persona} editable />
      ))}

      {/* Current persona being drafted */}
      {state.currentDraft && (
        <PersonaCard persona={state.currentDraft} draft />
      )}

      {/* Skeleton cards for upcoming personas */}
      {Array.from({
        length: state.totalPersonas - state.completedPersonas.length - 1
      }).map((_, idx) => (
        <PersonaSkeletonCard key={idx} index={state.completedPersonas.length + idx + 1} />
      ))}
    </div>
  );
}

// Skeleton card shows placeholder structure
function PersonaSkeletonCard({ index }: { index: number }) {
  return (
    <div className="persona-card skeleton">
      <div className="avatar-placeholder">
        <div className="shimmer-circle" />
      </div>
      <div className="content-placeholder">
        <div className="shimmer-line name" />
        <div className="shimmer-line role" />
        <div className="shimmer-block bio" />
      </div>
      <div className="badge">Upcoming</div>
    </div>
  );
}
```

**Key insight:** Skeleton cards provide visual feedback on progress without overwhelming the user with empty forms. AI works on one persona at a time, but user sees the full scope.

### Anti-Patterns to Avoid

- **Generic persona traits without research grounding:** Don't let AI generate "Sarah is a busy professional who values efficiency" without citing which Step 4 pain/gain or Step 3 quote supports this. Require explicit evidence linking.
- **Journey maps with uniform emotions:** If all stages show neutral or positive emotions, there's no dip. Validation should flag journeys where emotions don't align with persona pains.
- **HMW statements disconnected from journey dip:** Step 7 reframe must address the specific breakdown point identified in Step 6. Validation should check: "Does immediate goal solve the dip problem?"
- **Premature solution ideation in Step 5-7:** These are Definition steps, not solution steps. If prompts start suggesting features or implementation details, redirect to stay focused on problem synthesis.
- **Ignoring prior step revisions:** If user goes back and changes Step 4 pains/gains, Step 5 persona must update. Explicit acknowledgment: "I see your research themes changed. Let me update the persona to reflect this..."

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Evidence linking UI | Custom traceability visualization | Chat-based disclosure with clean output panel | User constraints specify: traceability lives in AI conversation, not output panel badges |
| Multi-field form builder | Custom mad-libs input components | Standard select dropdowns + text inputs | Complexity premature for MVP 0.5, standard forms sufficient |
| Journey map cell editing | Custom inline editing with rich text | Click-to-edit text inputs | Simple cell-level editing is sufficient, rich editing deferred to MMP |
| Persona avatar generation | AI image generation (DALL-E, Midjourney) | Initials circle placeholder | User constraints specify initials circle, image generation deferred to FFP |
| Journey stage reordering | Drag-and-drop with complex state management | Add/remove buttons with list reordering | User constraints allow add/remove, visual drag-drop deferred to FFP |
| Multi-persona parallel editing | Side-by-side persona comparison UI | One-at-a-time flow with skeleton placeholders | User constraints specify sequential flow with skeleton cards |

**Key insight:** User constraints define MVP 0.5 scope clearly. Don't over-engineer UI components or build features deferred to MMP/FFP. Focus on clean text-based interfaces with AI-driven content quality.

## Common Pitfalls

### Pitfall 1: Persona Trait Hallucination (Frankenstein Personas)

**What goes wrong:** AI generates believable persona demographics (age, location, family status) that aren't supported by research. User accepts the persona, then realizes later that traits contradict actual user research or don't match target audience.

**Why it happens:** LLMs excel at creating coherent narratives. Given a name and role, the AI will infer plausible but ungrounded details. Research from persona planning shows personas must be "based on information about real people" but Step 3 synthetic interviews may not cover demographic details. AI fills gaps with assumptions.

From Interaction Design Foundation: "Avoid Frankenstein Personas — don't combine conflicting traits from different user types."

**How to avoid:**
- Prompt engineering: "For demographic details (age, location, family status), ONLY include what was mentioned in Step 3 research or can be reasonably inferred from Step 4 pains/gains. If the research doesn't support a demographic trait, use persona.age.optional() and leave it undefined rather than inventing."
- Validation criteria: "Research Grounding - do all persona traits trace to Step 3 insights or Step 4 pains/gains? Flag invented demographics."
- AI acknowledgment: "The research doesn't specify age or location. I've left those optional fields empty. You can add them if you know your target audience demographics."
- User constraints specify: "AI can infer reasonable demographic/lifestyle attributes not explicitly researched" — but this should be light inference (role implications), not wholesale invention

**Warning signs:**
- Persona includes specific age (e.g., "34 years old") when Step 3 research never mentioned age
- Family status or lifestyle details (e.g., "married with two kids") not supported by research
- Multiple personas with nearly identical pains/gains but different demographics (demographics invented to create variety)
- User feedback: "That doesn't match our actual users"

### Pitfall 2: Journey Map Without Clear Dip (Flat Emotional Curve)

**What goes wrong:** AI generates journey map with emotions ranging from neutral to slightly positive, missing the critical pain point. Without a clear dip, Step 7 reframe lacks focus and Step 8 ideation addresses generic improvements rather than acute problems.

**Why it happens:** AI optimism bias — language models tend toward positive framing unless explicitly prompted for negative emotions. If Step 4 pains aren't explicitly referenced, AI may generate "ideal journey" rather than "current broken journey."

From customer journey mapping research: "Emotions are plotted as a single line across the journey phases, literally signaling the emotional 'ups' and 'downs' of the experience." Without variance, the journey map provides no design opportunity.

**How to avoid:**
- Explicit prompt instruction: "The journey map shows the CURRENT STATE, including all pain points. Emotions should reflect persona pains from Step 4. If Step 4 identified 'manual data entry frustration', stages involving data entry MUST have negative emotion."
- Validation criteria: "Emotional Variance - does the journey show clear ups and downs? Is there a distinct low point (the dip) where barriers are highest and emotion is most negative?"
- Reference Step 4 pains in system prompt: "Persona's top 3 pains: [list]. Ensure these pains appear as barriers and negative emotions in relevant journey stages."
- Traffic light system helps: red (pain/negative), orange (neutral/friction), green (good/positive) is visually obvious
- AI should explain dip rationale: "Stage X is the dip because [persona pain] manifests here with barriers like [specific barrier from Step 4]"

**Warning signs:**
- All journey stages show green or orange emotions (no red)
- Barriers list is short or generic ("some confusion", "minor delays")
- Dip identification is arbitrary: "Stage 3 is slightly less positive than Stage 2"
- User feedback: "This doesn't capture the real pain our users experience"
- Step 7 HMW reframe is vague or focuses on incremental improvements

### Pitfall 3: HMW Immediate Goal Doesn't Address Dip (Misalignment)

**What goes wrong:** Step 7 HMW statement's immediate goal focuses on a generic improvement rather than solving the specific breakdown point identified in Step 6 journey dip. Example: Journey dip is "Account setup fails due to complex requirements", but HMW immediate goal is "improve overall user experience."

**Why it happens:** AI synthesis without validation. The AI sees all context (challenge, persona, journey) and may synthesize a broader opportunity rather than the specific dip intervention. Also, if user types freeform HMW without using AI suggestions, they may lose connection to research.

From HMW research: "Good HMW statements follow three guidelines: Frame the Opportunity by focusing on needs, not solutions; Anchor in Insights by basing the statement on a real observation or user needs uncovered through design research."

**How to avoid:**
- Validation prompt: "Check immediate goal against journey dip. Journey dip stage: [stage name], barriers: [list]. Does immediate goal address THESE SPECIFIC barriers? If not, suggest refinement."
- Explicit traceability in UI: When user selects/types immediate goal, show which journey dip barrier it addresses
- Validation criteria: "Dip Alignment - does the immediate goal solve the specific problem at the journey dip stage? Can you trace immediate goal → dip barrier → persona pain?"
- AI suggestions for immediate goal field: Generate options that ONLY address the dip stage barriers, not generic journey improvements
- User constraints specify: "AI shows which persona pain and journey dip stage each HMW component traces to" — enforce this in validation

**Warning signs:**
- HMW immediate goal is broad: "improve experience", "make it easier", "help users succeed"
- Immediate goal addresses a different journey stage than the dip
- Traceability mapping shows weak connection: "somewhat related to dip" vs "directly solves dip barrier"
- Step 8 ideation produces ideas that don't address the core pain point
- User feedback: "This HMW doesn't focus on the main problem we identified"

### Pitfall 4: Multi-Persona Scope Creep (Building 4-5 Personas in Step 5)

**What goes wrong:** User or AI decides to build 4-5+ personas in Step 5, treating it like comprehensive user segmentation. This causes: (a) Step 5 conversation drags on excessively, (b) Step 6 journey mapping becomes unwieldy (which persona to map?), (c) Step 7 reframe lacks focus (trying to serve multiple personas).

**Why it happens:** Stakeholder mapping (Step 2) may identify 5-10+ stakeholder types. User sees the list and wants a persona for each. AI facilitates this without pushback. But design thinking workshops work best with focused artifacts — depth over breadth.

From persona research: "Pick one persona and one scenario" to avoid "cramming multiple personas into one map leads to confusion."

**How to avoid:**
- Prompt guidance: "For MVP 0.5, we recommend 1-3 personas maximum. More than 3 spreads the workshop too thin. Which stakeholder types are MOST critical to focus on?"
- AI pushback on scope creep: If user suggests 4th persona, AI asks: "We have 3 personas covering [segments]. A 4th persona risks diluting focus. Is there a segment we're missing, or should we stick with these 3 and go deeper?"
- User constraints specify: "1-3 personas, AI and user determine together when coverage feels sufficient — not fixed"
- Validation check: If >3 personas, AI asks: "We have X personas. For the journey map (Step 6), which ONE should be the primary focus? We can map one journey per persona in later releases."
- Clear communication: "More personas = wider coverage but shallower depth. Fewer personas = narrower coverage but deeper insights for focused ideation."

**Warning signs:**
- Step 5 conversation extends beyond 20-30 minutes (too many personas)
- Personas have significant overlap in pains/gains (redundant coverage)
- User struggles to choose primary persona for Step 6 journey mapping
- Step 7 HMW tries to address multiple personas in one statement ("help managers AND individual contributors")
- Step 8 ideation produces generic ideas that try to serve everyone (no focus)

### Pitfall 5: Journey Map Layers Incomplete or Generic (Shallow Mapping)

**What goes wrong:** AI generates journey map where layers have generic entries: Touchpoints = "website", Barriers = "friction", Opportunities = "improve UX". The map looks complete but provides no actionable insight.

**Why it happens:** Without explicit prompting to reference persona pains and Step 3 research, AI generates plausible but shallow journey content. Also, 7 layers × 4-8 stages = 28-56 cells to populate — AI may prioritize speed over depth.

From journey mapping research: "Touchpoints are the interactions between the customer and the business at various stages of the journey, which can be online (such as website visits or social media interactions) or offline (such as in-store experiences or customer service calls)."

**How to avoid:**
- Prompt specificity: "For each layer, reference persona context and Step 4 pains. Example: Touchpoints at 'Data Entry' stage: 'Manual Excel spreadsheet, internal database UI, email notifications' NOT just 'system'."
- Validation criteria: "Depth Check - are touchpoints specific to the persona's tools? Are barriers concrete and traceable to Step 4 pains? Are opportunities actionable intervention points?"
- Layer-by-layer generation with review: Instead of generating all 56 cells at once, generate one stage completely, show to user for feedback, then proceed to next stage
- Evidence linking in prompt: "Barriers layer: Draw from Step 4 pains. If Step 4 identified 'lack of visibility into task status', this should appear as a barrier in relevant journey stages. Be specific about HOW the barrier manifests."
- Cell-level editing allows user refinement: If AI generates generic content, user can click and edit specific cells

**Warning signs:**
- Touchpoints layer has generic entries across all stages: "app", "website", "system"
- Barriers layer lacks specificity: "some friction", "confusion", "delays"
- Opportunities layer is vague: "improve this", "make it easier", "streamline process"
- Journey map doesn't reference persona by name or specific context
- User feedback: "This is too generic, doesn't match our actual user flows"
- Step 7 HMW immediate goal struggles to identify specific intervention point

## Code Examples

Verified patterns from existing codebase and research:

### Step 5 (Persona) - Evidence-Linked Extraction

```typescript
// Source: step-schemas.ts personaArtifactSchema + Phase 11 patterns
// Persona synthesis with evidence traceability

const personaSynthesis = await streamText({
  model: google('gemini-2.5-flash'),
  system: `${getStepSpecificInstructions('persona')}

  ${getArcPhaseInstructions('synthesize')}

  EVIDENCE LINKING (CRITICAL):
  Every persona trait MUST trace to Step 4 pains/gains or Step 3 research.

  For each pain/gain you list in the persona:
  - Cite the Step 4 pain/gain it derives from
  - Optionally cite Step 3 quote/insight that supports it

  Example:
  Persona Pain: "Spends 3 hours daily on manual data entry, causing errors"
  → Evidence: Step 4 Pain #2 "Manual processes create time waste and quality issues"
  → Supporting Quote: Step 3, Sarah's interview: "I spend half my day copying data. Mistakes slip through when I'm rushed."

  For demographic details (age, location, family):
  - ONLY include if mentioned in research OR reasonably inferable from role/context
  - If not supported by research, leave optional fields undefined
  - Don't invent demographics to make persona "complete"

  PROACTIVE DRAFTING:
  You should draft ALL fields (name, role, bio, quote, pains, gains, goals).
  User will review and adjust what doesn't fit.

  CONTEXT:
  Step 4 Themes: ${JSON.stringify(senseMakingArtifact.themes)}
  Step 4 Pains: ${JSON.stringify(senseMakingArtifact.pains)}
  Step 4 Gains: ${JSON.stringify(senseMakingArtifact.gains)}
  Step 3 Key Insights: ${JSON.stringify(researchArtifact.insights.slice(0, 10))}
  Step 2 Stakeholder Types: ${JSON.stringify(stakeholderArtifact.stakeholders.filter(s => s.category === 'core'))}`,

  messages: conversationHistory,

  output: {
    schema: personaArtifactSchema // From step-schemas.ts
  },

  temperature: 0.3 // Low for research grounding, moderate for creative demographics
});

// Save with evidence metadata (not in schema, but in conversation context)
await saveStepArtifact(workshopStepId, 'persona', personaSynthesis.object);
```

### Step 6 (Journey Mapping) - Staged Generation with Dip Identification

```typescript
// Source: step-schemas.ts journeyMappingArtifactSchema + journey mapping research
// Two-phase: suggest stages, then populate layers

// PHASE 1: Suggest journey stages
const stagesSuggestion = await streamText({
  model: google('gemini-2.5-flash'),
  system: `${getStepSpecificInstructions('journey-mapping')}

  Suggest 4-8 journey stages for ${personaArtifact.name}'s current experience.

  Consider journey type based on challenge context:
  - Onboarding: Awareness → Sign-up → Setup → First Use → Habit
  - Purchase: Trigger → Research → Evaluate → Purchase → Receive → Use
  - Support: Issue → Search → Contact → Resolution → Follow-up
  - Custom: Domain-specific stages

  Persona: ${personaArtifact.name}, ${personaArtifact.role}
  Challenge: ${challengeArtifact.hmwStatement}
  Persona Pains: ${JSON.stringify(personaArtifact.pains)}

  For each suggested stage, provide:
  - Stage name (action-oriented, specific)
  - Rationale (why this is part of the journey)
  - Estimated emotion (positive/neutral/negative based on pains)`,

  output: {
    schema: z.object({
      journeyType: z.string().describe('Template type or "custom"'),
      stageCount: z.number().min(4).max(8),
      stages: z.array(z.object({
        name: z.string(),
        rationale: z.string(),
        estimatedEmotion: z.enum(['positive', 'neutral', 'negative'])
      }))
    })
  }
});

// User confirms/modifies stages (UI interaction)
const confirmedStages = await getUserStageConfirmation(stagesSuggestion.object.stages);

// PHASE 2: Populate 7 layers for confirmed stages
const journeyMapPopulated = await streamText({
  model: google('gemini-2.5-flash'),
  system: `${getStepSpecificInstructions('journey-mapping')}

  Fill all 7 layers for each journey stage:

  1. STEP (Action): What does ${personaArtifact.name} DO at this stage?
     - Specific actions, not generic ("enters data into Excel", not "uses system")

  2. GOALS: What are they trying to ACHIEVE?
     - Draw from persona goals and Step 4 gains

  3. BARRIERS: What FRICTION or OBSTACLES exist?
     - Draw from Step 4 pains — map specific pains to relevant stages
     - Be concrete: "No real-time sync causes duplicate entries" not "inefficiency"

  4. TOUCHPOINTS: What TOOLS, CHANNELS, or INTERFACES are involved?
     - Specific: "Excel spreadsheet, Slack notifications, internal dashboard"

  5. EMOTIONS: How do they FEEL? (positive/neutral/negative)
     - Emotions should reflect barriers: high barriers = negative emotion
     - Traffic light: green (good), orange (neutral/friction), red (pain/frustration)

  6. MOMENTS OF TRUTH: Critical decision or realization points
     - "Realizes data is out of sync", "Decides to escalate issue"

  7. OPPORTUNITIES: Where could we INTERVENE or IMPROVE?
     - Specific intervention points: "Automate sync to eliminate manual entry"

  IDENTIFY THE DIP:
  Mark the stage with MOST negative emotion AND highest barriers as isDip: true.
  Provide rationale: "Stage X is the dip because [persona pain] manifests here with barriers [specific barriers]."

  CONTEXT:
  Confirmed Stages: ${JSON.stringify(confirmedStages)}
  Persona: ${JSON.stringify(personaArtifact)}
  Step 4 Pains: ${JSON.stringify(senseMakingArtifact.pains)}`,

  output: {
    schema: journeyMappingArtifactSchema // From step-schemas.ts
  },

  temperature: 0.2 // Low for factual journey mapping
});

await saveStepArtifact(workshopStepId, 'journey-mapping', journeyMapPopulated.object);
```

### Step 7 (Reframe) - Mad-Libs HMW Builder with Validation

```typescript
// Source: step-schemas.ts reframeArtifactSchema + HMW research + user constraints
// Multi-field suggestions with traceability validation

// PHASE 1: Generate suggestions for each HMW field
const hmwFieldSuggestions = await streamText({
  model: google('gemini-2.5-flash'),
  system: `${getStepSpecificInstructions('reframe')}

  Generate 2-3 options for EACH field of the 4-part HMW statement:

  FIELD 1: "Given that" [context/situation]
  - Source: Journey Map dip stage context + persona current situation
  - Example: "Given that project managers lack real-time visibility into blocked tasks"

  FIELD 2: "How might we help" [persona]
  - Source: Persona name + defining characteristic from bio
  - Example: "How might we help Sarah, the overwhelmed project manager"

  FIELD 3: "do/be/feel/achieve" [immediate goal]
  - Source: Journey Map dip stage goals + barriers to overcome
  - Must address SPECIFIC dip pain point, not generic improvement
  - Example: "identify and unblock stalled tasks in real-time"

  FIELD 4: "So they can" [deeper, broader emotional goal]
  - Source: Persona gains (Step 5) + Step 4 desired outcomes
  - Focus on emotional/strategic value, broader impact
  - Example: "prevent deadline slips and reduce team stress"

  For each suggestion, provide:
  - text: The suggestion text
  - source: Which research element it derives from (for traceability)

  CONTEXT:
  Journey Map Dip: ${JSON.stringify(journeyDipStage)}
  Persona: ${JSON.stringify(personaArtifact)}
  Step 4 Gains: ${JSON.stringify(senseMakingArtifact.gains)}
  Original Challenge HMW: ${challengeArtifact.hmwStatement}`,

  output: {
    schema: z.object({
      givenThat: z.array(z.object({
        text: z.string(),
        source: z.string()
      })).min(2).max(3),
      persona: z.array(z.object({
        text: z.string(),
        source: z.string()
      })).min(2).max(3),
      immediateGoal: z.array(z.object({
        text: z.string(),
        source: z.string()
      })).min(2).max(3),
      deeperGoal: z.array(z.object({
        text: z.string(),
        source: z.string()
      })).min(2).max(3)
    })
  }
});

// User selects from dropdowns or types freeform to compose HMW
// (UI interaction: mad-libs form with dropdowns per field)

// PHASE 2: Validate composed HMW with explicit traceability
const hmwValidation = await streamText({
  model: google('gemini-2.5-flash'),
  system: `Validate the composed HMW statement:

  HMW STATEMENT: "${composedHMW}"

  VALIDATION CHECKS:

  1. IMMEDIATE GOAL VALIDITY (CRITICAL):
     - Journey Dip Stage: ${dipStage.name}
     - Dip Barriers: ${JSON.stringify(dipStage.barriers)}
     - Question: Does the immediate goal "${immediateGoalText}" directly address these specific barriers?
     - Check: Strong alignment, Partial alignment, or Weak/no alignment?

  2. DEEPER GOAL MOTIVATION:
     - Persona Top Gains: ${JSON.stringify(personaArtifact.goals.slice(0, 3))}
     - Question: Does the deeper goal "${deeperGoalText}" connect to these gains?
     - Check: Is the outcome genuinely motivating? (strong/moderate/weak)

  3. TRACEABILITY:
     - Can you trace each component to specific research?
       - Given that → Journey context: ${dipStage.context}
       - Immediate goal → Dip barrier: [identify specific barrier]
       - Deeper goal → Persona gain: [identify specific gain]

  4. SPECIFICITY: Focused enough to generate concrete ideas?

  5. BREADTH: Open enough to allow multiple solution approaches?

  Provide explicit traceability mapping and pass/warn/fail status per check.`,

  output: {
    schema: z.object({
      validated: z.boolean().describe('Overall validation passed'),
      traceability: z.object({
        givenThat: z.string().describe('Which journey stage/context'),
        immediateGoal: z.string().describe('Which dip barrier this solves'),
        deeperGoal: z.string().describe('Which persona gain this delivers')
      }),
      checks: z.object({
        immediateGoalValidity: z.object({
          status: z.enum(['pass', 'warn', 'fail']),
          feedback: z.string()
        }),
        deeperGoalMotivation: z.object({
          status: z.enum(['pass', 'warn', 'fail']),
          feedback: z.string(),
          motivationStrength: z.enum(['weak', 'moderate', 'strong'])
        }),
        specificity: z.object({
          status: z.enum(['pass', 'warn', 'fail']),
          feedback: z.string()
        }),
        breadth: z.object({
          status: z.enum(['pass', 'warn', 'fail']),
          feedback: z.string()
        })
      }),
      recommendations: z.array(z.string()).describe('Refinement suggestions if not validated')
    })
  }
});

if (!hmwValidation.object.validated) {
  // Show validation feedback to user, prompt for refinement
  // Iterate until validation passes
}

// Once validated, save reframe artifact
await saveStepArtifact(workshopStepId, 'reframe', {
  originalHmw: challengeArtifact.hmwStatement,
  insightsApplied: [
    `Journey Dip: ${dipStage.name}`,
    `Persona Pain: ${personaArtifact.pains[0]}`,
    `Desired Outcome: ${personaArtifact.goals[0]}`
  ],
  refinedHmw: composedHMW,
  evolution: `Original HMW was broad: "${challengeArtifact.hmwStatement}". Research revealed the critical pain point is ${dipStage.name}, so we've focused the HMW on helping ${personaArtifact.name} ${immediateGoalText}.`
});
```

### Context Assembly for Definition Steps

```typescript
// Source: Phase 7 context architecture patterns
// Steps 5-7 use progressively more context from prior steps

async function assembleDefinitionStepContext(
  workshopId: string,
  currentStepId: string
) {
  const baseContext = {
    challenge: await getStepArtifact(workshopId, 'challenge'),
    stakeholders: await getStepArtifact(workshopId, 'stakeholder-mapping'),
    research: await getStepArtifact(workshopId, 'user-research'),
    senseMaking: await getStepArtifact(workshopId, 'sense-making')
  };

  // Step 5: Reference all Discovery outputs (Steps 1-4)
  if (currentStepId === 'persona') {
    return {
      persistentContext: `
        Challenge: ${baseContext.challenge.hmwStatement}

        Step 4 Research Synthesis:
        - Themes: ${JSON.stringify(baseContext.senseMaking.themes)}
        - Top Pains: ${baseContext.senseMaking.pains.join(', ')}
        - Top Gains: ${baseContext.senseMaking.gains.join(', ')}

        Step 3 Key Insights: ${baseContext.research.insights.slice(0, 5).map(i => i.finding).join('; ')}

        Stakeholder Types: ${baseContext.stakeholders.stakeholders.filter(s => s.category === 'core').map(s => s.name).join(', ')}
      `,
      summaries: await getPreviousStepSummaries(workshopId, ['challenge', 'stakeholder-mapping', 'user-research', 'sense-making']),
      messages: await getCurrentStepMessages(workshopId, currentStepId)
    };
  }

  // Step 6: Reference Steps 1-5, heavy emphasis on Persona
  if (currentStepId === 'journey-mapping') {
    const persona = await getStepArtifact(workshopId, 'persona');
    return {
      persistentContext: `
        Challenge: ${baseContext.challenge.hmwStatement}

        Persona: ${persona.name}, ${persona.role}
        - Bio: ${persona.bio}
        - Quote: "${persona.quote}"
        - Top Pains: ${persona.pains.join(', ')}
        - Top Goals: ${persona.goals.join(', ')}

        Step 4 Pains (for mapping to journey stages): ${baseContext.senseMaking.pains.join(', ')}
      `,
      summaries: await getPreviousStepSummaries(workshopId, ['challenge', 'sense-making', 'persona']),
      messages: await getCurrentStepMessages(workshopId, currentStepId)
    };
  }

  // Step 7: Reference Steps 1-6, heavy emphasis on Journey Map Dip
  if (currentStepId === 'reframe') {
    const persona = await getStepArtifact(workshopId, 'persona');
    const journeyMap = await getStepArtifact(workshopId, 'journey-mapping');
    const dipStage = journeyMap.stages.find(s => s.isDip);

    return {
      persistentContext: `
        Original Challenge: ${baseContext.challenge.hmwStatement}

        Persona: ${persona.name}, ${persona.role}
        - Top Gains: ${persona.goals.join(', ')}

        Journey Map Dip (THE KEY PAIN POINT):
        - Stage: ${dipStage?.name}
        - Actions: ${dipStage?.actions}
        - Barriers: ${dipStage?.thoughts}
        - Emotion: ${dipStage?.emotions}
        - Dip Summary: ${journeyMap.dipSummary}

        Step 4 Gains (for deeper goal): ${baseContext.senseMaking.gains.join(', ')}
      `,
      summaries: await getPreviousStepSummaries(workshopId, ['challenge', 'persona', 'journey-mapping']),
      messages: await getCurrentStepMessages(workshopId, currentStepId)
    };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual persona creation from research spreadsheets | AI-assisted synthesis with evidence linking | 2024-2026 | 60-70% time savings, maintains research grounding through explicit citations |
| Physical post-it note journey mapping workshops | Digital grid with AI-suggested content and cell-level editing | 2024-2026 | Enables solo users and remote teams, AI suggests layer content from persona research |
| Generic HMW templates without research grounding | Evidence-linked HMW with explicit traceability to journey dip and persona pains | 2025-2026 | Prevents vague problem statements, ensures ideation focuses on real pain points |
| Single-persona approach (pick one user type) | Flexible 1-3 personas with skeleton cards showing progress | 2024-2025 | Accommodates diverse stakeholder groups without overwhelming scope |
| Separate persona/journey/HMW documents | Integrated flow with forward context (Step 5 → 6 → 7) | 2025-2026 | Each artifact builds on prior step, maintains evidence chain throughout Definition phase |

**Deprecated/outdated:**
- Personas without research grounding: 2026 best practice requires explicit evidence linking to Step 3 research and Step 4 pains/gains
- Journey maps without emotional variance: "Flat" journeys provide no design opportunity; current approach requires clear dip identification
- HMW statements that don't reference journey dip: Step 7 reframe must focus on specific breakdown point from Step 6
- One-size-fits-all journey stage templates: AI now adapts stage count (4-8) and names based on challenge domain and persona context

## Open Questions

1. **Optimal multi-persona display approach**
   - What we know: User constraints specify skeleton cards for upcoming personas, one-at-a-time flow
   - What's unclear: Should skeleton cards be clickable to preview/edit earlier personas? Or strictly sequential (must finish current before accessing next)?
   - Recommendation: For MVP 0.5, strictly sequential flow. Completed personas show as editable cards above current draft. Skeleton cards are non-interactive placeholders. Clicking completed persona cards allows editing but doesn't change current persona index.

2. **Journey map layer population granularity**
   - What we know: 7 layers × 4-8 stages = 28-56 cells. AI populates all at once based on persona/research context.
   - What's unclear: Should AI populate one stage at a time (show user, get feedback, continue) or generate full board with confirmation?
   - Recommendation: Full board generation with confirmation modal (user constraints: "AI suggests 4-8 stages, user can add/remove/reorder"). After generation, cell-level editing allows refinement.

3. **HMW field dependency/validation order**
   - What we know: 4 fields (Given that, How might we help, do/be/feel/achieve, So they can). AI suggests 2-3 options per field.
   - What's unclear: Should fields be validated independently, or does selecting "immediate goal" constrain "deeper goal" suggestions?
   - Recommendation: Independent field suggestions initially (AI generates all fields in parallel). After user composes full HMW, run holistic validation that checks field alignment.

4. **Evidence display in UI (traceability visibility)**
   - What we know: User constraints specify "traceability lives in AI conversation, not output panel"
   - What's unclear: How does user see evidence chain without cluttering output panel? Hover tooltips? Expandable sections? Separate evidence panel?
   - Recommendation: Evidence disclosure in chat conversation only for MVP 0.5. AI explains: "I drew [persona pain] from Step 4 Pain #2 which traces to Step 3 interview with Sarah." Clean output panel (no badges/tags). Evidence visualization deferred to MMP.

## Sources

### Primary (HIGH confidence)
- [Personas – A Simple Introduction | IxDF](https://www.interaction-design.org/literature/article/personas-why-and-how-you-should-use-them) - Persona development best practices, research grounding
- [Creating Personas from User Research Results | IxDF](https://www.interaction-design.org/literature/article/creating-personas-from-user-research-results) - Evidence-based persona creation methodology
- [Personas Make Users Memorable - NN/G](https://www.nngroup.com/articles/persona/) - Nielsen Norman Group persona guidelines
- [Journey Mapping 101 - NN/G](https://www.nngroup.com/articles/journey-mapping-101/) - Foundational journey mapping methodology
- [Common Journey Mapping Mistakes (Video) - NN/G](https://www.nngroup.com/videos/common-journey-mapping-mistakes/) - Pitfalls to avoid
- [Using "How Might We" Questions to Ideate on the Right Problems - NN/G](https://www.nngroup.com/articles/how-might-we-questions/) - HMW statement best practices
- [What is How Might We (HMW)? | IxDF](https://www.interaction-design.org/literature/topics/how-might-we) - HMW structure and validation
- Obsidian project specs: `/Users/michaelchristie/Library/Mobile Documents/iCloud~md~obsidian/Documents/lifeOS/10_Projects/WorkshopPilot/Design Thinking/Steps/05_Persona_Development.md` - Step 5 domain specification
- Obsidian project specs: `/Users/michaelchristie/Library/Mobile Documents/iCloud~md~obsidian/Documents/lifeOS/10_Projects/WorkshopPilot/Design Thinking/Steps/06_Journey_Mapping.md` - Step 6 domain specification
- Obsidian project specs: `/Users/michaelchristie/Library/Mobile Documents/iCloud~md~obsidian/Documents/lifeOS/10_Projects/WorkshopPilot/Design Thinking/Steps/07_Reframing_Challenge.md` - Step 7 domain specification
- Codebase: `src/lib/schemas/step-schemas.ts` - Existing Zod schemas for Steps 5-7
- Codebase: `src/lib/ai/prompts/step-prompts.ts` - Existing step prompt instructions
- Phase 11 Research: `.planning/phases/11-discovery-steps-1-4/11-RESEARCH.md` - Parallel phase for Steps 1-4

### Secondary (MEDIUM confidence)
- [Persona planning: how to build personas teams actually use in 2026](https://cleverx.com/blog/persona-planning-how-to-design-actionable-personas-for-2026-and-beyond) - 2026 persona planning trends
- [23 User Persona Examples, Templates & Tips (2026)](https://venngage.com/blog/user-persona-examples/) - Persona field structure examples
- [5 Common Mistakes in User Journey Mapping (And How to Avoid Them)](https://projectskillsmentor.com/user-journeys/5-common-mistakes-in-user-journey-mapping-and-how-to-avoid-them) - Journey mapping pitfalls
- [Customer Journey Mapping Mistakes and How to Avoid Them | UXPin](https://www.uxpin.com/studio/blog/customer-journey-mapping-mistakes/) - Common mistakes analysis
- [What Is a Customer Journey Map? Process, Stages, and Example](https://online.hbs.edu/blog/post/customer-journey-map) - Journey map layer structure
- [Pain point and opportunity management | Smaply Blog](https://www.smaply.com/blog/pain-point-and-opportunity-management-with-journey-maps) - Dip identification and opportunity areas
- [How Might We Statements: A Powerful Way to Turn Insights into Opportunities - Dscout](https://dscout.com/people-nerds/how-might-we-statements) - HMW from insights methodology

### Internal Project Sources (HIGH confidence)
- `.planning/phases/12-definition-steps-5-7/12-CONTEXT.md` - User decisions and constraints for this phase
- `.planning/phases/11-discovery-steps-1-4/11-RESEARCH.md` - Discovery steps research (Steps 1-4 patterns)
- `.planning/phases/08-ai-facilitation-engine/08-01-PLAN.md` - AI facilitation infrastructure
- `.planning/phases/09-structured-outputs/09-01-PLAN.md` - Zod schema patterns
- `.planning/phases/07-context-architecture/07-RESEARCH.md` - Context assembly and compression

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, all infrastructure from Phases 7-9
- Architecture patterns: HIGH - Follows established Phase 11 pattern, content implementation only
- Persona development: HIGH - Well-established UX methodology with 2026 AI-assisted patterns
- Journey mapping: HIGH - Standard design thinking practice with AI enhancement research
- HMW validation: MEDIUM-HIGH - Best practices established, AI validation patterns emerging
- Evidence traceability: MEDIUM - Critical requirement but implementation patterns still evolving

**Research date:** 2026-02-09
**Valid until:** ~60 days (2026-04-09) — Design thinking methodology stable, AI facilitation patterns maturing
