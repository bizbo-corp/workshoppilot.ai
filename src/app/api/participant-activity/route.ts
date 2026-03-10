import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import { chatMessages, sessionParticipants } from '@/db/schema';
import { eq, and, sql, isNotNull } from 'drizzle-orm';

/**
 * GET /api/participant-activity?sessionId=xxx&stepId=xxx
 * Returns per-participant summary for facilitator overview.
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

  // Get all participants for this session
  const participants = await db
    .select()
    .from(sessionParticipants)
    .where(
      and(
        eq(sessionParticipants.sessionId, sessionId),
        eq(sessionParticipants.role, 'participant'),
      )
    );

  // Get message counts per participant
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

  const result = participants.map((p) => ({
    participantId: p.id,
    displayName: p.displayName,
    color: p.color,
    status: p.status,
    messageCount: countMap.get(p.id)?.count || 0,
    lastActivity: countMap.get(p.id)?.lastActivity || null,
  }));

  return Response.json(result);
}
