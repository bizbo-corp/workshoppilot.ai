import { db } from '@/db/client';
import { stepArtifacts, workshopSteps } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface WorkshopArtifacts {
  challenge: Record<string, unknown> | null;
  senseMaking: Record<string, unknown> | null;
  persona: Record<string, unknown> | null;
  journey: Record<string, unknown> | null;
  reframe: Record<string, unknown> | null;
  concept: Record<string, unknown> | null;
}

const STEP_ID_MAP: Record<string, keyof WorkshopArtifacts> = {
  challenge: 'challenge',
  'sense-making': 'senseMaking',
  persona: 'persona',
  'journey-mapping': 'journey',
  reframe: 'reframe',
  concept: 'concept',
};

/**
 * Full 10-step artifacts interface for Build Pack generation.
 * Covers all design thinking steps: challenge → validate.
 */
export interface AllWorkshopArtifacts {
  challenge: Record<string, unknown> | null;         // Step 1
  stakeholderMapping: Record<string, unknown> | null; // Step 2
  userResearch: Record<string, unknown> | null;       // Step 3
  senseMaking: Record<string, unknown> | null;        // Step 4
  persona: Record<string, unknown> | null;            // Step 5
  journeyMapping: Record<string, unknown> | null;     // Step 6
  reframe: Record<string, unknown> | null;            // Step 7
  ideation: Record<string, unknown> | null;           // Step 8
  concept: Record<string, unknown> | null;            // Step 9
  validate: Record<string, unknown> | null;           // Step 10
}

const ALL_STEP_ID_MAP: Record<string, keyof AllWorkshopArtifacts> = {
  'challenge': 'challenge',
  'stakeholder-mapping': 'stakeholderMapping',
  'user-research': 'userResearch',
  'sense-making': 'senseMaking',
  'persona': 'persona',
  'journey-mapping': 'journeyMapping',
  'reframe': 'reframe',
  'ideation': 'ideation',
  'concept': 'concept',
  'validate': 'validate',
};

/**
 * Load all relevant step artifacts for a workshop.
 * Returns typed object with each step's artifact or null if not yet completed.
 */
export async function loadWorkshopArtifacts(workshopId: string): Promise<WorkshopArtifacts> {
  const rows = await db
    .select({
      stepId: stepArtifacts.stepId,
      artifact: stepArtifacts.artifact,
    })
    .from(stepArtifacts)
    .innerJoin(workshopSteps, eq(stepArtifacts.workshopStepId, workshopSteps.id))
    .where(eq(workshopSteps.workshopId, workshopId));

  const artifacts: WorkshopArtifacts = {
    challenge: null,
    senseMaking: null,
    persona: null,
    journey: null,
    reframe: null,
    concept: null,
  };

  for (const row of rows) {
    const key = STEP_ID_MAP[row.stepId];
    if (key) {
      artifacts[key] = row.artifact as Record<string, unknown>;
    }
  }

  return artifacts;
}

/**
 * Load all 10 step artifacts for a workshop for Build Pack generation.
 * Returns typed object with each step's artifact or null if not yet completed.
 */
export async function loadAllWorkshopArtifacts(workshopId: string): Promise<AllWorkshopArtifacts> {
  const rows = await db
    .select({
      stepId: stepArtifacts.stepId,
      artifact: stepArtifacts.artifact,
    })
    .from(stepArtifacts)
    .innerJoin(workshopSteps, eq(stepArtifacts.workshopStepId, workshopSteps.id))
    .where(eq(workshopSteps.workshopId, workshopId));

  const artifacts: AllWorkshopArtifacts = {
    challenge: null,
    stakeholderMapping: null,
    userResearch: null,
    senseMaking: null,
    persona: null,
    journeyMapping: null,
    reframe: null,
    ideation: null,
    concept: null,
    validate: null,
  };

  for (const row of rows) {
    const key = ALL_STEP_ID_MAP[row.stepId];
    if (key) {
      artifacts[key] = row.artifact as Record<string, unknown>;
    }
  }

  return artifacts;
}

/**
 * Validate that required step artifacts are present.
 * Returns list of missing required step names, or empty array if all present.
 */
export function validateRequiredArtifacts(artifacts: WorkshopArtifacts): string[] {
  const missing: string[] = [];
  if (!artifacts.challenge) missing.push('Step 1 (Challenge)');
  if (!artifacts.persona) missing.push('Step 5 (Persona)');
  if (!artifacts.concept) missing.push('Step 9 (Concept)');
  return missing;
}
