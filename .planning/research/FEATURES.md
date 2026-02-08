# Feature Research

**Domain:** AI-powered design thinking facilitation (text-based, single-user MVP)
**Researched:** 2026-02-08
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Step-aware AI prompting | Core value prop — AI must know what each step produces | MEDIUM | Requires step-specific system prompts, context injection from prior steps |
| Context memory across steps | Design thinking is sequential — each step builds on previous | HIGH | Dual-layer: structured JSON artifacts + conversation summaries; hierarchical memory architecture |
| Structured output per step | Users need tangible deliverables, not just conversation | MEDIUM | JSON schema per step (Challenge → HMW, Persona → fields, etc.) with Markdown rendering |
| Step completion validation | Users need confirmation they can move forward | LOW | AI validates output meets criteria (e.g., HMW has all 3 components) before allowing next step |
| Auto-save | 60% drop-off mid-workshop without save/resume capability | MEDIUM | Periodic saves during conversation + on step completion; no manual save button |
| Back-and-revise navigation | Users realize mistakes in earlier steps | MEDIUM | Allow revisiting prior steps, cascade context updates to subsequent steps |
| AI explains "why" | Non-experts need education embedded in facilitation | LOW | AI explains purpose of each step, why questions matter, what good outputs look like |
| Conversation is projection of state | Source of truth is structured data, not chat history | HIGH | Chat messages derive from/update structured artifacts; rebuild conversation from state on reload |
| Step progress indication | Users need to know where they are in 10-step journey | LOW | Already built in v0.5 (stepper component) |
| AI references prior outputs | Context must flow forward — AI cites persona pains, journey dip, etc. | MEDIUM | Inject prior step outputs into system prompt per step |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Orient → Gather → Synthesize → Refine → Validate → Complete arc | Structured facilitation pattern ensures quality outputs | MEDIUM | Each step follows 6-phase conversational workflow; AI guides user through predictable pattern |
| Synthetic user interviews (Step 3) | Removes biggest barrier to user research for non-experts | HIGH | AI simulates persona responses based on stakeholder map; generates realistic quotes/insights |
| Affinity mapping automation (Step 4) | Replaces 2-hour manual clustering exercise with AI synthesis | MEDIUM | AI auto-clusters research quotes into themes, extracts 5 pains/5 gains |
| Journey map auto-generation (Step 6) | Full journey board (4-8 stages × 5 layers) in seconds | HIGH | AI determines stage count, populates all cells, identifies "the dip" — requires strong context understanding |
| HMW auto-suggestions (Step 7) | Dropdown with 5 AI-generated goal options per field | LOW | Mad-libs structure with contextual suggestions; validates alignment with Challenge + Journey Dip |
| Text-based mind mapping (Step 8a) | Hierarchical ideation structure without visual complexity | LOW | Tree structure with AI theme/idea suggestions; "I'm stuck" wildcard prompts |
| AI-generated personas from research (Step 5) | Persona emerges from evidence, not assumptions | MEDIUM | AI synthesizes Step 4 pains/gains into persona fields with traceability |
| SWOT + feasibility auto-assessment (Step 9) | Concept evaluation happens automatically with rationale | MEDIUM | AI scores 5 feasibility dimensions, generates SWOT quadrants with evidence |
| Build Pack output (Step 10) | Final deliverable feeds directly into AI coding tools (Cursor, Claude) | HIGH | Structured PRD + user stories + tech specs formatted for LLM ingestion |
| Conversational UI as primary interface | AI leads, user responds — not "chatbot assistant" pattern | MEDIUM | Chat is primary, forms/canvases are secondary outputs populated by conversation |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time collaboration (MVP) | "Design thinking is collaborative" | Adds websocket complexity, multiplayer state sync, conflict resolution — scope explosion | Defer to MMP; MVP validates single-user flow first |
| Visual canvas tools (MVP) | "Design thinking uses post-its and whiteboards" | Requires drag-and-drop UI, canvas libraries (Tldraw/ReactFlow), visual state management | Text-based alternatives for MVP (hierarchical lists, tables); canvas at MMP |
| Freeform conversation | "Let users talk naturally" | No structure = low-quality outputs; users don't know what to say | Guided conversation with specific questions, options, validations |
| Generic AI assistant | "One prompt for all steps" | Each step has different goals, outputs, validation criteria | Step-specific system prompts with contextual injection |
| Manual save buttons | "Users should control when to save" | Users forget; leads to data loss and frustration | Auto-save on every significant action (message send, step completion) |
| Skip-ahead navigation | "Let users jump to any step" | Design thinking is sequential; skipping breaks context flow | Enforce linear progression; allow back-navigation only |
| Perfect AI outputs on first try | "AI should generate final deliverables" | Users need ownership; AI suggests, user refines | AI drafts, user edits/accepts/regenerates; iterate to quality |
| Voice input (MVP) | "Talking is faster than typing" | Adds transcription complexity, error handling, mobile mic permissions | Text-first for MVP; voice at FFP |
| Multi-language support (MVP) | "Global market opportunity" | Translation, cultural adaptation, testing overhead | English-only MVP; internationalize post-validation |

