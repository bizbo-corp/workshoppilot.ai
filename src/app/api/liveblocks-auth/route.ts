import { auth, currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { Liveblocks } from '@liveblocks/node';
import { eq } from 'drizzle-orm';
import { PARTICIPANT_COLORS } from '@/lib/liveblocks/config';
import { verifyGuestCookie, COOKIE_NAME } from '@/lib/auth/guest-cookie';
import { db } from '@/db/client';
import { sessionParticipants } from '@/db/schema';

/**
 * Liveblocks auth endpoint — issues access tokens for Clerk users and verified guests.
 *
 * This endpoint is called by the Liveblocks client SDK when entering a multiplayer
 * room. It verifies the Clerk session (owners) or HttpOnly guest cookie (participants)
 * and returns a short-lived Liveblocks token scoped to the requested room.
 *
 * Design decisions:
 * - Request body is parsed ONCE at the top of the handler — request.json() can only
 *   be called once. Both Clerk and guest paths share the already-parsed `room` value.
 * - Guest path reads the HttpOnly `wp_guest` cookie, verifies HMAC-SHA256 signature,
 *   looks up the sessionParticipants record, and issues a token with `role: 'participant'`.
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

  // Step 2: Check Clerk authentication
  const { userId } = await auth();

  // Step 3: Guest path — read and verify the HttpOnly signed cookie
  if (!userId) {
    const cookieStore = await cookies();
    const raw = cookieStore.get(COOKIE_NAME)?.value;
    const payload = raw ? verifyGuestCookie(raw) : null;

    if (!payload) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Look up the participant record
    const [participant] = await db
      .select()
      .from(sessionParticipants)
      .where(eq(sessionParticipants.id, payload.participantId))
      .limit(1);

    if (!participant) {
      return new Response('Participant not found', { status: 401 });
    }

    // Issue Liveblocks token for the guest participant
    const liveblocks = getLiveblocksClient();
    const session = liveblocks.prepareSession(participant.liveblocksUserId, {
      userInfo: {
        name: participant.displayName,
        color: participant.color,
        role: 'participant',
      },
    });
    session.allow(room, session.FULL_ACCESS);
    const { body: respBody, status } = await session.authorize();
    return new Response(respBody, { status });
  }

  // Step 4: Clerk-authenticated path — resolve full user details
  const user = await currentUser();
  if (!user) {
    // userId was valid but currentUser() returned null — session may have been revoked
    console.error('Liveblocks auth: userId present but currentUser() returned null');
    return new Response('User not found', { status: 401 });
  }

  // Step 5: Prepare the Liveblocks session with user metadata
  // name: prefer fullName, fall back to username, then a safe default
  const liveblocks = getLiveblocksClient();
  const session = liveblocks.prepareSession(user.id, {
    userInfo: {
      name: user.fullName ?? user.username ?? 'Facilitator',
      color: PARTICIPANT_COLORS[0], // Owner always gets indigo — per-session rotation in Phase 57
      role: 'owner',
    },
  });

  // Step 6: Grant FULL_ACCESS to the requested room
  session.allow(room, session.FULL_ACCESS);

  // Step 7: Authorize and return the access token
  const { body, status } = await session.authorize();
  return new Response(body, { status });
}
