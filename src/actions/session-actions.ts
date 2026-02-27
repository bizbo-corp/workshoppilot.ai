'use server';

import { auth } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { workshops, workshopSessions, workshopSteps, stepArtifacts } from '@/db/schema';
import { getRoomId } from '@/lib/liveblocks/config';

/**
 * Ends a multiplayer workshop session.
 *
 * 1. Verifies caller is the workshop owner (Clerk auth + DB ownership check)
 * 2. Snapshots canvas from Liveblocks REST API → upserts to Neon stepArtifacts
 * 3. Sets workshopSessions.status = 'ended' with endedAt timestamp
 *
 * The SESSION_ENDED broadcast happens on the CLIENT after this action returns
 * (the facilitator calls useBroadcastEvent after success). This ensures the
 * Neon write is committed before participants react.
 *
 * IMPORTANT: Do NOT delete the Liveblocks room — deletion removes all history
 * permanently. The 'ended' status + snapshot is sufficient for archival.
 */
export async function endWorkshopSession(workshopId: string): Promise<{ success: true }> {
  // 1. Auth: only the workshop owner can end the session
  const { userId } = await auth();
  if (!userId) throw new Error('Authentication required');

  const [workshop] = await db
    .select({ id: workshops.id, clerkUserId: workshops.clerkUserId })
    .from(workshops)
    .where(and(eq(workshops.id, workshopId), eq(workshops.clerkUserId, userId)))
    .limit(1);

  if (!workshop) throw new Error('Workshop not found or access denied');

  // 2. Snapshot canvas from Liveblocks REST API
  const roomId = getRoomId(workshopId);
  try {
    const storageRes = await fetch(
      `https://api.liveblocks.io/v2/rooms/${roomId}/storage`,
      {
        headers: { Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}` },
      }
    );

    if (storageRes.ok) {
      const storagePayload = await storageRes.text();
      let storageJson: unknown;
      try {
        storageJson = JSON.parse(storagePayload);
      } catch {
        console.error('endWorkshopSession: failed to parse storage payload as JSON');
        storageJson = null;
      }

      if (storageJson !== null) {
        // Find current in_progress step and upsert snapshot (mirrors webhook pattern)
        const [activeStep] = await db
          .select({ id: workshopSteps.id, stepId: workshopSteps.stepId })
          .from(workshopSteps)
          .where(
            and(
              eq(workshopSteps.workshopId, workshopId),
              eq(workshopSteps.status, 'in_progress')
            )
          )
          .limit(1);

        if (activeStep) {
          await db
            .insert(stepArtifacts)
            .values({
              workshopStepId: activeStep.id,
              stepId: activeStep.stepId,
              artifact: { _canvas: storageJson as Record<string, unknown> },
              schemaVersion: 'liveblocks-1.0',
              version: 1,
            })
            .onConflictDoUpdate({
              target: stepArtifacts.workshopStepId,
              set: {
                artifact: { _canvas: storageJson as Record<string, unknown> },
                extractedAt: new Date(),
              },
            });
        }
      }
    } else {
      // Log but don't throw — session must still end even if snapshot fails
      console.error(
        `endWorkshopSession: failed to snapshot canvas for room=${roomId} status=${storageRes.status}`
      );
    }
  } catch (err) {
    // Log but don't throw — session must still end
    console.error('endWorkshopSession: canvas snapshot error:', err);
  }

  // 3. Mark session ended in Neon
  await db
    .update(workshopSessions)
    .set({ status: 'ended', endedAt: new Date() })
    .where(eq(workshopSessions.workshopId, workshopId));

  return { success: true };
}
