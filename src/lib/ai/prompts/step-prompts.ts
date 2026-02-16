/**
 * Step-Specific Prompt Instructions — Barrel re-export
 *
 * Each step's prompt lives in its own file under ./steps/.
 * This file re-exports everything so existing import sites stay valid.
 */

import { challengeStep } from './steps/01_challenge';
import { stakeholderMappingStep } from './steps/02_stakeholder_mapping';
import { userResearchStep } from './steps/03_user_research';
import { senseMakingStep } from './steps/04_sense_making';
import { personaStep } from './steps/05_persona';
import { journeyMappingStep } from './steps/06_journey_mapping';
import { reframeStep } from './steps/07_reframe';
import { ideationStep } from './steps/08_ideation';
import { conceptStep } from './steps/09_concept';
import { validateStep } from './steps/10_validate';

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

export { getIdeationSubStepInstructions } from './steps/08_ideation';
export { CONCEPT_GENERATION_PROMPT } from './steps/09_concept';