## Feature Dependencies

```
Context Architecture (foundational)
    ├──requires──> Structured Outputs Per Step
    ├──requires──> Step-Aware AI Prompting
    └──enables───> Back-and-Revise Navigation

Step 1: Challenge
    └──produces──> Challenge Statement (HMW draft)

Step 2: Stakeholder Mapping
    ├──uses──────> Challenge Statement
    └──produces──> Stakeholder List (hierarchical)

Step 3: User Research
    ├──uses──────> Stakeholder List
    ├──requires──> Synthetic Interview AI
    └──produces──> Research Quotes/Insights

Step 4: Research Sense Making
    ├──uses──────> Research Quotes
    ├──requires──> Affinity Mapping AI
    └──produces──> 5 Pains, 5 Gains, Themes

Step 5: Persona Development
    ├──uses──────> Pains/Gains
    ├──requires──> Persona Generation AI
    └──produces──> Persona Card (Name, Bio, Quote, Pains, Gains)

Step 6: Journey Mapping
    ├──uses──────> Persona, Pains/Gains
    ├──requires──> Journey Auto-Generation AI
    └──produces──> Journey Map (stages × layers), The Dip

Step 7: Reframing Challenge
    ├──uses──────> The Dip, Persona, Pains/Gains, Challenge
    ├──requires──> HMW Validation AI
    └──produces──> Final HMW Statement

Step 8: Ideation
    ├──uses──────> HMW Statement
    ├──requires──> Text Mind Mapping AI
    └──produces──> Idea List (hierarchical themes/ideas)

Step 9: Concept Development
    ├──uses──────> Selected Ideas, Persona, HMW
    ├──requires──> SWOT + Feasibility AI
    └──produces──> Concept Sheet(s) (Name, Pitch, USP, SWOT, Scores)

Step 10: Validate
    ├──uses──────> All Prior Outputs
    ├──requires──> PRD Generation AI
    └──produces──> Build Pack (PRD, User Stories, Tech Specs)

Auto-Save (cross-cutting)
    ├──triggers──> On message send
    ├──triggers──> On step completion
    └──persists──> Structured artifacts + conversation history
```

### Dependency Notes

- **Context Architecture must precede all steps:** Dual-layer memory (artifacts + summaries) enables forward context flow
- **Steps are strictly sequential:** Step N cannot start until Step N-1 produces valid output
- **Back-navigation cascades updates:** Editing Step 4 pains should regenerate downstream (Persona, Journey Map)
- **AI features are step-specific:** Each step needs custom system prompt + output schema

## MVP Definition

### Launch With (v1.0)

Minimum viable product — what's needed to validate AI-facilitated design thinking.

