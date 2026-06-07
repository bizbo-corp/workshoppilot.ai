'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  workshops,
  sessions,
  challengeApprovals,
  sessionParticipants,
  users,
} from '@/db/schema';
import { resolveClerkParticipant } from '@/lib/auth/resolve-participant';

/**
 * Resolve the caller's session participant row for a given workshop.
 * Returns null if the caller isn't an (authenticated) participant.
 */
async function resolveCallerParticipant(workshopId: string): Promise<{
  participantId: string;
  sessionId: string;
  participantName: string;
} | null> {
  const participant = await resolveClerkParticipant(workshopId);
  if (!participant) return null;
  return {
    participantId: participant.participantId,
    sessionId: participant.sessionId,
    participantName: participant.displayName,
  };
}

/**
 * Resolve the owning sessions.id (the URL session id, not workshop_sessions.id) for revalidation.
 */
async function resolveUrlSessionId(workshopId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.workshopId, workshopId))
    .limit(1);
  return row?.id ?? null;
}

/**
 * Mark the caller's approval as 'approved' for the current challenge revision,
 * then redirect to Step 2.
 */
export async function approveChallenge(workshopId: string): Promise<void> {
  const caller = await resolveCallerParticipant(workshopId);
  if (!caller) {
    throw new Error('You are not a participant in this workshop');
  }

  const [workshop] = await db
    .select({
      id: workshops.id,
      challengeRevision: workshops.challengeRevision,
      facilitatorMode: workshops.facilitatorMode,
    })
    .from(workshops)
    .where(eq(workshops.id, workshopId))
    .limit(1);
  if (!workshop) throw new Error('Workshop not found');
  if (workshop.facilitatorMode !== 'team') {
    throw new Error('Approvals are only required for team workshops');
  }

  // Upsert: if an approval row exists, update; otherwise insert.
  const [existing] = await db
    .select({ id: challengeApprovals.id })
    .from(challengeApprovals)
    .where(
      and(
        eq(challengeApprovals.workshopId, workshopId),
        eq(challengeApprovals.sessionParticipantId, caller.participantId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(challengeApprovals)
      .set({
        status: 'approved',
        challengeRevision: workshop.challengeRevision,
        respondedAt: new Date(),
        changeRequestNote: null,
      })
      .where(eq(challengeApprovals.id, existing.id));
  } else {
    await db.insert(challengeApprovals).values({
      workshopId,
      sessionParticipantId: caller.participantId,
      status: 'approved',
      challengeRevision: workshop.challengeRevision,
      respondedAt: new Date(),
    });
  }

  const urlSessionId = await resolveUrlSessionId(workshopId);
  if (!urlSessionId) {
    throw new Error('Workshop session not found');
  }

  revalidatePath(`/workshop/${urlSessionId}/lobby`);
  revalidatePath(`/workshop/${urlSessionId}`);

  // v2.2 — approval no longer auto-advances. The workshop only starts when the
  // facilitator clicks Start in the lobby (or chose "Start now" at setup).
  redirect(`/workshop/${urlSessionId}/lobby`);
}

/**
 * Record a change request from the caller. Notifies the facilitator by email +
 * leaves the participant on the waiting screen.
 */
export async function requestChallengeChange(
  workshopId: string,
  note: string
): Promise<void> {
  const trimmed = (note ?? '').trim();
  if (trimmed.length < 4 || trimmed.length > 1000) {
    throw new Error('Change request must be between 4 and 1000 characters');
  }

  const caller = await resolveCallerParticipant(workshopId);
  if (!caller) {
    throw new Error('You are not a participant in this workshop');
  }

  const [workshop] = await db
    .select({
      id: workshops.id,
      title: workshops.title,
      clerkUserId: workshops.clerkUserId,
      challengeRevision: workshops.challengeRevision,
      facilitatorMode: workshops.facilitatorMode,
    })
    .from(workshops)
    .where(eq(workshops.id, workshopId))
    .limit(1);
  if (!workshop) throw new Error('Workshop not found');
  if (workshop.facilitatorMode !== 'team') {
    throw new Error('Change requests are only available for team workshops');
  }

  // Upsert change_requested
  const [existing] = await db
    .select({ id: challengeApprovals.id })
    .from(challengeApprovals)
    .where(
      and(
        eq(challengeApprovals.workshopId, workshopId),
        eq(challengeApprovals.sessionParticipantId, caller.participantId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(challengeApprovals)
      .set({
        status: 'change_requested',
        challengeRevision: workshop.challengeRevision,
        changeRequestNote: trimmed,
        respondedAt: new Date(),
      })
      .where(eq(challengeApprovals.id, existing.id));
  } else {
    await db.insert(challengeApprovals).values({
      workshopId,
      sessionParticipantId: caller.participantId,
      status: 'change_requested',
      challengeRevision: workshop.challengeRevision,
      changeRequestNote: trimmed,
      respondedAt: new Date(),
    });
  }

  // Notify the facilitator (fire-and-forget). Need facilitator's email.
  // First try the users table (Clerk-synced); fall back to Clerk API.
  const urlSessionId = await resolveUrlSessionId(workshopId);
  let facilitatorEmail: string | null = null;
  let facilitatorName = 'Facilitator';

  const localUser = await db.query.users.findFirst({
    where: eq(users.clerkUserId, workshop.clerkUserId),
  });
  if (localUser?.email) {
    facilitatorEmail = localUser.email;
    facilitatorName =
      [localUser.firstName, localUser.lastName].filter(Boolean).join(' ') ||
      localUser.email ||
      facilitatorName;
  } else {
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(workshop.clerkUserId);
      facilitatorEmail = clerkUser.emailAddresses[0]?.emailAddress ?? null;
      facilitatorName =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
        facilitatorEmail ||
        facilitatorName;
    } catch (err) {
      console.warn('[challenge-approval] Could not resolve facilitator email:', err);
    }
  }

  if (facilitatorEmail && urlSessionId) {
    const { sendChangeRequestEmail } = await import('@/lib/email/invitation-email');
    await sendChangeRequestEmail({
      to: facilitatorEmail,
      facilitatorName,
      workshopTitle: workshop.title,
      sessionId: urlSessionId,
      participantName: caller.participantName,
      note: trimmed,
    });
  }

  if (urlSessionId) {
    revalidatePath(`/workshop/${urlSessionId}/lobby`);
    revalidatePath(`/workshop/${urlSessionId}`);
    revalidatePath(`/workshop/${urlSessionId}/step/challenge`);
  }
}

/**
 * Republish the challenge after edits. Bumps challengeRevision, resets all approvals
 * to 'pending', and emails participants who previously requested a change.
 */
export async function republishChallenge(workshopId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error('Authentication required');

  const [workshop] = await db
    .select()
    .from(workshops)
    .where(and(eq(workshops.id, workshopId), eq(workshops.clerkUserId, userId)))
    .limit(1);
  if (!workshop) throw new Error('Access denied: only the facilitator can republish');
  if (workshop.facilitatorMode !== 'team') {
    throw new Error('Only team workshops can be republished');
  }

  const newRevision = workshop.challengeRevision + 1;

  // Gather participants who previously requested a change — they get the republish email.
  const changeRequesters = await db
    .select({
      participantId: challengeApprovals.sessionParticipantId,
      clerkUserId: sessionParticipants.clerkUserId,
      displayName: sessionParticipants.displayName,
    })
    .from(challengeApprovals)
    .innerJoin(
      sessionParticipants,
      eq(challengeApprovals.sessionParticipantId, sessionParticipants.id)
    )
    .where(
      and(
        eq(challengeApprovals.workshopId, workshopId),
        eq(challengeApprovals.status, 'change_requested')
      )
    );

  await db
    .update(workshops)
    .set({ challengeRevision: newRevision, challengePublishedAt: new Date() })
    .where(eq(workshops.id, workshopId));

  await db
    .update(challengeApprovals)
    .set({ status: 'pending', changeRequestNote: null, respondedAt: null })
    .where(eq(challengeApprovals.workshopId, workshopId));

  const urlSessionId = await resolveUrlSessionId(workshopId);

  // Resolve facilitator name for the email
  const facilitatorUser = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  });
  const facilitatorName =
    [facilitatorUser?.firstName, facilitatorUser?.lastName].filter(Boolean).join(' ') ||
    facilitatorUser?.email ||
    'Your facilitator';

  if (urlSessionId && changeRequesters.length > 0) {
    const emails: { email: string }[] = [];
    for (const req of changeRequesters) {
      if (!req.clerkUserId) continue; // Guest participants have no email on file
      const u = await db.query.users.findFirst({
        where: eq(users.clerkUserId, req.clerkUserId),
      });
      if (u?.email) emails.push({ email: u.email });
    }

    if (emails.length > 0) {
      const { sendRepublishEmail } = await import('@/lib/email/invitation-email');
      // Serialize to stay under Resend's 2 req/sec rate limit
      const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
      for (let i = 0; i < emails.length; i++) {
        if (i > 0) await sleep(650);
        await sendRepublishEmail({
          to: emails[i].email,
          facilitatorName,
          workshopTitle: workshop.title,
          sessionId: urlSessionId,
        });
      }
    }
  }

  if (urlSessionId) {
    revalidatePath(`/workshop/${urlSessionId}/step/challenge`);
    revalidatePath(`/workshop/${urlSessionId}/lobby`);
    revalidatePath(`/workshop/${urlSessionId}`);
  }
}
