import { auth, currentUser } from '@clerk/nextjs/server';
import { isAdmin } from './roles';
import { resolveClerkParticipant, isWorkshopOwner } from './resolve-participant';
import { isAuthBypassEnabled } from './bypass';

/**
 * Auth result for workshop-scoped API routes.
 *
 * Every caller is now a Clerk-authenticated user. `owner` covers the workshop
 * facilitator (and admins); `participant` covers an authenticated participant
 * who has joined this specific workshop. A signed-in user who is neither owner
 * nor participant of `workshopId` gets `null` (401) — this is the membership
 * check that stops anyone-with-a-link from burning the facilitator's AI tokens.
 *
 * `rateLimitKey` is pre-baked (`user:<id>` or `participant:<id>`) so routes
 * never fall through to IP-based limiting for an identified caller.
 */
export type WorkshopRequestAuth =
  | { kind: 'owner'; userId: string; isAdmin: boolean; rateLimitKey: string }
  | { kind: 'participant'; userId: string; participantId: string; rateLimitKey: string };

/**
 * Authenticate a workshop-scoped API request. Requires a Clerk session AND
 * membership of `workshopId` (as owner or participant). Returns null on
 * failure — caller is responsible for emitting the 401 response.
 *
 * Admin detection: prefers session claims (fast), falls back to `ADMIN_EMAIL`
 * env match on `currentUser()` for accounts whose roles haven't been
 * initialized yet.
 */
export async function authenticateWorkshopRequest(
  workshopId: string,
): Promise<WorkshopRequestAuth | null> {
  // E2E test bypass — see isAuthBypassEnabled(). NEVER active in a production or
  // preview deployment (fails closed on NODE_ENV='production'). Without this,
  // BYPASS_AUTH only disables middleware route protection, so workshop API
  // routes still 401 (auth() has no userId), which blocks the AI greeting and
  // any other authenticated workshop call in tests. Returns a synthetic owner.
  if (isAuthBypassEnabled()) {
    return {
      kind: 'owner',
      userId: 'anonymous',
      isAdmin: true,
      rateLimitKey: 'user:bypass',
    };
  }

  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  // Owner / admin path. Admins (by claims) are treated as owners of any
  // workshop. Resolve ownership before the email fallback so participant calls
  // (the high-frequency path) never pay for a currentUser() round-trip.
  const adminByClaims = isAdmin(sessionClaims);
  if (adminByClaims || (await isWorkshopOwner(workshopId, userId))) {
    let admin = adminByClaims;
    if (!admin) {
      // Email fallback for an owner whose admin role hasn't been initialized.
      const user = await currentUser();
      const adminEmail = process.env.ADMIN_EMAIL;
      const userEmail = user?.emailAddresses?.[0]?.emailAddress;
      admin = !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());
    }
    return {
      kind: 'owner',
      userId,
      isAdmin: admin,
      rateLimitKey: `user:${userId}`,
    };
  }

  // Participant path — must be an active participant of this workshop.
  const participant = await resolveClerkParticipant(workshopId);
  if (!participant) return null;

  return {
    kind: 'participant',
    userId,
    participantId: participant.participantId,
    rateLimitKey: `participant:${participant.participantId}`,
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

/**
 * Canonical 403 response for an authenticated caller acting outside their
 * own identity (e.g. a participant claiming someone else's participantId).
 */
export function forbiddenResponse(): Response {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}
