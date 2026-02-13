/**
 * Step 6: Journey Mapping — Map the current user experience and identify the critical dip.
 */
export const journeyMappingStep = {
  contentStructure: `STEP GOAL: Map the current user experience across 4-8 stages with 7 layers per stage, and identify the critical dip.

DESIGN THINKING PRINCIPLES:
Journey maps have 4-8 stages representing the CURRENT state (not ideal future). Let's walk in their shoes and find where it breaks down.

Each stage has 7 LAYERS: Action, Goals, Barriers, Touchpoints, Emotions, Moments of Truth, Opportunities.

The "dip" is the stage with the most acute pain — that's where the opportunity lives.

Emotions use traffic light system: positive (green/good), neutral (orange/ok), negative (red/pain). Emotions should vary across stages and MUST reflect the barriers in each stage. If barriers are severe, emotion is negative.

GATHERING REQUIREMENTS:
What are the stages from awareness to current resolution? (AI suggests, user confirms)

At each stage: What does the user do, want to achieve, encounter as barriers, interact with, and feel? (AI populates from research)

Where does the experience break down most severely (the dip)? (AI identifies with rationale, user confirms)

What opportunities exist at each stage? (AI infers from gains)

BOUNDARY: This step is about mapping the current experience, not designing the future solution. Don't suggest features or improvements yet — that's Steps 8-9. Opportunities layer identifies WHERE to intervene, not HOW. If ideation starts, redirect: "Let's finish mapping the current journey first. Once we identify the dip, we'll reframe the challenge in Step 7 before ideating solutions."

PRIOR CONTEXT USAGE:
Reference Persona (Step 5) behaviors and context heavily — use their pains to populate barriers, their goals to populate stage goals.
Reference Step 4 pains to identify barriers at each stage (which pains manifest where in the journey).
Reference Step 3 research for touchpoints (specific tools/processes mentioned) and moments of truth (decision points in interviews).
Reference Step 1 challenge to keep journey focused on the problem area (don't map unrelated parts of their life).`,

  interactionLogic: `STAGE CREATION (COLLABORATIVE — conversation only, no GRID_ITEM tags):
1. Suggest 4-8 journey stages based on persona and challenge context
   - Example for healthcare: "Symptom Awareness -> Scheduling Appointment -> Waiting Room -> Consultation -> Treatment -> Follow-up"
   - Example for e-commerce: "Product Discovery -> Comparison -> Cart -> Checkout -> Delivery -> Post-Purchase"

2. Present suggested stages to user: "Based on [persona name]'s context, I suggest these journey stages: [list]. Does this capture their experience, or should we adjust?"

3. User confirms or modifies stage structure (add/remove/rename stages)

4. Do NOT use [GRID_ITEM] tags during stage creation — columns are structural, not post-its. The canvas columns will be set up separately.

7-LAYER POPULATION (ROW-BY-ROW — use [GRID_ITEM] tags):
After stages are confirmed, populate ONE ROW at a time using [GRID_ITEM] tags.
Items appear instantly on the canvas as you generate them.

ROW-BY-ROW FLOW:
1. Start with the **Actions** row: generate one [GRID_ITEM] per confirmed stage/column
2. After presenting the row, ask: "How does the **Actions** row look? Say 'next' for the next layer, or tell me what to change."
3. When user says next (or approves), move to **Goals** row
4. Continue through all 7 rows: Actions -> Goals -> Barriers -> Touchpoints -> Emotions -> Moments of Truth -> Opportunities

For each row, generate items for ALL columns in a single message. One item per column per row is typical (4-8 items depending on stage count).

ROW CONTENT GUIDANCE:
1. **Actions**: What the persona does in this stage (observable behavior)
   - From: Step 5 persona behaviors + Step 3 research findings

2. **Goals**: What they're trying to achieve in this stage (desired outcome)
   - From: Step 5 persona goals + Step 4 gains relevant to this stage

3. **Barriers**: Obstacles, pain points, or friction they encounter
   - From: Step 4 pains + Step 5 persona frustrations

4. **Touchpoints**: Tools, systems, people, or interfaces they interact with
   - From: Step 3 research mentions of specific tools/processes

5. **Emotions** (TRAFFIC LIGHT): How they feel — MUST reflect barriers
   - positive (green): Stage goes smoothly, goals achieved, minimal friction
   - neutral (orange): Some friction but manageable, mixed feelings
   - negative (red): High friction, barriers blocking goals, frustration/pain
   - Emotion MUST match barrier severity — if barriers are severe, emotion is negative

6. **Moments of Truth** (OPTIONAL): Critical moments where they form strong opinions or make key decisions

7. **Opportunities** (OPTIONAL): Potential improvements or interventions

DIP IDENTIFICATION (AI SUGGESTS, USER CONFIRMS):
1. AI identifies the stage with the most severe barriers and negative emotion as the dip

2. Provide RATIONALE: "I've identified [stage name] as the critical dip because [specific barriers from that stage], which creates [negative emotion]. This is where [persona name] experiences the most acute breakdown."

3. Ask user to confirm or select different stage: "Does this feel like the most critical pain point, or is there another stage that's worse?"

4. User confirms or picks different dip stage

5. Capture dipRationale in the artifact explaining why this stage is the dip

CONTEXT REFERENCING:
Use GENERIC references, not persona name, when describing journey stages:
- GOOD: "The user searches multiple websites" / "They feel frustrated by confusing terminology"
- BAD: "Sarah searches multiple websites" / "Sarah feels frustrated by confusing terminology"

This keeps the journey map reusable and professional. Persona name appears ONLY in the personaName field at the top of the artifact.`,
};
