/**
 * Cascade Invalidation Service
 * Marks downstream steps as needs_regeneration when a user revises an earlier step
 *
 * When a user clicks "Revise This Step" on a completed step:
 * 1. The revised step is reset to in_progress (arcPhase: orient, completedAt: null)
 * 2. All downstream steps (higher order numbers) are marked needs_regeneration
 * 3. Artifacts and summaries are preserved as starting points for regeneration
 */

import { db } from '@/db/client';
import { workshopSteps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { STEPS } from '@/lib/workshop/step-metadata';

/**
 * Invalidates downstream steps when a user revises an earlier step
 *
 * @param workshopId - The workshop ID
 * @param revisedStepId - The step ID being revised (e.g., 'challenge', 'stakeholder-mapping')
 * @returns Object with count of invalidated steps
 */
export async function invalidateDownstreamSteps(
  workshopId: string,
  revisedStepId: string
): Promise<{ invalidatedCount: number }> {
  try {
    // Find the order of the revised step
    const revisedStep = STEPS.find((s) => s.id === revisedStepId);

    if (!revisedStep) {
      throw new Error(`Step ${revisedStepId} not found in STEPS array`);
    }

    // Reset the revised step itself to in_progress
    // This puts the user back into active editing mode for that step
    await db
      .update(workshopSteps)
      .set({
        status: 'in_progress',
        arcPhase: 'orient', // Reset arc phase to re-orient the user
        completedAt: null, // Clear completion timestamp
      })
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, revisedStepId)
        )
      );

    // Filter STEPS to get downstream steps (order > revisedStep.order)
    const downstreamSteps = STEPS.filter((s) => s.order > revisedStep.order);

    // If no downstream steps (e.g., revising step 10), return early
    if (downstreamSteps.length === 0) {
      return { invalidatedCount: 0 };
    }

    // For each downstream step, update status to needs_regeneration
    // Reset timestamps but preserve artifacts/summaries (they serve as starting points)
    let invalidatedCount = 0;

    for (const step of downstreamSteps) {
      await db
        .update(workshopSteps)
        .set({
          status: 'needs_regeneration',
          arcPhase: 'orient', // Reset arc phase so re-entering re-orients
          completedAt: null, // Clear completion timestamp
        })
        .where(
          and(
            eq(workshopSteps.workshopId, workshopId),
            eq(workshopSteps.stepId, step.id)
          )
        );
      invalidatedCount++;
    }

    return { invalidatedCount };
  } catch (error) {
    console.error('Failed to invalidate downstream steps:', error);
    throw error;
  }
}
