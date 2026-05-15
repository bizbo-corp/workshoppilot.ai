import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import {
  chatMessages,
  sessionParticipants,
  sessions,
  workshops,
  workshopInvitations,
} from '@/db/schema';
import { eq, and, sql, isNotNull } from 'drizzle-orm';
import { NUDGE_COOLDOWN_MS } from '@/lib/workshop/nudge-config';

/**
 * GET /api/participant-activity?sessionId=xxx&stepId=xxx
 *
 * Returns the facilitator's view of the workshop:
 *   - `active`: participants who have joined the session (existing data)
 *   - `pending`: invitations that haven't been accepted yet, with cooldown info
 *     so the client can render Nudge UI
 *
 * Facilitator-only: returns 403 if the caller is not the workshop owner.
 * Pending invites contain participant emails, so ownership must be enforced here.
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const stepId = searchParams.get('stepId');

  if (!sessionId) {
    return Response.json({ error: 'sessionId required' }, { status: 400 });
  }

  // Resolve session → workshop → owner, and verify the caller is the owner.
  const [sessionRow] = await db
    .select({
      workshopId: sessions.workshopId,
      ownerId: workshops.clerkUserId,
    })
    .from(sessions)
    .innerJoin(workshops, eq(sessions.workshopId, workshops.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!sessionRow) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }
  if (sessionRow.ownerId !== userId) {
    return new Response('Forbidden', { status: 403 });
  }

  // Active participants (existing behaviour)
  const participants = await db
    .select()
    .from(sessionParticipants)
    .where(
      and(
        eq(sessionParticipants.sessionId, sessionId),
        eq(sessionParticipants.role, 'participant'),
      )
    );

  const messageCounts = await db
    .select({
      participantId: chatMessages.participantId,
      count: sql<number>`count(*)::int`,
      lastActivity: sql<string>`max(${chatMessages.createdAt})`,
    })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.sessionId, sessionId),
        isNotNull(chatMessages.participantId),
        ...(stepId ? [eq(chatMessages.stepId, stepId)] : []),
      )
    )
    .groupBy(chatMessages.participantId);

  const countMap = new Map(
    messageCounts.map((m) => [m.participantId, { count: m.count, lastActivity: m.lastActivity }])
  );

  const active = participants.map((p) => ({
    participantId: p.id,
    displayName: p.displayName,
    color: p.color,
    status: p.status,
    rejoinToken: p.rejoinToken,
    messageCount: countMap.get(p.id)?.count || 0,
    lastActivity: countMap.get(p.id)?.lastActivity || null,
  }));

  // Pending invitations — emails the facilitator can nudge.
  const pendingRows = await db
    .select({
      id: workshopInvitations.id,
      email: workshopInvitations.email,
      invitedAt: workshopInvitations.invitedAt,
    })
    .from(workshopInvitations)
    .where(
      and(
        eq(workshopInvitations.workshopId, sessionRow.workshopId),
        eq(workshopInvitations.status, 'pending')
      )
    );

  const now = Date.now();
  const pending = pendingRows.map((r) => {
    const lastSent = r.invitedAt instanceof Date ? r.invitedAt.getTime() : 0;
    const elapsed = now - lastSent;
    return {
      id: r.id,
      email: r.email,
      invitedAt: r.invitedAt instanceof Date ? r.invitedAt.toISOString() : null,
      cooldownMsRemaining: Math.max(0, NUDGE_COOLDOWN_MS - elapsed),
    };
  });

  return Response.json({ active, pending });
}
