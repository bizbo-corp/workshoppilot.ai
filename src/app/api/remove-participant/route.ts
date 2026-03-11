import { auth } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { sessionParticipants, workshopSessions } from '@/db/schema';
import { workshops } from '@/db/schema';

/**
 * POST /api/remove-participant
 *
 * Removes a participant from a multiplayer workshop session.
 * Only the workshop owner (facilitator) can remove participants.
 *
 * Body: { participantId: string, workshopId: string }
 * Returns: { ok: true } on success
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let participantId: string;
  let workshopId: string;

  try {
    const body = await request.json();
    participantId = body.participantId;
    workshopId = body.workshopId;
    if (!participantId || !workshopId) {
      return Response.json({ error: 'Missing participantId or workshopId' }, { status: 400 });
    }
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Verify caller owns this workshop
  const [workshop] = await db
    .select({ id: workshops.id })
    .from(workshops)
    .where(and(eq(workshops.id, workshopId), eq(workshops.clerkUserId, userId)))
    .limit(1);

  if (!workshop) {
    return Response.json({ error: 'Not authorized' }, { status: 403 });
  }

  // Look up the participant and verify they belong to this workshop's session
  const [participant] = await db
    .select({
      id: sessionParticipants.id,
      role: sessionParticipants.role,
      sessionId: sessionParticipants.sessionId,
    })
    .from(sessionParticipants)
    .innerJoin(workshopSessions, eq(sessionParticipants.sessionId, workshopSessions.id))
    .where(
      and(
        eq(sessionParticipants.id, participantId),
        eq(workshopSessions.workshopId, workshopId),
      )
    )
    .limit(1);

  if (!participant) {
    return Response.json({ error: 'Participant not found' }, { status: 404 });
  }

  // Cannot remove the owner
  if (participant.role === 'owner') {
    return Response.json({ error: 'Cannot remove workshop owner' }, { status: 400 });
  }

  // Set status to 'removed'
  await db
    .update(sessionParticipants)
    .set({ status: 'removed' })
    .where(eq(sessionParticipants.id, participantId));

  return Response.json({ ok: true });
}
