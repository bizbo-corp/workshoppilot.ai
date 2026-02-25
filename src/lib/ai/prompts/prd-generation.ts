import type { WorkshopArtifacts, AllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';

/**
 * Build the Gemini system prompt that instructs it to synthesize workshop artifacts
 * into a V0-optimized prototype prompt.
 */
export function buildPrdGenerationPrompt(artifacts: WorkshopArtifacts): string {
  const artifactJson = JSON.stringify(artifacts, null, 2);

  return `You are a senior product designer. Your job is to transform design thinking workshop outputs into a clear, actionable prompt that V0 (Vercel's AI code generator) can use to build a clickable frontend prototype.

Below are the structured outputs from the workshop. Some sections may be null (the user skipped that step) — omit those sections from your output.

<workshop_artifacts>
${artifactJson}
</workshop_artifacts>

Write a prompt in markdown following this EXACT structure. Keep it under 1500 words. Use natural language, not JSON. Be specific and actionable.

---

Build a frontend prototype for "{concept name from artifacts}".

## What This Product Does
{Write 2-3 sentences combining the elevator pitch and problem statement}

## The User
{Persona name} is a {role} who {bio summary}.
- Goals: {top 3 goals as bullet points}
- Frustrations: {top 3 pains as bullet points}
- Key quote: "{persona quote}"

## The Core Problem
{Combine pain points from sense-making + HMW statement from reframe. If those steps are missing, derive from challenge + persona pains}

## The Solution
{USP from concept} — {billboard headline + subheadline if available}

## Key Features to Prototype
{Derive 3-5 features from the concept, each tied to a specific persona pain point. Format as bullet points with feature name + brief description}

## Pages to Build
{Derive 2-4 pages from the journey stages. Each page should have a clear purpose and list of key UI elements}

## Design Direction
Clean, modern, professional. Focus on the happy path.
Use realistic mock data that reflects the persona's world.

---

IMPORTANT:
- Write the prompt as if speaking directly to V0
- Be specific about UI elements, data to display, and interactions
- Do NOT include any preamble, explanation, or meta-commentary — output ONLY the prompt markdown
- If a section's source data is null/missing, omit that section entirely (except "What This Product Does" and "The Solution" which are always required)`;
}

/**
 * Build the full PRD generation prompt (Markdown output).
 * Produces a comprehensive Product Requirements Document derived from all 10 workshop steps.
 */
export function buildFullPrdPrompt(artifacts: AllWorkshopArtifacts): string {
  const workshopData = JSON.stringify(artifacts, null, 2);

  return `You are a senior product manager with expertise in design thinking and product requirements documentation. Your task is to produce a comprehensive, professional Product Requirements Document (PRD) in Markdown format, derived entirely from the design thinking workshop outputs below.

<workshop_data>
${workshopData}
</workshop_data>

INSTRUCTIONS:
- Use ONLY the data provided above — reference specific details, not generic boilerplate
- If a section's source step artifact is null/missing, omit that section entirely
- Write for an audience of engineers, designers, and stakeholders who will build this product
- Output ONLY the Markdown document — no preamble, no meta-commentary, no markdown fences
- Target 2000-3000 words for a comprehensive but readable document

Produce a PRD with the following sections (omit any section whose source data is null):

# [Product Name] — Product Requirements Document

## 1. Executive Summary
Derive from: challenge statement (Step 1) + concept elevator pitch (Step 9)
Write 2-3 paragraphs summarizing the product vision, the problem it solves, and the proposed solution.

## 2. Problem Statement
Derive from: challenge (Step 1) + sense-making pain points (Step 4) + reframe HMW statement (Step 7)
Articulate the specific problem being solved, with evidence from research.

## 3. Target Users
Derive from: persona (Step 5)
Include:
- **Name & Role**: [persona name and role]
- **Demographics**: [relevant demographics]
- **Goals**: [top goals as bullet points]
- **Pain Points**: [top frustrations as bullet points]
- **Behaviors**: [key behavior patterns]
- **Representative Quote**: "[quote that captures their perspective]"

## 4. Stakeholder Analysis
Derive from: stakeholder mapping (Step 2)
List key stakeholders, their influence/interest levels, and engagement strategies.

## 5. User Research Insights
Derive from: user research (Step 3) + sense-making themes (Step 4)
Summarize the key themes and evidence from research that inform this product.

## 6. User Journey
Derive from: journey mapping (Step 6)
Map the current experience stages, noting actions, emotions, pain points, and opportunities at each stage.

## 7. Core Problem (HMW Statement)
Derive from: reframe (Step 7)
State the refined "How Might We" problem statement that guides the solution.

## 8. Solution Overview
Derive from: concept (Step 9)
Describe the proposed solution including:
- **Concept Name**: [name]
- **Unique Selling Proposition**: [USP]
- **Elevator Pitch**: [1-2 sentence pitch]
- **SWOT Analysis**: [strengths, weaknesses, opportunities, threats as lists]

## 9. Feature Requirements
Derive from: ideation (Step 8) + concept (Step 9)
List features with priority levels. Format each as:
- **[Feature Name]** (Priority: Must-have | Should-have | Nice-to-have): [description] — [user need it addresses]

## 10. Success Metrics
Derive from: validation (Step 10)
Define measurable criteria for product success, including any confidence scores or validated assumptions.

## 11. Assumptions & Risks
Derive from: challenge assumptions (Step 1) + concept SWOT threats (Step 9)
List key assumptions that must hold true and risks to mitigate.

## 12. Recommended Next Steps
Derive from: validation next steps (Step 10)
Provide actionable next steps for the team, sequenced by priority.

---

CRITICAL RULES:
- Reference SPECIFIC data from the workshop (persona names, feature names, HMW statements, etc.)
- Do NOT write generic product management content
- Every claim should trace back to a specific step's output
- Use the exact names, quotes, and metrics from the workshop data
- Omit any section whose source step is null in the workshop_data above`;
}

/**
 * Build the full PRD generation prompt (structured JSON output).
 * Same content as buildFullPrdPrompt but formatted as machine-readable JSON.
 */
export function buildFullPrdJsonPrompt(artifacts: AllWorkshopArtifacts): string {
  const workshopData = JSON.stringify(artifacts, null, 2);

  return `You are a senior product manager. Transform the design thinking workshop outputs below into a structured Product Requirements Document (PRD) in JSON format.

<workshop_data>
${workshopData}
</workshop_data>

Return ONLY valid JSON matching this exact schema — no markdown fences, no commentary, no preamble:

{
  "title": "string — product name from concept artifact",
  "executiveSummary": "string — 2-3 paragraph summary from challenge + concept",
  "problemStatement": "string — specific problem from challenge + sense-making + reframe",
  "targetUsers": {
    "name": "string — persona name",
    "role": "string — persona role/occupation",
    "goals": ["string — goal 1", "string — goal 2"],
    "pains": ["string — pain 1", "string — pain 2"],
    "behaviors": ["string — behavior 1", "string — behavior 2"]
  },
  "stakeholders": [
    { "name": "string", "influence": "string — High/Medium/Low", "interest": "string — High/Medium/Low" }
  ],
  "researchInsights": [
    { "theme": "string — insight theme", "evidence": "string — supporting evidence" }
  ],
  "userJourney": {
    "stages": [
      {
        "name": "string — stage name",
        "actions": "string — what the user does",
        "emotions": "string — how the user feels",
        "painPoints": "string — frustrations at this stage",
        "opportunities": "string — where the product can help"
      }
    ]
  },
  "hmwStatement": "string — the refined How Might We statement from reframe step",
  "solution": {
    "name": "string — concept name",
    "usp": "string — unique selling proposition",
    "elevatorPitch": "string — 1-2 sentence pitch",
    "swot": {
      "strengths": ["string"],
      "weaknesses": ["string"],
      "opportunities": ["string"],
      "threats": ["string"]
    }
  },
  "features": [
    {
      "name": "string — feature name",
      "description": "string — what it does",
      "priority": "must-have",
      "userNeed": "string — which user pain this addresses"
    }
  ],
  "successMetrics": [
    { "metric": "string — what to measure", "target": "string — target value or outcome" }
  ],
  "assumptions": ["string — assumption 1", "string — assumption 2"],
  "risks": ["string — risk 1", "string — risk 2"],
  "nextSteps": ["string — action 1", "string — action 2"]
}

RULES:
- Use ONLY data from the workshop_data above
- Omit or use empty arrays for sections whose source step is null
- priority field must be exactly one of: "must-have", "should-have", "nice-to-have"
- Return ONLY valid JSON — no markdown code fences, no explanation`;
}

/**
 * Build the V0 system prompt (static constraints template).
 * This is sent as the system prompt to V0's API, not generated by AI.
 */
export function buildV0SystemPrompt(conceptName: string, personaName: string): string {
  return `You are building a clickable frontend prototype to validate a product concept called "${conceptName}" designed for a user like ${personaName}.

CONSTRAINTS:
- Next.js App Router + React + Tailwind CSS + shadcn/ui
- Frontend ONLY — no database, no auth, no API routes, no backend
- All data is hardcoded mock data in a /lib/mock-data.ts file
- Mock data should feel realistic for the target persona
- Use React useState for interactive behavior (filters, toggles, forms)
- Mobile responsive, polished visual design

WHAT TO BUILD:
- Multiple pages demonstrating the core user flow
- Focus on the happy path — no error handling needed
- Make it feel like a real product a stakeholder could click through

WHAT NOT TO BUILD:
- No login/signup/auth screens
- No real API calls or data fetching
- No complex state management
- No backend routes or server actions
- No payment processing, email, or third-party integrations

DESIGN:
- Use shadcn/ui components (Card, Button, Input, Badge, Tabs, etc.)
- Professional color scheme with clear visual hierarchy
- Hover states and basic transitions for interactivity
- Placeholder images where needed`;
}
