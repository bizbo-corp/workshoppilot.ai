'use server';

import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { participantResearchContributions } from '@/db/schema';

/**
 * Record (or clear) a participant's "research submitted" status for a step.
 * Mirrors the in-room Liveblocks roster into the DB so the dashboard and reminder
 * emails — which run outside the Liveblocks room — can read who's done.
 */
export async function recordResearchSubmission(
  workshopId: string,
  participantId: string,
  stepId: string,
  submitted: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: 'Unauthorized' };

    if (submitted) {
      await db
        .insert(participantResearchContributions)
        .values({ workshopId, participantId, stepId })
        .onConflictDoNothing({
          target: [
            participantResearchContributions.workshopId,
            participantResearchContributions.participantId,
            participantResearchContributions.stepId,
          ],
        });
    } else {
      await db
        .delete(participantResearchContributions)
        .where(
          and(
            eq(participantResearchContributions.workshopId, workshopId),
            eq(participantResearchContributions.participantId, participantId),
            eq(participantResearchContributions.stepId, stepId),
          ),
        );
    }
    return { success: true };
  } catch (e) {
    console.error('recordResearchSubmission failed:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
