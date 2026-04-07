export interface Subfeature {
  id: string;
  name: string;
  description: string;
  sourceNodeId?: string;
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'peripheral';
  priority: 'must-have' | 'should-have' | 'nice-to-have';
  conceptName?: string;
  journeyNodeIds: string[];
  subfeatures: Subfeature[];
}

export interface FeaturePrioritizationState {
  features: Feature[];
  workshopTitle: string;
  personaName: string;
  challengeContext: string;
  generatedAt?: string;
  isDirty: boolean;
  _schemaVersion: 1;
}