- [x] **Step-aware AI prompting** — Each step has dedicated system prompt with context injection (essential for quality outputs)
- [x] **Orient → Gather → Synthesize → Refine → Validate → Complete arc** — 6-phase conversational pattern per step (core facilitation structure)
- [x] **Context memory architecture** — Dual-layer: structured JSON artifacts + conversation summaries (enables forward context flow)
- [x] **Structured outputs per step** — JSON schemas with Markdown rendering (tangible deliverables)
- [x] **Auto-save on message send + step completion** — Prevent 60% mid-workshop drop-off (critical for retention)
- [x] **Step completion validation** — AI checks output quality before allowing progression (ensures quality)
- [x] **Back-navigation with context awareness** — Allow revisiting prior steps (users make mistakes)
- [x] **Step 1: Challenge extraction** — AI guides from vague idea to Challenge Statement
- [x] **Step 2: Stakeholder mapping** — Text-based hierarchical list with AI suggestions
- [x] **Step 3: Synthetic user interviews** — AI simulates stakeholder responses (removes research barrier)
- [x] **Step 4: Affinity mapping automation** — AI clusters quotes into 5 pains/5 gains
- [x] **Step 5: AI-generated persona** — Synthesize research into persona card with traceability
- [x] **Step 6: Journey map auto-generation** — Full board (4-8 stages × 5 layers) with "the dip" identified
- [x] **Step 7: HMW builder with auto-suggestions** — Mad-libs structure, dropdown suggestions, validation
- [x] **Step 8: Text-based mind mapping** — Hierarchical idea generation with AI theme/idea suggestions
- [x] **Step 9: Concept development** — Auto-generated concept sheets with SWOT + feasibility scores
- [x] **Step 10: Synthesis summary** — Recap full journey outputs (Build Pack PRD deferred to v1.1)

### Add After Validation (v1.1+)

Features to add once core AI facilitation is validated.

- [ ] **Build Pack PRD generation** — Trigger: v1.0 validates that prior 9 steps produce quality inputs
- [ ] **Multiple HMW instances** — Trigger: Users request exploring multiple angles from journey map
- [ ] **Concept comparison side-by-side** — Trigger: Users create 2+ concepts and struggle to choose
- [ ] **AI gap analysis** — Trigger: Users submit incomplete concept sheets
- [ ] **Elevator pitch improvement** — Trigger: Users accept but struggle with pitch quality
- [ ] **Journey map granular auto-suggest** — Trigger: Users want to edit specific cells without full regeneration
- [ ] **Mind map "I'm stuck" wildcard prompts** — Trigger: Users report creative blocks during ideation

### Future Consideration (MMP+)

Features to defer until text-based MVP proves product-market fit.

- [ ] **Visual canvas tools** — Why defer: Complex UI, requires Tldraw/ReactFlow integration
- [ ] **Split-screen mode (chat + canvas)** — Why defer: Layout complexity, mobile challenges
- [ ] **Dot voting for idea selection** — Why defer: Requires multiple concepts; v1.0 focuses on 1-3
- [ ] **Real-time collaboration** — Why defer: Websockets, state sync, conflict resolution — scope explosion
- [ ] **Visual persona cards** — Why defer: Image generation, layout polish; text works for validation
- [ ] **Visual journey map canvas** — Why defer: Swimlane UI, drag-and-drop; table structure validates first
- [ ] **Billboard Hero exercise** — Why defer: Visual template complexity; concept sheet covers core need
- [ ] **Voice input** — Why defer: Transcription overhead; text validates flow first
- [ ] **Stakeholder collateral export** — Why defer: PowerPoint/report generation; Build Pack is priority

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Step-aware AI prompting | HIGH | MEDIUM | P1 |
| Context memory architecture | HIGH | HIGH | P1 |
| Structured outputs per step | HIGH | MEDIUM | P1 |
| Auto-save | HIGH | MEDIUM | P1 |
| Orient → Gather → Synthesize arc | HIGH | MEDIUM | P1 |
| Synthetic user interviews (Step 3) | HIGH | HIGH | P1 |
| Affinity mapping automation (Step 4) | HIGH | MEDIUM | P1 |
| AI persona generation (Step 5) | HIGH | MEDIUM | P1 |
| Journey map auto-generation (Step 6) | HIGH | HIGH | P1 |
| HMW auto-suggestions (Step 7) | MEDIUM | LOW | P1 |
| Text-based mind mapping (Step 8) | MEDIUM | LOW | P1 |
| SWOT + feasibility AI (Step 9) | MEDIUM | MEDIUM | P1 |
| Step completion validation | MEDIUM | LOW | P1 |
| Back-navigation | MEDIUM | MEDIUM | P1 |
| Synthesis summary (Step 10) | MEDIUM | LOW | P1 |
| Build Pack PRD generation | HIGH | HIGH | P2 |
| Concept comparison | MEDIUM | MEDIUM | P2 |
| Gap analysis | MEDIUM | MEDIUM | P2 |
| Visual canvas tools | HIGH | HIGH | P3 |
| Split-screen mode | MEDIUM | MEDIUM | P3 |
| Real-time collaboration | HIGH | HIGH | P3 |
| Voice input | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v1.0 launch (validate AI facilitation)
- P2: Should have for v1.1+ (enhance proven features)
- P3: Nice to have for MMP/FFP (visual/collaborative upgrades)

