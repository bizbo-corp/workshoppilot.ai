/**
 * Context Architecture Types
 *
 * Defines the three-tier context system that prevents context degradation
 * across the 10-step design thinking workshop flow.
 */

import type {
  ChallengeArtifact,
  StakeholderArtifact,
  UserResearchArtifact,
  SenseMakingArtifact,
  PersonaArtifact,
  JourneyMappingArtifact,
  ReframeArtifact,
  IdeationArtifact,
  ConceptArtifact,
  ValidateArtifact,
} from '@/lib/schemas';

/**
 * Context tiers in the hierarchical compression system
 *
 * - short-term: Verbatim chat messages (current step only)
 * - long-term: AI-generated summaries (previous steps)
 * - persistent: Structured JSON artifacts (all completed steps)
 */
export type ContextTier = 'short-term' | 'long-term' | 'persistent';

/**
 * Step context assembled for AI prompts
 *
 * Combines all three tiers into a single prompt context:
 * - persistentContext: Formatted JSON artifacts from completed steps
 * - summaries: AI-generated summaries from previous steps
 * - messages: Verbatim chat history for current step
 * - canvasContext: Canvas state formatted for AI prompt (Tier 4)
 */
export interface StepContext {
  persistentContext: string; // Formatted JSON artifacts
  summaries: string; // AI-generated summaries
  canvasContext: string; // Canvas state formatted for AI prompt
  messages: Array<{
    role: string;
    content: string;
  }>;
}

/**
 * Map of step IDs to their typed artifact structures
 *
 * Each step produces a specific artifact type with a defined schema.
 * Step IDs match those in src/lib/workshop/step-metadata.ts
 */
export type StepArtifactMap = {
  challenge: ChallengeArtifact;
  'stakeholder-mapping': StakeholderArtifact;
  'user-research': UserResearchArtifact;
  'sense-making': SenseMakingArtifact;
  persona: PersonaArtifact;
  'journey-mapping': JourneyMappingArtifact;
  reframe: ReframeArtifact;
  ideation: IdeationArtifact;
  concept: ConceptArtifact;
  validate: ValidateArtifact;
};

/**
 * Union of all step artifact types
 *
 * Use this when you need to handle any artifact type generically.
 */
export type AnyStepArtifact = StepArtifactMap[keyof StepArtifactMap];

/**
 * Artifact record type (deprecated - use StepArtifactMap types for new code)
 *
 * @deprecated Use StepArtifactMap types for new code. This remains for backward compatibility.
 */
export type ArtifactRecord = Record<string, unknown>;
