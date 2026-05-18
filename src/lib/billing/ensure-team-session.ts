import 'server-only';
import { db } from '@/db/client';
import { users, workshopSessions, sessionParticipants } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { PARTICIPANT_COLORS, getRoomId } from '@/lib/liveblocks/config';

/**
 * Idempotently create the Liveblocks-backed workshop session and seed the
 * owner's sessionParticipants row. Called whenever a workshop becomes team-tier
 * (Stripe fulfillment, admin tier override) so the multiplayer flow has the
 * rows it expects.
 */
export async function ensureTeamSession(
  workshopId: string,
  ownerClerkUserId: string
): Promise<void> {
  const existingSession = await db.query.workshopSessions.findFirst({
    where: eq(workshopSessions.workshopId, workshopId),
  });

  let workshopSessionId: string;
  if (existingSession) {
    workshopSessionId = existingSession.id;
  } else {
    const shareToken = randomBytes(18).toString('base64url');
    const [created] = await db
      .insert(workshopSessions)
      .values({
        workshopId,
        liveblocksRoomId: getRoomId(workshopId),
        shareToken,
        status: 'waiting',
        maxParticipants: 15,
      })
      .returning();
    workshopSessionId = created.id;
  }

  const ownerParticipant = await db.query.sessionParticipants.findFirst({
    where: and(
      eq(sessionParticipants.sessionId, workshopSessionId),
      eq(sessionParticipants.clerkUserId, ownerClerkUserId)
    ),
  });
  if (!ownerParticipant) {
    const ownerUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, ownerClerkUserId),
    });
    const ownerDisplayName = ownerUser
      ? [ownerUser.firstName, ownerUser.lastName].filter(Boolean).join(' ') || 'Facilitator'
      : 'Facilitator';
    await db.insert(sessionParticipants).values({
      sessionId: workshopSessionId,
      clerkUserId: ownerClerkUserId,
      liveblocksUserId: ownerClerkUserId,
      displayName: ownerDisplayName,
      color: PARTICIPANT_COLORS[0],
      role: 'owner',
      status: 'active',
    });
  }
}
