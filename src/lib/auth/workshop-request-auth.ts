import { auth, currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { sessionParticipants } from '@/db/schema';
import { verifyGuestCookie, COOKIE_NAME } from './guest-cookie';
import { isAdmin } from './roles';

/**
 * Dual-auth result for workshop-scoped API routes.
 *
 * `user` covers Clerk-authenticated facilitators/owners. `guest` covers
 * participants who joined via a join link and hold a signed `wp_guest` cookie
 * scoped to the same workshopId.
 *
 * `rateLimitKey` is pre-baked (`user:<id>` or `guest:<participantId>`) so
 * routes don't accidentally fall through to IP-based limiting for an
 * identified caller.
 */
export type WorkshopRequestAuth =
  | { kind: 'user'; userId: string; isAdmin: boolean; rateLimitKey: string }
  | { kind: 'guest'; participantId: string; rateLimitKey: string };

/**
 * Authenticate a workshop-scoped API request as either a Clerk user or a
 * guest participant of `workshopId`.
 *
 * Returns null on failure. Caller is responsible for emitting the 401 response.
 *
 * Admin detection: prefers session claims (fast). Falls back to `ADMIN_EMAIL`
 * env match on `currentUser()` for accounts whose roles haven't been
 * initialized yet — same pattern as the existing inline check in
 * generate-sketch-image.
 */
export async function authenticateWorkshopRequest(
  workshopId: string,
): Promise<WorkshopRequestAuth | null> {
  const { userId, sessionClaims } = await auth();

  if (userId) {
    let admin = isAdmin(sessionClaims);
    if (!admin) {
      const user = await currentUser();
      const adminEmail = process.env.ADMIN_EMAIL;
      const userEmail = user?.emailAddresses?.[0]?.emailAddress;
      admin = !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());
    }
    return {
      kind: 'user',
      userId,
      isAdmin: admin,
      rateLimitKey: `user:${userId}`,
    };
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  const payload = raw ? verifyGuestCookie(raw) : null;
  if (!payload || payload.workshopId !== workshopId) return null;

  const [participant] = await db
    .select({ id: sessionParticipants.id, status: sessionParticipants.status })
    .from(sessionParticipants)
    .where(eq(sessionParticipants.id, payload.participantId))
    .limit(1);

  if (!participant || participant.status === 'removed') return null;

  return {
    kind: 'guest',
    participantId: payload.participantId,
    rateLimitKey: `guest:${payload.participantId}`,
  };
}

/**
 * Canonical 401 response for routes that gate on authenticateWorkshopRequest.
 */
export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
