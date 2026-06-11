/**
 * Journey Flow Heuristic Generator
 *
 * Pure functions — NO database imports, NO React.
 * Adapts heuristic-mapper.ts / intent-detection.ts logic to emit
 * lean JourneyFlowNode[] (Phase 63 schema).
 *
 * "Reuse, don't rebuild" — imports detectStrategicIntent / normalizeIntent
 * from the existing intent-detection layer; does not copy their internals.
 */

import type { ConceptData } from '@/lib/journey-mapper/heuristic-mapper';
import { detectStrategicIntent } from '@/lib/journey-mapper/intent-detection';
import { normalizeIntent } from '@/lib/journey-mapper/types';
import type { JourneyFlowNode, JourneyFlowEdge, JourneyFlowUiType } from '@/lib/journey-flow/types';
import {
  type FlowArchetype,
  type TestScope,
  ARCHETYPE_TO_INTENT,
} from '@/lib/journey-flow/types';
import type { StrategicIntent } from '@/lib/journey-mapper/types';

// Re-export ConceptData so callers don't need to import from heuristic-mapper
export type { ConceptData };

// ---------------------------------------------------------------------------
// 1. extractConceptsForFlow
// ---------------------------------------------------------------------------

/**
 * Simplified port of extractConcepts() from generate-journey-map/route.ts.
 * Handles all known concept-artifact shapes:
 *   _canvas.conceptCards, cards, concepts, selectedConcepts, singular concept fallback.
 * Normalizes each card to { name, description, usp, elevatorPitch, features }.
 * Drops _debug plumbing and cross-source enrichment loop (lean for generator use).
 */
export function extractConceptsForFlow(conceptArtifact: Record<string, unknown>): ConceptData[] {
  // Gather candidate sources
  const canvas = conceptArtifact._canvas as Record<string, unknown> | undefined;
  const canvasCards =
    canvas && Array.isArray(canvas.conceptCards) && canvas.conceptCards.length > 0
      ? (canvas.conceptCards as Array<Record<string, unknown>>)
      : null;
  const topCards =
    Array.isArray(conceptArtifact.cards) && conceptArtifact.cards.length > 0
      ? (conceptArtifact.cards as Array<Record<string, unknown>>)
      : null;
  const conceptsArr =
    Array.isArray(conceptArtifact.concepts) && conceptArtifact.concepts.length > 0
      ? (conceptArtifact.concepts as Array<Record<string, unknown>>)
      : null;
  const selectedConcepts =
    Array.isArray(conceptArtifact.selectedConcepts) && conceptArtifact.selectedConcepts.length > 0
      ? (conceptArtifact.selectedConcepts as Array<Record<string, unknown>>)
      : null;

  // Score each source by named-item count; prefer canvas cards when tied (richer data)
  const sources: Array<{ key: string; items: Array<Record<string, unknown>>; namedCount: number }> = [];
  if (canvasCards) sources.push({ key: '_canvas.conceptCards', items: canvasCards, namedCount: countNamedItems(canvasCards) });
  if (topCards) sources.push({ key: 'cards', items: topCards, namedCount: countNamedItems(topCards) });
  if (conceptsArr) sources.push({ key: 'concepts', items: conceptsArr, namedCount: countNamedItems(conceptsArr) });
  if (selectedConcepts) sources.push({ key: 'selectedConcepts', items: selectedConcepts, namedCount: countNamedItems(selectedConcepts) });

  let primarySource: Array<Record<string, unknown>> | null = null;

  if (sources.length > 0) {
    sources.sort((a, b) => {
      if (b.namedCount !== a.namedCount) return b.namedCount - a.namedCount;
      if (a.key === '_canvas.conceptCards') return -1;
      if (b.key === '_canvas.conceptCards') return 1;
      return 0;
    });
    primarySource = sources[0].items;
  }

  // Fallback: singular concept object
  if (!primarySource) {
    if (
      conceptArtifact.concept &&
      typeof conceptArtifact.concept === 'object' &&
      !Array.isArray(conceptArtifact.concept)
    ) {
      primarySource = [conceptArtifact.concept as Record<string, unknown>];
    } else {
      for (const key of Object.keys(conceptArtifact)) {
        if (key.startsWith('_')) continue;
        const val = conceptArtifact[key];
        if (Array.isArray(val) && val.length > 0) {
          const first = val[0] as Record<string, unknown>;
          if (typeof first === 'object' && first !== null && (first.name || first.title || first.conceptName)) {
            primarySource = val as Array<Record<string, unknown>>;
            break;
          }
        }
      }
    }
  }

  if (!primarySource) {
    primarySource = [conceptArtifact];
  }

  return mapConceptCards(primarySource);
}

