'use server';

import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { workshops, users, sessions } from '@/db/schema';
import { resolveClerkParticipant } from '@/lib/auth/resolve-participant';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import { sendFacilitatorNudgeEmail } from '@/lib/email/facilitator-nudge-email';

export interface NudgeFacilitatorResult {
  ok: boolean;
  error?: string;
  /** Set when blocked by the cooldown so the client can disable the button. */
  retryAfterMs?: number;
}

/**
 * A participant in the lobby nudges the facilitator by email to come run the
 * workshop. Authorized by membership (the caller must be a participant of the
 * workshop) and rate-limited to one nudge per workshop per 5 minutes.
 */
export async function nudgeFacilitator(
  workshopId: string,
): Promise<NudgeFacilitatorResult> {
  const participant = await resolveClerkParticipant(workshopId);
  if (!participant) {
    return { ok: false, error: 'You are not a participant of this workshop.' };
  }

  const rl = checkRateLimit(`nudge:${workshopId}`, 'nudge');
  if (!rl.allowed) {
    return {
      ok: false,
      error: 'The facilitator was just nudged. Give them a moment.',
      retryAfterMs: rl.retryAfterMs,
    };
  }

  const workshop = await db.query.workshops.findFirst({
    where: eq(workshops.id, workshopId),
    columns: { id: true, title: true, clerkUserId: true },
  });
  if (!workshop) {
    return { ok: false, error: 'Workshop not found.' };
  }

  const facilitatorUser = await db.query.users.findFirst({
    where: eq(users.clerkUserId, workshop.clerkUserId),
    columns: { email: true, firstName: true, lastName: true },
  });
  const facilitatorEmail = facilitatorUser?.email;
  if (!facilitatorEmail) {
    return { ok: false, error: 'We couldn’t reach the facilitator right now.' };
  }
  const facilitatorName =
    [facilitatorUser?.firstName, facilitatorUser?.lastName]
      .filter(Boolean)
      .join(' ') ||
    facilitatorEmail ||
    'there';

  const sessionRow = await db.query.sessions.findFirst({
    where: eq(sessions.workshopId, workshopId),
    columns: { id: true },
  });
  if (!sessionRow) {
    return { ok: false, error: 'Workshop session not found.' };
  }

  const result = await sendFacilitatorNudgeEmail({
    to: facilitatorEmail,
    facilitatorName,
    participantName: participant.displayName,
    workshopTitle: workshop.title,
    sessionId: sessionRow.id,
  });

  if (!result.ok) {
    return { ok: false, error: result.error ?? 'Failed to send the nudge.' };
  }
  return { ok: true };
}
