import type { BoardId, StageId, WorkshopState } from './types';

/** True when the facilitator has not spoken since the current stage began. */
export function needsGreeting(state: WorkshopState): boolean {
  return state.lastAiStage !== state.stage;
}

export interface FieldDef {
  id: string;
  label: string;
  /** What good looks like; the AI reads this. */
  description: string;
  required: boolean;
  /** System fields: never shown to the user or described to the AI. */
  hidden?: boolean;
}

export interface StageDef {
  id: StageId;
  label: string;
  /** One line shown to the user. */
  tagline: string;
  goal: string;
  fields: FieldDef[];
  boards: BoardId[];
  /** Facilitation guidance, ported from the 1.0 step prompts and trimmed. */
  guidance: string;
  /** Rough number of exchanges before the AI should be synthesising. */
  targetTurns: number;
}

/**
 * Setup plus the Double Diamond. Each stage is done when its required
 * fields are set; the AI decides when to call complete_stage, the engine
 * refuses until the fields are there.
 */
export const STAGES: Record<StageId, StageDef> = {
  setup: {
    id: 'setup',
    label: 'Setup',
    tagline: 'Turn the idea into a challenge worth solving',
    goal: 'Sharpen the idea into one challenge statement under 25 words, and confirm what kind of thing it is.',
    fields: [
      { id: 'challenge', label: 'Challenge statement', description: 'One sentence under 25 words, framed as a user-centred question ("How might we…", "How do we help…"). Names the people and the change, never a method.', required: true },
      { id: 'audience', label: 'Who it is for', description: 'The people who feel this most acutely, in a phrase. "Everyone" only if the user has said breadth is deliberate.', required: true },
      { id: 'why_now', label: 'Why it matters', description: 'What is at stake for those people, one line.', required: false },
    ],
    boards: [],
    guidance: `Watch for solutions disguised as problems. "I want an app that…" has jumped ahead; ask what prompted it, what frustration or gap they saw. But a concept or approach rooted in experience is worth exploring on its own terms, so only pull back from specific implementations.

Do not default to framing the idea as a digital product. Listen to the words: "attract customers" is communication, "streamline" is process, a thing people hold is physical. Call set_idea_type early with your best guess and a confidence; the user can correct it.

Find who feels the problem most. Push past "everyone" once; if they say breadth is deliberate, accept it and move on.

A broad problem ("education is broken") needs zooming in: who, which part. A vague feeling needs a story. A specific pain point is great material: explore the who and the why.

When the picture forms, draft the challenge. Short, aspirational, a user-centred question. Kill any clause that names a method ("by…", "through…", "using…"). Keep it about the human change, not a business metric. Good: "How might we let freight carriers and operations teams trust every hand-off, so nothing slips through the cracks?" Bad: "Enable seamless visibility by replacing manual processes with timely updates."

Set the fields with set_field as soon as you have a draft, then ask what they would change. Complete the stage once they accept.`,
    targetTurns: 5,
  },
  discover: {
    id: 'discover',
    label: 'Discover',
    tagline: 'Who is involved, and what do they actually say',
    goal: 'Map the people around the challenge and gather real evidence of the problem through interviews, synthetic or real.',
    fields: [
      { id: 'key_insight', label: 'Key insight', description: 'The sharpest thing learned so far, in a sentence. With no research yet, the user\'s strongest belief, written as a belief: "The user believes X; untested."', required: true },
      { id: 'evidence_summary', label: 'Evidence so far', description: 'Two or three lines: who was spoken to, what they said, what was observed, and what is still only belief. "No research yet" is a valid, honest answer.', required: true },
    ],
    boards: ['stakeholder_rings', 'empathy_map'],
    guidance: `Start with the stakeholder rings. Ask who lives the problem daily and put them in core; then who shapes or feels the outcome (direct); then context (indirect). Add items yourself from what the user says, then ask what is missing. Three to eight people or groups is plenty.

Then research. Offer two routes: real conversations the user has had or will have, and a synthetic interview where you play a core stakeholder so they can practise questions and surface likely answers. Run a synthetic interview only when the user asks for one, keep it to three or four exchanges, start each synthetic line with "Synthetic:", and never put a synthetic answer on the empathy map as if someone said it. Synthetic answers are hypotheses, never evidence.

Capture what you hear on the empathy map as you go: quotes into says, inferred beliefs into thinks, emotions into feels, behaviours into does. Mark who said each thing. Keep it to the sharpest items, not everything.

Before completing, write the key insight and the evidence summary honestly. If everything so far is the user's own belief, the evidence summary says so and the key insight is the belief, labelled as one. A user with no research who wants to move on is allowed to: record the honest state, note what they plan to gather, and complete the stage. Thin evidence is the Verdict's job to call out, not a reason to hold them here.`,
    targetTurns: 8,
  },
  define: {
    id: 'define',
    label: 'Define',
    tagline: 'Find the moment that hurts most',
    goal: 'Turn the research into pains and gains, one persona, a five-moment journey with the dip marked, and a sharp How Might We.',
    fields: [
      { id: 'persona', label: 'Persona', description: 'A short, research-grounded sketch of the one person this is for: name, situation, what they are trying to do, the pain in their words.', required: true },
      { id: 'dip', label: 'The dip', description: 'The single worst moment in the journey and why, one or two lines.', required: true },
      { id: 'hmw', label: 'Reframed How Might We', description: '"Given that [context], how might we help [persona] [immediate goal] so they can [deeper, aspirational goal]?" Rewritten from the research, sharper than the Setup challenge.', required: true },
    ],
    boards: ['empathy_map', 'journey_strip'],
    guidance: `First synthesise the empathy map into pains and gains: add pains and gains items that are grounded in what is already on the board. Then draft the persona from the core stakeholder and the research, and set the persona field.

Then the journey strip: five moments, in the order the persona lives them, using the lens's moment labels. For each, one line: what they are doing, how they feel, the pain. Mark the worst moment with meta.dip = true and set the dip field.

Finally the reframe. This is a fresh rewrite, not a tweak of the Setup challenge. The "given that" comes from the dip; the persona is named; the deeper goal is aspirational, what achieving the immediate goal unlocks for them. Show the evolution from the original challenge in one line, then set the hmw field and ask what they would change.

Do not suggest solutions yet. If ideas start, park them: "Hold that, Develop is next."`,
    targetTurns: 8,
  },
  develop: {
    id: 'develop',
    label: 'Develop',
    tagline: 'Many ideas, then one concept',
    goal: 'Generate a spread of ideas against the HMW, shortlist one to three, and build one concept card.',
    fields: [
      { id: 'concept_name', label: 'Concept name', description: 'Two to five words.', required: true },
      { id: 'concept_pitch', label: 'Concept pitch', description: 'One sentence: for [persona], [thing] that [does what] so that [deeper goal].', required: true },
    ],
    boards: ['idea_board', 'concept_card'],
    guidance: `Ideation first, judgement later. Invite the user to fill the eight idea slots quickly: a sketch photo or a few words each. If they stall after three, seed up to three starter ideas yourself, clearly marked as yours, that attack the dip from different angles (remove the step, automate it, change who does it, change when it happens).

Then shortlist: ask which one to three ideas they would bet on and why; mark them meta.shortlisted. Push gently on the safe choice: which idea would the persona actually notice?

Build the concept card for the chosen idea on the board, zone by zone, with the user. Strengths and risks must cite the research (the dip, a pain, a quote), not generic SWOT. Set the two fields and ask what they would change.`,
    targetTurns: 8,
  },
  deliver: {
    id: 'deliver',
    label: 'Deliver',
    tagline: 'Design the test that could kill it',
    goal: 'Name the riskiest assumption, design the cheapest test with a target and a kill threshold, and arm the Validation Score.',
    fields: [
      { id: 'assumption', label: 'Riskiest assumption', description: 'A falsifiable statement about the persona\'s need or behaviour. Not a feature statement.', required: true },
      { id: 'test_plan', label: 'Test plan', description: 'Method, metric, target, kill threshold and date, in two or three lines.', required: true },
      { id: 'result', label: 'Logged result', description: 'Set by the summary page when the user logs the test outcome.', required: false, hidden: true },
      { id: 'reminder_sent', label: 'Reminder sent', description: 'Set by the reminder cron.', required: false, hidden: true },
    ],
    boards: ['test_card'],
    guidance: `Surface the riskiest assumption: the belief that, if wrong, kills the concept. Anchor it on the core value the persona is meant to get, not pricing or distribution, unless the research says those are the risk. Offer two alternatives and let the user choose.

Design the test using the lens's cheap tests. Fill the test card: method, metric, a target that would convince a sceptic, and a kill threshold below which the idea is parked. Be concrete about the number and the date.

Be honest about the evidence so far. Credit only what the workshop produced; name beliefs as beliefs. If the evidence is thin, say the idea is not ready to build yet, and that the test is how to find out cheaply. End constructive: the next experiment is the win.

Set the fields, fill the card, then complete the stage. The user then gets the free summary and the option of the paid Verdict.`,
    targetTurns: 6,
  },
};

export const STAGE_ORDER: StageId[] = ['setup', 'discover', 'define', 'develop', 'deliver'];

export function nextStage(stage: StageId): StageId | null {
  const i = STAGE_ORDER.indexOf(stage);
  return i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1] : null;
}

export function fieldKey(stage: StageId, field: string): string {
  return `${stage}.${field}`;
}

/** Required fields of a stage that are still empty. */
export function missingFields(state: WorkshopState, stage: StageId = state.stage): FieldDef[] {
  return STAGES[stage].fields.filter((f) => f.required && !state.fields[fieldKey(stage, f.id)]?.trim());
}

export function isStageDone(state: WorkshopState, stage: StageId = state.stage): boolean {
  return missingFields(state, stage).length === 0;
}