function countNamedItems(items: Array<Record<string, unknown>>): number {
  return items.filter((item) => {
    const name = (item.conceptName as string) || (item.name as string) || (item.title as string) || '';
    return name.trim().length > 0;
  }).length;
}

function mapConceptCards(cards: Array<Record<string, unknown>>): ConceptData[] {
  return cards.map((card) => ({
    ...card,
    name: (card.conceptName as string) || (card.name as string) || (card.title as string) || (card.ideaSource as string) || 'Concept',
    description: (card.description as string) || (card.summary as string) || '',
    usp: (card.usp as string) || (card.valueProposition as string) || '',
    elevatorPitch: (card.elevatorPitch as string) || (card.pitch as string) || (card.description as string) || '',
    features: (card.features as unknown[]) || (card.keyFeatures as unknown[]) || (card.key_features as unknown[]) || [],
    strengths: (card.strengths as string[]) || (card.swotStrengths as string[]) || [],
  }));
}

// ---------------------------------------------------------------------------
// 2. detectTwoSided
// ---------------------------------------------------------------------------

const TWO_SIDED_KEYWORDS = [
  'marketplace', 'platform', 'two-sided', 'host', 'guest',
  'provider', 'consumer', 'buyer', 'seller', 'supply', 'demand', 'b2b2c',
] as const;

const DEMAND_KEYWORDS = ['buyer', 'consumer', 'demand', 'guest'];

/**
 * Scans combined text for two-sided product signals.
 * Requires >= 2 DISTINCT keyword hits for isTwoSided: true.
 * riskierSide defaults to 'supply/provider side' (the side that must be
 * convinced to participate) unless demand-side keywords dominate.
 */
export function detectTwoSided(
  challengeContext: string,
  concepts: ConceptData[]
): { isTwoSided: boolean; riskierSide: string } {
  const combinedText = [
    challengeContext,
    ...concepts.map((c) => [c.name, c.usp, c.elevatorPitch, c.description].filter(Boolean).join(' ')),
  ]
    .join(' ')
    .toLowerCase();

  const hitKeywords = TWO_SIDED_KEYWORDS.filter((kw) => combinedText.includes(kw));

  if (hitKeywords.length < 2) {
    return { isTwoSided: false, riskierSide: '' };
  }

  // Count demand vs supply signals
  const demandHits = hitKeywords.filter((kw) => DEMAND_KEYWORDS.includes(kw as (typeof DEMAND_KEYWORDS)[number])).length;
  const supplyHits = hitKeywords.length - demandHits;

  const riskierSide = demandHits > supplyHits ? 'demand/consumer side' : 'supply/provider side';

  return { isTwoSided: true, riskierSide };
}

// ---------------------------------------------------------------------------
// 3. detectArchetype
// ---------------------------------------------------------------------------

const LOOP_KEYWORDS = ['habit', 'log', 'track', 'streak', 'daily', 'retention', 'come back', 'feedback loop'];
const BRANCHING_KEYWORDS = ['eligibility', 'triage', 'approve', 'reject', 'qualify', 'choose your', 'decision'];
const FUNNEL_KEYWORDS = ['landing page', 'sign-up', 'signup', 'waitlist', 'fake door', 'desirability', 'conversion'];
// Marketing-site secondary signals used in funnel detection when intent scoring is ambiguous
const MARKETING_SECONDARY_KEYWORDS = ['landing page', 'marketing', 'promote', 'launch', 'brand', 'audience', 'sell', 'campaign'];
// Tool secondary signals for single-screen-tool detection
const TOOL_SECONDARY_KEYWORDS = ['calculator', 'converter', 'generator', 'validator', 'checker', 'scanner', 'linter', 'formatter', 'utility', 'widget', 'convert', 'calculate', 'estimate', 'compute'];

/**
 * Detects the flow archetype from workshop signals.
 * Calls detectStrategicIntent() + normalizeIntent(), then refines with
 * archetype keyword signals (loop/branching/funnel are checked FIRST — more specific).
 */
