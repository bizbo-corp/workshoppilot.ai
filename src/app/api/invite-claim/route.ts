import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  workshopInvitations,
  workshopSessions,
  sessions,
  sessionParticipants,
} from '@/db/schema';
import { createPrefixedId } from '@/lib/ids';
import { PARTICIPANT_COLORS } from '@/lib/liveblocks/config';
import { COOKIE_NAME, signGuestCookie, verifyGuestCookie } from '@/lib/auth/guest-cookie';
import { markInvitationAccepted } from '@/actions/invitation-actions';

/**
 * POST /api/invite-claim
 * Claims a workshop invitation. Mirrors /api/guest-join but uses an invite token
 * (per-invitee URL secret) rather than the team-wide share token, and marks the
 * invitation 'accepted'.
 *
 * Body: { inviteToken: string, displayName: string }
 * Response: { ok: true, participantId, sessionId, urlSessionId, displayName }
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { inviteToken, displayName } = body as Record<string, unknown>;
  if (!inviteToken || typeof inviteToken !== 'string') {
    return Response.json({ error: 'inviteToken is required' }, { status: 400 });
  }
  if (!displayName || typeof displayName !== 'string') {
    return Response.json({ error: 'displayName is required' }, { status: 400 });
  }

  const trimmedName = displayName.trim();
  if (trimmedName.length < 2 || trimmedName.length > 30) {
    return Response.json(
      { error: 'Display name must be between 2 and 30 characters' },
      { status: 400 }
    );
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

  const { userId: clerkUserId } = await auth();
  const cookieStore = await cookies();

  // Dedup priority: invitation already linked → Clerk → cookie → create new

  // 1. Already-linked participant
  if (invitation.sessionParticipantId) {
    const [existing] = await db
      .select()
      .from(sessionParticipants)
      .where(eq(sessionParticipants.id, invitation.sessionParticipantId))
      .limit(1);
    if (existing && existing.status !== 'removed') {
      await refreshGuestCookie(existing.id, wSession.workshopId, cookieStore);
      // Update name + link Clerk account if applicable
      const updates: Partial<{ displayName: string; clerkUserId: string }> = {};
      if (existing.displayName !== trimmedName) updates.displayName = trimmedName;
      if (clerkUserId && !existing.clerkUserId) updates.clerkUserId = clerkUserId;
      if (Object.keys(updates).length > 0) {
        await db
          .update(sessionParticipants)
          .set(updates)
          .where(eq(sessionParticipants.id, existing.id));
      }
      return Response.json({
        ok: true,
        participantId: existing.id,
        sessionId: wSession.id,
        urlSessionId: urlSession.id,
        workshopId: wSession.workshopId,
        displayName: trimmedName,
      });
    }
  }

  // 2. Clerk-authenticated user already in this session
  if (clerkUserId) {
    const [clerkParticipant] = await db
      .select()
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.sessionId, wSession.id),
          eq(sessionParticipants.clerkUserId, clerkUserId)
        )
      )
      .limit(1);
    if (clerkParticipant && clerkParticipant.status !== 'removed') {
      await markInvitationAccepted(inviteToken, clerkParticipant.id);
      await refreshGuestCookie(clerkParticipant.id, wSession.workshopId, cookieStore);
      if (clerkParticipant.displayName !== trimmedName) {
        await db
          .update(sessionParticipants)
          .set({ displayName: trimmedName })
          .where(eq(sessionParticipants.id, clerkParticipant.id));
      }
      return Response.json({
        ok: true,
        participantId: clerkParticipant.id,
        sessionId: wSession.id,
        urlSessionId: urlSession.id,
        workshopId: wSession.workshopId,
        displayName: trimmedName,
      });
    }
  }

  // 3. Guest cookie pointing to a participant in this session
  const existingCookie = cookieStore.get(COOKIE_NAME);
  if (existingCookie?.value) {
    const payload = verifyGuestCookie(existingCookie.value);
    if (payload && payload.workshopId === wSession.workshopId) {
      const [cookieParticipant] = await db
        .select()
        .from(sessionParticipants)
        .where(eq(sessionParticipants.id, payload.participantId))
        .limit(1);
      if (
        cookieParticipant &&
        cookieParticipant.status !== 'removed' &&
        cookieParticipant.sessionId === wSession.id
      ) {
        await markInvitationAccepted(inviteToken, cookieParticipant.id);
        await refreshGuestCookie(cookieParticipant.id, wSession.workshopId, cookieStore);
        if (cookieParticipant.displayName !== trimmedName) {
          await db
            .update(sessionParticipants)
            .set({ displayName: trimmedName })
            .where(eq(sessionParticipants.id, cookieParticipant.id));
        }
        return Response.json({
          ok: true,
          participantId: cookieParticipant.id,
          sessionId: wSession.id,
          urlSessionId: urlSession.id,
          workshopId: wSession.workshopId,
          displayName: trimmedName,
        });
      }
    }
  }

  // 4. Create a fresh participant
  const [{ count: existingCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessionParticipants)
    .where(eq(sessionParticipants.sessionId, wSession.id));
  if (existingCount >= wSession.maxParticipants) {
    return Response.json({ error: 'Workshop is full' }, { status: 409 });
  }

  const colorIndex = (existingCount + 1) % PARTICIPANT_COLORS.length;
  const color = PARTICIPANT_COLORS[colorIndex];
  const liveblocksUserId = clerkUserId ?? createPrefixedId('guest');
  const newRejoinToken = randomBytes(12).toString('base64url');

  const [participant] = await db
    .insert(sessionParticipants)
    .values({
      sessionId: wSession.id,
      clerkUserId: clerkUserId ?? null,
      liveblocksUserId,
      displayName: trimmedName,
      color,
      role: 'participant',
      status: 'active',
      rejoinToken: newRejoinToken,
    })
    .returning();

  await markInvitationAccepted(inviteToken, participant.id);
  await refreshGuestCookie(participant.id, wSession.workshopId, cookieStore);

  return Response.json({
    ok: true,
    participantId: participant.id,
    sessionId: wSession.id,
    urlSessionId: urlSession.id,
    workshopId: wSession.workshopId,
    displayName: trimmedName,
  });
}

async function refreshGuestCookie(
  participantId: string,
  workshopId: string,
  cookieStore: Awaited<ReturnType<typeof cookies>>
) {
  const signed = signGuestCookie({
    participantId,
    workshopId,
    iat: Date.now(),
  });
  cookieStore.set(COOKIE_NAME, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
}
