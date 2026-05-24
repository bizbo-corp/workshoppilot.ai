import { auth, currentUser } from '@clerk/nextjs/server';
import { and, eq, ne, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  workshopInvitations,
  workshopSessions,
  sessions,
  sessionParticipants,
  workshopSteps,
} from '@/db/schema';
import { PARTICIPANT_COLORS } from '@/lib/liveblocks/config';
import { deriveParticipantName, getPrimaryEmail } from '@/lib/auth/participant-name';
import { markInvitationAccepted } from '@/actions/invitation-actions';
import { prefetchStepStartGreeting } from '@/lib/ai/prefetch-greeting';
import { after } from 'next/server';

/**
 * POST /api/invite-claim
 * Claims a workshop invitation. Requires a Clerk session whose verified primary
 * email matches the address the invite was sent to — the invite is locked to
 * its recipient. Identity (name + id) comes from the Clerk account.
 *
 * Body: { inviteToken: string }
 * Response: { ok: true, participantId, sessionId, urlSessionId, workshopId, displayName }
 *           | { error, ...} with 401 / 403 / 404 / 409 / 410
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

  const { inviteToken } = body as Record<string, unknown>;
  if (!inviteToken || typeof inviteToken !== 'string') {
    return Response.json({ error: 'inviteToken is required' }, { status: 400 });
  }

  // Look up invitation
  const invitation = await db.query.workshopInvitations.findFirst({
    where: eq(workshopInvitations.inviteToken, inviteToken),
  });
  if (!invitation) {
    return Response.json({ error: 'Invalid or expired invitation' }, { status: 404 });
  }
  if (invitation.status === 'revoked' || invitation.status === 'expired') {
    return Response.json({ error: 'This invitation is no longer valid' }, { status: 410 });
  }

  // Email lock: the signed-in account must own the invited address. Re-checked
  // here (not just on the page) so the API can never be claimed by another user.
  const user = await currentUser();
  const signedInEmail = getPrimaryEmail(user);
  if (!signedInEmail || signedInEmail !== invitation.email.toLowerCase()) {
    return Response.json(
      {
        error: 'email_mismatch',
        invitedEmail: invitation.email,
        signedInEmail: signedInEmail ?? null,
      },
      { status: 403 },
    );
  }

  // Resolve the workshop session
  const [wSession] = await db
    .select({
      id: workshopSessions.id,
      workshopId: workshopSessions.workshopId,
      maxParticipants: workshopSessions.maxParticipants,
      status: workshopSessions.status,
    })
    .from(workshopSessions)
    .where(eq(workshopSessions.workshopId, invitation.workshopId))
    .limit(1);
  if (!wSession) {
    return Response.json({ error: 'Workshop session not found' }, { status: 404 });
  }
  if (wSession.status === 'ended') {
    return Response.json({ error: 'This workshop has ended' }, { status: 410 });
  }

  // Resolve the URL session id for the redirect target
  const [urlSession] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.workshopId, wSession.workshopId))
    .limit(1);
  if (!urlSession) {
    return Response.json({ error: 'Workshop is not initialised' }, { status: 500 });
  }

  const displayName = deriveParticipantName(user);

  // 1. Returning user — already has a participant row for this session.
  const [existing] = await db
    .select()
    .from(sessionParticipants)
    .where(
      and(
        eq(sessionParticipants.sessionId, wSession.id),
        eq(sessionParticipants.clerkUserId, userId),
        ne(sessionParticipants.status, 'removed'),
      ),
    )
    .limit(1);
  if (existing) {
    await markInvitationAccepted(inviteToken, existing.id);
    return Response.json({
      ok: true,
      participantId: existing.id,
      sessionId: wSession.id,
      urlSessionId: urlSession.id,
      workshopId: wSession.workshopId,
      displayName: existing.displayName,
    });
  }

  // 2. Legacy re-link — this invitation was previously claimed by an
  //    unauthenticated guest. Attach the Clerk identity to that same row so the
  //    participant's prior canvas/approval state is preserved (we keep their
  //    original liveblocksUserId so existing contributions stay attributed).
  if (invitation.sessionParticipantId) {
    const [legacy] = await db
      .select()
      .from(sessionParticipants)
      .where(eq(sessionParticipants.id, invitation.sessionParticipantId))
      .limit(1);
    if (legacy && legacy.status !== 'removed' && !legacy.clerkUserId) {
      await db
        .update(sessionParticipants)
        .set({ clerkUserId: userId, displayName })
        .where(eq(sessionParticipants.id, legacy.id));
      await markInvitationAccepted(inviteToken, legacy.id);
      return Response.json({
        ok: true,
        participantId: legacy.id,
        sessionId: wSession.id,
        urlSessionId: urlSession.id,
        workshopId: wSession.workshopId,
        displayName,
      });
    }
  }

  // 3. Create a fresh participant (bounded by maxParticipants).
  const [{ count: existingCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessionParticipants)
    .where(
      and(
        eq(sessionParticipants.sessionId, wSession.id),
        ne(sessionParticipants.status, 'removed'),
      ),
    );
  if (existingCount >= wSession.maxParticipants) {
    return Response.json({ error: 'Workshop is full' }, { status: 409 });
  }

  const color = PARTICIPANT_COLORS[(existingCount + 1) % PARTICIPANT_COLORS.length];

  const inserted = await db
    .insert(sessionParticipants)
    .values({
      sessionId: wSession.id,
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
        eq(sessionParticipants.sessionId, wSession.id),
        eq(sessionParticipants.clerkUserId, userId),
      ),
    });
    if (!found) {
      return Response.json({ error: 'Failed to join workshop' }, { status: 500 });
    }
    participant = found;
  }

  await markInvitationAccepted(inviteToken, participant.id);

  // Eager greeting prefetch for whichever step is currently in_progress, scoped
  // to this new participant. Fire-and-forget in the post-response queue. See
  // src/lib/ai/prefetch-greeting.ts for race semantics with __step_start__.
  try {
    const [currentStep] = await db
      .select({ stepId: workshopSteps.stepId })
      .from(workshopSteps)
      .where(
        and(
          eq(workshopSteps.workshopId, wSession.workshopId),
          eq(workshopSteps.status, 'in_progress'),
        ),
      )
      .limit(1);
    if (currentStep) {
      after(() =>
        prefetchStepStartGreeting({
          workshopId: wSession.workshopId,
          sessionId: urlSession.id,
          stepId: currentStep.stepId,
          participantId: participant!.id,
          participantName: participant!.displayName,
        }),
      );
    }
  } catch (err) {
    console.error('[invite-claim] greeting prefetch scheduling failed:', err);
  }

  return Response.json({
    ok: true,
    participantId: participant.id,
    sessionId: wSession.id,
    urlSessionId: urlSession.id,
    workshopId: wSession.workshopId,
    displayName: participant.displayName,
  });
}