## Structured Output Schemas Per Step

### Step 1: Challenge

```json
{
  "challenge_statement": "How might we [verb] [target user] [context]?",
  "problem_core": "One-sentence problem statement",
  "target_user": "Who this is for",
  "altitude_check": "too_specific | just_right | too_broad"
}
```

### Step 2: Stakeholder Mapping

```json
{
  "stakeholders": [
    {
      "id": "uuid",
      "name": "Stakeholder name",
      "category": "Users | Buyers | Regulators | Internal",
      "priority": "Core | Direct | Indirect",
      "ring_index": 0 | 1 | 2,
      "children": ["uuid", "uuid"]
    }
  ]
}
```

### Step 3: User Research

```json
{
  "interviews": [
    {
      "stakeholder_id": "uuid",
      "questions": ["Question 1", "Question 2", "..."],
      "responses": [
        {
          "question": "Question text",
          "response": "AI-simulated stakeholder response",
          "quote": "Key quote extracted"
        }
      ]
    }
  ]
}
```

### Step 4: Research Sense Making

```json
{
  "themes": [
    {
      "id": "uuid",
      "name": "Theme name",
      "observations": ["Quote 1", "Quote 2"],
      "insight": "The non-obvious truth",
      "challenge_relation": "How this impacts challenge",
      "type": "pain | gain"
    }
  ],
  "top_pains": ["Pain 1", "Pain 2", "Pain 3", "Pain 4", "Pain 5"],
  "top_gains": ["Gain 1", "Gain 2", "Gain 3", "Gain 4", "Gain 5"]
}
```

### Step 5: Persona Development

```json
{
  "persona": {
    "id": "uuid",
    "name": "Persona name",
    "age": 35,
    "role": "Job title",
    "context": "Situational description",
    "bio": "2-3 sentence backstory",
    "quote": "One defining sentence in their voice",
    "pains": [
      { "text": "Pain statement", "evidence_theme_id": "uuid" }
    ],
    "gains": [
      { "text": "Gain statement", "evidence_theme_id": "uuid" }
    ],
    "behaviors": ["Observable pattern 1", "Observable pattern 2"]
  }
}
```

### Step 6: Journey Mapping

```json
{
  "journey_map": {
    "id": "uuid",
    "persona_id": "uuid",
    "journey_type": "onboarding | purchase | support | custom",
    "scenario": "Start point → End point",
    "stages": [
      {
        "id": "uuid",
        "name": "Stage name",
        "order": 0,
        "layers": {
          "goals": "What user wants to achieve",
          "barriers": "Friction points",
          "touchpoints": "Channels/tools involved",
          "emotional_status": "positive | neutral | negative",
          "unmet_needs": "Where to intervene"
        }
      }
    ],
    "dip": {
      "stage_id": "uuid",
      "reason": "Why this is the critical pain point"
    },
    "opportunities": ["Intervention 1", "Intervention 2", "Intervention 3"]
  }
}
```

### Step 7: Reframing Challenge

