/**
 * Step Metadata Module
 * Hardcoded step data for all 10 WorkshopPilot design thinking steps
 * Per user decision: Step descriptions are hardcoded (not fetched from DB)
 *
 * CRITICAL: Step IDs (slugs) MUST match database step_definition IDs
 * Used by: sidebar, step pages, mobile stepper
 */

export interface StepDefinition {
  order: number;            // 1-10
  id: string;               // Database step_definition ID: 'challenge', 'stakeholder-mapping', etc.
  slug: string;             // URL-friendly (same as id): 'challenge', 'stakeholder-mapping', etc.
  name: string;             // Display name: 'Challenge', 'Stakeholder Mapping', etc.
  description: string;      // Brief description of what this step does
  greeting: string;         // Legacy: AI now auto-starts via __step_start__ trigger. Kept as fallback.
  mockOutputType: string;   // Type label for output panel
  mockOutputContent: string; // Structured placeholder content for the output panel
}

export const STEPS: StepDefinition[] = [
  {
    order: 1,
    id: 'challenge',
    slug: 'challenge',
    name: 'Challenge',
    description: 'Extract the core problem and draft a How Might We statement',
    greeting: "Welcome! Let's start by understanding the problem you're trying to solve. Tell me about your idea -- what challenge or opportunity are you exploring?",
    mockOutputType: 'Problem Statement & HMW',
    mockOutputContent: `Problem Statement:
[Description of the core problem your users face]

How Might We:
How might we [problem area] for [target user] so that [desired outcome]?`,
  },
  {
    order: 2,
    id: 'stakeholder-mapping',
    slug: 'stakeholder-mapping',
    name: 'Stakeholder Mapping',
    description: 'Identify and prioritize the people and groups involved',
    greeting: "Now let's map out who's involved. Who are the key people and groups that will be affected by or influence your solution?",
    mockOutputType: 'Stakeholder Grid',
    mockOutputContent: `Stakeholder Grid (Power vs Interest):

High Power, High Interest:
- [Key stakeholder 1]
- [Key stakeholder 2]

High Power, Low Interest:
- [Stakeholder to keep satisfied]

Low Power, High Interest:
- [Stakeholder to keep informed]

Low Power, Low Interest:
- [Monitor only]`,
  },
  {
    order: 3,
    id: 'user-research',
    slug: 'user-research',
    name: 'User Research',
    description: 'Gather insights through synthetic interviews and research',
    greeting: "Time to understand your users deeply. I'll help you conduct synthetic user interviews to uncover needs, behaviors, and pain points.",
    mockOutputType: 'Interview Questions & Synthesis',
    mockOutputContent: `Interview Questions:
1. [Question about user context]
2. [Question about current behavior]
3. [Question about pain points]
4. [Question about desired outcomes]

Synthesis Notes:
- Key insight 1: [Finding from research]
- Key insight 2: [Finding from research]
- Key insight 3: [Finding from research]`,
  },
  {
    order: 4,
    id: 'sense-making',
    slug: 'sense-making',
    name: 'Research Sense Making',
    description: 'Synthesize research into themes, pains, and gains',
    greeting: "Let's make sense of what we've learned. I'll help you organize your research findings into clear themes, pain points, and gains.",
    mockOutputType: 'Affinity Map & Pains/Gains',
    mockOutputContent: `Themes:
1. [Theme 1]: [Supporting evidence]
2. [Theme 2]: [Supporting evidence]
3. [Theme 3]: [Supporting evidence]

Top 5 Pains:
1. [Pain point]
2. [Pain point]
3. [Pain point]
4. [Pain point]
5. [Pain point]

Top 5 Gains:
1. [Desired gain]
2. [Desired gain]
3. [Desired gain]
4. [Desired gain]
5. [Desired gain]`,
  },
  {
    order: 5,
    id: 'persona',
    slug: 'persona',
    name: 'Persona Development',
    description: 'Create a research-grounded user persona',
    greeting: "Time to bring your users to life! Based on our research, I'll help you create a detailed persona that represents your target user.",
    mockOutputType: 'User Persona Card',
    mockOutputContent: `Name: [Persona Name]
Age: [Age]
Role: [Role / Occupation]
Location: [Location]

Bio:
[Brief background story]

Goals:
- [Primary goal]
- [Secondary goal]

Pain Points:
- [Key frustration 1]
- [Key frustration 2]

Behaviors:
- [Relevant behavior pattern]
- [Technology usage pattern]

Quote:
"[A quote that captures their perspective]"`,
  },
  {
    order: 6,
    id: 'journey-mapping',
    slug: 'journey-mapping',
    name: 'Journey Mapping',
    description: 'Map the current user experience and find the critical dip',
    greeting: "Let's walk through your user's current experience step by step. We'll map their journey and find where things break down -- the critical 'dip'.",
    mockOutputType: 'Journey Map',
    mockOutputContent: `Journey Map: [Persona Name]'s Experience

Stage 1: [Awareness]
- Actions: [What they do]
- Thoughts: [What they think]
- Emotions: [How they feel] (positive)

Stage 2: [Consideration]
- Actions: [What they do]
- Thoughts: [What they think]
- Emotions: [How they feel] (neutral)

Stage 3: [The Dip]
- Actions: [What they struggle with]
- Thoughts: [Frustrations]
- Emotions: [How they feel] (negative)
- PAIN POINT: [Critical breakdown]

Stage 4: [Resolution]
- Actions: [Current workaround]
- Opportunity: [Where we can help]`,
  },
  {
    order: 7,
    id: 'reframe',
    slug: 'reframe',
    name: 'Reframing Challenge',
    description: 'Craft a focused How Might We statement based on insights',
    greeting: "With all our research insights, let's reframe the challenge. We'll craft a focused 'How Might We' statement that captures the real opportunity.",
    mockOutputType: 'Refined HMW Statement',
    mockOutputContent: `Original HMW:
How might we [initial problem framing]?

Research Insights Applied:
- [Key insight that shifts perspective]
- [Pain point from journey map dip]
- [Persona need]

Refined HMW:
How might we [reframed problem] for [specific persona] when [specific context] so that [measurable outcome]?`,
  },
  {
    order: 8,
    id: 'ideation',
    slug: 'ideation',
    name: 'Ideation',
    description: 'Generate ideas using Mind Mapping and Crazy 8s sketching, then select top ideas',
    greeting: "Time to get creative! We'll use Mind Mapping to explore themes, then Crazy 8s to sketch 8 rapid ideas. Finally, you'll select your best concepts to develop further.",
    mockOutputType: 'Mind Map & Idea Cards',
    mockOutputContent: `Mind Map:
[Central HMW Statement]
├── Branch 1: [Category]
│   ├── [Idea 1.1]
│   └── [Idea 1.2]
├── Branch 2: [Category]
│   ├── [Idea 2.1]
│   └── [Idea 2.2]
└── Branch 3: [Category]
    ├── [Idea 3.1]
    └── [Idea 3.2]

Top Ideas:
1. [Idea title] -- [Brief description]
2. [Idea title] -- [Brief description]
3. [Idea title] -- [Brief description]`,
  },
  {
    order: 9,
    id: 'concept',
    slug: 'concept',
    name: 'Concept Development',
    description: 'Develop concept sheets with SWOT analysis, feasibility, and elevator pitch',
    greeting: "Let's develop your best ideas into solid concepts. For each one, we'll create a concept sheet with SWOT analysis, feasibility assessment, and elevator pitch.",
    mockOutputType: 'Concept Sheet',
    mockOutputContent: `Concept: [Concept Name]

Elevator Pitch:
[One-sentence description of the concept]

SWOT Analysis:
Strengths:
- [Internal advantage]
Weaknesses:
- [Internal limitation]
Opportunities:
- [External possibility]
Threats:
- [External risk]

Feasibility:
- Technical: [High/Medium/Low]
- Business: [High/Medium/Low]
- User Desirability: [High/Medium/Low]

Next Steps:
- [Action item 1]
- [Action item 2]`,
  },
  {
    order: 10,
    id: 'validate',
    slug: 'validate',
    name: 'Validate',
    description: 'Create flow diagrams, prototyping, PRD generation, and Build Pack export',
    greeting: "Final step! Let's validate your concept with flow diagrams, a prototype outline, and generate your PRD. This becomes your Build Pack -- everything a developer needs to start building.",
    mockOutputType: 'Flow Diagram & PRD Outline',
    mockOutputContent: `User Flow:
[Start] → [Step 1] → [Decision Point]
  ├── Yes → [Step 2a] → [Step 3]
  └── No → [Step 2b] → [Step 3]
[Step 3] → [End]

PRD Outline:
1. Overview & Objectives
2. Target Users & Personas
3. Core Features (MVP)
4. User Stories
5. Technical Requirements
6. Success Metrics

Build Pack Status:
- [ ] PRD Document
- [ ] User Stories
- [ ] Technical Spec
- [ ] Flow Diagrams`,
  },
];

/**
 * Total number of steps in the WorkshopPilot process
 */
export const TOTAL_STEPS = 10;

/**
 * Get step by order number (1-10)
 */
export function getStepByOrder(order: number): StepDefinition | undefined {
  return STEPS.find((step) => step.order === order);
}

/**
 * Get step by URL slug (same as ID)
 */
export function getStepBySlug(slug: string): StepDefinition | undefined {
  return STEPS.find((step) => step.slug === slug);
}

/**
 * Get step by database ID (same as slug)
 */
export function getStepById(id: string): StepDefinition | undefined {
  return STEPS.find((step) => step.id === id);
}
