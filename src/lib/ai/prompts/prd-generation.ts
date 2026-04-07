import type { WorkshopArtifacts, AllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';
import type { FeaturePrioritizationState } from '@/lib/feature-prioritization/types';
import type { TechSpecsPreferences } from '@/lib/tech-specs-wizard/types';
import { formatPreferencesForPrompt } from '@/lib/tech-specs-wizard/format-preferences';

/**
 * Max characters per individual step artifact when serialized.
 * Keeps total prompt well under Gemini's per-field size limit.
 */
const MAX_CHARS_PER_STEP = 4000;

/**
 * Safe per-step serialization that individually truncates each step's JSON.
 * Falls back to a raw truncated string if JSON repair fails.
 */
export function serializeArtifactsSafe(artifacts: Record<string, unknown>): string {
  const parts: string[] = ['{'];
  const entries = Object.entries(artifacts);
  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    const comma = i < entries.length - 1 ? ',' : '';
    if (value === null || value === undefined) {
      parts.push(`  "${key}": null${comma}`);
      continue;
    }
    let serialized = JSON.stringify(value, null, 2);
    if (serialized.length > MAX_CHARS_PER_STEP) {
      serialized = serialized.slice(0, MAX_CHARS_PER_STEP) + '\n  ...[truncated]';
    }
    parts.push(`  "${key}": ${serialized}${comma}`);
  }
  parts.push('}');
  return parts.join('\n');
}

/**
 * Build the Gemini system prompt that instructs it to synthesize workshop artifacts
 * into a V0-optimized prototype prompt.
 */