```json
{
  "hmw_statement": {
    "id": "uuid",
    "persona": "Persona name with descriptor",
    "immediate_goal": "Specific action/outcome at pain point",
    "deeper_goal": "Underlying motivation/broader outcome",
    "full_statement": "How might we help [persona] to [immediate_goal] so that [deeper_goal]",
    "validation": {
      "immediate_goal_validity": "pass | warn | fail",
      "deeper_goal_motivation": "pass | warn | fail",
      "specificity": "pass | warn | fail",
      "breadth": "pass | warn | fail",
      "actionability": "pass | warn | fail",
      "recommendation": "proceed | refine"
    }
  }
}
```

### Step 8: Ideation (Text Mind Map)

```json
{
  "mind_map": {
    "id": "uuid",
    "hmw_statement_id": "uuid",
    "structure": [
      {
        "theme": "Theme name",
        "ideas": [
          { "id": "uuid", "text": "Idea statement", "source": "user | ai" }
        ]
      }
    ],
    "wildcards": ["Provocative prompt 1", "Provocative prompt 2"]
  }
}
```

### Step 9: Concept Development

```json
{
  "concept_sheet": {
    "id": "uuid",
    "source_idea_id": "uuid",
    "name": "Concept name",
    "elevator_pitch": "Problem → Solution → Benefit",
    "usp": "What makes this different",
    "strengths": ["Strength 1", "Strength 2", "Strength 3"],
    "weaknesses": ["Weakness 1", "Weakness 2"],
    "opportunities": ["Opportunity 1", "Opportunity 2"],
    "risks": ["Risk 1", "Risk 2"],
    "feasibility": {
      "technical": { "score": 4, "rationale": "Why this score" },
      "operational": { "score": 3, "rationale": "Why this score" },
      "market_potential": { "score": 5, "rationale": "Why this score" },
      "value_add": { "score": 5, "rationale": "Why this score" },
      "attractiveness": { "score": 4, "rationale": "Why this score" },
      "overall_score": 4.2,
      "recommendation": "proceed | refine | reconsider"
    }
  }
}
```

### Step 10: Validate (Synthesis Summary)

```json
{
  "synthesis": {
    "id": "uuid",
    "project_name": "Project name",
    "journey_recap": {
      "challenge": "Original challenge statement",
      "stakeholders": ["Key stakeholder 1", "Key stakeholder 2"],
      "persona_summary": "Name, role, key pain/gain",
      "journey_dip": "Where the biggest opportunity is",
      "hmw_statement": "Final HMW",
      "concept_selected": "Concept name and pitch"
    },
    "next_steps": ["Action 1", "Action 2", "Action 3"],
    "confidence_score": 4.2,
    "ready_for_development": true
  }
}
```

## AI Conversational Arc Pattern

Each step follows the same 6-phase pattern for consistency and quality.

### 1. ORIENT

**Purpose:** Set context, explain step purpose, reference prior outputs

**AI behavior:**
- Welcome user to step
- Explain what this step produces and why it matters
- Reference relevant prior outputs ("Based on your persona Sarah...")
- Preview the questions coming next

**Example:**
> "Welcome to Step 5: Persona Development. Now we'll transform your research insights into a detailed persona — a realistic representation of your target user. Based on your 5 pains and 5 gains from Research Sense Making, I'll help you build a persona grounded in evidence, not assumptions."

### 2. GATHER

**Purpose:** Collect user inputs through questions, options, or confirmations

**AI behavior:**
- Ask specific, focused questions
- Offer contextual suggestions based on prior steps
- Provide examples when helpful
- Allow freeform input or selection from options
- Clarify ambiguous responses

**Example:**
> "Let's start with the persona's role. Based on your stakeholder map, I see 'Department Head' and 'Logistics Manager' as key groups. Which role best represents your primary user?
>
> 1. Department Head (strategic, budget authority)
> 2. Logistics Manager (operational, execution focus)
> 3. Something else (describe)"

### 3. SYNTHESIZE

**Purpose:** Draft output based on gathered inputs, show AI's interpretation

**AI behavior:**
- Generate structured output from conversation
- Show draft to user for review
- Explain reasoning ("I chose X because of Y from Step Z")
- Ask "Does this capture your intent?"

