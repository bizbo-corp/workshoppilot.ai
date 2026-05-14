'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { randomBytes } from 'crypto';
import { and, eq, sql, count } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  workshops,
  sessions,
  workshopSessions,
  sessionParticipants,
  workshopInvitations,
  users,
} from '@/db/schema';
import { getChallengeArtifact } from '@/lib/workshop/challenge-artifact';
import { MAX_TEAM_INVITES } from '@/lib/workshop/workshop-schedule';

/**
 * Minimum gap between Resend sends (ms). Resend free tier allows 2 req/sec — we
 * pace at ~1.5/sec to leave headroom for retries. With MAX_TEAM_INVITES=5 the
 * worst-case wizard submission takes ~3.5s of email work, which is fine.
 */
const RESEND_MIN_GAP_MS = 650;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Send a list of emails sequentially with a minimum gap between them.
 * Returns each result in the order received so callers can match against the input.
 */
async function sendSequential<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  gapMs: number = RESEND_MIN_GAP_MS
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i++) {
    if (i > 0) await sleep(gapMs);
    results.push(await fn(items[i]));
  }
  return results;
}

/**
 * Result shapes
 */
export type SendInvitesResult = {
  sent: number;
  skipped: {
    email: string;
    reason: 'invalid' | 'duplicate' | 'already-accepted' | 'cap-reached' | 'send-failed';
    /** Free-form error text from Resend when reason === 'send-failed'. */
    detail?: string;
  }[];
};

/**
 * Resolve the facilitator's row. Throws if the caller is not the owner of `workshopId`.
 * Returns the workshop record alongside the resolved Clerk userId.
 */
async function assertFacilitator(workshopId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Authentication required');
  }

  const workshop = await db.query.workshops.findFirst({
    where: and(eq(workshops.id, workshopId), eq(workshops.clerkUserId, userId)),
  });
  if (!workshop) {
    throw new Error('Access denied: only the facilitator can perform this action');
  }
  return { workshop, userId };
}

/**
 * Marks the challenge as published. Idempotent — does nothing if `challengePublishedAt` is already set.
 * Facilitator-only.
 */
