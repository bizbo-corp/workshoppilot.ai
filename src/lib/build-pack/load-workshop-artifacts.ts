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