**Example:**
> "Here's the persona I've drafted based on your responses:
>
> **Name:** Sarah Chen
> **Role:** Logistics Manager at mid-size retailer
> **Bio:** Sarah manages daily operations for a 50-person logistics team. She's constantly firefighting delays and communication breakdowns, leading to frequent overtime and stressed team members.
> **Quote:** 'I can't fix what I can't see coming.'
>
> Does this feel like the right persona, or should we adjust anything?"

### 4. REFINE

**Purpose:** Iterate on draft based on user feedback

**AI behavior:**
- Accept edits, regenerations, or specific changes
- Update output in real-time
- Explain impact of changes
- Continue refining until user satisfied

**Example:**
> User: "Change the quote to something about team morale"
>
> AI: "Updated! New quote: 'When my team is stressed, I've failed them.' This shifts focus from visibility to team impact, aligning with the 'team morale' pain you identified in Step 4."

### 5. VALIDATE

**Purpose:** Check output quality against criteria, offer improvement suggestions

**AI behavior:**
- Evaluate output against step-specific criteria
- Flag weaknesses or gaps
- Suggest improvements if needed
- Confirm readiness to proceed

**Example:**
> "Let me validate this persona against best practices:
>
> ✅ **Research-grounded:** All pains/gains trace to Step 4 themes
> ✅ **Specific role:** Logistics Manager is concrete, not generic
> ⚠️ **Backstory depth:** Bio could include more behavioral context — how does Sarah currently cope with visibility gaps?
>
> Want to strengthen the backstory, or proceed as-is?"

### 6. COMPLETE

**Purpose:** Finalize output, save to context, transition to next step

**AI behavior:**
- Confirm completion
- Save structured output
- Preview how this feeds into next step
- Offer to proceed or revisit

**Example:**
> "Persona complete! Sarah Chen is now locked in.
>
> In the next step (Journey Mapping), I'll use Sarah's pains and gains to map her current experience and find the biggest opportunity area.
>
> Ready to continue, or want to review anything first?"

## AI Prompt Engineering Patterns

### System Prompt Structure (Per Step)

```markdown
# Role
You are a professional design thinking facilitator guiding [USER_NAME] through Step [N]: [STEP_NAME].

# Context from Prior Steps
[Inject structured outputs from Steps 1 through N-1 as JSON]

# Step Goal
Produce: [Structured output description]
Validation criteria: [What makes a good output]

# Conversational Arc
1. ORIENT: Explain step purpose, reference prior outputs
2. GATHER: Ask [N] focused questions, offer contextual suggestions
3. SYNTHESIZE: Draft output, show reasoning, ask for confirmation
4. REFINE: Accept edits, regenerate, iterate to user satisfaction
5. VALIDATE: Check output against criteria, flag gaps, suggest improvements
6. COMPLETE: Finalize, save to context, preview next step

# Output Format
When synthesizing, use this JSON schema:
[Step-specific schema]

# Facilitation Style
- Ask one question at a time
- Reference prior outputs by name ("Based on Sarah's pain about...")
- Explain your reasoning ("I chose X because Y")
- Validate before moving forward ("Does this capture your intent?")
- Be encouraging but honest about quality

# Constraints
- Do not invent information — only use what user provides or prior step outputs
- Do not skip validation — always check output quality
- Do not assume — ask clarifying questions when ambiguous
```

### User Message Handling

```javascript
// On each user message:
1. Parse intent (answering question | editing output | requesting help)
2. Update conversation state (GATHER → SYNTHESIZE → REFINE → ...)
3. Inject relevant prior step outputs into context
4. Generate response with:
   - Text (conversational guidance)
   - Structured output update (if synthesizing/refining)
   - Validation feedback (if validating)
   - Next question or confirmation prompt
5. Save updated state (conversation + artifacts)
```

### Context Injection Strategy

**Problem:** Token limits constrain how much prior context can be injected

**Solution:** Hierarchical compression

