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

/** App/portal/dashboard/tool mode: map concept features to journey stages */
function heuristicAppMap(
  concepts: ConceptData[],
  stages: JourneyStageColumn[],
  challengeContext: string,
  intent: StrategicIntent
): JourneyMappingResult {
  const features: JourneyMappingResult['features'] = [];
  const edges: JourneyMappingResult['edges'] = [];

  // Count total core features for peripheral context
  let totalCoreFeatures = 0;
  for (const concept of concepts) {
    totalCoreFeatures += extractFeatures(concept).length;
  }

  for (let conceptIdx = 0; conceptIdx < concepts.length; conceptIdx++) {
    const concept = concepts[conceptIdx];
    const conceptName = concept.name || concept.conceptName || `Concept ${conceptIdx + 1}`;

    // Extract features from concept data
    const rawFeatures = extractFeatures(concept);

    for (let fi = 0; fi < rawFeatures.length; fi++) {
      const feature = rawFeatures[fi];

      // Score each stage for this feature
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
        const stageIdx = fi % stages.length;
        bestStage = stages[stageIdx];
      }

      features.push({
        conceptIndex: conceptIdx,
        conceptName,
        featureName: feature.name,
        featureDescription: feature.description,
        stageId: bestStage.id,
        uiType: inferUiType(feature.name + ' ' + feature.description),
        uiPatternSuggestion: `${conceptName} ${feature.name} screen`,
        addressesPain: bestStage.barriers[0] || 'General improvement',
        priority: fi === 0 ? 'must-have' : fi < 3 ? 'should-have' : 'nice-to-have',
        nodeCategory: 'core',
        groupId: 'main',
      });
    }
  }

  // Create sequential edges within each concept's features
  let featureIdx = 0;
  for (const concept of concepts) {
    const count = extractFeatures(concept).length;
    for (let i = 0; i < count - 1; i++) {
      edges.push({
        sourceFeatureIndex: featureIdx + i,
        targetFeatureIndex: featureIdx + i + 1,
        flowType: 'primary' as FlowType,
      });
    }
    featureIdx += count;
  }

  // Add peripheral services
  const ctx = buildPeripheralContext(challengeContext, null, totalCoreFeatures);
  const peripherals = selectPeripheralServices(intent, ctx);
  const groups: NavigationGroup[] = getDefaultGroups(intent);

  for (const p of peripherals) {
    // Find best matching stage for this peripheral's stageHint
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

function extractFeatures(concept: ConceptData): Array<{ name: string; description: string }> {
  const features: Array<{ name: string; description: string }> = [];

  // Try explicit features array
  if (concept.features && Array.isArray(concept.features) && concept.features.length > 0) {
    for (const f of concept.features.slice(0, 5)) {
      if (typeof f === 'string') {
        features.push({ name: f, description: f });
      } else if (typeof f === 'object' && f !== null) {
        const obj = f as Record<string, unknown>;
        features.push({
          name: (obj.name as string) || (obj.title as string) || 'Feature',
          description: (obj.description as string) || '',
        });
      }
    }
  }

  // Try keyFeatures / key_features (concept card format — array of strings)
  if (features.length === 0) {
    const kf = concept.keyFeatures || concept.key_features;
    if (Array.isArray(kf) && kf.length > 0) {
      for (const f of kf.slice(0, 5)) {
        if (typeof f === 'string') {
          features.push({ name: f.slice(0, 50), description: f });
        }
      }
    }
  }

  // Extract from USP or valueProposition
  if (features.length === 0) {
    const uspText = concept.usp || concept.valueProposition;
    if (uspText) {
      const sentences = uspText.split(/[.;]/).filter((s) => s.trim().length > 10);
      for (const s of sentences.slice(0, 3)) {
        features.push({ name: s.trim().slice(0, 50), description: s.trim() });
      }
    }
  }

  // Extract from elevator pitch or description
  if (features.length === 0) {
    const pitchText = concept.elevatorPitch || concept.description;
    if (pitchText) {
      features.push({
        name: 'Core Feature',
        description: pitchText,
      });
    }
  }

  // Try strengths as features
  if (features.length === 0) {
    const strengths = concept.strengths || concept.swotStrengths || concept.swot?.strengths;
    if (Array.isArray(strengths) && strengths.length > 0) {
      for (const s of strengths.slice(0, 3)) {
        if (typeof s === 'string') {
          features.push({ name: s.slice(0, 50), description: s });
        }
      }
    }
  }

  // Fallback — use concept name/title
  if (features.length === 0) {
    features.push({
      name: concept.name || concept.title || concept.conceptName || 'Feature',
      description: concept.description || 'Core product feature',
    });
  }

  return features.slice(0, 5);
}
