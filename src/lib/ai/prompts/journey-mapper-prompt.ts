import type { AllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';

/**
 * Build the Gemini prompt for mapping Step 9 concepts onto Step 6 journey stages.
 * Receives artifacts + raw canvas data for the actual journey template.
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
   - "separate-sections": concepts become different sections/modules
   - "alternative": concepts are alternative approaches (pick best features from each)

3. EXTRACT FEATURES/SECTIONS based on intent:

   FOR "marketing-site" — CONCEPT-DRIVEN SECTION MAPPING (CRITICAL):
   Each concept's data maps to specific site sections. You MUST use concept-specific names, NOT generic ones:

   a) ELEVATOR PITCH → Hero headline + subheadline
      - Primary concept (index 0) dominates the Hero section
      - Use the actual elevator pitch text as the basis for headline copy
      - Example: "Three Steps to Creativity" → Hero: "Unlock Your Creative Potential in Three Steps"

   b) USP → "How [Concept Name] Works" 3-step breakdown
      - Each concept with a USP gets its own "How It Works" section
      - Break the USP into 3 digestible steps with icons
      - Example: "Conversion Catalyst" → "How Conversion Catalyst Works" section

   c) SWOT STRENGTHS → Benefit cards (rewrite to marketing language)
      - Each concept's strengths become "Why [Concept Name]" benefit grids
      - Rewrite technical strengths into user-facing benefits
      - Example: strengths ["Fast processing", "Scalable"] → "Lightning Fast Results", "Grows With You"

   d) SWOT OPPORTUNITIES → Social proof themes
      - Opportunities suggest what testimonials/proof should emphasize
      - Create social proof sections themed around opportunity areas

   e) SWOT THREATS → FAQ questions
      - Each threat becomes an objection-handling FAQ question
      - Reframe threats as questions visitors might ask, then answer reassuringly

   f) Multiple concepts each contribute sections to the CONSIDERATION stage
      - Primary concept also owns the Hero (Awareness) and Final CTA (Purchase)

   FOR "admin-portal":
   - Extract CRUD operations from concept features
   - Map to admin workflow: data tables, forms, detail views, settings panels
   - Use uiTypes: "table", "form", "detail-view", "settings", "modal"

   FOR "dashboard":
   - Extract metrics and KPIs from concept data
   - Map to analytics workflow: metric cards, charts, filters, drill-downs
   - Use uiTypes: "dashboard", "detail-view", "table", "modal"

   FOR "tool":
   - Extract input/output flows from concept features
   - Map to tool workflow: input forms, processing views, result displays, export options
   - Use uiTypes: "form", "detail-view", "wizard", "modal"

   FOR "web-app":
   - Extract features from USP, elevator pitch, and SWOT strengths
   - Map to journey stages from Step 6 data
   - Use any appropriate uiType based on the feature's nature

4. For each feature/section determine:
   - Which journey stage it best addresses (grounded in that stage's barriers/opportunities)
   - A uiType: "dashboard" | "landing-page" | "form" | "table" | "detail-view" | "wizard" | "modal" | "settings"
   - A uiPatternSuggestion: specific UI pattern description
   - Which pain point it addresses from the journey barriers
   - Priority: "must-have" (core value / dip points), "should-have" (important), "nice-to-have"

5. CREATE FLOW EDGES: Define navigation connections between features:
   - Primary flows (main user path through stages)
   - Secondary flows (alternative paths)
   - Error flows (recovery/support paths, especially at dip points)

6. GENERATE NAVIGATION GROUPS: Define logical navigation groups for the app type.
   Each group represents a section of the app's navigation (e.g., main app, auth, settings, support).
   Every feature MUST belong to a group via groupId.
   Groups should include at minimum: a "main" group for core features, plus groups for peripheral services.

7. ADD PERIPHERAL SERVICES: Based on the strategic intent, add supporting screens that every real app needs:
   - For web-app: Auth (login/signup), Onboarding, Profile/Settings, Help, Error pages. Conditionally: Search (if >10 features), Billing (if SaaS), Notifications (if collaborative).
   - For admin-portal: Auth (SSO), User Management, Audit Log, Settings, Error pages. Conditionally: Import/Export, Notifications.
   - For dashboard: Auth, Profile/Preferences, Export Center, Error states. Conditionally: Notifications.
   - For tool: Error handling, Help/FAQ. Conditionally: Auth (if save/share), Settings (if configurable).
   - For marketing-site: Header Nav, Footer, 404, Privacy. Conditionally: Contact Form, Newsletter, Checkout.

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
      "uiType": "dashboard" | "landing-page" | "form" | "table" | "detail-view" | "wizard" | "modal" | "settings" | "auth" | "onboarding" | "search" | "error",
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
      "label": "optional string",
      "flowType": "primary" | "secondary" | "error"
    }
  ]
}

CRITICAL RULES:
- Return ONLY the JSON object. No preamble, no explanation, no markdown fences.
- Every feature's stageId MUST match one of the stage ids.
- Every feature's groupId MUST match one of the group ids.
- Feature indices in edges refer to the position in the features array (0-based).
- Extract 3-5 features per concept. More for complex concepts, fewer for simple ones.
- Prioritize features that address journey dip points as "must-have".
- If Step 6 data is missing or minimal, use the default stages for the detected intent type.
- Always include at least one "primary" flow edge connecting the main user path.
- Every app-type intent (web-app, admin-portal, dashboard) MUST include auth, onboarding, profile/settings, and error pages as peripheral services.
- Do NOT add irrelevant peripheral services (e.g., no checkout for a dashboard, no billing for a free tool).
- For "marketing-site": Use marketing funnel stages (Awareness, Consideration, Decision, Purchase). Nodes MUST be concept-specific site sections — use actual concept names in section titles (e.g., "How Conversion Catalyst Works", NOT "How It Works"). Use uiType "landing-page". Focus on persuasion goals. Do NOT suggest database schemas, auth flows, or backend logic. Map elevator pitch to Hero, USP to How It Works, SWOT strengths to benefit cards, SWOT threats to FAQ.
- For "admin-portal": Use admin workflow stages. Focus on CRUD operations, data management, and role-based access. Include bulk actions and audit trails.
- For "dashboard": Use analytics stages. Focus on KPIs, charts, drill-down, and actionable insights. Include date range selectors and export.
- For "tool": Use tool stages. Focus on clear input → process → result → export flow. Include progress feedback and error states.
- For "web-app": Use Step 6 journey stages. Map functional features to appropriate stages.`;
}