export function buildPrdGenerationPrompt(artifacts: WorkshopArtifacts): string {
  const artifactJson = serializeArtifactsSafe(artifacts as unknown as Record<string, unknown>);

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
{USP from concept} — {elevator pitch from concept}

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
 * Produces a comprehensive Product Requirements Document derived from all 10 workshop steps,
 * feature prioritization, and technical specifications.
 */
export function buildFullPrdPrompt(
  artifacts: AllWorkshopArtifacts,
  featurePrioritization?: FeaturePrioritizationState | null,
  techSpecsMarkdown?: string | null,
  techSpecsPreferences?: TechSpecsPreferences | null,
): string {
  const workshopData = serializeArtifactsSafe(artifacts as unknown as Record<string, unknown>);

  const fpSection = featurePrioritization && featurePrioritization.features.length > 0
    ? `\n<feature_prioritization>
${JSON.stringify(featurePrioritization.features.map((f, i) => ({
  rank: i + 1,
  name: f.name,
  description: f.description,
  category: f.category,
  priority: f.priority,
  subfeatures: f.subfeatures.map((sf) => sf.name),
})), null, 2)}
</feature_prioritization>

IMPORTANT: The feature_prioritization section above is the AUTHORITATIVE source for feature names, ordering, and priority levels. Use these exact feature names and their priority rankings in Section 9 (Feature Requirements). The order reflects user-defined priority — features ranked higher are more important. Group features into release phases: must-have features are Phase 1 (MVP), should-have features are Phase 2, nice-to-have features are Phase 3.
`
    : '';

  // Build tech specs context — include both generated specs and user preferences
  let techSection = '';
  if (techSpecsMarkdown) {
    // Truncate to prevent prompt bloat — include the most critical sections
    const truncated = techSpecsMarkdown.length > 6000
      ? techSpecsMarkdown.slice(0, 6000) + '\n\n...[truncated]'
      : techSpecsMarkdown;
    techSection += `\n<technical_specifications>
${truncated}
</technical_specifications>

IMPORTANT: The technical_specifications section above contains the generated Technical Specifications for this product. Use this as the AUTHORITATIVE source for:
- System architecture and platform decisions (Section 10: Technical Architecture)
- Data model and API design references (Section 10)
- Integration requirements and third-party services (Section 10)
- Security and compliance requirements (Section 11: Assumptions & Risks)
- Implementation roadmap phasing (Section 13: Implementation Roadmap)
`;
  }

  // Also inject user's explicit tech preferences if available
  const techPrefsText = techSpecsPreferences ? formatPreferencesForPrompt(techSpecsPreferences) : null;
  if (techPrefsText) {
    techSection += `\n${techPrefsText}\n\nThese user-specified technical requirements MUST be reflected in the Technical Architecture and Implementation Roadmap sections.\n`;
  }

  return `You are a senior product manager with expertise in design thinking and product requirements documentation. Your task is to produce a comprehensive, professional Product Requirements Document (PRD) in Markdown format that serves as the definitive handoff document for AI coding agents and development teams.

This PRD must synthesize ALL available context: workshop research, feature prioritization, and technical specifications into a single authoritative document.

<workshop_data>
${workshopData}
</workshop_data>
${fpSection}${techSection}

INSTRUCTIONS:
- Use ONLY the data provided above — reference specific details, not generic boilerplate
- If a section's source step artifact is null/missing, omit that section entirely
- Write for an audience of AI coding agents and engineers who will build this product from scratch
- The PRD must be self-contained — a developer reading only this document should have everything needed to start building
- Output ONLY the Markdown document — no preamble, no meta-commentary, no markdown fences
- Target 3000-4000 words for a comprehensive but readable document

Produce a PRD with the following sections (omit any section whose source data is null):

# [Product Name] — Product Requirements Document

## 1. Executive Summary
Derive from: challenge statement (Step 1) + concept elevator pitch (Step 9)
Write 2-3 paragraphs summarizing the product vision, the problem it solves, and the proposed solution. Include the target platform and core technology decisions if technical specifications are available.

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

## 9. Feature Requirements by Release Phase
Derive from: feature prioritization + ideation (Step 8) + concept (Step 9)
Organize features into release phases based on priority. For each phase, list features with descriptions and the user need they address.

### Phase 1: MVP (Must-Have)
Core features required for initial launch. These address the primary user pain points and deliver the core value proposition.
- **[Feature Name]**: [description] — Addresses: [user need]
  - Sub-features: [list sub-features if available]

### Phase 2: Enhancement (Should-Have)
Features that significantly improve the experience but are not blockers for initial release.
- **[Feature Name]**: [description] — Addresses: [user need]

### Phase 3: Growth (Nice-to-Have)
Features that add polish, delight, or serve secondary use cases.
- **[Feature Name]**: [description] — Addresses: [user need]

## 10. Technical Architecture & Constraints
Derive from: technical specifications (if available)
Summarize the key technical decisions that constrain or guide implementation:
- **Platform**: [web/mobile/desktop and architecture]
- **Hosting & Deployment**: [cloud provider, deployment approach]
- **Database & Storage**: [database type, file storage]
- **Authentication**: [auth methods, identity provider]
- **Key Integrations**: [third-party services, APIs]
- **Security & Compliance**: [data sensitivity, compliance standards]
- **Performance Targets**: [uptime, latency, scale requirements]

If no technical specifications are available, omit this section.

## 11. Success Metrics
Derive from: validation (Step 10)
Define measurable criteria for product success, including any confidence scores or validated assumptions.

## 12. Assumptions & Risks
Derive from: challenge assumptions (Step 1) + concept SWOT threats (Step 9) + technical constraints
List key assumptions that must hold true and risks to mitigate. Include technical risks if tech specs are available.

## 13. Implementation Roadmap
Derive from: feature phases above + technical specifications implementation roadmap (if available)
Provide a phased implementation plan that maps release phases to concrete deliverables:

### Phase 1: MVP
- **Goal**: [what users can do after this phase]
- **Key Deliverables**: [list of features and technical foundations]
- **Technical Focus**: [core architecture, data model, auth setup]

### Phase 2: Enhancement
- **Goal**: [expanded capabilities]
- **Key Deliverables**: [features from Phase 2 + infrastructure improvements]

### Phase 3: Growth
- **Goal**: [scale and polish]
- **Key Deliverables**: [remaining features + optimization]

## 14. Recommended Next Steps
Derive from: validation next steps (Step 10)
Provide actionable next steps for the team, sequenced by priority.

---

CRITICAL RULES:
- Reference SPECIFIC data from the workshop (persona names, feature names, HMW statements, etc.)
- Do NOT write generic product management content
- Every claim should trace back to a specific step's output
- Use the exact names, quotes, and metrics from the workshop data
- Feature names and priorities MUST match the feature_prioritization data exactly
- Technical architecture MUST match the technical_specifications data exactly
- The Implementation Roadmap must align feature phases with technical phases
- Omit any section whose source step is null in the workshop_data above`;
}

/**
 * Build the full PRD generation prompt (structured JSON output).
 * Same content as buildFullPrdPrompt but formatted as machine-readable JSON.
 */
export function buildFullPrdJsonPrompt(
  artifacts: AllWorkshopArtifacts,
  featurePrioritization?: FeaturePrioritizationState | null,
  techSpecsMarkdown?: string | null,
  techSpecsPreferences?: TechSpecsPreferences | null,
): string {
  const workshopData = serializeArtifactsSafe(artifacts as unknown as Record<string, unknown>);

  const fpSection = featurePrioritization && featurePrioritization.features.length > 0
    ? `\n<feature_prioritization>
${JSON.stringify(featurePrioritization.features.map((f, i) => ({
  rank: i + 1,
  name: f.name,
  description: f.description,
  category: f.category,
  priority: f.priority,
  subfeatures: f.subfeatures.map((sf) => sf.name),
})), null, 2)}
</feature_prioritization>

IMPORTANT: Use the feature_prioritization data above as the AUTHORITATIVE source for the "features" array. Group features into releasePhases by priority: must-have → Phase 1 (MVP), should-have → Phase 2, nice-to-have → Phase 3.
`
    : '';

  // Build tech specs context
  let techSection = '';
  if (techSpecsMarkdown) {
    const truncated = techSpecsMarkdown.length > 6000
      ? techSpecsMarkdown.slice(0, 6000) + '\n\n...[truncated]'
      : techSpecsMarkdown;
    techSection += `\n<technical_specifications>
${truncated}
</technical_specifications>

Use technical_specifications as the AUTHORITATIVE source for the "technicalArchitecture" and "implementationRoadmap" objects.
`;
  }

  const techPrefsText = techSpecsPreferences ? formatPreferencesForPrompt(techSpecsPreferences) : null;
  if (techPrefsText) {
    techSection += `\n${techPrefsText}\n`;
  }

  return `You are a senior product manager. Transform the design thinking workshop outputs below into a structured Product Requirements Document (PRD) in JSON format. This PRD is the definitive handoff document for AI coding agents.

<workshop_data>
${workshopData}
</workshop_data>
${fpSection}${techSection}

Return ONLY valid JSON matching this exact schema — no markdown fences, no commentary, no preamble:

{
  "title": "string — product name from concept artifact",
  "executiveSummary": "string — 2-3 paragraph summary from challenge + concept + platform",
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
      "priority": "must-have | should-have | nice-to-have",
      "releasePhase": "string — Phase 1: MVP | Phase 2: Enhancement | Phase 3: Growth",
      "userNeed": "string — which user pain this addresses",
      "subfeatures": ["string — sub-feature name"]
    }
  ],
  "technicalArchitecture": {
    "platform": "string — e.g. Responsive Web App (SSR) or null if no tech specs",
    "hosting": "string — e.g. AWS, Serverless or null",
    "database": "string — e.g. PostgreSQL or null",
    "authentication": "string — e.g. Email/Password + Social Login or null",
    "keyIntegrations": ["string — third-party service"],
    "securityCompliance": ["string — requirement e.g. GDPR, PII handling"],
    "performanceTargets": ["string — e.g. 99.9% uptime, <200ms response"]
  },
  "successMetrics": [
    { "metric": "string — what to measure", "target": "string — target value or outcome" }
  ],
  "assumptions": ["string — assumption 1", "string — assumption 2"],
  "risks": ["string — risk 1 (include technical risks if tech specs available)", "string — risk 2"],
  "implementationRoadmap": [
    {
      "phase": "string — Phase 1: MVP",
      "goal": "string — what users can do after this phase",
      "features": ["string — feature name from this phase"],
      "technicalFocus": "string — core architecture work for this phase"
    }
  ],
  "nextSteps": ["string — action 1", "string — action 2"]
}

RULES:
- Use ONLY data from the workshop_data, feature_prioritization, and technical_specifications above
- Omit or use empty arrays for sections whose source step is null
- priority field must be exactly one of: "must-have", "should-have", "nice-to-have"
- releasePhase must map from priority: must-have → "Phase 1: MVP", should-have → "Phase 2: Enhancement", nice-to-have → "Phase 3: Growth"
- technicalArchitecture: populate from technical_specifications if available, otherwise set fields to null
- implementationRoadmap: must have at least Phase 1, align features with their releasePhase
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
