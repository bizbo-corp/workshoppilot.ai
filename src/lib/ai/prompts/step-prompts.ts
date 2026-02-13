/**
 * Step-Specific Prompt Instructions — Barrel re-export
 *
 * Each step's prompt lives in its own file under ./steps/.
 * This file re-exports everything so existing import sites stay valid.
 */

import { challengeStep } from './steps/challenge';
import { stakeholderMappingStep } from './steps/stakeholder-mapping';
import { userResearchStep } from './steps/user-research';
import { senseMakingStep } from './steps/sense-making';
import { personaStep } from './steps/persona';
import { journeyMappingStep } from './steps/journey-mapping';
import { reframeStep } from './steps/reframe';
import { ideationStep } from './steps/ideation';
import { conceptStep } from './steps/concept';
import { validateStep } from './steps/validate';

const steps: Record<string, { contentStructure: string; interactionLogic: string }> = {
  'challenge': challengeStep,
  'stakeholder-mapping': stakeholderMappingStep,
  'user-research': userResearchStep,
  'sense-making': senseMakingStep,
  'persona': personaStep,
  'journey-mapping': journeyMappingStep,
  'reframe': reframeStep,
  'ideation': ideationStep,
  'concept': conceptStep,
  'validate': validateStep,
};

/**
 * Get step-specific instructions for AI facilitation
 */
export function getStepSpecificInstructions(stepId: string): string {
  const step = steps[stepId];
  if (!step) return `No specific instructions available for step: ${stepId}. Provide general design thinking facilitation.`;
  return `${step.contentStructure}\n\n${step.interactionLogic}`;
}

export { getIdeationSubStepInstructions } from './steps/ideation';
export { CONCEPT_GENERATION_PROMPT } from './steps/concept';