export function detectArchetype(
  challengeContext: string,
  concepts: ConceptData[],
  personaRole?: string | null
): FlowArchetype {
  const combinedText = [
    challengeContext,
    ...concepts.map((c) => [c.name, c.usp, c.elevatorPitch, c.description].filter(Boolean).join(' ')),
  ]
    .join(' ')
    .toLowerCase();

  const intent = normalizeIntent(
    detectStrategicIntent(
      challengeContext,
      concepts as Array<Record<string, unknown>>,
      personaRole
    )
  );

  // --- More-specific keyword overrides go first ---

  if (LOOP_KEYWORDS.some((kw) => combinedText.includes(kw))) {
    return 'loop';
  }

  if (BRANCHING_KEYWORDS.some((kw) => combinedText.includes(kw))) {
    return 'branching';
  }

  // Funnel: either intent scored marketing-site AND funnel keywords,
  // OR funnel keywords PLUS at least one marketing secondary signal
  // (handles cases where intent scoring doesn't reach the marketing-site threshold)
  const hasFunnelKeyword = FUNNEL_KEYWORDS.some((kw) => combinedText.includes(kw));
  const hasMarketingSignal = intent === 'marketing-site' || MARKETING_SECONDARY_KEYWORDS.some((kw) => combinedText.includes(kw));
  if (hasFunnelKeyword && hasMarketingSignal) {
    return 'funnel';
  }

  // Single-screen-tool: either intent scored tool, or strong tool keyword signals
  const hasToolKeyword = TOOL_SECONDARY_KEYWORDS.some((kw) => combinedText.includes(kw));
  if (intent === 'tool' || hasToolKeyword) {
    return 'single-screen-tool';
  }

  // --- Intent-based defaults ---

  if (intent === 'marketing-site') return 'single-page-sections';
  if (intent === 'dashboard' || intent === 'admin-portal') return 'hub-and-spoke';

  // web-app / anything else
  return 'linear-sequence';
}

// ---------------------------------------------------------------------------
// 4. normalizeUiType
// ---------------------------------------------------------------------------

const VALID_UI_TYPES = new Set<string>([
  'dashboard', 'landing-page', 'form', 'table', 'detail-view',
  'wizard', 'modal', 'settings', 'auth', 'onboarding', 'search', 'error',
]);

/** Clamps unknown/invalid uiType values to 'detail-view'. */
export function normalizeUiType(value: unknown): JourneyFlowUiType {
  if (typeof value === 'string' && VALID_UI_TYPES.has(value)) {
    return value as JourneyFlowUiType;
  }
  return 'detail-view';
}

// ---------------------------------------------------------------------------
// 5. layoutPositions
// ---------------------------------------------------------------------------

/**
 * Deterministic per-archetype node placement.
 * Returns an array of { x, y } positions, one per node.
 */
