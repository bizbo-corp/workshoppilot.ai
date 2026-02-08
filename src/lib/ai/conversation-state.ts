import { db } from '@/db/client';
import { workshopSteps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Arc Phase Type
 *
 * Represents the current phase of the conversational arc for a workshop step.
 * The AI facilitator progresses through these phases:
 * - orient: Introduction, context setting, understanding current state
 * - gather: Collecting information, exploring ideas, asking questions
 * - synthesize: Analyzing patterns, connecting dots, building understanding
 * - refine: Narrowing focus, clarifying details, improving quality
 * - validate: Checking completeness, confirming readiness to move on
 * - complete: Final confirmation, transition preparation
 *
 * Note: This is defined locally to avoid Wave 1 race condition with Plan 08-01.
 * Plan 08-03 will reconcile this with the canonical type in arc-phases.ts.
 */
export type ArcPhase = 'orient' | 'gather' | 'synthesize' | 'refine' | 'validate' | 'complete';

/**
 * Get the current arc phase for a workshop step
 *
 * @param workshopId - The workshop ID
 * @param stepId - The step ID (e.g., 'empathize', 'define')
 * @returns The current arc phase, defaulting to 'orient' if not found
 */
export async function getCurrentArcPhase(
  workshopId: string,
  stepId: string
): Promise<ArcPhase> {
  const result = await db
    .select({ arcPhase: workshopSteps.arcPhase })
    .from(workshopSteps)
    .where(
      and(
        eq(workshopSteps.workshopId, workshopId),
        eq(workshopSteps.stepId, stepId)
      )
    )
    .limit(1);

  return result[0]?.arcPhase ?? 'orient';
}

/**
 * Transition to a new arc phase for a workshop step
 *
 * Updates the arc phase in the database. The AI decides when to transition
 * based on system prompt instructions. This function simply persists the state.
 *
 * @param workshopId - The workshop ID
 * @param stepId - The step ID (e.g., 'empathize', 'define')
 * @param newPhase - The new arc phase to transition to
 */
export async function transitionArcPhase(
  workshopId: string,
  stepId: string,
  newPhase: ArcPhase
): Promise<void> {
  await db
    .update(workshopSteps)
    .set({
      arcPhase: newPhase,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(workshopSteps.workshopId, workshopId),
        eq(workshopSteps.stepId, stepId)
      )
    );
}
