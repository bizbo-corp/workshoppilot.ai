/**
 * Journey Flow Types
 *
 * Dependency-free — safe to import from both server and client code.
 * These are the contracts every other Phase 63 file imports.
 */

export type JourneyFlowUiType =
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

export type JourneyFlowPriority = 'must-have' | 'should-have' | 'nice-to-have';

export interface JourneyFlowNode {
  id: string;                       // 'jf-node-{uuid}'
  name: string;
  uiType: JourneyFlowUiType;
  purpose: string;                  // the "short description" shown on the card
  keyElements: string[];
  addressesPain?: string;
  priority: JourneyFlowPriority;
  position: { x: number; y: number };
}

export interface JourneyFlowEdge {
  id: string;                       // 'jf-edge-{uuid}'
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface JourneyFlowState {
  nodes: JourneyFlowNode[];
  edges: JourneyFlowEdge[];
  isApproved: boolean;
  isDirty: boolean;
  lastSavedAt?: string;
  _schemaVersion: number;           // 1
}

// ---------------------------------------------------------------------------
// Display label maps
// ---------------------------------------------------------------------------

export const UI_TYPE_LABELS: Record<JourneyFlowUiType, string> = {
  dashboard: 'Dashboard',
  'landing-page': 'Landing Page',
  form: 'Form',
  table: 'Table',
  'detail-view': 'Detail View',
  wizard: 'Wizard',
  modal: 'Modal',
  settings: 'Settings',
  auth: 'Auth',
  onboarding: 'Onboarding',
  search: 'Search',
  error: 'Error Page',
};

export const PRIORITY_LABELS: Record<JourneyFlowPriority, string> = {
  'must-have': 'Must Have',
  'should-have': 'Should Have',
  'nice-to-have': 'Nice to Have',
};

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

export const DEFAULT_JOURNEY_FLOW_STATE: JourneyFlowState = {
  nodes: [],
  edges: [],
  isApproved: false,
  isDirty: false,
  _schemaVersion: 1,
};
