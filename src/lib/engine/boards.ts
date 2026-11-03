import type { BoardId } from './types';

export interface ZoneDef {
  id: string;
  label: string;
  hint?: string;
}

export interface BoardDef {
  id: BoardId;
  label: string;
  /** What the AI should know when it adds items here. */
  aiGuidance: string;
  zones: ZoneDef[];
  /** Soft cap per zone so the AI does not flood a board. */
  maxPerZone: number;
}

export const BOARDS: Record<BoardId, BoardDef> = {
  stakeholder_rings: {
    id: 'stakeholder_rings',
    label: 'Stakeholder map',
    aiGuidance:
      'Three rings. "core" are the people who live the problem daily and the key decision makers; "direct" influence or are affected by it; "indirect" are context (regulators, suppliers, the wider market). One person or group per item, two to five words. A broad label ("Customers") gets cracked into three or four specific sub-groups; put the sub-groups on the ring and set meta.group to the broad label so they sit together.',
    zones: [
      { id: 'core', label: 'Core', hint: 'Lives the problem, or decides' },
      { id: 'direct', label: 'Direct', hint: 'Shapes or feels the outcome' },
      { id: 'indirect', label: 'Indirect', hint: 'Context and constraints' },
    ],
    maxPerZone: 10,
  },
  interviewees: {
    id: 'interviewees',
    label: 'Interviewees',
    aiGuidance:
      'People to interview, each drawn from a specific stakeholder on the map. Text is "Name, The Role" (for example "Priya, The Locum Vet"); meta.tension holds one line on their angle; meta.kind is "synthetic" (you play them) or "real" (the user talks to them). Zone is always "list".',
    zones: [{ id: 'list', label: 'Interviewees' }],
    maxPerZone: 6,
  },
  insights: {
    id: 'insights',
    label: 'Research notes',
    aiGuidance:
      'Raw research, one note per insight, headline length. Zone "real" for what real people said (meta.source = who); zone "synthetic" for lines from a practice interview (meta.source = the interviewee name). Synthetic notes are hypotheses, never evidence, and the UI labels them so.',
    zones: [
      { id: 'real', label: 'From real people' },
      { id: 'synthetic', label: 'From practice interviews' },
    ],
    maxPerZone: 24,
  },
  empathy_map: {
    id: 'empathy_map',
    label: 'Empathy map',
    aiGuidance:
      'Six zones. says, thinks, feels, does hold evidence from the research notes, with meta.source = who said it; a synthesised pattern across people has no source. pains and gains are the synthesis: what hurts and what they want. Keep items under 15 words.',
    zones: [
      { id: 'says', label: 'Says' },
      { id: 'thinks', label: 'Thinks' },
      { id: 'feels', label: 'Feels' },
      { id: 'does', label: 'Does' },
      { id: 'pains', label: 'Pains' },
      { id: 'gains', label: 'Gains' },
    ],
    maxPerZone: 10,
  },
  persona_card: {
    id: 'persona_card',
    label: 'Persona',
    aiGuidance:
      'One person who stands for the core stakeholder. One item per zone: name (first name only), role (age and role in one line), situation (two sentences on their world), goals (up to three items), pains (up to three, each traced to a research note), behaviours (what they actually do and use today, up to three), quote (one first-person line, 8 to 20 words, in their voice).',
    zones: [
      { id: 'name', label: 'Name' },
      { id: 'role', label: 'Age and role' },
      { id: 'situation', label: 'Their situation' },
      { id: 'goals', label: 'Goals' },
      { id: 'pains', label: 'Pains' },
      { id: 'behaviours', label: 'What they do today' },
      { id: 'quote', label: 'In their words' },
    ],
    maxPerZone: 3,
  },
  journey_strip: {
    id: 'journey_strip',
    label: 'Journey',
    aiGuidance:
      'Five moments in order, zones m1 to m5, named by the lens. Each item is one moment: what the persona is doing, how they feel, and the pain, in one line. Mark the worst moment meta.dip = true. Map the journey as it is today, not the future.',
    zones: [
      { id: 'm1', label: 'Moment 1' },
      { id: 'm2', label: 'Moment 2' },
      { id: 'm3', label: 'Moment 3' },
      { id: 'm4', label: 'Moment 4' },
      { id: 'm5', label: 'Moment 5' },
    ],
    maxPerZone: 1,
  },
  idea_board: {
    id: 'idea_board',
    label: 'Crazy 8s',
    aiGuidance:
      'Eight slots, s1 to s8, for quick ideas. The user sketches or types; you may seed up to three starter ideas if they are stuck, each with a short title and one line. Shortlisted ideas get meta.shortlisted = true.',
    zones: Array.from({ length: 8 }, (_, i) => ({ id: `s${i + 1}`, label: `Idea ${i + 1}` })),
    maxPerZone: 1,
  },
  concept_card: {
    id: 'concept_card',
    label: 'Concept sheet',
    aiGuidance:
      'One concept, one item per zone unless noted. name; pitch (two or three sentences a stranger would understand); usp (what makes it different from doing nothing or the current workaround); how_it_works (three or four lines); strengths and weaknesses (up to three each, cited to the research); feasibility (three items, one each: "Technical 4/5: why", "Business 3/5: why", "Desirability 5/5: why", honest, not all fours and fives).',
    zones: [
      { id: 'name', label: 'Name' },
      { id: 'pitch', label: 'Elevator pitch' },
      { id: 'usp', label: 'What makes it different' },
      { id: 'how_it_works', label: 'How it works' },
      { id: 'strengths', label: 'Strengths' },
      { id: 'weaknesses', label: 'Weaknesses' },
      { id: 'feasibility', label: 'Feasibility' },
    ],
    maxPerZone: 3,
  },
  test_card: {
    id: 'test_card',
    label: 'Test card',
    aiGuidance:
      'The committed test. Zones: assumption (falsifiable, about need or behaviour, not features), method (the cheapest test), metric, target (pass bar), kill (threshold below which the idea is parked), by_when.',
    zones: [
      { id: 'assumption', label: 'Riskiest assumption' },
      { id: 'method', label: 'Test' },
      { id: 'metric', label: 'Metric' },
      { id: 'target', label: 'Target' },
      { id: 'kill', label: 'Kill threshold' },
      { id: 'by_when', label: 'By when' },
    ],
    maxPerZone: 1,
  },
};

export function isZone(board: BoardId, zone: string): boolean {
  return BOARDS[board].zones.some((z) => z.id === zone);
}