export async function publishChallenge(workshopId: string): Promise<void> {
  const { workshop } = await assertFacilitator(workshopId);
  if (workshop.challengePublishedAt) return;

  await db
    .update(workshops)
    .set({ challengePublishedAt: new Date() })
    .where(eq(workshops.id, workshopId));
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends email invitations to the given list for a team-mode workshop.
 * - Owner-only
 * - Lowercases and dedupes emails
 * - Skips emails that are already accepted invites
 * - Caps the total at `workshopSessions.maxParticipants - currentParticipantCount`
 * - Publishes the challenge if not already published
 * - Fire-and-forget email send (failures are logged, not thrown)
 */
export async function sendWorkshopInvites(
  workshopId: string,
  rawEmails: string[]
): Promise<SendInvitesResult> {
  const { workshop, userId } = await assertFacilitator(workshopId);

  if (workshop.facilitatorMode !== 'team') {
    throw new Error('Invitations are only available for team workshops');
  }

  // Find the workshopSession (required for participant cap and to confirm multiplayer wiring exists)
  const [wSession] = await db
    .select({
      id: workshopSessions.id,
      maxParticipants: workshopSessions.maxParticipants,
    })
    .from(workshopSessions)
    .where(eq(workshopSessions.workshopId, workshopId))
    .limit(1);
  if (!wSession) {
    throw new Error('Workshop session not found');
  }

  // Get owning sessionId for revalidation
  const [sessionRow] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.workshopId, workshopId))
    .limit(1);

  // Normalise inputs
  const normalised: string[] = [];
  const skipped: SendInvitesResult['skipped'] = [];
  const seen = new Set<string>();
  for (const raw of rawEmails) {
    const email = (raw ?? '').trim().toLowerCase();
    if (!email) continue;
    if (!EMAIL_REGEX.test(email)) {
      skipped.push({ email: raw, reason: 'invalid' });
      continue;
    }
    if (seen.has(email)) {
      skipped.push({ email, reason: 'duplicate' });
      continue;
    }
    seen.add(email);
    normalised.push(email);
  }

  if (normalised.length === 0) {
    return { sent: 0, skipped };
  }

  // Filter out emails that already have an accepted invitation for this workshop
  const existing = await db
    .select({ email: workshopInvitations.email, status: workshopInvitations.status })
    .from(workshopInvitations)
    .where(eq(workshopInvitations.workshopId, workshopId));

  const acceptedSet = new Set(
    existing.filter((r) => r.status === 'accepted').map((r) => r.email.toLowerCase())
  );

  let candidates = normalised.filter((email) => {
    if (acceptedSet.has(email)) {
      skipped.push({ email, reason: 'already-accepted' });
      return false;
    }
    return true;
  });

  // Cap to MAX_TEAM_INVITES total — counts existing participants (excluding the facilitator)
  // plus existing pending invites against the new candidates.
  const [participantCountRow] = await db
    .select({ value: count() })
    .from(sessionParticipants)
    .where(
      and(
        eq(sessionParticipants.sessionId, wSession.id),
        eq(sessionParticipants.role, 'participant')
      )
    );
  const currentParticipants = Number(participantCountRow?.value ?? 0);
  const pendingInvites = existing.filter((r) => r.status === 'pending').length;
  const seatsRemaining = Math.max(
    0,
    MAX_TEAM_INVITES - currentParticipants - pendingInvites
  );

  if (candidates.length > seatsRemaining) {
    const overflow = candidates.slice(seatsRemaining);
    candidates = candidates.slice(0, seatsRemaining);
    for (const email of overflow) {
      skipped.push({ email, reason: 'cap-reached' });
    }
  }

  if (candidates.length === 0) {
    return { sent: 0, skipped };
  }

  // Look up facilitator's display name + email
  const facilitatorUser = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  });
  const facilitatorName =
    [facilitatorUser?.firstName, facilitatorUser?.lastName].filter(Boolean).join(' ') ||
    facilitatorUser?.email ||
    'Your facilitator';
  const facilitatorEmail = facilitatorUser?.email ?? null;

  // Full challenge artifact — HMW + idea/problem/audience for the email body
  const artifact = await getChallengeArtifact(workshopId);

  // Upsert invitations. Insert with onConflictDoUpdate would re-roll the token for a re-invite,
  // which is fine — but we want to preserve existing 'pending' tokens too. Use a fetch-then-insert
  // approach: skip emails that have a non-revoked pending row already.
  const existingByEmail = new Map(existing.map((e) => [e.email.toLowerCase(), e.status]));

  const toInsert: { email: string; inviteToken: string }[] = [];
  const toResend: string[] = [];
  for (const email of candidates) {
    const status = existingByEmail.get(email);
    if (status === 'pending') {
      // Re-use existing token — caller can resend explicitly via resendInvite
      toResend.push(email);
      continue;
    }
    toInsert.push({ email, inviteToken: randomBytes(24).toString('base64url') });
  }

  let sent = 0;
  if (toInsert.length > 0) {
    await db.insert(workshopInvitations).values(
      toInsert.map((row) => ({
        workshopId,
        email: row.email,
        inviteToken: row.inviteToken,
        invitedByClerkUserId: userId,
      }))
    );
    sent += toInsert.length;
  }

  // Publish challenge once invites go out
  if (!workshop.challengePublishedAt) {
    await db
      .update(workshops)
      .set({ challengePublishedAt: new Date() })
      .where(eq(workshops.id, workshopId));
  }

  // Build common email payload — shared between fresh sends and resends.
  const commonEmailPayload = {
    facilitatorName,
    facilitatorEmail,
    workshopId,
    workshopTitle: workshop.title,
    hmwStatement: artifact?.hmwStatement ?? null,
    idea: artifact?.idea ?? null,
    problem: artifact?.problem ?? null,
    audience: artifact?.audience ?? null,
    scheduledStartAt: workshop.scheduledStartAt ?? null,
    scheduledDurationMinutes: workshop.scheduledDurationMinutes ?? null,
    scheduledTimezone: workshop.scheduledTimezone ?? null,
  };

  // Fire emails sequentially with a gap to stay under Resend's 2 req/sec limit.
  // (After DB writes so a Resend hiccup doesn't roll back invitations.)
  const { sendInvitationEmail } = await import('@/lib/email/invitation-email');
  const freshSendResults = await sendSequential(toInsert, async (row) => ({
    email: row.email,
    ...(await sendInvitationEmail({
      ...commonEmailPayload,
      to: row.email,
      inviteToken: row.inviteToken,
    })),
  }));
  // Demote DB-inserted-but-email-failed rows back out of the `sent` count and surface
  // the Resend error to the caller via skipped[].detail.
  let successfulFreshSends = 0;
  for (const r of freshSendResults) {
    if (r.ok) {
      successfulFreshSends += 1;
    } else {
      skipped.push({ email: r.email, reason: 'send-failed', detail: r.error });
    }
  }
  // Override the optimistic `sent += toInsert.length` we did at row insert time
  // with the real successful-send count.
  sent = sent - toInsert.length + successfulFreshSends;

  // Track resends: emails already pending get a fresh email with the existing token
  if (toResend.length > 0) {
    const tokens = await db
      .select({ email: workshopInvitations.email, inviteToken: workshopInvitations.inviteToken })
      .from(workshopInvitations)
      .where(eq(workshopInvitations.workshopId, workshopId));
    const tokenByEmail = new Map(tokens.map((t) => [t.email.toLowerCase(), t.inviteToken]));
    const resendResults = await sendSequential(toResend, async (email) => {
      const token = tokenByEmail.get(email);
      if (!token) return { email, ok: false, error: 'No token on file' } as const;
      return {
        email,
        ...(await sendInvitationEmail({
          ...commonEmailPayload,
          to: email,
          inviteToken: token,
        })),
      };
    });
    for (const r of resendResults) {
      if (r.ok) {
        sent += 1;
      } else {
        skipped.push({ email: r.email, reason: 'send-failed', detail: r.error });
      }
    }
  }

  if (sessionRow) {
    revalidatePath(`/workshop/${sessionRow.id}/step/1`);
  }

  return { sent, skipped };
}

