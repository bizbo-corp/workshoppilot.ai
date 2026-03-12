import { cookies } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { workshopSessions, sessionParticipants } from '@/db/schema';
import { createPrefixedId } from '@/lib/ids';
import { PARTICIPANT_COLORS } from '@/lib/liveblocks/config';
import { signGuestCookie, verifyGuestCookie, COOKIE_NAME } from '@/lib/auth/guest-cookie';

/**
 * POST /api/guest-join
 * Guest name submission endpoint — creates a session participant and sets an
 * HttpOnly signed cookie establishing the guest's identity.
 *
 * Request body: { shareToken: string, displayName: string }
 * Response: { ok: true, participantId, workshopId, sessionId, displayName, color }
 *
 * Design decisions:
 * - HttpOnly cookie prevents XSS access to the token.
 * - sameSite: 'lax' (NOT 'strict') — 'strict' drops the cookie on navigation
 *   from external links (the share link scenario), breaking first-load auth.
 * - 8-hour maxAge covers a full workshop session.
 * - Color assigned by slot: index 0 = owner indigo, guests start at index 1.
 * - liveblocksUserId prefixed with 'guest' — distinguishable from Clerk user IDs
 *   in the Liveblocks dashboard and session_participants table.
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

  const { shareToken, displayName } = body as Record<string, unknown>;

  // Validate shareToken
  if (!shareToken || typeof shareToken !== 'string') {
    return Response.json({ error: 'shareToken is required' }, { status: 400 });
  }

  // Validate displayName: trimmed, 2-30 chars
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

  // Look up the workshop session by shareToken
  const workshopSession = await db.query.workshopSessions.findFirst({
    where: eq(workshopSessions.shareToken, shareToken),
    with: {
      workshop: true,
    },
  });

  if (!workshopSession) {
    return Response.json({ error: 'Invalid or expired share link' }, { status: 404 });
  }

  if (workshopSession.status === 'ended') {
    return Response.json({ error: 'This workshop session has ended' }, { status: 410 });
  }

  // Clerk-first deduplication: cross-device identity for signed-in guests
  const { userId: clerkUserId } = await auth();

  const cookieStore = await cookies();

  if (clerkUserId) {
    const clerkParticipant = await db.query.sessionParticipants.findFirst({
      where: and(
        eq(sessionParticipants.clerkUserId, clerkUserId),
        eq(sessionParticipants.sessionId, workshopSession.id)
      ),
    });

    if (clerkParticipant && clerkParticipant.status !== 'removed') {
      // Reuse existing participant — update name if changed
      if (clerkParticipant.displayName !== trimmedName) {
        await db
          .update(sessionParticipants)
          .set({ displayName: trimmedName })
          .where(eq(sessionParticipants.id, clerkParticipant.id));
      }
      // Refresh the cookie (resets 8-hour expiry)
      const signedToken = signGuestCookie({
        participantId: clerkParticipant.id,
        workshopId: workshopSession.workshopId,
        iat: Date.now(),
      });
      cookieStore.set(COOKIE_NAME, signedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 8,
      });
      return Response.json({
        ok: true,
        participantId: clerkParticipant.id,
        workshopId: workshopSession.workshopId,
        sessionId: workshopSession.id,
        displayName: trimmedName,
        color: clerkParticipant.color,
      });
    }
    // clerkParticipant not found or removed — fall through to cookie dedup / create new
  }

  // Cookie deduplication: reuse existing participant if cookie is valid
  const existingCookie = cookieStore.get(COOKIE_NAME);
  if (existingCookie?.value) {
    const payload = verifyGuestCookie(existingCookie.value);
    if (payload && payload.workshopId === workshopSession.workshopId) {
      const existing = await db.query.sessionParticipants.findFirst({
        where: eq(sessionParticipants.id, payload.participantId),
      });
      if (existing && existing.status !== 'removed' && existing.sessionId === workshopSession.id) {
        // Update display name if changed; link Clerk account if present and not yet linked
        const updates: Partial<{ displayName: string; clerkUserId: string }> = {};
        if (existing.displayName !== trimmedName) {
          updates.displayName = trimmedName;
        }
        if (clerkUserId && !existing.clerkUserId) {
          updates.clerkUserId = clerkUserId;
        }
        if (Object.keys(updates).length > 0) {
          await db
            .update(sessionParticipants)
            .set(updates)
            .where(eq(sessionParticipants.id, existing.id));
        }
        // Refresh the cookie (resets 8-hour expiry)
        const signedToken = signGuestCookie({
          participantId: existing.id,
          workshopId: workshopSession.workshopId,
          iat: Date.now(),
        });
        cookieStore.set(COOKIE_NAME, signedToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 8,
        });
        return Response.json({
          ok: true,
          participantId: existing.id,
          workshopId: workshopSession.workshopId,
          sessionId: workshopSession.id,
          displayName: trimmedName,
          color: existing.color,
        });
      }
    }
  }

  // Count existing participants to assign color slot
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessionParticipants)
    .where(eq(sessionParticipants.sessionId, workshopSession.id));

  const existingCount = countResult[0]?.count ?? 0;

  // Index 0 = owner indigo, guests start at 1
  const colorIndex = (existingCount + 1) % PARTICIPANT_COLORS.length;
  const color = PARTICIPANT_COLORS[colorIndex];

  // Generate a unique Liveblocks user ID for this guest
  const liveblocksUserId = createPrefixedId('guest');

  // Insert the session participant record
  const [participant] = await db
    .insert(sessionParticipants)
    .values({
      sessionId: workshopSession.id,
      clerkUserId: clerkUserId ?? null,
      liveblocksUserId,
      displayName: trimmedName,
      color,
      role: 'participant',
      status: 'active',
    })
    .returning();

  // Sign the guest cookie
  const signedToken = signGuestCookie({
    participantId: participant.id,
    workshopId: workshopSession.workshopId,
    iat: Date.now(),
  });

  // Set the HttpOnly signed cookie
  cookieStore.set(COOKIE_NAME, signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // 'lax' required — 'strict' drops cookie on navigation from share link
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours — covers a full workshop session
  });

  return Response.json({
    ok: true,
    participantId: participant.id,
    workshopId: workshopSession.workshopId,
    sessionId: workshopSession.id,
    displayName: trimmedName,
    color,
  });
}
