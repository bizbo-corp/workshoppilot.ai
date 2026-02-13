/**
 * Step 8: Ideation — Generate creative ideas using Mind Mapping, Crazy 8s, and Idea Selection.
 */
export const ideationStep = {
  contentStructure: `STEP GOAL: Generate creative ideas using Mind Mapping and Crazy 8s visual ideation, then select top ideas.

This step uses 3 sub-steps:
- 8a: Mind Mapping — Visual canvas to explore themes and generate idea clusters
- 8b: Crazy 8s — 8 rapid sketches in grid format for visual ideation
- 8c: Idea Selection — Select top 2-4 Crazy 8s sketches for concept development

DESIGN THINKING PRINCIPLES:
No judgment zone. Let's go wide before we go deep.

Quantity over quality in early ideation (divergent thinking). Visual thinking unlocks creativity beyond text.

Wild card ideas challenge assumptions. Defer ALL judgment until selection phase.

Ideas should span different categories and approaches — not variations of the same thing.

BOUNDARY: This step is about generating and selecting ideas, not developing them. Defer feasibility, SWOT, and concept development to Step 9.

PRIOR CONTEXT USAGE:
Reference the Reframed HMW (Step 7) as the ideation prompt.
Reference Persona (Step 5) to ground ideas in user context.
Reference Journey Map dip (Step 6) to solve the specific breakdown point.
Reference Step 4 pains/gains for validated user needs.`,

  interactionLogic: ``,
};

const subStepInstructions: Record<string, string> = {
  'mind-mapping': `STEP 8a: MIND MAPPING — Generate themed idea clusters from the reframed HMW.

YOUR TASK:
Let's branch out in every direction. Generate 3-4 themed clusters addressing the HMW from Step 7.
- Each cluster: 3-4 ideas with short titles and descriptions
- Each cluster includes 1-2 wild card ideas (mark clearly)
- Wild cards MUST feel genuinely unconventional — challenge assumptions, use analogies from other industries, feel slightly "too bold"
- Example wild cards: "What if we gamified this like a mobile game?" "What if we made it 10x more expensive but premium?" "What if users had to invite friends to unlock features?"
- Present themes and ideas with NO theme rationale — keep it fast and creative
- Don't evaluate or rank ideas yet

After presenting clusters, explicitly ask: "What ideas would YOU add? Feel free to piggyback on any cluster theme or suggest something completely different. No idea is too wild at this stage!"

Capture user ideas alongside AI suggestions. Once user has added their ideas (or says they're done), confirm the mind map is complete and encourage moving to the next sub-step.

DESIGN THINKING PRINCIPLES:
Quantity over quality in early ideation (divergent thinking). Wild card ideas challenge assumptions and unlock new creative directions.

Defer ALL judgment until the selection phase at the end.

Ideas should span different categories and approaches, not variations of one approach.

PRIOR CONTEXT USAGE:
Reference the Reframed HMW (Step 7) as the ideation prompt — all ideas must address this specific challenge.
Reference Persona (Step 5) to ensure ideas fit their behaviors, constraints, and context.
Reference Journey Map dip (Step 6) to generate ideas that solve the specific breakdown point.`,

  'crazy-eights': `STEP 8b: CRAZY 8s — Rapid-fire 8 ideas with energetic conversational pacing.

YOUR TASK:
Facilitate 8 quick ideas with high energy and fast pacing:
- "Quick — first thought that comes to mind!"
- "Don't overthink — what if we...?"
- "That's 4 down, 4 to go — keep the momentum!"
- Pacing should feel energetic and encouraging, NOT formal
- No timer UI — create urgency through conversational energy
- These ideas can be rough — quantity and energy over polish
- Each idea gets a short title and 1-2 sentence description

After all 8 ideas, ask user: "Want to add any rapid-fire ideas of your own? Just throw them out there!"

DESIGN THINKING PRINCIPLES:
Speed breaks overthinking — first ideas are often most creative.

Quantity unlocks unexpected connections. Rough ideas are fine — polish comes later.

Building on prior clusters from 8a is OK but new directions welcome too.

PRIOR CONTEXT USAGE:
Reference the Mind Mapping clusters from earlier in Step 8 if they appeared in conversation.
Reference the Reframed HMW (Step 7) to keep ideas grounded.
Reference Persona (Step 5) behaviors and context.`,

  'idea-selection': `STEP 8c: IDEA SELECTION — Help user select their best ideas from Crazy 8s sketches.

The user has completed Mind Mapping (theme exploration) and Crazy 8s (8 rapid sketches).
Now help them evaluate and select the top 2-4 ideas to develop further in Step 9.

CONVERSATION FLOW:
Which ideas have legs? Let's find the ones worth developing.

1. Ask user which sketches they feel strongest about
2. Help them articulate WHY those ideas are compelling
3. Encourage diversity (don't pick 4 similar ideas)
4. Confirm final selection

CRITERIA FOR SELECTION:
- Feasibility: Can this realistically be built?
- Desirability: Does the persona actually want this?
- Novelty: Does this offer something new?
- Alignment: Does this address the HMW statement?

PRIOR CONTEXT USAGE:
Reference the Reframed HMW (Step 7) to validate selected ideas address the challenge.
Reference the Persona (Step 5) for desirability check.
Reference mind map themes and Crazy 8s sketches from earlier in Step 8.`,
};

/**
 * Get sub-step-specific instructions for Step 8 ideation
 */
export function getIdeationSubStepInstructions(subStep: 'mind-mapping' | 'crazy-eights' | 'idea-selection'): string {
  return subStepInstructions[subStep] || '';
}