```javascript
// Short-term context (last 10 messages)
const shortTerm = conversationHistory.slice(-10);

// Medium-term context (current step summary)
const mediumTerm = {
  step: currentStep,
  phase: conversationPhase, // ORIENT | GATHER | SYNTHESIZE | etc.
  gathered_inputs: {}, // Key-value pairs from GATHER phase
  current_draft: {}, // Latest SYNTHESIZE output
};

// Long-term context (prior step artifacts)
const longTerm = {
  challenge: steps[1].output,
  stakeholders: steps[2].output,
  research: steps[3].output,
  pains_gains: steps[4].output,
  persona: steps[5].output,
  journey_map: steps[6].output,
  hmw: steps[7].output,
  // ... only include steps 1 through N-1 for step N
};

// System prompt gets:
const systemPrompt = buildPrompt({
  role: stepConfig[currentStep].role,
  priorArtifacts: longTerm,
  currentState: mediumTerm,
  arc: stepConfig[currentStep].arc,
});

// User message gets:
const userContext = {
  recentMessages: shortTerm,
  currentDraft: mediumTerm.current_draft,
};
```

### Validation Prompt Pattern

```markdown
# Validation Role
You are evaluating Step [N] output against quality criteria.

# Output to Validate
[User's finalized output as JSON]

# Validation Criteria
[Step-specific criteria with pass/warn/fail thresholds]

# Instructions
For each criterion:
1. Assess: pass | warn | fail
2. Provide feedback: specific, actionable
3. If fail: suggest concrete improvement
4. If all pass: confirm readiness to proceed

# Output Format
{
  "criteria": {
    "[criterion_1]": { "status": "pass|warn|fail", "feedback": "..." },
    "[criterion_2]": { "status": "pass|warn|fail", "feedback": "..." }
  },
  "recommendation": "proceed | refine",
  "improvements": ["Suggestion 1 if refine", "Suggestion 2 if refine"]
}
```

## Competitor Feature Analysis

| Feature | Mural AI | IDEO U Workshops | TheyDo AI | Our Approach (WorkshopPilot) |
|---------|----------|------------------|-----------|------------------------------|
| **AI role** | Assistant (suggests, clusters) | Educational (teaches DT) | Assistant (suggests journey content) | **Facilitator (leads conversation)** |
| **Primary UI** | Canvas + AI sidebar | Video + exercises | Journey canvas + AI | **Chat + secondary forms** |
| **Context memory** | Per-canvas session | No memory (lesson-based) | Journey-specific | **Cross-step hierarchical** |
| **Structured outputs** | Visual artifacts (sticky notes) | Manual deliverables | Journey maps | **JSON artifacts per step** |
| **User research** | Manual import | Manual homework | Manual import | **Synthetic AI interviews** |
| **Affinity mapping** | Auto-cluster with review | Manual exercise | N/A | **Fully automated with themes** |
| **Persona generation** | Suggest fields | Template with guidance | N/A | **Full AI synthesis from research** |
| **Journey mapping** | Suggest per cell | Manual with templates | AI suggest rows/columns | **Full board auto-generation** |
| **HMW generation** | N/A | Manual with examples | N/A | **Auto-suggestions + validation** |
| **Ideation** | Mind map canvas + AI | Crazy 8s (manual) | N/A | **Text mind map + AI themes** |
| **Concept evaluation** | Manual | Manual SWOT | N/A | **AI SWOT + feasibility scores** |
| **Output format** | Mural board export | Worksheets | Journey map JSON | **Build Pack for AI coders** |
| **Collaboration** | Real-time multiplayer | Workshop groups | Team editing | **Single-user MVP, defer to MMP** |
| **Learning curve** | Medium (canvas tools) | High (10-week course) | Medium (journey mapping) | **Low (conversational)** |

**Key differentiators:**
1. **AI as facilitator vs. assistant** — We lead, they help
2. **Conversational UI vs. canvas-first** — Chat drives interaction, not drag-and-drop
3. **Synthetic research vs. manual** — We simulate interviews, they require real homework
4. **End-to-end automation vs. selective** — We facilitate all 10 steps, they assist specific tasks
5. **Build Pack output vs. visual artifacts** — We feed AI coders, they export boards/PDFs

