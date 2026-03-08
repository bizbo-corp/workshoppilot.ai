/**
 * Shared workshop context loader
 * Loads workshop challenge + reframed HMW for prompt enrichment in image generation APIs
 */

import { db } from '@/db/client';
import { workshops, workshopSteps, stepArtifacts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export type WorkshopContext = {
  originalIdea?: string;
  problemStatement?: string;
  hmwStatement?: string;
  reframedHmw?: string;
};

/**
 * Load workshop context: challenge + reframed HMW for prompt enrichment
 */
export async function loadWorkshopContext(workshopId: string): Promise<WorkshopContext> {
  const context: WorkshopContext = {};

  // Load workshop original idea
  const [workshop] = await db
    .select({ originalIdea: workshops.originalIdea })
    .from(workshops)
    .where(eq(workshops.id, workshopId))
    .limit(1);

  if (workshop) {
    context.originalIdea = workshop.originalIdea;
  }

  // Load challenge artifact (Step 1)
  const [challengeStep] = await db
    .select({ id: workshopSteps.id })
    .from(workshopSteps)
    .where(
      and(
        eq(workshopSteps.workshopId, workshopId),
        eq(workshopSteps.stepId, 'challenge'),
      ),
    )
    .limit(1);

  if (challengeStep) {
    const [art] = await db
      .select({ artifact: stepArtifacts.artifact })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, challengeStep.id))
      .limit(1);

    if (art) {
      const a = art.artifact as Record<string, unknown>;
      context.problemStatement = (a.problemStatement as string) || undefined;
      context.hmwStatement = (a.hmwStatement as string) || undefined;
    }
  }

  // Load reframe artifact (Step 7) for reframed HMW
  const [reframeStep] = await db
    .select({ id: workshopSteps.id })
    .from(workshopSteps)
    .where(
      and(
        eq(workshopSteps.workshopId, workshopId),
        eq(workshopSteps.stepId, 'reframe'),
      ),
    )
    .limit(1);

  if (reframeStep) {
    const [art] = await db
      .select({ artifact: stepArtifacts.artifact })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, reframeStep.id))
      .limit(1);

    if (art) {
      const a = art.artifact as Record<string, unknown>;
      const hmwStatements = a.hmwStatements as
        | Array<{ fullStatement?: string }>
        | undefined;
      if (hmwStatements?.[0]?.fullStatement) {
        context.reframedHmw = hmwStatements[0].fullStatement;
      }
    }
  }

  return context;
}
