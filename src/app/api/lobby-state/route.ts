import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { sessions } from '@/db/schema';
import {
  resolveClerkParticipant,
  isWorkshopOwner,
} from '@/lib/auth/resolve-participant';
import { getLobbyState } from '@/lib/workshop/lobby-state';

/**
 * GET /api/lobby-state?sessionId=xxx
 *
 * Polled by participants sitting in the lobby to decide whether to show the
 * "Begin <step>" button (facilitator online), the "Waiting on facilitator" +
 * nudge state, or to follow the group into the step when the workshop starts.
 *
 * Membership-gated: only the workshop owner or an active participant may read
 * presence for a session.
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const sessionId = new URL(req.url).searchParams.get('sessionId');
  if (!sessionId) {
    return Response.json({ error: 'sessionId required' }, { status: 400 });
  }

  const sessionRow = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    columns: { workshopId: true },
  });
  if (!sessionRow) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }

  const [participant, owner] = await Promise.all([
    resolveClerkParticipant(sessionRow.workshopId),
    isWorkshopOwner(sessionRow.workshopId, userId),
  ]);
  if (!participant && !owner) {
    return new Response('Forbidden', { status: 403 });
  }

  const state = await getLobbyState(sessionId);
  if (!state) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }
  return Response.json(state);
}
