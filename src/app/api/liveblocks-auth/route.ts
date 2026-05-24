import { auth, currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { Liveblocks } from '@liveblocks/node';
import { eq, and } from 'drizzle-orm';
import { PARTICIPANT_COLORS } from '@/lib/liveblocks/config';
import { isWorkshopOwner } from '@/lib/auth/resolve-participant';
import { db } from '@/db/client';
import { sessionParticipants, workshopSessions } from '@/db/schema';

/**
 * Liveblocks auth endpoint — issues access tokens for Clerk-authenticated users.
 *
 * Called by the Liveblocks client SDK when entering a multiplayer room. All
 * participants are now Clerk-authenticated, so the token is always derived from
 * the Clerk session: a participant is looked up by (sessionId, clerkUserId);
 * everyone else with a Clerk session is treated as the owner/facilitator.
 *
 * Design decisions:
 * - Request body is parsed ONCE at the top — request.json() can only be called once.
 * - A signed-out request returns 503 (transient) if a Clerk session cookie is
 *   present (JWT likely mid-refresh) so the client retries, else 401.
 * - FULL_ACCESS granted for all authenticated users — room-level authorization relies
 *   on the Liveblocks room ID being unpredictable (derived from workshopId UUID).
 *
 * Implementation note — lazy initialization:
 * The Liveblocks constructor validates the secret key format at instantiation time.
 * Module-level initialization fails at build time when LIVEBLOCKS_SECRET_KEY is
 * not set (e.g., CI builds, local dev without .env.local). Lazy initialization
 * inside the POST handler defers this to request time, matching Next.js conventions
 * for environment-dependent server modules.
 */

// Lazily initialized Liveblocks client — avoids build-time env var validation failure
let _liveblocks: Liveblocks | null = null;

function getLiveblocksClient(): Liveblocks {
  if (!_liveblocks) {
    _liveblocks = new Liveblocks({
      secret: process.env.LIVEBLOCKS_SECRET_KEY!,
    });
  }
  return _liveblocks;
}

export async function POST(request: Request) {
  // Step 1: Parse the request body ONCE — request.json() can only be called once
  let room: string;
  try {
    const body = await request.json();
    room = body.room;
    if (!room || typeof room !== 'string') {
      return new Response('Missing or invalid room', { status: 400 });
    }
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  // Step 2: Require a Clerk session. A signed-out request with a Clerk session
  // cookie present is likely a mid-refresh JWT — return 503 so the client
  // retries instead of dropping the user out of the room.
  const { userId } = await auth();
  if (!userId) {
    const cookieStore = await cookies();
    const hasClerkSession = cookieStore.has('__session') || cookieStore.has('__client');
    if (hasClerkSession) {
      console.warn('[liveblocks-auth] Clerk session cookie present but auth() returned null — JWT likely refreshing, returning 503 for retry');
      return new Response('Auth temporarily unavailable', { status: 503 });
    }
    return new Response('Unauthorized', { status: 401 });
  }

  // Step 3: Resolve the workshop this room belongs to and authorize by
  // membership. Room format: "workshop-{workshopId}[-step-{stepId}]".
  const roomWorkshopId = room.startsWith('workshop-')
    ? room.replace(/^workshop-/, '').replace(/-step-.*$/, '')
    : null;

  // Every legitimate room is workshop-scoped. A room we can't parse is not
  // something this endpoint should grant access to.
  if (!roomWorkshopId) {
    return new Response('Unknown room', { status: 400 });
  }

  const workshopSession = await db.query.workshopSessions.findFirst({
    where: eq(workshopSessions.workshopId, roomWorkshopId),
  });
  if (!workshopSession) {
    return new Response('Workshop session not found', { status: 404 });
  }

  // The caller's participant row (covers both owner and participant rows).
  const participant = await db.query.sessionParticipants.findFirst({
    where: and(
      eq(sessionParticipants.sessionId, workshopSession.id),
      eq(sessionParticipants.clerkUserId, userId),
    ),
  });

  if (participant) {
    // Block removed participants from reconnecting.
    if (participant.status === 'removed') {
      return new Response('Removed from session', { status: 403 });
    }
    // Issue a token from the participant's stored identity (keeps presence
    // consistent across devices) for both roles.
    const liveblocks = getLiveblocksClient();
    const session = liveblocks.prepareSession(participant.liveblocksUserId, {
      userInfo: {
        name: participant.displayName,
        color: participant.color,
        role: participant.role,
        participantId: participant.role === 'owner' ? null : participant.id,
      },
    });
    session.allow(room, session.FULL_ACCESS);
    const { body: respBody, status } = await session.authorize();
    return new Response(respBody, { status });
  }

  // Step 4: No participant row — only the workshop owner may enter without one.
  // This closes the gap where any signed-in Clerk user could obtain an owner
  // token for a room whose id they happened to know.
  if (!(await isWorkshopOwner(roomWorkshopId, userId))) {
    return new Response('Not a participant of this workshop', { status: 401 });
  }

  const user = await currentUser();
  if (!user) {
    console.error('Liveblocks auth: userId present but currentUser() returned null');
    return new Response('User not found', { status: 401 });
  }

  const liveblocks = getLiveblocksClient();
  const session = liveblocks.prepareSession(user.id, {
    userInfo: {
      name: user.fullName ?? user.username ?? 'Facilitator',
      color: PARTICIPANT_COLORS[0], // Owner always gets indigo
      role: 'owner',
      participantId: null,
    },
  });
  session.allow(room, session.FULL_ACCESS);
  const { body, status } = await session.authorize();
  return new Response(body, { status });
}