export function layoutPositions(
  archetype: FlowArchetype,
  count: number
): Array<{ x: number; y: number }> {
  if (count === 0) return [];

  switch (archetype) {
    case 'linear-sequence':
    case 'funnel':
    case 'branching':
      // Left-to-right row
      return Array.from({ length: count }, (_, i) => ({ x: i * 340, y: 160 }));

    case 'hub-and-spoke': {
      // Hub at (400, 160); spokes on a circle of radius 320 at evenly spaced angles
      const positions: Array<{ x: number; y: number }> = [{ x: 400, y: 160 }]; // hub first
      const spokeCount = count - 1;
      for (let i = 0; i < spokeCount; i++) {
        const angle = (2 * Math.PI * i) / Math.max(spokeCount, 1);
        positions.push({
          x: Math.round(400 + 320 * Math.cos(angle)),
          y: Math.round(160 + 320 * Math.sin(angle)),
        });
      }
      return positions;
    }

    case 'single-page-sections':
      // Top-to-bottom column
      return Array.from({ length: count }, (_, i) => ({ x: 400, y: i * 220 }));

    case 'single-screen-tool':
      // Always 2 nodes: input left, result right
      return [{ x: 200, y: 160 }, { x: 600, y: 160 }];

    case 'loop': {
      // N points on a circle
      const r = Math.max(220, count * 60);
      return Array.from({ length: count }, (_, i) => {
        const angle = (2 * Math.PI * i) / count - Math.PI / 2; // start from top
        return {
          x: Math.round(400 + r * Math.cos(angle)),
          y: Math.round(300 + r * Math.sin(angle)),
        };
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 6. buildAnnotationNode
// ---------------------------------------------------------------------------

/**
 * Creates the two-sided product explanation node.
 * Positioned above the canvas (y = -120).
 * isAnnotation=true — Phase 66 prompt-building excludes it from screen list.
 */
export function buildAnnotationNode(riskierSide: string): JourneyFlowNode {
  return {
    id: 'jf-node-annotation-two-sided',
    name: 'Two-Sided Product Detected',
    uiType: 'modal',
    isAnnotation: true,
    priority: 'must-have',
    keyElements: [],
    position: { x: 400, y: -120 },
    purpose:
      `This looks like a two-sided product. This baseline maps only the ${riskierSide} — ` +
      `the riskier side to test first because they need to be convinced to participate. ` +
      `The other side is intentionally out of scope for this baseline.`,
  };
}

// ---------------------------------------------------------------------------
// 7. heuristicGenerateFlow — main entry point
// ---------------------------------------------------------------------------

export interface FlowGenerationInput {
  concepts: ConceptData[];
  challengeContext: string;
  persona?: { name?: string; pains?: string[] } | null;
  scope: TestScope;
  selectedConceptName?: string; // feature mode: which concept
}

export interface FlowGenerationOutput {
  nodes: JourneyFlowNode[];      // includes annotation node when two-sided
  edges: JourneyFlowEdge[];
  flowArchetype: FlowArchetype;
  strategicIntent: StrategicIntent; // ARCHETYPE_TO_INTENT[archetype], except admin-portal override
  isTwoSided: boolean;
}

export function heuristicGenerateFlow(input: FlowGenerationInput): FlowGenerationOutput {
  const { concepts, challengeContext, persona, scope, selectedConceptName } = input;

  if (scope === 'feature') {
    return generateFeatureFlow(concepts, selectedConceptName);
  }

  return generateJourneyFlow(concepts, challengeContext, persona);
}

// ---------------------------------------------------------------------------
// Feature mode: exactly 3 nodes (entry → action → result)
// ---------------------------------------------------------------------------

function generateFeatureFlow(
  concepts: ConceptData[],
  selectedConceptName?: string
): FlowGenerationOutput {
  // Match selected concept by name; fallback to first
  const concept =
    (selectedConceptName
      ? concepts.find((c) => c.name === selectedConceptName || c.conceptName === selectedConceptName)
      : null) ?? concepts[0];

  const conceptName = concept?.name || concept?.conceptName || 'Feature';
  const conceptDesc = concept?.elevatorPitch || concept?.usp || concept?.description || '';

  // Determine archetype for feature: single-screen-tool if utility signals
  const isUtility = /calculat|convert|generat|validat|check|scan|format|estimat/i.test(
    conceptName + ' ' + conceptDesc
  );
  const archetype: FlowArchetype = isUtility ? 'single-screen-tool' : 'linear-sequence';
  const positions = layoutPositions('linear-sequence', 3); // always row layout for 3 nodes

  const features = Array.isArray(concept?.features)
    ? (concept.features as string[]).slice(0, 3)
    : [];

  const nodes: JourneyFlowNode[] = [
    {
      id: 'jf-node-gen-0',
      name: `${conceptName} — Entry`,
      uiType: 'landing-page',
      purpose: `Entry point for testing ${conceptName}. First impression that explains what users will do.`,
      keyElements: features.length > 0 ? [features[0]] : ['Value proposition', 'Get started CTA'],
      priority: 'must-have',
      position: positions[0],
    },
    {
      id: 'jf-node-gen-1',
      name: conceptName,
      uiType: isUtility ? 'form' : 'detail-view',
      purpose: conceptDesc
        ? `Core action screen for ${conceptName}: ${conceptDesc.slice(0, 150)}`
        : `Core action screen for ${conceptName}. Where the primary value is delivered.`,
      keyElements:
        features.length > 1
          ? features.slice(1, 3)
          : [concept?.usp?.slice(0, 60) || 'Primary action', 'Submit / confirm'],
      priority: 'must-have',
      position: positions[1],
    },
    {
      id: 'jf-node-gen-2',
      name: `${conceptName} — Result`,
      uiType: 'detail-view',
      purpose: `Confirmation / result screen after the core action. Reinforces value and shows next steps.`,
      keyElements: ['Success message', 'Result summary', 'Next step CTA'],
      priority: 'must-have',
      position: positions[2],
    },
  ];

  const edges: JourneyFlowEdge[] = [
    { id: 'jf-edge-gen-0', sourceNodeId: 'jf-node-gen-0', targetNodeId: 'jf-node-gen-1' },
    { id: 'jf-edge-gen-1', sourceNodeId: 'jf-node-gen-1', targetNodeId: 'jf-node-gen-2' },
  ];

  return {
    nodes,
    edges,
    flowArchetype: archetype,
    strategicIntent: ARCHETYPE_TO_INTENT[archetype],
    isTwoSided: false,
  };
}

// ---------------------------------------------------------------------------
// Journey mode: full archetype-shaped flow
// ---------------------------------------------------------------------------

function generateJourneyFlow(
  concepts: ConceptData[],
  challengeContext: string,
  persona?: { name?: string; pains?: string[] } | null
): FlowGenerationOutput {
  const personaRole = persona?.name ?? null;
  const archetype = detectArchetype(challengeContext, concepts, personaRole);

  // Detect two-sided
  const { isTwoSided, riskierSide } = detectTwoSided(challengeContext, concepts);

  // Get base intent — admin-portal override for hub-and-spoke when detection said admin-portal
  const rawIntent = normalizeIntent(
    detectStrategicIntent(challengeContext, concepts as Array<Record<string, unknown>>, personaRole)
  );
  const strategicIntent: StrategicIntent =
    archetype === 'hub-and-spoke' && rawIntent === 'admin-portal'
      ? 'admin-portal'
      : ARCHETYPE_TO_INTENT[archetype];

  // Generate nodes/edges per archetype
  let nodes: JourneyFlowNode[];
  let edges: JourneyFlowEdge[];

  switch (archetype) {
    case 'linear-sequence':
      ({ nodes, edges } = generateLinearSequence(concepts, persona));
      break;
    case 'hub-and-spoke':
      ({ nodes, edges } = generateHubAndSpoke(concepts, persona));
      break;
    case 'single-page-sections':
      ({ nodes, edges } = generateSinglePageSections(concepts, persona));
      break;
    case 'funnel':
      ({ nodes, edges } = generateFunnel(concepts, persona));
      break;
    case 'branching':
      ({ nodes, edges } = generateBranching(concepts, persona));
      break;
    case 'single-screen-tool':
      ({ nodes, edges } = generateSingleScreenTool(concepts));
      break;
    case 'loop':
      ({ nodes, edges } = generateLoop(concepts, persona));
      break;
  }

  // Append two-sided annotation node (no edges to it)
  if (isTwoSided) {
    nodes = [buildAnnotationNode(riskierSide), ...nodes];
  }

  return { nodes, edges, flowArchetype: archetype, strategicIntent, isTwoSided };
}

// ---------------------------------------------------------------------------
// Per-archetype generators
// ---------------------------------------------------------------------------

function priorityForIndex(i: number): 'must-have' | 'should-have' | 'nice-to-have' {
  if (i < 3) return 'must-have';
  return 'should-have';
}

function conceptKeyElements(concept: ConceptData | undefined, fallback: string[]): string[] {
  if (!concept) return fallback;
  const features = Array.isArray(concept.features)
    ? (concept.features as string[]).filter((f) => typeof f === 'string').slice(0, 3)
    : [];
  if (features.length >= 2) return features.slice(0, 3);
  const usp = concept.usp || concept.elevatorPitch || '';
  if (usp) return [usp.slice(0, 60), ...fallback.slice(0, 1)];
  return fallback;
}

function makeNodes(
  specs: Array<{
    name: string;
    uiType: JourneyFlowUiType;
    purpose: string;
    keyElements?: string[];
    concept?: ConceptData;
    fallbackElements?: string[];
  }>,
  positions: Array<{ x: number; y: number }>
): JourneyFlowNode[] {
  return specs.map((s, i) => ({
    id: `jf-node-gen-${i}`,
    name: s.name,
    uiType: s.uiType,
    purpose: s.purpose,
    keyElements: s.keyElements ?? conceptKeyElements(s.concept, s.fallbackElements ?? ['Key feature', 'Action']),
    priority: priorityForIndex(i),
    position: positions[i] ?? { x: i * 340, y: 160 },
  }));
}

function linearEdges(nodeCount: number): JourneyFlowEdge[] {
  const edges: JourneyFlowEdge[] = [];
  for (let i = 0; i < nodeCount - 1; i++) {
    edges.push({ id: `jf-edge-gen-${i}`, sourceNodeId: `jf-node-gen-${i}`, targetNodeId: `jf-node-gen-${i + 1}` });
  }
  return edges;
}

// --- linear-sequence: 4-6 screens ---
function generateLinearSequence(
  concepts: ConceptData[],
  persona?: { name?: string; pains?: string[] } | null
): { nodes: JourneyFlowNode[]; edges: JourneyFlowEdge[] } {
  const primaryConcept = concepts[0];
  const coreScreens = concepts.slice(0, 3); // cap at 3 concept screens

  const specs: Array<Parameters<typeof makeNodes>[0][number]> = [
    {
      name: 'Entry / Landing',
      uiType: 'landing-page',
      purpose: 'First screen the user encounters. Communicates value and drives them to get started.',
      fallbackElements: ['Value headline', 'Get started CTA', 'Social proof'],
      concept: primaryConcept,
    },
    {
      name: 'Sign Up / Onboarding',
      uiType: 'onboarding',
      purpose: 'User creates an account or completes initial setup to unlock the core product.',
      keyElements: ['Account creation form', 'Progress indicator', 'Skip option'],
    },
    ...coreScreens.map((c) => ({
      name: c.name || c.conceptName || 'Core Feature',
      uiType: normalizeUiType('detail-view'),
      purpose: c.elevatorPitch
        ? c.elevatorPitch.slice(0, 160)
        : `Core feature screen. Where the user performs the primary action.`,
      concept: c,
      fallbackElements: ['Primary action', 'Status / progress', 'Navigation'],
    })),
    {
      name: 'Result / Confirmation',
      uiType: 'detail-view',
      purpose: 'Confirms the user completed the core action. Surfaces outcomes and next steps.',
      keyElements: ['Success state', 'Summary of action', 'Next step CTA'],
    },
  ];

  const positions = layoutPositions('linear-sequence', specs.length);
  const nodes = makeNodes(specs, positions);
  return { nodes, edges: linearEdges(nodes.length) };
}

// --- hub-and-spoke: hub + up to 5 spokes ---
function generateHubAndSpoke(
  concepts: ConceptData[],
  _persona?: { name?: string; pains?: string[] } | null
): { nodes: JourneyFlowNode[]; edges: JourneyFlowEdge[] } {
  const spokes = concepts.slice(0, 5);
  const total = 1 + spokes.length;
  const positions = layoutPositions('hub-and-spoke', total);

  const hubNode: JourneyFlowNode = {
    id: 'jf-node-gen-0',
    name: 'Dashboard',
    uiType: 'dashboard',
    purpose: 'Central hub. Gives the user an overview of all key areas and navigates to detail screens.',
    keyElements: ['Navigation cards', 'Summary metrics', 'Recent activity'],
    priority: 'must-have',
    position: positions[0],
  };

  const spokeNodes: JourneyFlowNode[] = spokes.map((c, i) => ({
    id: `jf-node-gen-${i + 1}`,
    name: c.name || c.conceptName || `Feature ${i + 1}`,
    uiType: normalizeUiType('detail-view'),
    purpose: c.elevatorPitch
      ? c.elevatorPitch.slice(0, 160)
      : `Detail screen for ${c.name || 'this feature'}. Full management and interaction.`,
    keyElements: conceptKeyElements(c, ['Detail view', 'Edit / action', 'Back to hub']),
    priority: priorityForIndex(i + 1),
    position: positions[i + 1],
  }));

  const nodes = [hubNode, ...spokeNodes];

  // Hub → each spoke
  const edges: JourneyFlowEdge[] = spokeNodes.map((spoke, i) => ({
    id: `jf-edge-gen-${i}`,
    sourceNodeId: 'jf-node-gen-0',
    targetNodeId: spoke.id,
  }));

  return { nodes, edges };
}

// --- single-page-sections: 4-5 section nodes top-to-bottom ---
function generateSinglePageSections(
  concepts: ConceptData[],
  _persona?: { name?: string; pains?: string[] } | null
): { nodes: JourneyFlowNode[]; edges: JourneyFlowEdge[] } {
  const primaryConcept = concepts[0];

  const specs: Array<Parameters<typeof makeNodes>[0][number]> = [
    {
      name: 'Hero / Above the Fold',
      uiType: 'landing-page',
      purpose:
        primaryConcept?.elevatorPitch
          ? `Hero section: "${primaryConcept.elevatorPitch.slice(0, 120)}"`
          : 'Bold headline, subheadline, and primary CTA above the fold.',
      fallbackElements: ['Headline from elevator pitch', 'Subheadline', 'Primary CTA'],
      concept: primaryConcept,
    },
    {
      name: 'Problem / Value Proposition',
      uiType: 'landing-page',
      purpose: 'Articulates the pain point and why this product is the solution.',
      keyElements: ['Pain statement', 'Before/after framing', 'Empathetic copy'],
    },
    ...concepts.slice(0, 2).map((c) => ({
      name: `${c.name || 'Feature'} — How It Works`,
      uiType: normalizeUiType('landing-page'),
      purpose: c.usp
        ? `3-step breakdown: "${c.usp.slice(0, 120)}"`
        : `How ${c.name || 'this'} works. Step-by-step breakdown.`,
      concept: c,
      fallbackElements: ['Step 1', 'Step 2', 'Step 3'],
    })),
    {
      name: 'Call to Action',
      uiType: 'form',
      purpose: 'Final CTA. Drives conversion (sign up, waitlist, purchase).',
      keyElements: ['Strong headline', 'Email / sign-up input', 'Submit CTA'],
    },
  ];

  const positions = layoutPositions('single-page-sections', specs.length);
  const nodes = makeNodes(specs, positions);
  return { nodes, edges: linearEdges(nodes.length) };
}

// --- funnel: 3-4 nodes (landing → sign-up → confirmation) ---
function generateFunnel(
  concepts: ConceptData[],
  _persona?: { name?: string; pains?: string[] } | null
): { nodes: JourneyFlowNode[]; edges: JourneyFlowEdge[] } {
  const primaryConcept = concepts[0];

  const specs: Array<Parameters<typeof makeNodes>[0][number]> = [
    {
      name: 'Landing Page',
      uiType: 'landing-page',
      purpose:
        primaryConcept?.elevatorPitch
          ? `Strong-CTA landing page: "${primaryConcept.elevatorPitch.slice(0, 120)}". Focus: convert visitor to sign-up.`
          : 'Landing page with strong CTA. Goal: convert visitor to sign-up. Minimal friction.',
      fallbackElements: ['Bold headline', 'Strong CTA button', 'Social proof below fold'],
      concept: primaryConcept,
    },
    {
      name: 'Sign Up / Waitlist Form',
      uiType: 'form',
      purpose: 'Minimal sign-up or waitlist form. Captures email/name. No friction beyond essential fields.',
      keyElements: ['Email input', 'Name (optional)', 'Submit CTA', 'Privacy reassurance'],
    },
    {
      name: 'Thank You / Confirmation',
      uiType: 'detail-view',
      purpose: "Confirms sign-up. Delivers the 'what happens next' message and reinforces the value decision.",
      keyElements: ['Confirmation message', 'Next steps', 'Share / referral CTA'],
    },
  ];

  const positions = layoutPositions('funnel', specs.length);
  const nodes = makeNodes(specs, positions);
  return { nodes, edges: linearEdges(nodes.length) };
}

// --- branching: linear backbone + 1 fork ---
function generateBranching(
  concepts: ConceptData[],
  _persona?: { name?: string; pains?: string[] } | null
): { nodes: JourneyFlowNode[]; edges: JourneyFlowEdge[] } {
  const primaryConcept = concepts[0];

  // Nodes: entry(0) → decision(1) → path-A(2) / path-B(3) → result(4)
  const specs: Array<Parameters<typeof makeNodes>[0][number]> = [
    {
      name: 'Entry / Intake',
      uiType: 'landing-page',
      purpose: 'User enters the flow and provides initial context or intent.',
      concept: primaryConcept,
      fallbackElements: ['Initial question or form', 'Context input', 'Get started CTA'],
    },
    {
      name: 'Decision Point',
      uiType: 'wizard',
      purpose: "Branching screen. User's answer or eligibility determines which path they take next.",
      keyElements: ['Decision question', 'Path options (A/B)', 'Explanation of difference'],
    },
    {
      name: 'Path A — Approved / Eligible',
      uiType: 'detail-view',
      purpose: concepts[0]?.elevatorPitch
        ? concepts[0].elevatorPitch.slice(0, 160)
        : 'Core experience for users who qualify or choose path A.',
      concept: concepts[0],
      fallbackElements: ['Core feature access', 'Primary action', 'Progress indicator'],
    },
    {
      name: 'Path B — Alternate Route',
      uiType: 'detail-view',
      purpose: 'Alternative experience for users who take path B (e.g., ineligible, different segment).',
      keyElements: ['Alternative offering', 'Explanation', 'Waitlist or next steps'],
    },
    {
      name: 'Result / Confirmation',
      uiType: 'detail-view',
      purpose: 'Shared result screen for both paths. Confirms outcome and surfaces next steps.',
      keyElements: ['Outcome summary', 'Next step CTA', 'Share / continue'],
    },
  ];

  const positions = layoutPositions('linear-sequence', specs.length); // backbone
  const nodes = makeNodes(specs, positions);

  // Edges: 0→1, 1→2 (fork A), 1→3 (fork B), 2→4, 3→4
  const edges: JourneyFlowEdge[] = [
    { id: 'jf-edge-gen-0', sourceNodeId: 'jf-node-gen-0', targetNodeId: 'jf-node-gen-1' },
    { id: 'jf-edge-gen-1', sourceNodeId: 'jf-node-gen-1', targetNodeId: 'jf-node-gen-2' },
    { id: 'jf-edge-gen-2', sourceNodeId: 'jf-node-gen-1', targetNodeId: 'jf-node-gen-3' },
    { id: 'jf-edge-gen-3', sourceNodeId: 'jf-node-gen-2', targetNodeId: 'jf-node-gen-4' },
    { id: 'jf-edge-gen-4', sourceNodeId: 'jf-node-gen-3', targetNodeId: 'jf-node-gen-4' },
  ];

  return { nodes, edges };
}

// --- single-screen-tool: input → result (2 nodes) ---
function generateSingleScreenTool(
  concepts: ConceptData[]
): { nodes: JourneyFlowNode[]; edges: JourneyFlowEdge[] } {
  const concept = concepts[0];
  const name = concept?.name || concept?.conceptName || 'Tool';

  const positions = layoutPositions('single-screen-tool', 2);

  const nodes: JourneyFlowNode[] = [
    {
      id: 'jf-node-gen-0',
      name: `${name} — Input`,
      uiType: 'form',
      purpose: `Input panel. User provides data or parameters for ${name}.`,
      keyElements: conceptKeyElements(concept, ['Input fields', 'Smart defaults', 'Submit / run']),
      priority: 'must-have',
      position: positions[0],
    },
    {
      id: 'jf-node-gen-1',
      name: `${name} — Result`,
      uiType: 'detail-view',
      purpose: `Result panel. Shows the output of ${name} with options to copy, export, or re-run.`,
      keyElements: ['Output display', 'Copy / export action', 'Refine / re-run'],
      priority: 'must-have',
      position: positions[1],
    },
  ];

  const edges: JourneyFlowEdge[] = [
    { id: 'jf-edge-gen-0', sourceNodeId: 'jf-node-gen-0', targetNodeId: 'jf-node-gen-1' },
  ];

  return { nodes, edges };
}

// --- loop: 3-5 nodes with closing edge from last back to first ---
function generateLoop(
  concepts: ConceptData[],
  persona?: { name?: string; pains?: string[] } | null
): { nodes: JourneyFlowNode[]; edges: JourneyFlowEdge[] } {
  const primaryConcept = concepts[0];

  const specs: Array<Parameters<typeof makeNodes>[0][number]> = [
    {
      name: 'Entry / Start Session',
      uiType: 'landing-page',
      purpose: 'User begins a session or logs in to continue their habit/streak.',
      concept: primaryConcept,
      fallbackElements: ['Start / continue button', 'Streak indicator', 'Quick status'],
    },
    {
      name: 'Log / Track Action',
      uiType: 'form',
      purpose: 'Core logging or tracking action. Fast and frictionless — the key habit moment.',
      fallbackElements: ['Log entry form', 'Quick-add options', 'Today\'s progress'],
      concept: primaryConcept,
    },
    {
      name: 'Feedback / Progress',
      uiType: 'dashboard',
      purpose: 'Immediate feedback showing progress, streak, or insight. Reinforces the habit loop.',
      keyElements: ['Progress chart', 'Streak / badge', 'Encouragement message'],
    },
    {
      name: 'Reflection / Review',
      uiType: 'detail-view',
      purpose: 'Periodic review screen. Surfaces patterns and motivates continued engagement.',
      keyElements: ['Weekly/monthly summary', 'Key insight', 'Goal progress'],
    },
  ];

  const positions = layoutPositions('loop', specs.length);
  const nodes = makeNodes(specs, positions);

  // Forward edges + closing edge from last back to first
  const edges: JourneyFlowEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ id: `jf-edge-gen-${i}`, sourceNodeId: `jf-node-gen-${i}`, targetNodeId: `jf-node-gen-${i + 1}` });
  }
  // Closing edge: last → first
  edges.push({
    id: `jf-edge-gen-${nodes.length - 1}`,
    sourceNodeId: `jf-node-gen-${nodes.length - 1}`,
    targetNodeId: 'jf-node-gen-0',
  });

  return { nodes, edges };
}
