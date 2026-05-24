import { auth, currentUser } from '@clerk/nextjs/server';
import { eq, and, ne, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { workshopSessions, sessionParticipants, sessions, workshopSteps } from '@/db/schema';
import { PARTICIPANT_COLORS } from '@/lib/liveblocks/config';
import { deriveParticipantName } from '@/lib/auth/participant-name';
import { prefetchStepStartGreeting } from '@/lib/ai/prefetch-greeting';
import { after } from 'next/server';

/**
 * POST /api/guest-join
 * Joins a multiplayer workshop via the team-wide share token. Requires a Clerk
 * session — the participant's identity (name + stable id) comes from their
 * Clerk account, not a free-text field. This removes the old name-match
 * "rejoin" path that let one person inherit another's participant identity.
 *
 * Body: { shareToken: string }
 * Response: { ok: true, participantId, workshopId, sessionId, displayName, color }
 *
 * Identity is keyed on (sessionId, clerkUserId): a returning user re-joins the
 * same participant row; a new user gets a fresh one (bounded by maxParticipants).
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { shareToken } = body as Record<string, unknown>;
  if (!shareToken || typeof shareToken !== 'string') {
    return Response.json({ error: 'shareToken is required' }, { status: 400 });
  }

  // Look up the workshop session by shareToken
  const workshopSession = await db.query.workshopSessions.findFirst({
    where: eq(workshopSessions.shareToken, shareToken),
    with: { workshop: true },
  });
  if (!workshopSession) {
    return Response.json({ error: 'Invalid or expired share link' }, { status: 404 });
  }
  if (workshopSession.status === 'ended') {
    return Response.json({ error: 'This workshop session has ended' }, { status: 410 });
  }

  // Returning user — reuse their existing participant row for this session.
  const existing = await db.query.sessionParticipants.findFirst({
    where: and(
      eq(sessionParticipants.sessionId, workshopSession.id),
      eq(sessionParticipants.clerkUserId, userId),
      ne(sessionParticipants.status, 'removed'),
    ),
  });
  if (existing) {
    return Response.json({
      ok: true,
      participantId: existing.id,
      workshopId: workshopSession.workshopId,
      sessionId: workshopSession.id,
      displayName: existing.displayName,
      color: existing.color,
    });
  }

  // New participant — derive identity from the Clerk account.
  const user = await currentUser();
  const displayName = deriveParticipantName(user);

  // Enforce the participant cap to bound AI/MAU cost on the open link.
  const [{ count: existingCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessionParticipants)
    .where(
      and(
        eq(sessionParticipants.sessionId, workshopSession.id),
        ne(sessionParticipants.status, 'removed'),
      ),
    );
  if (existingCount >= workshopSession.maxParticipants) {
    return Response.json({ error: 'Workshop is full' }, { status: 409 });
  }

  // Index 0 = owner; participants start at 1.
  const color = PARTICIPANT_COLORS[(existingCount + 1) % PARTICIPANT_COLORS.length];

  // Insert; the partial unique index on (sessionId, clerkUserId) makes this
  // race-safe across concurrent tabs. On conflict, re-read the winning row.
  const inserted = await db
    .insert(sessionParticipants)
    .values({
      sessionId: workshopSession.id,
      clerkUserId: userId,
      liveblocksUserId: userId,
      displayName,
      color,
      role: 'participant',
      status: 'active',
    })
    .onConflictDoNothing()
    .returning();

  let participant = inserted[0];
  if (!participant) {
    const found = await db.query.sessionParticipants.findFirst({
      where: and(
        eq(sessionParticipants.sessionId, workshopSession.id),
        eq(sessionParticipants.clerkUserId, userId),
      ),
    });
    if (!found) {
      return Response.json({ error: 'Failed to join workshop' }, { status: 500 });
    }
    participant = found;
  }

  // Eager greeting prefetch — scoped to this new participant on whichever step
  // is currently in_progress. Fire-and-forget in the post-response queue.
  // See src/lib/ai/prefetch-greeting.ts for race semantics.
  try {
    const [urlSession] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.workshopId, workshopSession.workshopId))
      .limit(1);
    const [currentStep] = urlSession
      ? await db
          .select({ stepId: workshopSteps.stepId })
          .from(workshopSteps)
          .where(
            and(
              eq(workshopSteps.workshopId, workshopSession.workshopId),
              eq(workshopSteps.status, 'in_progress'),
            ),
          )
          .limit(1)
      : [];
    if (urlSession && currentStep) {
      after(() =>
        prefetchStepStartGreeting({
          workshopId: workshopSession.workshopId,
          sessionId: urlSession.id,
          stepId: currentStep.stepId,
          participantId: participant!.id,
          participantName: participant!.displayName,
        }),
      );
    }
  } catch (err) {
    console.error('[guest-join] greeting prefetch scheduling failed:', err);
  }

  return Response.json({
    ok: true,
    participantId: participant.id,
    workshopId: workshopSession.workshopId,
    sessionId: workshopSession.id,
    displayName: participant.displayName,
    color: participant.color,
  });
}
