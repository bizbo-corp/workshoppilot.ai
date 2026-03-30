/**
 * Core data model for the UX Journey Mapper.
 * Maps Step 9 concepts onto Step 6 journey stages to create
 * an interactive roadmap for prototyping.
 */

export type UiType =
  | 'dashboard'
  | 'landing-page'
  | 'form'
  | 'table'
  | 'detail-view'
  | 'wizard'
  | 'modal'
  | 'settings'
  | 'auth'
  | 'onboarding'
  | 'search'
  | 'error';

export type NodeCategory = 'core' | 'peripheral';

export type LayoutMode = 'auto' | 'freeform';

export interface NavigationGroup {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  color?: string;
  position?: { x: number; y: number };
  width?: number;
  height?: number;
}

export const GROUP_COLORS = [
  { key: 'blue',    fill: 'rgba(104,136,160,0.08)', border: 'rgba(104,136,160,0.30)', text: '#6888a0', headerBg: 'rgba(104,136,160,0.70)' },
  { key: 'green',   fill: 'rgba(96,136,80,0.08)',   border: 'rgba(96,136,80,0.30)',   text: '#608850', headerBg: 'rgba(96,136,80,0.70)' },
  { key: 'yellow',  fill: 'rgba(196,152,32,0.08)',  border: 'rgba(196,152,32,0.30)',  text: '#c49820', headerBg: 'rgba(196,152,32,0.70)' },
  { key: 'pink',    fill: 'rgba(176,112,104,0.08)', border: 'rgba(176,112,104,0.30)', text: '#b07068', headerBg: 'rgba(176,112,104,0.70)' },
  { key: 'orange',  fill: 'rgba(192,128,48,0.08)',  border: 'rgba(192,128,48,0.30)',  text: '#c08030', headerBg: 'rgba(192,128,48,0.70)' },
  { key: 'red',     fill: 'rgba(168,96,80,0.08)',   border: 'rgba(168,96,80,0.30)',   text: '#a86050', headerBg: 'rgba(168,96,80,0.70)' },
] as const;

export type GroupColorKey = typeof GROUP_COLORS[number]['key'];

export function getGroupColor(group: NavigationGroup, index: number) {
  if (group.color) {
    const match = GROUP_COLORS.find((c) => c.key === group.color);
    if (match) return match;
  }
  return GROUP_COLORS[index % GROUP_COLORS.length];
}

export type Priority = 'must-have' | 'should-have' | 'nice-to-have';

export type FlowType = 'primary' | 'secondary' | 'error';

export type ConceptRelationship = 'combined' | 'separate-sections' | 'alternative';

export type StrategicIntent =
  | 'marketing-site'   // Landing pages, conversion funnels
  | 'admin-portal'     // CRUD management interfaces
  | 'dashboard'        // Analytics, monitoring, reporting
  | 'tool'             // Single-purpose utility
  | 'web-app'          // General web application (new default)
  | 'app'              // Legacy alias for web-app
  | 'brochure';        // Legacy alias for marketing-site

/** Normalize legacy intent values to canonical ones */
export function normalizeIntent(intent: StrategicIntent): StrategicIntent {
  if (intent === 'brochure') return 'marketing-site';
  if (intent === 'app') return 'web-app';
  return intent;
}

/** True for marketing-site or its legacy alias */
export function isMarketingIntent(intent: StrategicIntent): boolean {
  return intent === 'marketing-site' || intent === 'brochure';
}

/** Display names for the toolbar badge */
export const INTENT_LABELS: Record<StrategicIntent, string> = {
  'marketing-site': 'Marketing Site',
  'admin-portal': 'Admin Portal',
  'dashboard': 'Dashboard',
  'tool': 'Tool',
  'web-app': 'Web App',
  'app': 'Application',
  'brochure': 'Landing Page',
};

/** "Add ___" button label per intent */
export const INTENT_ADD_LABELS: Record<StrategicIntent, string> = {
  'marketing-site': 'Add Section',
  'admin-portal': 'Add View',
  'dashboard': 'Add Widget',
  'tool': 'Add Feature',
  'web-app': 'Add Feature',
  'app': 'Add Feature',
  'brochure': 'Add Section',
};

export type StageEmotion = 'positive' | 'neutral' | 'negative';

export interface JourneyMapperNode {
  id: string;
  conceptIndex: number;
  conceptName: string;
  featureName: string;
  featureDescription: string;
  stageId: string;
  stageName: string;
  uiType: UiType;
  uiPatternSuggestion: string;
  addressesPain: string;
  position: { x: number; y: number };
  priority: Priority;
  nodeCategory?: NodeCategory;
  groupId?: string;
}

export interface JourneyMapperEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
  flowType: FlowType;
}

export interface JourneyStageColumn {
  id: string;
  name: string;
  description: string;
  emotion: StageEmotion;
  isDip: boolean;
  barriers: string[];
  opportunities: string[];
}

export interface JourneyMapperState {
  nodes: JourneyMapperNode[];
  edges: JourneyMapperEdge[];
  stages: JourneyStageColumn[];
  groups: NavigationGroup[];
  challengeContext: string;
  personaName: string;
  conceptRelationship: ConceptRelationship;
  strategicIntent: StrategicIntent;
  layoutMode?: LayoutMode;
  isApproved: boolean;
  isDirty: boolean;
  lastGeneratedAt?: string;
}

/** Result shape returned by the LLM mapping engine */
export interface JourneyMappingResult {
  strategicIntent: StrategicIntent;
  conceptRelationship: ConceptRelationship;
  stages: JourneyStageColumn[];
  groups?: NavigationGroup[];
  features: Array<{
    conceptIndex: number;
    conceptName: string;
    featureName: string;
    featureDescription: string;
    stageId: string;
    uiType: UiType;
    uiPatternSuggestion: string;
    addressesPain: string;
    priority: Priority;
    nodeCategory?: NodeCategory;
    groupId?: string;
  }>;
  edges: Array<{
    sourceFeatureIndex: number;
    targetFeatureIndex: number;
    flowType: FlowType;
  }>;
}
