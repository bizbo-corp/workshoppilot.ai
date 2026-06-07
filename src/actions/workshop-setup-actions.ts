'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { workshops, sessions, workshopSteps, chatMessages, stepSummaries } from '@/db/schema';
import { sendWorkshopInvites, type SendInvitesResult } from './invitation-actions';
import {
  parseScheduleInput,
  MAX_TEAM_INVITES,
  type DurationMinutes,
} from '@/lib/workshop/workshop-schedule';
import { syncChallengeArtifactFromLiveblocks } from '@/lib/workshop/challenge-artifact';
import {
  generateStepSummary,
  generateChallengeSummaryFromArtifact,
} from '@/lib/context/generate-summary';
import { prefetchStepStartGreeting } from '@/lib/ai/prefetch-greeting';
import { after } from 'next/server';

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

  // Pull the latest challenge canvas state from Liveblocks into the artifact BEFORE
  // any downstream consumers run: advanceFromStepOne (which writes the Step 1 summary
  // from the artifact) and sendWorkshopInvites (which renders the challenge block into
  // invitation emails). Idempotent + no-op for solo workshops.
  try {
    await syncChallengeArtifactFromLiveblocks(
      input.workshopId,
      workshop.workshopType === 'multiplayer'
    );
  } catch (err) {
    console.warn('[setupWorkshop] Challenge artifact sync failed (continuing):', err);
  }

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

    await advanceFromStepOne(input.workshopId, sessionRow.id);
  }

  // Send invitation emails (publishChallenge fires inside sendWorkshopInvites)
  const invites = await sendWorkshopInvites(input.workshopId, cleanedEmails);

  revalidatePath(`/workshop/${sessionRow.id}`);
  revalidatePath(`/workshop/${sessionRow.id}/lobby`);
  revalidatePath(`/workshop/${sessionRow.id}/step/challenge`);

  const redirectUrl =
    input.mode === 'start_now'
      ? `/workshop/${sessionRow.id}/step/stakeholder-mapping`
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
      nextUrl: `/workshop/${sessionRow.id}/step/stakeholder-mapping`,
      alreadyStarted: true,
    };
  }

  await db
    .update(workshops)
    .set({ workshopStartedAt: new Date() })
    .where(eq(workshops.id, workshopId));

  // Mirror setupWorkshop("start_now"): sync the Liveblocks canvas before advancing so
  // advanceFromStepOne's summary writer sees the latest sticky-note text. Idempotent.
  try {
    await syncChallengeArtifactFromLiveblocks(
      workshopId,
      workshop.workshopType === 'multiplayer'
    );
  } catch (err) {
    console.warn('[startWorkshop] Challenge artifact sync failed (continuing):', err);
  }

  await advanceFromStepOne(workshopId, sessionRow.id);

  revalidatePath(`/workshop/${sessionRow.id}/lobby`);
  revalidatePath(`/workshop/${sessionRow.id}/step/stakeholder-mapping`);
  revalidatePath(`/workshop/${sessionRow.id}/step/challenge`);

  return {
    ok: true,
    nextUrl: `/workshop/${sessionRow.id}/step/stakeholder-mapping`,
    alreadyStarted: false,
  };
}

/**
 * Mark Step 1 complete and Step 2 in_progress. Internal helper, reused by both
 * setupWorkshop("start_now") and startWorkshop.
 *
 * Also writes a `step_summaries` row for Step 1 — without this, the stakeholder-mapping
 * ABSENCE PROTOCOL (added in 62.1 HALL-01) would hard-stop on Step 2 because there is no
 * downstream summary to satisfy its "challenge confirmed?" check. Prefers a chat-derived
 * summary if the user actually chatted on Step 1; otherwise synthesizes a deterministic
 * summary from the challenge artifact (the form-only path's source of truth). Failure to
 * write the summary is logged but never blocks step advance.
 */
async function advanceFromStepOne(workshopId: string, sessionId: string): Promise<void> {
  const now = new Date();
  // Resolve the workshop_step row id for Step 1 — needed by both the status update and
  // the summary write. One round-trip avoids a second SELECT inside the summary helper.
  const [step1Row] = await db
    .select({ id: workshopSteps.id })
    .from(workshopSteps)
    .where(
      and(eq(workshopSteps.workshopId, workshopId), eq(workshopSteps.stepId, STEP_1_ID))
    )
    .limit(1);

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

  if (!step1Row) {
    console.error(
      `[advanceFromStepOne] Step 1 row not found for workshop=${workshopId} — skipping summary write`
    );
    return;
  }

  try {
    // Idempotency: if a Step 1 summary already exists, the helper has run before
    // (or Path A wrote one). Skip — `step_summaries.workshop_step_id` is uniquely
    // constrained, and re-running would waste a Gemini call only to throw + fall
    // through to the fallback insert (which also throws). Safe no-op.
    const existing = await db
      .select({ id: stepSummaries.id })
      .from(stepSummaries)
      .where(eq(stepSummaries.workshopStepId, step1Row.id))
      .limit(1);
    if (existing.length > 0) return;

    // If the user actually chatted on Step 1, let generateStepSummary distill the
    // conversation (parity with advanceToNextStep / Path A). Otherwise synthesize from
    // the structured challenge artifact so downstream steps still have a usable summary.
    const hasChat = await db
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .where(
        and(eq(chatMessages.sessionId, sessionId), eq(chatMessages.stepId, STEP_1_ID))
      )
      .limit(1);

    if (hasChat.length > 0) {
      await generateStepSummary(workshopId, sessionId, step1Row.id, STEP_1_ID, 'Challenge');
    } else {
      await generateChallengeSummaryFromArtifact(workshopId, step1Row.id);
    }
  } catch (err) {
    // Never block step advance on summary failure — log + fall through.
    console.error(
      `[advanceFromStepOne] Failed to write Step 1 summary for workshop=${workshopId}:`,
      err
    );
  }

  // Eagerly pregenerate the facilitator's Step 2 greeting in the post-response queue,
  // so by the time setupWorkshop returns and the wizard navigates to /step/stakeholder-mapping, the chat
  // panel finds a ready-to-replay greeting via the DB-lock singleton instead of having
  // to wait the full Gemini round-trip on mount. The client's own __step_start__ trigger
  // loses the claim race and replays via pollForFilledGreeting. Safe to call from server
  // actions per Next.js 15+ `after` semantics.
  try {
    after(() =>
      prefetchStepStartGreeting({
        workshopId,
        sessionId,
        stepId: STEP_2_ID,
        participantId: null,
      }),
    );
  } catch (err) {
    // `after()` should not throw in normal Next.js runtimes, but if it does (e.g. legacy
    // edge runtime without the API), don't block step advance — the client's own
    // __step_start__ will still generate the greeting on mount.
    console.error(
      `[advanceFromStepOne] Failed to schedule greeting prefetch for workshop=${workshopId}:`,
      err,
    );
  }
}