/**
 * Revoke a pending invitation. Owner-only.
 */
export async function revokeInvite(invitationId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error('Authentication required');

  const [invite] = await db
    .select({
      id: workshopInvitations.id,
      workshopId: workshopInvitations.workshopId,
      ownerId: workshops.clerkUserId,
    })
    .from(workshopInvitations)
    .innerJoin(workshops, eq(workshopInvitations.workshopId, workshops.id))
    .where(eq(workshopInvitations.id, invitationId))
    .limit(1);
  if (!invite) throw new Error('Invitation not found');
  if (invite.ownerId !== userId) throw new Error('Access denied');

  await db
    .update(workshopInvitations)
    .set({ status: 'revoked' })
    .where(eq(workshopInvitations.id, invitationId));

  const [sessionRow] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.workshopId, invite.workshopId))
    .limit(1);
  if (sessionRow) revalidatePath(`/workshop/${sessionRow.id}/step/1`);
}

/**
 * Resends a pending invitation email. Owner-only.
 */
export async function resendInvite(invitationId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error('Authentication required');

  const [invite] = await db
    .select({
      id: workshopInvitations.id,
      workshopId: workshopInvitations.workshopId,
      email: workshopInvitations.email,
      inviteToken: workshopInvitations.inviteToken,
      status: workshopInvitations.status,
      ownerId: workshops.clerkUserId,
      title: workshops.title,
      scheduledStartAt: workshops.scheduledStartAt,
      scheduledDurationMinutes: workshops.scheduledDurationMinutes,
      scheduledTimezone: workshops.scheduledTimezone,
    })
    .from(workshopInvitations)
    .innerJoin(workshops, eq(workshopInvitations.workshopId, workshops.id))
    .where(eq(workshopInvitations.id, invitationId))
    .limit(1);

  if (!invite) throw new Error('Invitation not found');
  if (invite.ownerId !== userId) throw new Error('Access denied');
  if (invite.status !== 'pending') throw new Error('Only pending invitations can be resent');

  const facilitatorUser = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  });
  const facilitatorName =
    [facilitatorUser?.firstName, facilitatorUser?.lastName].filter(Boolean).join(' ') ||
    facilitatorUser?.email ||
    'Your facilitator';

  const artifact = await getChallengeArtifact(invite.workshopId);

  const { sendInvitationEmail } = await import('@/lib/email/invitation-email');
  await sendInvitationEmail({
    to: invite.email,
    inviteToken: invite.inviteToken,
    facilitatorName,
    facilitatorEmail: facilitatorUser?.email ?? null,
    workshopId: invite.workshopId,
    workshopTitle: invite.title,
    hmwStatement: artifact?.hmwStatement ?? null,
    idea: artifact?.idea ?? null,
    problem: artifact?.problem ?? null,
    audience: artifact?.audience ?? null,
    scheduledStartAt: invite.scheduledStartAt ?? null,
    scheduledDurationMinutes: invite.scheduledDurationMinutes ?? null,
    scheduledTimezone: invite.scheduledTimezone ?? null,
  });

  // Touch invitedAt so the facilitator can see the most recent send time
  await db
    .update(workshopInvitations)
    .set({ invitedAt: new Date() })
    .where(eq(workshopInvitations.id, invitationId));
}

/**
 * Helper for `/api/invite-claim` and similar code paths to mark an invitation accepted.
 * Not exported as a server action — imported directly by route handlers.
 */
export async function markInvitationAccepted(
  inviteToken: string,
  sessionParticipantId: string
): Promise<void> {
  await db
    .update(workshopInvitations)
    .set({
      status: 'accepted',
      acceptedAt: new Date(),
      sessionParticipantId,
    })
    .where(
      and(
        eq(workshopInvitations.inviteToken, inviteToken),
        // Don't downgrade an already-accepted/revoked row
        sql`${workshopInvitations.status} = 'pending'`
      )
    );
}
