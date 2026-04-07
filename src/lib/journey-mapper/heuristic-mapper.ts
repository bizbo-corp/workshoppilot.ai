import type {
  JourneyMappingResult,
  JourneyStageColumn,
  UiType,
  FlowType,
  StrategicIntent,
  NavigationGroup,
} from './types';
import { normalizeIntent, isMarketingIntent } from './types';
import { BROCHURE_STAGES, detectStrategicIntent, generateConceptDrivenSections, getDefaultStagesForIntent } from './intent-detection';
import { selectPeripheralServices, getDefaultGroups, buildPeripheralContext } from './peripheral-services';

const UI_TYPE_KEYWORDS: Record<string, UiType> = {
  list: 'table',
  manage: 'table',
  track: 'table',
  monitor: 'dashboard',
  overview: 'dashboard',
  analytics: 'dashboard',
  report: 'dashboard',
  create: 'form',
  submit: 'form',
  input: 'form',
  register: 'form',
  signup: 'form',
  onboard: 'wizard',
  setup: 'wizard',
  configure: 'settings',
  preferences: 'settings',
  profile: 'settings',
  view: 'detail-view',
  detail: 'detail-view',
  inspect: 'detail-view',
  confirm: 'modal',
  alert: 'modal',
  notify: 'modal',
  landing: 'landing-page',
  homepage: 'landing-page',
  welcome: 'landing-page',
};

function inferUiType(text: string): UiType {
  const lower = text.toLowerCase();
  for (const [keyword, uiType] of Object.entries(UI_TYPE_KEYWORDS)) {
    if (lower.includes(keyword)) return uiType;
  }
  return 'detail-view';
}

