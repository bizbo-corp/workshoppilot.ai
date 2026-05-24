import { auth } from '@clerk/nextjs/server';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db/client';
import { workshops, workshopSessions, sessionParticipants } from '@/db/schema';

/**
 * The authenticated Clerk user's participant row for a workshop.
 * Identity is keyed on (sessionId, clerkUserId) — the single source of truth
 * now that all participants are Clerk-authenticated. This replaces the old
 * dual (Clerk userId → wp_guest cookie) resolution that lived inline in every
 * page and action.
 */
export type ResolvedParticipant = {
  participantId: string;
  sessionId: string;
  displayName: string;
  color: string;
  role: 'owner' | 'participant';
  clerkUserId: string;
};

/**
 * Resolve the signed-in Clerk user's participant row for `workshopId`.
 * Returns null if the user is not signed in, the workshop has no session, or
 * the user isn't an active participant of it. `removed` participants are
 * excluded (treated as not-a-participant).
 */
export async function resolveClerkParticipant(
  workshopId: string,
): Promise<ResolvedParticipant | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const [wSession] = await db
    .select({ id: workshopSessions.id })
    .from(workshopSessions)
    .where(eq(workshopSessions.workshopId, workshopId))
    .limit(1);
  if (!wSession) return null;

  const [participant] = await db
    .select({
      id: sessionParticipants.id,
      sessionId: sessionParticipants.sessionId,
      displayName: sessionParticipants.displayName,
      color: sessionParticipants.color,
      role: sessionParticipants.role,
    })
    .from(sessionParticipants)
    .where(
      and(
        eq(sessionParticipants.sessionId, wSession.id),
        eq(sessionParticipants.clerkUserId, userId),
        ne(sessionParticipants.status, 'removed'),
      ),
    )
    .limit(1);

  if (!participant) return null;

  return {
    participantId: participant.id,
    sessionId: participant.sessionId,
    displayName: participant.displayName,
    color: participant.color,
    role: participant.role,
    clerkUserId: userId,
  };
}

/**
 * True when `userId` owns `workshopId`. Cheap ownership check used by routes
 * that gate on the facilitator before the participant lookup.
 */
export async function isWorkshopOwner(
  workshopId: string,
  userId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: workshops.id })
    .from(workshops)
    .where(and(eq(workshops.id, workshopId), eq(workshops.clerkUserId, userId)))
    .limit(1);
  return !!row;
}
