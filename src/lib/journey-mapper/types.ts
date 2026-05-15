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
  { key: 'blue',    fill: 'rgba(168,218,255,0.12)', border: 'rgba(168,218,255,0.45)', text: '#0a1f4a', headerBg: 'rgba(168,218,255,0.85)' },
  { key: 'green',   fill: 'rgba(179,239,189,0.12)', border: 'rgba(179,239,189,0.45)', text: '#0a3818', headerBg: 'rgba(179,239,189,0.85)' },
  { key: 'yellow',  fill: 'rgba(255,226,153,0.12)', border: 'rgba(255,226,153,0.45)', text: '#3d2a00', headerBg: 'rgba(255,226,153,0.85)' },
  { key: 'pink',    fill: 'rgba(255,168,219,0.12)', border: 'rgba(255,168,219,0.45)', text: '#5a1438', headerBg: 'rgba(255,168,219,0.85)' },
  { key: 'orange',  fill: 'rgba(255,211,168,0.12)', border: 'rgba(255,211,168,0.45)', text: '#4a2805', headerBg: 'rgba(255,211,168,0.85)' },
  { key: 'red',     fill: 'rgba(255,175,163,0.12)', border: 'rgba(255,175,163,0.45)', text: '#4a1408', headerBg: 'rgba(255,175,163,0.85)' },
  { key: 'teal',    fill: 'rgba(179,244,239,0.12)', border: 'rgba(179,244,239,0.45)', text: '#0a3a35', headerBg: 'rgba(179,244,239,0.85)' },
  { key: 'purple',  fill: 'rgba(211,189,255,0.12)', border: 'rgba(211,189,255,0.45)', text: '#2a1252', headerBg: 'rgba(211,189,255,0.85)' },
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

export interface ViewState {
  nodeIds: string[];
  positions: Record<string, { x: number; y: number }>;
  edges: JourneyMapperEdge[];
}

export interface SitemapViewState extends ViewState {
  groups: NavigationGroup[];
}

export interface JourneyMapperState {
  nodes: JourneyMapperNode[];
  /** @deprecated Use journeyView.edges / sitemapView.edges instead. Kept for migration detection. */
  edges: JourneyMapperEdge[];
  stages: JourneyStageColumn[];
  /** @deprecated Use sitemapView.groups instead. Kept for migration detection. */
  groups: NavigationGroup[];
  journeyView: ViewState;
  sitemapView: SitemapViewState;
  activeView: 'journey' | 'sitemap';
  challengeContext: string;
  personaName: string;
  conceptRelationship: ConceptRelationship;
  strategicIntent: StrategicIntent;
  layoutMode?: LayoutMode;
  isApproved: boolean;
  isDirty: boolean;
  lastGeneratedAt?: string;
  _schemaVersion?: number;
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
