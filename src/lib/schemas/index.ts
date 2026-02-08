/**
 * Schema Module Index
 *
 * Re-exports all step artifact schemas and types.
 * Provides schema lookup utilities for dynamic schema access.
 */

import { z } from 'zod';

// Re-export all schemas
export {
  challengeArtifactSchema,
  stakeholderArtifactSchema,
  userResearchArtifactSchema,
  senseMakingArtifactSchema,
  personaArtifactSchema,
  journeyMappingArtifactSchema,
  reframeArtifactSchema,
  ideationArtifactSchema,
  conceptArtifactSchema,
  validateArtifactSchema,
} from './step-schemas';

// Re-export all types
export type {
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
} from './step-schemas';

import {
  challengeArtifactSchema,
  stakeholderArtifactSchema,
  userResearchArtifactSchema,
  senseMakingArtifactSchema,
  personaArtifactSchema,
  journeyMappingArtifactSchema,
  reframeArtifactSchema,
  ideationArtifactSchema,
  conceptArtifactSchema,
  validateArtifactSchema,
} from './step-schemas';

/**
 * Map of step IDs to their Zod schemas
 *
 * Used for dynamic schema lookup by step ID.
 * Step IDs match those in src/lib/workshop/step-metadata.ts
 */
export const stepSchemaMap: Record<string, z.ZodType> = {
  challenge: challengeArtifactSchema,
  'stakeholder-mapping': stakeholderArtifactSchema,
  'user-research': userResearchArtifactSchema,
  'sense-making': senseMakingArtifactSchema,
  persona: personaArtifactSchema,
  'journey-mapping': journeyMappingArtifactSchema,
  reframe: reframeArtifactSchema,
  ideation: ideationArtifactSchema,
  concept: conceptArtifactSchema,
  validate: validateArtifactSchema,
};

/**
 * Get Zod schema for a given step ID
 *
 * @param stepId - Step ID from step-metadata.ts ('challenge', 'stakeholder-mapping', etc.)
 * @returns Zod schema for the step, or undefined if not found
 *
 * @example
 * const schema = getSchemaForStep('challenge');
 * if (schema) {
 *   const result = schema.parse(data);
 * }
 */
export function getSchemaForStep(stepId: string): z.ZodType | undefined {
  return stepSchemaMap[stepId];
}
