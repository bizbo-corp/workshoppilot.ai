'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { workshops, sessions, workshopSteps } from '@/db/schema';
import { sendWorkshopInvites, type SendInvitesResult } from './invitation-actions';
import {
  parseScheduleInput,
  MAX_TEAM_INVITES,
  type DurationMinutes,
} from '@/lib/workshop/workshop-schedule';
import { syncChallengeArtifactFromLiveblocks } from '@/lib/workshop/challenge-artifact';

const STEP_1_ID = 'challenge';
const STEP_2_ID = 'stakeholder-mapping';

export interface SetupWorkshopInput {
  workshopId: string;
  emails: string[];
  mode: 'start_now' | 'schedule';
  /** Required when mode==='schedule' */
  schedule?: {
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    durationMinutes: DurationMinutes;
    timezone: string;
  };
}

export interface SetupWorkshopResult {
  ok: true;
  redirectUrl: string;
  invites: SendInvitesResult;
}

/**
 * Orchestrates the Step-1 → workshop-setup pipeline for team workshops:
 *   1. Validates ownership + emails (≥1, ≤MAX_TEAM_INVITES)
 *   2. Persists the chosen schedule (or marks workshopStartedAt for "Start now")
 *   3. Sends invitation emails (which now include challenge + schedule + .ics)
 *   4. Returns the URL the facilitator should navigate to
 *
 * Does NOT call redirect() — the client navigates after seeing the result so it can
 * also fire the Liveblocks broadcast (for "Start now") before unmount.
 */
export async function setupWorkshop(input: SetupWorkshopInput): Promise<SetupWorkshopResult> {
  const { userId } = await auth();
  if (!userId) throw new Error('Authentication required');

  // Ownership + workshop in team mode
  const [workshop] = await db
    .select()
    .from(workshops)
    .where(and(eq(workshops.id, input.workshopId), eq(workshops.clerkUserId, userId)))
    .limit(1);
  if (!workshop) throw new Error('Access denied: only the facilitator can run setup');
  if (workshop.facilitatorMode !== 'team') {
    throw new Error('Setup is only available for team workshops');
  }

  // Validate emails
  const cleanedEmails = (input.emails ?? [])
    .map((e) => (e ?? '').trim())
    .filter((e) => e.length > 0);
  if (cleanedEmails.length === 0) {
    throw new Error('Add at least one participant email');
  }
  if (cleanedEmails.length > MAX_TEAM_INVITES) {
    throw new Error(`Maximum ${MAX_TEAM_INVITES} participants`);
  }

  // Resolve the URL session id for the redirect
  const [sessionRow] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.workshopId, input.workshopId))
    .limit(1);
  if (!sessionRow) throw new Error('Workshop session not found');

  // Persist the schedule decision BEFORE sending emails, so the invitation
  // email picks up the schedule from the workshop row via sendWorkshopInvites.
  if (input.mode === 'schedule') {
    if (!input.schedule) throw new Error('Schedule details are required');
    const parsed = parseScheduleInput(input.schedule);
    await db
      .update(workshops)
      .set({
        scheduledStartAt: parsed.startAt,
        scheduledDurationMinutes: parsed.durationMinutes,
        scheduledTimezone: parsed.timezone,
        workshopStartedAt: null, // Reset in case the workshop was already started
      })
      .where(eq(workshops.id, input.workshopId));
  } else {
    // start_now — clear any previous schedule, stamp the start, advance steps
    await db
      .update(workshops)
      .set({
        scheduledStartAt: null,
        scheduledDurationMinutes: null,
        scheduledTimezone: null,
        workshopStartedAt: new Date(),
      })
      .where(eq(workshops.id, input.workshopId));
    await advanceFromStepOne(input.workshopId);
  }

  // Pull the latest challenge canvas state from Liveblocks into the artifact so the
  // invitation emails include the up-to-date challenge block (multiplayer canvas writes
  // otherwise don't land in step_artifacts until step advance or a webhook fires).
  try {
    await syncChallengeArtifactFromLiveblocks(
      input.workshopId,
      workshop.workshopType === 'multiplayer'
    );
  } catch (err) {
    console.warn('[setupWorkshop] Challenge artifact sync failed (continuing):', err);
  }

  // Send invitation emails (publishChallenge fires inside sendWorkshopInvites)
  const invites = await sendWorkshopInvites(input.workshopId, cleanedEmails);

  revalidatePath(`/workshop/${sessionRow.id}`);
  revalidatePath(`/workshop/${sessionRow.id}/lobby`);
  revalidatePath(`/workshop/${sessionRow.id}/step/1`);

  const redirectUrl =
    input.mode === 'start_now'
      ? `/workshop/${sessionRow.id}/step/2`
      : `/workshop/${sessionRow.id}/lobby`;

  return { ok: true, redirectUrl, invites };
}

/**
 * Facilitator clicks "Start workshop" from the lobby. Stamps workshopStartedAt
 * and advances Step 1 → Step 2. Returns the next URL — the client navigates and
 * fires the Liveblocks broadcast so other participants in the lobby follow.
 */
export async function startWorkshop(workshopId: string): Promise<{
  ok: true;
  nextUrl: string;
  alreadyStarted: boolean;
}> {
  const { userId } = await auth();
  if (!userId) throw new Error('Authentication required');

  const [workshop] = await db
    .select()
    .from(workshops)
    .where(and(eq(workshops.id, workshopId), eq(workshops.clerkUserId, userId)))
    .limit(1);
  if (!workshop) throw new Error('Access denied: only the facilitator can start');

  const [sessionRow] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.workshopId, workshopId))
    .limit(1);
  if (!sessionRow) throw new Error('Workshop session not found');

  // Idempotent: if already started, just route to current step
  if (workshop.workshopStartedAt) {
    return {
      ok: true,
      nextUrl: `/workshop/${sessionRow.id}/step/2`,
      alreadyStarted: true,
    };
  }

  await db
    .update(workshops)
    .set({ workshopStartedAt: new Date() })
    .where(eq(workshops.id, workshopId));

  await advanceFromStepOne(workshopId);

  revalidatePath(`/workshop/${sessionRow.id}/lobby`);
  revalidatePath(`/workshop/${sessionRow.id}/step/2`);
  revalidatePath(`/workshop/${sessionRow.id}/step/1`);

  return {
    ok: true,
    nextUrl: `/workshop/${sessionRow.id}/step/2`,
    alreadyStarted: false,
  };
}

/**
 * Mark Step 1 complete and Step 2 in_progress. Internal helper, reused by both
 * setupWorkshop("start_now") and startWorkshop.
 */
async function advanceFromStepOne(workshopId: string): Promise<void> {
  const now = new Date();
  await db
    .update(workshopSteps)
    .set({ status: 'complete', completedAt: now })
    .where(
      and(
        eq(workshopSteps.workshopId, workshopId),
        eq(workshopSteps.stepId, STEP_1_ID)
      )
    );
  await db
    .update(workshopSteps)
    .set({ status: 'in_progress', startedAt: now })
    .where(
      and(
        eq(workshopSteps.workshopId, workshopId),
        eq(workshopSteps.stepId, STEP_2_ID)
      )
    );
}