function scoreOverlap(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const words2 = new Set(text2.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  let overlap = 0;
  for (const word of words1) {
    if (words2.has(word)) overlap++;
  }
  return overlap;
}

export interface ConceptData {
  name?: string;
  title?: string;
  conceptName?: string;
  usp?: string;
  valueProposition?: string;
  elevatorPitch?: string;
  description?: string;
  keyFeatures?: string[];
  key_features?: string[];
  strengths?: string[];
  swotStrengths?: string[];
  swotOpportunities?: string[];
  swotThreats?: string[];
  swot?: {
    strengths?: string[];
    weaknesses?: string[];
    opportunities?: string[];
    threats?: string[];
  };
  features?: unknown[];
}

interface PersonaData {
  name?: string;
  pains?: string[];
  painPoints?: string[];
  frustrations?: string[];
}

/**
 * Heuristic fallback mapper when LLM is unavailable.
 * Detects strategic intent and branches between concept-driven marketing site and app features.
 */
export function heuristicMap(
  concepts: ConceptData[],
  stages: JourneyStageColumn[],
  challengeContext: string,
  persona?: PersonaData | null
): JourneyMappingResult {
  const intent = detectStrategicIntent(challengeContext, concepts as Array<Record<string, unknown>>);
  const normalized = normalizeIntent(intent);

  if (isMarketingIntent(intent)) {
    return heuristicMarketingSiteMap(concepts, persona, challengeContext);
  }

  // For non-marketing intents, use provided stages or get defaults
  const effectiveStages = stages.length > 0 ? stages : getDefaultStagesForIntent(normalized);
  return heuristicAppMap(concepts, effectiveStages, challengeContext, normalized);
}

/** Marketing-site mode: generate concept-driven sections mapped to funnel stages */
function heuristicMarketingSiteMap(
  concepts: ConceptData[],
  persona?: PersonaData | null,
  challengeContext?: string
): JourneyMappingResult {
  const stages = BROCHURE_STAGES;
  const personaPains = persona?.pains || persona?.painPoints || persona?.frustrations || [];

  const generatedSections = generateConceptDrivenSections(concepts, personaPains);

  const features: JourneyMappingResult['features'] = generatedSections.map((section) => ({
    conceptIndex: section.conceptIndex,
    conceptName: section.conceptName,
    featureName: section.featureName,
    featureDescription: section.featureDescription,
    stageId: section.stageId,
    uiType: 'landing-page' as UiType,
    uiPatternSuggestion: section.uiPatternSuggestion,
    addressesPain: section.addressesPain,
    priority: section.priority,
    nodeCategory: 'core' as const,
    groupId: 'main',
  }));

  // Sequential edges through all sections
  const edges: JourneyMappingResult['edges'] = [];
  for (let i = 0; i < features.length - 1; i++) {
    edges.push({
      sourceFeatureIndex: i,
      targetFeatureIndex: i + 1,
      flowType: 'primary' as FlowType,
    });
  }

  // Add peripheral services for marketing site
  const ctx = buildPeripheralContext(challengeContext || '', null, features.length);
  const peripherals = selectPeripheralServices('marketing-site', ctx);
  const groups: NavigationGroup[] = getDefaultGroups('marketing-site');

  for (const p of peripherals) {
    const matchingStage = stages.find((s) => s.id === p.stageHint) || stages[0];
    features.push({
      conceptIndex: 0,
      conceptName: 'Site',
      featureName: p.featureName,
      featureDescription: p.featureDescription,
      stageId: matchingStage.id,
      uiType: p.uiType,
      uiPatternSuggestion: p.uiPatternSuggestion,
      addressesPain: p.addressesPain,
      priority: p.priority,
      nodeCategory: 'peripheral',
      groupId: p.groupId,
    });
  }

  return {
    strategicIntent: 'marketing-site',
    conceptRelationship: 'combined',
    stages,
    groups,
    features,
    edges,
  };
}

/** App/portal/dashboard/tool mode: map concept screens to journey stages */
function heuristicAppMap(
  concepts: ConceptData[],
  stages: JourneyStageColumn[],
  challengeContext: string,
  intent: StrategicIntent
): JourneyMappingResult {
  const features: JourneyMappingResult['features'] = [];
  const edges: JourneyMappingResult['edges'] = [];

  // Add Dashboard/Home entry node when there are 2+ concepts
  if (concepts.length >= 2) {
    features.push({
      conceptIndex: 0,
      conceptName: 'Dashboard',
      featureName: 'Dashboard',
      featureDescription: 'App entry point that links to all concept screens',
      stageId: stages[0].id,
      uiType: 'dashboard',
      uiPatternSuggestion: 'Dashboard with cards/links to each concept screen',
      addressesPain: stages[0].barriers[0] || 'Navigation',
      priority: 'must-have',
      nodeCategory: 'core',
      groupId: 'main',
    });
  }

  const dashboardOffset = concepts.length >= 2 ? 1 : 0;

  for (let conceptIdx = 0; conceptIdx < concepts.length; conceptIdx++) {
    const concept = concepts[conceptIdx];
    const conceptFeature = extractFeatures(concept);
    const feature = conceptFeature[0]; // Always exactly 1 feature per concept

    // Score each stage for this concept
    let bestStage = stages[0];
    let bestScore = -1;
    for (const stage of stages) {
      const stageText = [stage.name, stage.description, ...stage.barriers, ...stage.opportunities].join(' ');
      const score = scoreOverlap(feature.name + ' ' + feature.description, stageText);
      if (score > bestScore) {
        bestScore = score;
        bestStage = stage;
      }
    }

    // If no overlap found, distribute evenly across stages
    if (bestScore === 0) {
      const stageIdx = conceptIdx % stages.length;
      bestStage = stages[stageIdx];
    }

    features.push({
      conceptIndex: conceptIdx,
      conceptName: feature.name,
      featureName: feature.name,
      featureDescription: feature.description,
      stageId: bestStage.id,
      uiType: inferUiType(feature.name + ' ' + feature.description),
      uiPatternSuggestion: `${feature.name} primary screen`,
      addressesPain: bestStage.barriers[0] || 'General improvement',
      priority: 'must-have',
      nodeCategory: 'core',
      groupId: 'main',
    });

    // If Dashboard exists, add edge from Dashboard to this concept
    if (dashboardOffset > 0) {
      edges.push({
        sourceFeatureIndex: 0,
        targetFeatureIndex: dashboardOffset + conceptIdx,
        flowType: 'primary' as FlowType,
      });
    }
  }

  // If no Dashboard, create sequential primary edges between concept screens
  if (dashboardOffset === 0 && features.length > 1) {
    for (let i = 0; i < features.length - 1; i++) {
      edges.push({
        sourceFeatureIndex: i,
        targetFeatureIndex: i + 1,
        flowType: 'primary' as FlowType,
      });
    }
  }

  // Add peripheral services
  const ctx = buildPeripheralContext(challengeContext, null, features.length);
  const peripherals = selectPeripheralServices(intent, ctx);
  const groups: NavigationGroup[] = getDefaultGroups(intent);

  for (const p of peripherals) {
    const matchingStage = stages.find((s) => s.id === p.stageHint)
      || stages.find((s) => s.name.toLowerCase().includes(p.stageHint))
      || stages[0];

    features.push({
      conceptIndex: 0,
      conceptName: 'System',
      featureName: p.featureName,
      featureDescription: p.featureDescription,
      stageId: matchingStage.id,
      uiType: p.uiType,
      uiPatternSuggestion: p.uiPatternSuggestion,
      addressesPain: p.addressesPain,
      priority: p.priority,
      nodeCategory: 'peripheral',
      groupId: p.groupId,
    });
  }

  return {
    strategicIntent: intent,
    conceptRelationship: concepts.length > 1 ? 'separate-sections' : 'combined',
    stages,
    groups,
    features,
    edges,
  };
}

/**
 * Returns the concept itself as a single feature — each concept card = 1 screen.
 * Does NOT decompose concepts into sub-features.
 */
function extractFeatures(concept: ConceptData): Array<{ name: string; description: string }> {
  const name = concept.conceptName || concept.name || concept.title || 'Feature';
  const description = concept.elevatorPitch || concept.description || concept.usp || concept.valueProposition || 'Core product feature';

  return [{ name, description }];
}
