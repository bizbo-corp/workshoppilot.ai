import { auth, currentUser } from '@clerk/nextjs/server';
import { Liveblocks } from '@liveblocks/node';

/**
 * Liveblocks auth endpoint — issues access tokens for authenticated Clerk users.
 *
 * This endpoint is called by the Liveblocks client SDK when entering a multiplayer
 * room. It verifies the Clerk session and returns a short-lived Liveblocks token
 * scoped to the requested room.
 *
 * Design decisions:
 * - FULL_ACCESS granted for all Clerk-authenticated users — workshop ownership
 *   verification is deferred to Phase 55 (requires session_participants DB lookup).
 * - Guest path returns 401 — Phase 57 will issue tokens via HttpOnly signed cookies.
 * - color is hardcoded to indigo (#6366f1) — per-session color assignment is Phase 57.
 * - No server-only guard needed: API route files are inherently server-only.
 *
 * TODO (Phase 55): Verify that the requesting user owns or is a participant in the
 * requested room before issuing the token. Requires joining workshop_sessions and
 * session_participants tables by workshopId extracted from the room name.
 *
 * TODO (Phase 57): Guest auth — read identity from HttpOnly signed cookie, look up
 * the session_participants record, issue token with FULL_ACCESS scoped to the room.
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
  // Step 1: Check Clerk authentication
  const { userId } = await auth();

  // Step 2: Guest path — not yet implemented (Phase 57)
  if (!userId) {
    // TODO (Phase 57): Read guest identity from HttpOnly signed cookie, look up
    // session_participants record, and issue a token with FULL_ACCESS scoped to
    // the requested room. Guest sign-in prompt is NEVER shown to participants.
    return new Response('Guest auth not yet implemented', { status: 401 });
  }

  // Step 3: Clerk-authenticated path — resolve full user details
  const user = await currentUser();
  if (!user) {
    // userId was valid but currentUser() returned null — session may have been revoked
    console.error('Liveblocks auth: userId present but currentUser() returned null');
    return new Response('User not found', { status: 401 });
  }

  // Step 4: Extract the room ID from the request body (sent by Liveblocks client SDK)
  let room: string;
  try {
    const body = await request.json();
    room = body.room;
    if (!room || typeof room !== 'string') {
      return new Response('Missing or invalid room in request body', { status: 400 });
    }
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  // Step 5: Prepare the Liveblocks session with user metadata
  // name: prefer fullName, fall back to username, then a safe default
  const liveblocks = getLiveblocksClient();
  const session = liveblocks.prepareSession(user.id, {
    userInfo: {
      name: user.fullName ?? user.username ?? 'Facilitator',
      color: '#6366f1', // Default indigo — per-session color assignment in Phase 57
      role: 'owner', // Clerk users are always owners for now — guest role is Phase 57
    },
  });

  // Step 6: Grant FULL_ACCESS to the requested room
  session.allow(room, session.FULL_ACCESS);

  // Step 7: Authorize and return the access token
  const { body, status } = await session.authorize();
  return new Response(body, { status });
}
