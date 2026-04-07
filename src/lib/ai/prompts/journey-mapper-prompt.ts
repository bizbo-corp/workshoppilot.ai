import type { AllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';

/**
 * Build the Gemini prompt for mapping Step 9 concepts onto Step 6 journey stages.
 * Receives artifacts + raw canvas data for the actual journey template.
 *
 * Philosophy: Each concept card from Step 9 IS a core screen/feature.
 * The LLM designs the app shell around them — it does NOT invent sub-features.
 */
export function buildJourneyMapperPrompt(
  artifacts: AllWorkshopArtifacts,
  journeyCanvasData?: { gridColumns?: unknown[]; stickyNotes?: unknown[] }
): string {
  return `You are a UX strategist and product architect. Your task is to map validated product concepts onto a user journey to create an interactive UX roadmap.

<workshop_data>
STEP 1 - CHALLENGE:
${JSON.stringify(artifacts.challenge, null, 2)}

STEP 5 - PERSONA:
${JSON.stringify(artifacts.persona, null, 2)}

STEP 6 - JOURNEY MAPPING (extracted artifact):
${JSON.stringify(artifacts.journeyMapping, null, 2)}

STEP 6 - JOURNEY CANVAS (raw stage columns and sticky notes):
${JSON.stringify(journeyCanvasData, null, 2)}

STEP 9 - CONCEPTS:
${JSON.stringify(artifacts.concept, null, 2)}
</workshop_data>

TASK:
Analyze the workshop data and produce a structured JSON mapping of concepts to journey stages.

INSTRUCTIONS:

0. CLASSIFY STRATEGIC INTENT: Determine the project type from this list:
   - "marketing-site": The challenge is about product discovery, sales, marketing, lead generation, launching a product to market, or helping users discover/adopt an existing product. Use marketing funnel stages (Awareness → Consideration → Decision → Purchase). Nodes represent SITE SECTIONS focused on PERSUASION GOALS.
   - "admin-portal": The challenge involves managing resources, users, content, inventory, or back-office operations. Use admin workflow stages (Auth → Overview → Manage → Configure → Audit). Nodes represent admin views and CRUD interfaces.
   - "dashboard": The challenge is about analytics, monitoring, reporting, or data visualization. Use data stages (Data Load → KPI Overview → Drill-Down → Action). Nodes represent widgets, charts, and metric views.
   - "tool": The challenge is a single-purpose utility (calculator, converter, generator, validator). Use tool stages (Input → Processing → Result → Export). Nodes represent the tool's UI panels.
   - "web-app": General web application, platform, or SaaS product. Use the journey stages from Step 6 data. Nodes represent app features and screens.

   Set "strategicIntent" in your output accordingly.

1. EXTRACT JOURNEY STAGES: Based on the classified intent:
   - For "web-app": Extract stages from Step 6 data (journey mapping artifact + canvas grid columns)
   - For other intents: Use the default stages listed above for that intent type, enriched with Step 6 data where relevant
   Each stage needs: unique id (kebab-case), name, description, emotion ("positive"|"neutral"|"negative"), isDip (boolean), barriers[], opportunities[].

2. ANALYZE CONCEPT RELATIONSHIP: If multiple concepts exist, determine:
   - "combined": concepts merge into a single cohesive product
   - "separate-sections": concepts become different sections/modules within one app
   - "alternative": concepts are alternative approaches (pick best features from each)

3. MAP CONCEPTS TO CORE NODES — CRITICAL RULES:

   ★ Each concept card from Step 9 becomes EXACTLY 1 core node. Do NOT invent features that aren't on the concept cards. ★

   IMPORTANT: In the Step 9 data, concept cards are typically stored in _canvas.conceptCards[]. Each card's name is in the "conceptName" field (NOT "name" or "title"). Use the "conceptName" value as the node's featureName.

   For each concept:
   - "featureName" = the concept card's "conceptName" value (e.g., "Message to Metaphor Digger")
   - "featureDescription" = the concept card's "elevatorPitch" or description
   - "conceptName" = same as featureName for core nodes
   - "nodeCategory" = "core"
   - "priority" = "must-have"
   - Map each concept to whichever journey stage from Step 6 best fits its purpose

   FOR "marketing-site" — CONCEPT-DRIVEN SECTION MAPPING:
   Each concept's data maps to specific site sections. Use concept-specific names, NOT generic ones:
   a) ELEVATOR PITCH → Hero headline + subheadline (primary concept dominates Hero)
   b) USP → "How [Concept Name] Works" 3-step breakdown
   c) SWOT STRENGTHS → Benefit cards (rewrite to marketing language)
   d) SWOT OPPORTUNITIES → Social proof themes
   e) SWOT THREATS → FAQ questions
   f) Multiple concepts each contribute sections to the CONSIDERATION stage

   FOR other intents (web-app, admin-portal, dashboard, tool):
   - Each concept = 1 core screen representing that concept's primary functionality
   - Do NOT decompose concepts into sub-features

4. ADD DASHBOARD / HOME ENTRY NODE:
   - If 2 or more concepts exist, add 1 "Dashboard" or "Home" node as the app entry point
   - This node links to all concept screens and serves as the navigation hub
   - "nodeCategory" = "core", "priority" = "must-have"
   - Place it in the earliest journey stage

5. For each feature/section determine:
   - Which journey stage it best addresses (grounded in that stage's barriers/opportunities)
   - A uiType: "dashboard" | "landing-page" | "form" | "table" | "detail-view" | "wizard" | "modal" | "settings"
   - A uiPatternSuggestion: specific UI pattern description
   - Which pain point it addresses from the journey barriers
   - Priority: "must-have" (core concepts), "should-have" (important peripherals), "nice-to-have" (optional)

6. CREATE FLOW EDGES — HAPPY PATH ONLY:
   - Primary flows: the main user path through stages (Dashboard → concept screens)
   - Secondary flows: alternative navigation paths between concept screens
   - Do NOT create error flow edges

7. GENERATE NAVIGATION GROUPS: Define logical navigation groups for the app type.
   Each group represents a section of the app's navigation (e.g., main app, auth, settings, support).
   Every feature MUST belong to a group via groupId.
   Groups should include at minimum: a "main" group for core features, plus groups for peripheral services.

8. ADD PERIPHERAL SERVICES (optional nice-to-have screens):
   Based on the strategic intent, optionally add supporting screens:
   - Auth (Login/Sign Up) — "should-have"
   - Onboarding Flow — "nice-to-have"
   - Profile & Settings — "nice-to-have"
   - Help & Support — "nice-to-have"
   - Do NOT add error pages, error states, or error handling screens
   - Do NOT add irrelevant peripheral services (e.g., no checkout for a dashboard, no billing for a free tool)

   Mark peripheral services with "nodeCategory": "peripheral". Core concept features use "nodeCategory": "core".

OUTPUT FORMAT - Return ONLY valid JSON matching this exact schema:
{
  "strategicIntent": "marketing-site" | "admin-portal" | "dashboard" | "tool" | "web-app",
  "conceptRelationship": "combined" | "separate-sections" | "alternative",
  "stages": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "emotion": "positive" | "neutral" | "negative",
      "isDip": boolean,
      "barriers": ["string"],
      "opportunities": ["string"]
    }
  ],
  "groups": [
    {
      "id": "string (kebab-case)",
      "label": "string",
      "description": "string"
    }
  ],
  "features": [
    {
      "conceptIndex": 0,
      "conceptName": "string",
      "featureName": "string",
      "featureDescription": "string",
      "stageId": "string (must match a stage id)",
      "uiType": "dashboard" | "landing-page" | "form" | "table" | "detail-view" | "wizard" | "modal" | "settings" | "auth" | "onboarding" | "search",
      "uiPatternSuggestion": "string",
      "addressesPain": "string",
      "priority": "must-have" | "should-have" | "nice-to-have",
      "nodeCategory": "core" | "peripheral",
      "groupId": "string (must match a group id)"
    }
  ],
  "edges": [
    {
      "sourceFeatureIndex": 0,
      "targetFeatureIndex": 1,
      "flowType": "primary" | "secondary"
    }
  ]
}

CRITICAL RULES:
- Return ONLY the JSON object. No preamble, no explanation, no markdown fences.
- Every feature's stageId MUST match one of the stage ids.
- Every feature's groupId MUST match one of the group ids.
- Feature indices in edges refer to the position in the features array (0-based).
- Each concept card = EXACTLY 1 core node. Do NOT invent features that aren't on the concept cards.
- Add 1 Dashboard/Home entry node when there are 2+ concepts.
- Peripheral screens (Auth, Onboarding, Settings, Help) are optional nice-to-have nodes.
- No error pages — focus on happy path only.
- No error flow edges — only "primary" and "secondary" flowTypes.
- Prioritize concept nodes as "must-have". Peripherals are "should-have" or "nice-to-have".
- If Step 6 data is missing or minimal, use the default stages for the detected intent type.
- Always include at least one "primary" flow edge connecting the main user path.
- For "marketing-site": Use marketing funnel stages (Awareness, Consideration, Decision, Purchase). Nodes MUST be concept-specific site sections — use actual concept names in section titles. Use uiType "landing-page". Focus on persuasion goals.
- For "admin-portal": Use admin workflow stages. Focus on CRUD operations and data management.
- For "dashboard": Use analytics stages. Focus on KPIs, charts, drill-down, and actionable insights.
- For "tool": Use tool stages. Focus on clear input → process → result → export flow.
- For "web-app": Use Step 6 journey stages. Map concept screens to appropriate stages.`;
}