## Sources

**AI-Powered Design Thinking:**
- [The Intersection of Design Thinking and AI: Enhancing Innovation](https://www.ideou.com/blogs/inspiration/ai-and-design-thinking)
- [How AI Is Transforming Design Thinking](https://www.itonics-innovation.com/blog/design-thinking-transformation)
- [18 Best Design Thinking Tools of 2026](https://cpoclub.com/tools/best-design-thinking-tools/)

**Conversational AI Patterns:**
- [Conversational AI Design in 2026 (According to Experts)](https://botpress.com/blog/conversation-design)
- [Conversational AI – A Complete Guide for 2026](https://www.prismetric.com/conversational-ai-guide/)
- [Conversational UI: 6 Best Practices in 2026](https://research.aimultiple.com/conversational-ui/)

**Context Engineering & Multi-Step Workflows:**
- [AI Context Engineering in 2026: Why Prompt Engineering Is No Longer Enough](https://sombrainc.com/blog/ai-context-engineering-guide)
- [Context Engineering: A Complete Guide & Why It Is Important in 2026](https://codeconductor.ai/blog/context-engineering/)
- [Context Window Management: Strategies for Long-Context AI Agents and Chatbots](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots/)

**Persona Development with AI:**
- [AI for Persona Research and Creation: Build Better Profiles in Less Time](https://www.interaction-design.org/literature/article/ai-for-personas)
- [Synthetic Personas: How AI is Changing Customer Research](https://bluetext.com/blog/synthetic-personas-how-ai-generated-user-models-are-changing-customer-research/)

**Journey Mapping Automation:**
- [AI customer journey mapping: top implementation stages for 2026](https://monday.com/blog/crm-and-sales/ai-customer-journey/)
- [Automating Customer Journey Mapping with Ai: a Practical Guide for 2026](https://futuretask.ai/automating-customer-journey-mapping-with-ai)

**HMW Statement Generation:**
- [Design Thinking – How Might We Statement Creator](https://www.yeschat.ai/gpts-9t557I8Z770-Design-Thinking-%E2%80%93-How-Might-We-Statement-Creator)
- [What is How Might We (HMW)?](https://www.interaction-design.org/literature/topics/how-might-we)

**AI Mind Mapping & Ideation:**
- [The 5 Best AI Tools to Convert Text into Mind Maps In 2026](https://awisee.com/blog/ai-tools-to-convert-text-into-mind-maps/)
- [14 Best AI Mind Mapping Tools Reviewed in 2026](https://thedigitalprojectmanager.com/tools/best-ai-mind-mapping-tools/)

**Affinity Mapping & Research Synthesis:**
- [Affinity Mapping: How to Synthesize User Research Data in 5 Steps](https://www.userinterviews.com/blog/affinity-mapping-ux-research-data-synthesis)
- [Improve Your Synthesis with Cluster Analysis](https://www.notably.ai/features/notably-cluster-analysis)

**SWOT Analysis with AI:**
- [The Ultimate Guide for SWOT Analysis Using Generative AI](https://www.linkedin.com/pulse/ultimate-guide-swot-analysis-using-generative-ai-hacking-hr-9xroc)
- [AI SWOT analysis generator](https://manus.im/playbook/swot-analysis-generator)

**Dot Voting & Prioritization:**
- [Dot Voting: A Simple Decision-Making and Prioritizing Technique in UX](https://www.nngroup.com/articles/dot-voting/)
- [How to Use Dot Voting for Group Decision-making](https://lucid.co/blog/dot-voting)

**Step Completion & Validation:**
- [When Should Users Check? A Decision-Theoretic Model of Confirmation Frequency in Multi-Step AI Agent Tasks](https://arxiv.org/abs/2510.05307)
- [Chatbot Testing: A/B, Auto, & Manual Testing in 2026](https://research.aimultiple.com/chatbot-testing-frameworks/)

---
*Feature research for: WorkshopPilot.ai v1.0 — AI-powered design thinking facilitation*
*Researched: 2026-02-08*
*Confidence: HIGH (Obsidian specs + WebSearch + Context7)*
