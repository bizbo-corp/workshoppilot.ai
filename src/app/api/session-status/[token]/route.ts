import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { workshopSessions, sessionParticipants } from '@/db/schema';

/**
 * GET /api/session-status/[token]
 * Public polling endpoint for the guest lobby waiting screen.
 *
 * Returns the current session status, workshop title, and live participant list.
 * No authentication required — this endpoint is in isPublicRoute (proxy.ts).
 *
 * Design decisions:
 * - Cache-Control: no-store ensures lobby always gets fresh data (status changes matter).
 * - Only 'active' participants are returned — 'away' and 'removed' participants
 *   are excluded to show the current live cohort.
 * - Ordered by joinedAt ASC so the participant list is stable and deterministic.
 */

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { token } = await params;

  // Query the workshop session by share token, including the workshop title
  const workshopSession = await db.query.workshopSessions.findFirst({
    where: eq(workshopSessions.shareToken, token),
    with: {
      workshop: true,
    },
  });

  if (!workshopSession) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Query active participants for the live lobby list
  const participants = await db
    .select({
      displayName: sessionParticipants.displayName,
      color: sessionParticipants.color,
      role: sessionParticipants.role,
      id: sessionParticipants.id,
    })
    .from(sessionParticipants)
    .where(
      and(
        eq(sessionParticipants.sessionId, workshopSession.id),
        eq(sessionParticipants.status, 'active')
      )
    )
    .orderBy(sessionParticipants.joinedAt);

  return NextResponse.json(
    {
      status: workshopSession.status,
      workshopTitle: workshopSession.workshop.title,
      participantCount: participants.length,
      participants: participants.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        color: p.color,
        role: p.role,
      })),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
