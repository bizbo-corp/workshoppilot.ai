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
    label: 'Stakeholder rings',
    aiGuidance:
      'Three concentric rings. "core" are the people who live the problem daily; "direct" influence or are affected by it; "indirect" are context (regulators, suppliers, the wider market). One person or group per item, two to five words.',
    zones: [
      { id: 'core', label: 'Core', hint: 'Lives the problem' },
      { id: 'direct', label: 'Direct', hint: 'Shapes or feels the outcome' },
      { id: 'indirect', label: 'Indirect', hint: 'Context and constraints' },
    ],
    maxPerZone: 8,
  },
  empathy_map: {
    id: 'empathy_map',
    label: 'Empathy map',
    aiGuidance:
      'Six zones. says, thinks, feels, does hold short evidence from research, ideally quotes with who said them. pains and gains are the synthesis: what hurts and what they want. Keep items under 15 words.',
    zones: [
      { id: 'says', label: 'Says' },
      { id: 'thinks', label: 'Thinks' },
      { id: 'feels', label: 'Feels' },
      { id: 'does', label: 'Does' },
      { id: 'pains', label: 'Pains' },
      { id: 'gains', label: 'Gains' },
    ],
    maxPerZone: 8,
  },
  journey_strip: {
    id: 'journey_strip',
    label: 'Journey strip',
    aiGuidance:
      'Five moments in order, zones m1 to m5. Each item is one moment: what the person is doing, how they feel, and the pain, in one line. Mark the worst moment in meta.dip = true. The lens may rename the moments (before and after for a process, moments of use for a physical product).',
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
    label: 'Idea board',
    aiGuidance:
      'Eight slots, s1 to s8, for quick ideas. The user sketches or types; you may seed up to three starter ideas if they are stuck. Shortlisted ideas get meta.shortlisted = true.',
    zones: Array.from({ length: 8 }, (_, i) => ({ id: `s${i + 1}`, label: `Idea ${i + 1}` })),
    maxPerZone: 1,
  },
  concept_card: {
    id: 'concept_card',
    label: 'Concept card',
    aiGuidance:
      'One concept. Zones: name, pitch (one sentence), for_whom, how_it_works, strengths, risks. One item per zone except strengths and risks, which take up to three.',
    zones: [
      { id: 'name', label: 'Name' },
      { id: 'pitch', label: 'Pitch' },
      { id: 'for_whom', label: 'For whom' },
      { id: 'how_it_works', label: 'How it works' },
      { id: 'strengths', label: 'Strengths' },
      { id: 'risks', label: 'Risks' },
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
