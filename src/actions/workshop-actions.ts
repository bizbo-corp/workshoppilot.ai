'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import { workshops, sessions, workshopSteps, chatMessages, stepArtifacts, stepSummaries, users, workshopSessions, sessionParticipants } from '@/db/schema';
import { randomBytes } from 'crypto';
import { eq, and, isNull, inArray, sql, gt } from 'drizzle-orm';
import { PAYWALL_CUTOFF_DATE } from '@/lib/billing/paywall-config';
import { createPrefixedId } from '@/lib/ids';
import { STEPS, getStepById } from '@/lib/workshop/step-metadata';
import { generateStepSummary } from '@/lib/context/generate-summary';
import { prefetchStepStartGreeting } from '@/lib/ai/prefetch-greeting';
import { after } from 'next/server';
import { getNextWorkshopColor, WORKSHOP_COLORS } from '@/lib/workshop/workshop-appearance';
import { PARTICIPANT_COLORS } from '@/lib/liveblocks/config';
import { deleteBlobUrls } from '@/lib/blob/delete-blob-urls';
import { extractBlobUrlsFromArtifact } from '@/lib/blob/extract-urls';
import { dbWithRetry } from '@/db/with-retry';
import { unwrapLiveblocksStorage } from '@/lib/liveblocks/unwrap-storage';
import { getRoomId } from '@/lib/liveblocks/config';

/**
 * Get user ID from Clerk auth.
 * Returns null for unauthenticated users (including E2E test mode where
 * BYPASS_AUTH=true keeps middleware running but no Clerk session exists).
 */
async function getUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Creates a new workshop session and redirects to step 1
 * Works for both authenticated and anonymous users
 * Accepts optional FormData with title, color, and emoji fields
 */
export async function createWorkshopSession(formData?: FormData) {
  let sessionId: string;
  let checkoutUrl: string | null = null;

  try {
    // Get current user (or null for anonymous/BYPASS_AUTH)
    const userId = await getUserId();

    // For anonymous users, use 'anonymous' placeholder
    const clerkUserId = userId || 'anonymous';

    // Extract title from FormData (trim, fallback, cap at 100 chars)
    const rawTitle = formData?.get('title') as string | null;
    const title = rawTitle?.trim().slice(0, 100) || 'New Workshop';

    // Extract color from FormData, validate against palette, fallback to cycling
    const rawColor = formData?.get('color') as string | null;
    const validColorIds = WORKSHOP_COLORS.map((c) => c.id);
    let color: string;
    if (rawColor && validColorIds.includes(rawColor)) {
      color = rawColor;
    } else {
      const existingWorkshops = await db
        .select({ id: workshops.id })
        .from(workshops)
        .where(and(eq(workshops.clerkUserId, clerkUserId), isNull(workshops.deletedAt)));
      color = getNextWorkshopColor(existingWorkshops.length);
    }

    // Extract emoji from FormData (use if provided, otherwise null)
    const rawEmoji = formData?.get('emoji') as string | null;
    const emoji = rawEmoji || null;

    // Extract facilitatorMode from FormData. Team mode (facilitator-led + invites)
    // implies workshopType='multiplayer' regardless of the explicit workshopType field.
    const rawFacilitatorMode = formData?.get('facilitatorMode') as string | null;
    let facilitatorMode: 'solo' | 'team' = rawFacilitatorMode === 'team' ? 'team' : 'solo';

    // Anonymous users can't run a team workshop — invites/notifications need an identified facilitator.
    if (facilitatorMode === 'team' && !userId) {
      facilitatorMode = 'solo';
    }

    // Extract workshopType from FormData (defaults to 'solo'). Team mode forces multiplayer.
    const rawWorkshopType = formData?.get('workshopType') as string | null;
    const workshopType: 'solo' | 'multiplayer' =
      facilitatorMode === 'team' || rawWorkshopType === 'multiplayer'
        ? 'multiplayer'
        : 'solo';

    // 1. Create workshop record
    const [workshop] = await db
      .insert(workshops)
      .values({
        id: createPrefixedId('ws'),
        clerkUserId,
        title,
        originalIdea: '', // Will be populated when AI processes first message
        status: 'active',
        color,
        emoji,
        workshopType,
        maxParticipants: workshopType === 'multiplayer' ? 15 : null,
        facilitatorMode,
      })
      .returning();

    // 2. Create session record
    const [session] = await db
      .insert(sessions)
      .values({
        id: createPrefixedId('ses'),
        workshopId: workshop.id,
      })
      .returning();

    // 3. Initialize all 10 workshop_steps records
    // Use correct WorkshopPilot step definition IDs from step-metadata.ts
    const stepRecords = STEPS.map((step, index) => ({
      id: createPrefixedId('wst'),
      workshopId: workshop.id,
      stepId: step.id, // Uses: 'challenge', 'stakeholder-mapping', etc.
      status: index === 0 ? ('in_progress' as const) : ('not_started' as const),
      startedAt: index === 0 ? new Date() : null,
    }));

    await db.insert(workshopSteps).values(stepRecords);

    // 4. If multiplayer: create workshopSessions record (Liveblocks room registration + share token)
    //    Also create the owner's sessionParticipants record so the facilitator
    //    appears as a participant in ideation step (self-serving workshops).
    if (workshopType === 'multiplayer') {
      const { getRoomId } = await import('@/lib/liveblocks/config');
      // Generate 24-character URL-safe token using Node.js crypto (available in Next.js server actions)
      const shareToken = randomBytes(18).toString('base64url');
      const [workshopSession] = await db.insert(workshopSessions).values({
        workshopId: workshop.id,
        liveblocksRoomId: getRoomId(workshop.id),
        shareToken,
        status: 'waiting',
        maxParticipants: 15,
      }).returning();

      // Create owner participant record — facilitator gets first color (indigo)
      const ownerUser = userId
        ? await db.query.users.findFirst({ where: eq(users.clerkUserId, userId) })
        : null;
      const ownerDisplayName = ownerUser
        ? [ownerUser.firstName, ownerUser.lastName].filter(Boolean).join(' ') || 'Facilitator'
        : 'Facilitator';
      await db.insert(sessionParticipants).values({
        sessionId: workshopSession.id,
        clerkUserId: userId,
        liveblocksUserId: userId || clerkUserId,
        displayName: ownerDisplayName,
        color: PARTICIPANT_COLORS[0],
        role: 'owner',
        status: 'active',
      });
    }

    sessionId = session.id;

    // If a paid tier was preselected ('team' = $299, 'white_glove' = $1,499),
    // redirect through Stripe checkout. Workshop is already created with tier=null;
    // fulfillment sets the tier + creditConsumedAt so the user lands Step 1 fully unlocked.
    const tierToBuyRaw = formData?.get('tierToBuy') as string | null;
    const tierToBuy: 'team' | 'white_glove' | null =
      tierToBuyRaw === 'team' || tierToBuyRaw === 'white_glove' ? tierToBuyRaw : null;
    if (tierToBuy && facilitatorMode === 'team' && userId) {
      const { createCheckoutUrl } = await import('@/actions/billing-actions');
      const result = await createCheckoutUrl({
        sku: tierToBuy,
        workshopId: workshop.id,
        returnUrl: `/workshop/${sessionId}/step/1`,
      });
      if ('url' in result) {
        // Hand off the URL through the outer redirect — see comment below.
        checkoutUrl = result.url;
      } else {
        // Fall through to normal Step 1 redirect; user can still pay at the paywall.
        console.warn(`tierToBuy=${tierToBuy}: createCheckoutUrl failed, falling back to free trial:`, result.error);
      }
    }
  } catch (error) {
    console.error('Failed to create workshop session:', error);
    throw new Error('Failed to create workshop session. Please try again.');
  }

  // Redirect outside try/catch — redirect() throws a special NEXT_REDIRECT
  // error internally, which must not be caught.
  if (checkoutUrl) {
    redirect(checkoutUrl);
  }
  redirect(`/workshop/${sessionId}/step/1`);
}

/**
 * Converts a solo workshop into a team (facilitator-led, multiplayer) workshop.
 * Mirrors the multiplayer-creation branch in createWorkshopSession: sets
 * facilitator_mode='team' + workshop_type='multiplayer', creates the
 * workshopSessions row (Liveblocks room + share token), and seeds the owner's
 * sessionParticipants record. Idempotent: returns early if the workshop is
 * already team-mode.
 *
 * Only the workshop owner can convert. Conversion is blocked once the challenge
 * has been published (challengePublishedAt) because participants may already be
 * involved.
 */
export type ConvertToTeamResult =
  | { status: 'converted' }
  | { status: 'payment_required'; checkoutUrl: string; sku: 'team' | 'team_upgrade'; amountCents: number }
  | { status: 'already_team' }
  | { status: 'blocked'; reason: 'challenge_published' | 'access_denied' | 'auth_required' }
  | { status: 'error'; message: string };

export async function convertToTeamWorkshop(workshopId: string): Promise<ConvertToTeamResult> {
  const userId = await getUserId();
  if (!userId) return { status: 'blocked', reason: 'auth_required' };

  const [workshop] = await db
    .select()
    .from(workshops)
    .where(and(eq(workshops.id, workshopId), eq(workshops.clerkUserId, userId)))
    .limit(1);
  if (!workshop) return { status: 'blocked', reason: 'access_denied' };
  if (workshop.facilitatorMode === 'team') return { status: 'already_team' };
  if (workshop.challengePublishedAt) {
    return { status: 'blocked', reason: 'challenge_published' };
  }

  // Payment branching:
  // - tier === 'solo'  → already paid for solo, charge $200 upgrade diff via team_upgrade SKU.
  // - tier === null    → still in free trial; flip to team for free, payment happens at Step 7.
  // - tier === 'team' or 'white_glove' → covered by the already_team / impossible cases above.
  if (workshop.tier === 'solo') {
    const { createCheckoutUrl } = await import('@/actions/billing-actions');
    const { getPriceConfigBySku } = await import('@/lib/billing/price-config');
    const priceConfig = getPriceConfigBySku('team_upgrade');
    if (!priceConfig) {
      return { status: 'error', message: 'team_upgrade SKU not configured' };
    }
    const [sessionRow] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.workshopId, workshopId))
      .limit(1);
    const returnUrl = sessionRow ? `/workshop/${sessionRow.id}/step/1` : undefined;
    const result = await createCheckoutUrl({
      sku: 'team_upgrade',
      workshopId,
      returnUrl,
    });
    if ('error' in result) {
      return { status: 'error', message: result.error };
    }
    return {
      status: 'payment_required',
      checkoutUrl: result.url,
      sku: 'team_upgrade',
      amountCents: priceConfig.amountCents,
    };
  }

  // Free conversion path (tier === null, still in trial). Flip to team mode and
  // create the Liveblocks session so invites/lobby become available.
  await db
    .update(workshops)
    .set({ facilitatorMode: 'team', workshopType: 'multiplayer', maxParticipants: 15 })
    .where(eq(workshops.id, workshopId));

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
      eq(sessionParticipants.clerkUserId, userId)
    ),
  });
  if (!ownerParticipant) {
    const ownerUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, userId),
    });
    const ownerDisplayName = ownerUser
      ? [ownerUser.firstName, ownerUser.lastName].filter(Boolean).join(' ') || 'Facilitator'
      : 'Facilitator';
    await db.insert(sessionParticipants).values({
      sessionId: workshopSessionId,
      clerkUserId: userId,
      liveblocksUserId: userId,
      displayName: ownerDisplayName,
      color: PARTICIPANT_COLORS[0],
      role: 'owner',
      status: 'active',
    });
  }

  const [sessionRow] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.workshopId, workshopId))
    .limit(1);
  if (sessionRow) {
    revalidatePath(`/workshop/${sessionRow.id}/step/1`);
  }
  revalidatePath('/dashboard');

  return { status: 'converted' };
}

/**
 * Renames a workshop
 * Validates name and updates workshop title in database
 */
export async function renameWorkshop(workshopId: string, newName: string): Promise<void> {
  try {
    // Validate name
    const trimmedName = newName.trim();
    if (trimmedName === '') {
      throw new Error('Workshop name cannot be empty');
    }
    if (trimmedName.length > 100) {
      throw new Error('Workshop name must be 100 characters or less');
    }

    // Update workshop title
    await db
      .update(workshops)
      .set({ title: trimmedName })
      .where(eq(workshops.id, workshopId));

    // Revalidate dashboard to show updated name
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/dashboard');
  } catch (error) {
    console.error('Failed to rename workshop:', error);
    throw error;
  }
}

/**
 * Soft-deletes one or more workshops by setting deletedAt timestamp
 * Validates ownership: only workshops belonging to the current user are deleted
 */
export async function deleteWorkshops(workshopIds: string[]): Promise<{ deleted: number }> {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Authentication required');
  }

  if (workshopIds.length === 0) {
    return { deleted: 0 };
  }

  // Soft delete only workshops owned by this user (defense in depth)
  const result = await db
    .update(workshops)
    .set({ deletedAt: new Date() })
    .where(
      and(
        inArray(workshops.id, workshopIds),
        eq(workshops.clerkUserId, userId),
        isNull(workshops.deletedAt)
      )
    )
    .returning({ id: workshops.id });

  const deletedIds = result.map((r) => r.id);

  if (deletedIds.length > 0) {
    // Find all workshop steps and sessions for deleted workshops
    const [wsSteps, wsSessions] = await Promise.all([
      db
        .select({ id: workshopSteps.id, snapshotUrl: workshopSteps.snapshotUrl })
        .from(workshopSteps)
        .where(inArray(workshopSteps.workshopId, deletedIds)),
      db
        .select({ id: sessions.id })
        .from(sessions)
        .where(inArray(sessions.workshopId, deletedIds)),
    ]);

    const wsStepIds = wsSteps.map((s) => s.id);
    const sessionIds = wsSessions.map((s) => s.id);

    if (wsStepIds.length > 0) {
      // Extract blob URLs from all artifacts before deleting
      const artifacts = await db
        .select({ artifact: stepArtifacts.artifact })
        .from(stepArtifacts)
        .where(inArray(stepArtifacts.workshopStepId, wsStepIds));

      const blobUrls = artifacts.flatMap((a) =>
        extractBlobUrlsFromArtifact((a.artifact || {}) as Record<string, unknown>)
      );

      // Include snapshot URLs in blob cleanup (may be single URL or JSON array)
      for (const s of wsSteps) {
        if (!s.snapshotUrl) continue;
        if (s.snapshotUrl.startsWith('[')) {
          try { blobUrls.push(...JSON.parse(s.snapshotUrl)); } catch { blobUrls.push(s.snapshotUrl); }
        } else {
          blobUrls.push(s.snapshotUrl);
        }
      }

      // Hard-delete related DB rows (they're useless after soft-delete)
      const deleteOps: Promise<unknown>[] = [
        db.delete(stepArtifacts).where(inArray(stepArtifacts.workshopStepId, wsStepIds)),
        db.delete(stepSummaries).where(inArray(stepSummaries.workshopStepId, wsStepIds)),
      ];
      if (sessionIds.length > 0) {
        deleteOps.push(
          db.delete(chatMessages).where(inArray(chatMessages.sessionId, sessionIds))
        );
      }
      await Promise.all(deleteOps);

      // Fire-and-forget blob cleanup
      if (blobUrls.length > 0) {
        deleteBlobUrls(blobUrls).catch(console.warn);
      }
    }
  }

  revalidatePath('/dashboard');

  return { deleted: result.length };
}

/**
 * Updates a single workshop step's status in the database
 * Sets appropriate timestamps based on status transition
 */
export async function updateStepStatus(
  workshopId: string,
  stepId: string,
  status: 'not_started' | 'in_progress' | 'complete' | 'needs_regeneration',
  sessionId: string
): Promise<void> {
  // Determine timestamp updates based on status
  const updates: {
    status: 'not_started' | 'in_progress' | 'complete' | 'needs_regeneration';
    startedAt?: Date | null;
    completedAt?: Date | null;
  } = { status };

  if (status === 'complete') {
    updates.completedAt = new Date();
  } else if (status === 'in_progress') {
    updates.startedAt = new Date();
  } else if (status === 'not_started' || status === 'needs_regeneration') {
    updates.startedAt = null;
    updates.completedAt = null;
  }

  await dbWithRetry(() =>
    db
      .update(workshopSteps)
      .set(updates)
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, stepId)
        )
      )
  );

  // Revalidate workshop layout to refresh step status
  revalidatePath(`/workshop/${sessionId}`);
}

/**
 * Atomically marks current step complete and next step in_progress
 * Returns the next step's order number for navigation
 */
export async function advanceToNextStep(
  workshopId: string,
  currentStepId: string,
  nextStepId: string,
  sessionId: string
): Promise<{ nextStepOrder: number } | { paywallRequired: true; hasCredits: boolean; creditBalance: number }> {
  let nextStepOrder: number;

  try {
    // Multiplayer guard: only the workshop owner (facilitator) can advance steps.
    // Guest participants have no Clerk session — getUserId() returns null for them.
    // This check fires for Clerk-authenticated users who may attempt to call the
    // server action directly (e.g., via browser devtools on a multiplayer workshop
    // they don't own).
    const authUserId = await getUserId();
    // Fetch workshop type once — needed for multiplayer guard AND canvas extraction.
    const [workshopTypeCheck] = await db
      .select({ id: workshops.id, workshopType: workshops.workshopType })
      .from(workshops)
      .where(eq(workshops.id, workshopId))
      .limit(1);
    const isMultiplayer = workshopTypeCheck?.workshopType === 'multiplayer';

    if (authUserId && isMultiplayer) {
      const [isOwner] = await db
        .select({ id: workshops.id })
        .from(workshops)
        .where(and(eq(workshops.id, workshopId), eq(workshops.clerkUserId, authUserId)))
        .limit(1);

      if (!isOwner) {
        throw new Error('Access denied: only the facilitator can advance steps');
      }
    }

    // Paywall gate: Step 7 → Step 8 boundary (after How Might We, before Ideation)
    const STEP_7_ID = 'reframe';
    if (process.env.PAYWALL_ENABLED !== 'false' && currentStepId === STEP_7_ID) {
      const gatUserId = await getUserId();
      if (!gatUserId) throw new Error('Authentication required');

      // Check workshop credit state
      const workshopRecord = await db.query.workshops.findFirst({
        where: and(
          eq(workshops.id, workshopId),
          eq(workshops.clerkUserId, gatUserId)
        ),
        columns: { creditConsumedAt: true, createdAt: true },
      });

      if (workshopRecord) {
        const isUnlocked = workshopRecord.creditConsumedAt !== null;
        const isGrandfathered =
          workshopRecord.creditConsumedAt === null &&
          workshopRecord.createdAt < PAYWALL_CUTOFF_DATE;

        if (!isUnlocked && !isGrandfathered) {
          // Check credit balance to inform UI which dialog to show
          const userRecord = await db.query.users.findFirst({
            where: eq(users.clerkUserId, gatUserId),
            columns: { creditBalance: true },
          });
          const balance = userRecord?.creditBalance ?? 0;
          return {
            paywallRequired: true,
            hasCredits: balance > 0,
            creditBalance: balance,
          };
        }
      }
    }

    // Mark current step complete and next step in_progress BEFORE summary generation.
    // This order is critical for multiplayer: the facilitator broadcasts STEP_CHANGED
    // before this server action runs, so participants may navigate to the next step
    // within ~1 second. If the next step is still "not_started" when they arrive,
    // sequential enforcement redirects them back. By updating both statuses first,
    // the DB is ready for participant navigation before the slow summary generation.
    await updateStepStatus(workshopId, currentStepId, 'complete', sessionId);
    await updateStepStatus(workshopId, nextStepId, 'in_progress', sessionId);

    // Extract structured data from canvas on step completion.
    // For multiplayer: fetches latest from Liveblocks REST API (source of truth).
    // For solo: reads from auto-saved _canvas in the artifact.
    // Failure here must not block step advancement.
    try {
      await extractCanvasArtifactsOnCompletion(workshopId, currentStepId, isMultiplayer);
    } catch (extractErr) {
      console.error(`Failed to extract canvas artifacts for step ${currentStepId}:`, extractErr);
    }

    // Generate conversation summary for the completed step
    // Summary generation is synchronous but failure must not block step advance
    try {
      // Get the workshopStepId from the database
      const workshopStepResult = await dbWithRetry(() =>
        db
          .select({ id: workshopSteps.id })
          .from(workshopSteps)
          .where(
            and(
              eq(workshopSteps.workshopId, workshopId),
              eq(workshopSteps.stepId, currentStepId)
            )
          )
          .limit(1)
      );

      if (workshopStepResult.length > 0) {
        const workshopStepId = workshopStepResult[0].id;

        // Get step metadata for the step name
        const stepMetadata = getStepById(currentStepId);
        const stepName = stepMetadata?.name || currentStepId;

        // Generate summary for the completed step
        await generateStepSummary(workshopId, sessionId, workshopStepId, currentStepId, stepName);
      } else {
        console.error(`Workshop step not found for workshopId=${workshopId}, stepId=${currentStepId}`);
      }
    } catch (summaryError) {
      // Log error but continue with step advance (per Phase 7 decision)
      console.error(`Failed to generate summary for step ${currentStepId}:`, summaryError);
    }

    // Find next step's order number from STEPS array
    const nextStep = STEPS.find((s) => s.id === nextStepId);
    if (!nextStep) {
      throw new Error(`Step ${nextStepId} not found in STEPS array`);
    }

    nextStepOrder = nextStep.order;

    // Eagerly pregenerate the facilitator's greeting for the step we're advancing into,
    // mirroring advanceFromStepOne's prefetch for the step 1→2 boundary. Without this,
    // every "Next" transition relies entirely on the client's auto-start hitting
    // /api/chat after page load — and if /api/chat fails (observed at user-research
    // for ses_u9yw80ayadx3sjnj7dy3tubh: trigger persisted by useAutoSave but no
    // chat_request_logs row, no placeholder), the chat appears permanently empty.
    // With the prefetch, the singleton in /api/chat has a filled placeholder ready
    // to replay even if the client's request never completes.
    //
    // Participants' greetings still rely on their own client auto-start (their
    // participantId scope is independent and the facilitator can't generate for them).
    try {
      after(() =>
        prefetchStepStartGreeting({
          workshopId,
          sessionId,
          stepId: nextStepId,
          participantId: null,
        }),
      );
    } catch (err) {
      console.error(
        `[advanceToNextStep] failed to schedule greeting prefetch for ${nextStepId}:`,
        err,
      );
    }
  } catch (error) {
    console.error('Failed to advance to next step:', error);
    throw error;
  }

  // redirect() must be called outside try/catch (it throws NEXT_REDIRECT internally)
  // This is the idiomatic Next.js pattern for server action navigation.
  // Using router.push() after a server action with revalidatePath doesn't work
  // because the revalidation interferes with client-side navigation.
  redirect(`/workshop/${sessionId}/step/${nextStepOrder}`);
}

/**
 * Extract structured artifact fields from canvas data when a step completes.
 *
 * For multiplayer: fetches the per-step Liveblocks Storage via REST API
 * (the source of truth), unwraps the CRDT format, and extracts fields.
 * For solo: reads from the existing _canvas in the artifact (saved by auto-save).
 *
 * Currently extracts:
 * - Challenge step: hmwStatement from sticky notes (templateKey: 'challenge-statement')
 * - Reframe step: hmwStatements from HMW cards (fullStatement + 4-part fields + ownerId)
 *
 * Extracted fields are merged into the existing artifact (preserving _canvas).
 */
async function extractCanvasArtifactsOnCompletion(
  workshopId: string,
  stepId: string,
  isMultiplayer: boolean,
): Promise<void> {
  // Only these steps need canvas extraction
  const EXTRACTABLE_STEPS = ['challenge', 'reframe'];
  if (!EXTRACTABLE_STEPS.includes(stepId)) return;

  // Find the workshopStep record
  const [wsRecord] = await db
    .select({ id: workshopSteps.id })
    .from(workshopSteps)
    .where(and(eq(workshopSteps.workshopId, workshopId), eq(workshopSteps.stepId, stepId)))
    .limit(1);
  if (!wsRecord) return;

  // Get canvas data — either from Liveblocks REST API (multiplayer) or existing artifact (solo)
  let canvasData: Record<string, unknown> | null = null;

  if (isMultiplayer) {
    // Fetch latest storage from Liveblocks REST API — always fresh
    const liveblocksRoomId = `${getRoomId(workshopId)}-step-${stepId}`;
    try {
      const res = await fetch(
        `https://api.liveblocks.io/v2/rooms/${encodeURIComponent(liveblocksRoomId)}/storage`,
        { headers: { Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}` } }
      );
      if (res.ok) {
        const raw = await res.json();
        canvasData = unwrapLiveblocksStorage(raw) as Record<string, unknown>;
      } else {
        console.warn(`extractCanvasArtifacts: Liveblocks fetch failed for room=${liveblocksRoomId} status=${res.status}`);
      }
    } catch (err) {
      console.warn('extractCanvasArtifacts: Liveblocks fetch error:', err);
    }
  }

  // Fallback or solo: read from existing artifact _canvas
  if (!canvasData) {
    const [artifactRecord] = await db
      .select({ artifact: stepArtifacts.artifact })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, wsRecord.id))
      .limit(1);
    if (artifactRecord?.artifact) {
      const existing = artifactRecord.artifact as Record<string, unknown>;
      if (existing._canvas && typeof existing._canvas === 'object') {
        canvasData = existing._canvas as Record<string, unknown>;
      }
    }
  }

  if (!canvasData) return;

  // Extract structured fields based on step type
  const structuredFields: Record<string, unknown> = {};

  if (stepId === 'challenge') {
    // Extract hmwStatement from the challenge-statement sticky note
    const stickyNotes = canvasData.stickyNotes as Array<{ templateKey?: string; text?: string }> | undefined;
    if (stickyNotes) {
      const hmwNote = stickyNotes.find((n) => n.templateKey === 'challenge-statement' && n.text);
      if (hmwNote?.text) {
        structuredFields.hmwStatement = hmwNote.text;
      }
    }
  }

  if (stepId === 'reframe') {
    // Extract hmwStatements from HMW cards
    type HmwCard = {
      fullStatement?: string; givenThat?: string; persona?: string;
      immediateGoal?: string; deeperGoal?: string; cardIndex?: number;
      ownerId?: string; ownerName?: string;
    };
    const hmwCards = canvasData.hmwCards as HmwCard[] | undefined;
    if (hmwCards && hmwCards.length > 0) {
      const statements = hmwCards
        .filter((c) => c.fullStatement || (c.givenThat && c.persona && c.immediateGoal && c.deeperGoal))
        .sort((a, b) => (a.cardIndex ?? 0) - (b.cardIndex ?? 0))
        .map((c) => ({
          givenThat: c.givenThat || '',
          persona: c.persona || '',
          immediateGoal: c.immediateGoal || '',
          deeperGoal: c.deeperGoal || '',
          fullStatement: c.fullStatement ||
            `Given that ${c.givenThat}, how might we help ${c.persona} to ${c.immediateGoal} so they can ${c.deeperGoal}?`,
          ownerId: c.ownerId,
          ownerName: c.ownerName,
        }));
      if (statements.length > 0) {
        structuredFields.hmwStatements = statements;
      }
    }
  }

  if (Object.keys(structuredFields).length === 0) return;

  // Merge structured fields into existing artifact (preserving _canvas and other keys)
  const [existingArt] = await db
    .select({ id: stepArtifacts.id, artifact: stepArtifacts.artifact, version: stepArtifacts.version })
    .from(stepArtifacts)
    .where(eq(stepArtifacts.workshopStepId, wsRecord.id))
    .limit(1);

  if (existingArt) {
    const existing = (existingArt.artifact || {}) as Record<string, unknown>;
    const merged = { ...existing, ...structuredFields };
    await db
      .update(stepArtifacts)
      .set({ artifact: merged, version: existingArt.version + 1, extractedAt: new Date() })
      .where(eq(stepArtifacts.id, existingArt.id));
  } else {
    // No artifact yet — create one with just the structured fields
    await db.insert(stepArtifacts).values({
      workshopStepId: wsRecord.id,
      stepId,
      artifact: structuredFields,
      schemaVersion: '1.0',
      version: 1,
    });
  }

  console.log(`extractCanvasArtifacts: saved ${Object.keys(structuredFields).join(', ')} for step=${stepId}`);
}

/**
 * Resets a step and all downstream steps — full destructive forward wipe.
 * Admin-only. Deletes conversations, artifacts, and summaries for current step
 * and all later steps. Resets current step to in_progress, downstream to not_started.
 */
export async function resetStep(
  workshopId: string,
  stepId: string,
  sessionId: string
): Promise<void> {
  try {
    // Find the current step definition to determine order
    const currentStepDef = getStepById(stepId);
    if (!currentStepDef) {
      throw new Error(`Step definition not found: ${stepId}`);
    }

    // Get all step IDs from current step forward (inclusive)
    const forwardStepDefs = STEPS.filter(s => s.order >= currentStepDef.order);
    const forwardStepIds = forwardStepDefs.map(s => s.id);

    // Find all workshop step records for forward steps
    const workshopStepRecords = await db
      .select({ id: workshopSteps.id, stepId: workshopSteps.stepId, snapshotUrl: workshopSteps.snapshotUrl })
      .from(workshopSteps)
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          inArray(workshopSteps.stepId, forwardStepIds)
        )
      );

    if (workshopStepRecords.length === 0) {
      throw new Error(`No workshop steps found for reset`);
    }

    const workshopStepIds = workshopStepRecords.map(r => r.id);

    // Delete chat messages for all forward steps
    for (const fwdStepId of forwardStepIds) {
      await db
        .delete(chatMessages)
        .where(
          and(
            eq(chatMessages.sessionId, sessionId),
            eq(chatMessages.stepId, fwdStepId)
          )
        );
    }

    // Extract blob URLs from artifacts before deleting
    const artifacts = await db
      .select({ artifact: stepArtifacts.artifact })
      .from(stepArtifacts)
      .where(inArray(stepArtifacts.workshopStepId, workshopStepIds));

    const blobUrls = artifacts.flatMap((a) =>
      extractBlobUrlsFromArtifact((a.artifact || {}) as Record<string, unknown>)
    );

    // Include snapshot URLs in blob cleanup (may be single URL or JSON array)
    for (const r of workshopStepRecords) {
      if (!r.snapshotUrl) continue;
      if (r.snapshotUrl.startsWith('[')) {
        try { blobUrls.push(...JSON.parse(r.snapshotUrl)); } catch { blobUrls.push(r.snapshotUrl); }
      } else {
        blobUrls.push(r.snapshotUrl);
      }
    }

    // Batch-delete step artifacts for all forward steps
    await db
      .delete(stepArtifacts)
      .where(inArray(stepArtifacts.workshopStepId, workshopStepIds));

    // Fire-and-forget blob cleanup
    if (blobUrls.length > 0) {
      deleteBlobUrls(blobUrls).catch(console.warn);
    }

    // Batch-delete step summaries for all forward steps
    await db
      .delete(stepSummaries)
      .where(inArray(stepSummaries.workshopStepId, workshopStepIds));

    // Reset current step to in_progress
    await db
      .update(workshopSteps)
      .set({
        status: 'in_progress',
        arcPhase: 'orient',
        startedAt: new Date(),
        completedAt: null,
        snapshotUrl: null,
      })
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, stepId)
        )
      );

    // Reset all downstream steps (after current) to not_started
    const downstreamStepIds = forwardStepDefs
      .filter(s => s.order > currentStepDef.order)
      .map(s => s.id);

    if (downstreamStepIds.length > 0) {
      await db
        .update(workshopSteps)
        .set({
          status: 'not_started',
          arcPhase: 'orient',
          startedAt: null,
          completedAt: null,
          snapshotUrl: null,
        })
        .where(
          and(
            eq(workshopSteps.workshopId, workshopId),
            inArray(workshopSteps.stepId, downstreamStepIds)
          )
        );
    }

    // Revalidate workshop layout to refresh sidebar and step status
    revalidatePath(`/workshop/${sessionId}`);
  } catch (error) {
    console.error('Failed to reset step:', error);
    throw error;
  }
}

/**
 * Marks a workshop as completed.
 * Requires all 10 steps to be complete before setting workshop status.
 * Idempotent: if workshop is already completed, returns success without re-updating.
 */
export async function completeWorkshop(
  workshopId: string,
  sessionId: string
): Promise<{ success: true }> {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Authentication required');
  }

  // Verify workshop belongs to the current user
  const [workshop] = await db
    .select({ id: workshops.id, status: workshops.status, clerkUserId: workshops.clerkUserId })
    .from(workshops)
    .where(
      and(
        eq(workshops.id, workshopId),
        eq(workshops.clerkUserId, userId),
        isNull(workshops.deletedAt)
      )
    )
    .limit(1);

  if (!workshop) {
    throw new Error('Workshop not found or access denied');
  }

  // Idempotent: already completed
  if (workshop.status === 'completed') {
    return { success: true };
  }

  // Verify all 10 steps are complete (completedAt must be set on every step)
  const steps = await db
    .select({ id: workshopSteps.id, stepId: workshopSteps.stepId, completedAt: workshopSteps.completedAt })
    .from(workshopSteps)
    .where(eq(workshopSteps.workshopId, workshopId));

  const incompleteSteps = steps.filter((s) => s.completedAt === null);
  if (incompleteSteps.length > 0 || steps.length < 10) {
    throw new Error('All steps must be completed before finishing the workshop');
  }

  // Set workshop status to 'completed'
  await db
    .update(workshops)
    .set({ status: 'completed' })
    .where(
      and(
        eq(workshops.id, workshopId),
        eq(workshops.clerkUserId, userId)
      )
    );

  revalidatePath('/dashboard');
  revalidatePath(`/workshop/${sessionId}`);

  return { success: true };
}

/**
 * Updates a workshop's visual appearance (color accent and/or emoji)
 * Validates color against palette; accepts any emoji string from emoji-mart
 */
export async function updateWorkshopAppearance(
  workshopId: string,
  updates: { color?: string; emoji?: string | null }
): Promise<void> {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Authentication required');
  }

  // Build the set object with only provided fields
  const setValues: { color?: string; emoji?: string | null } = {};

  if (updates.color !== undefined) {
    // Validate color against palette
    const validColorIds = WORKSHOP_COLORS.map((c) => c.id);
    if (!validColorIds.includes(updates.color)) {
      throw new Error(`Invalid color: ${updates.color}`);
    }
    setValues.color = updates.color;
  }

  if (updates.emoji !== undefined) {
    setValues.emoji = updates.emoji;
  }

  if (Object.keys(setValues).length === 0) {
    return;
  }

  // Ownership check: only update workshops belonging to this user
  // Preserve updatedAt so cosmetic changes don't reorder the dashboard
  await db
    .update(workshops)
    .set({ ...setValues, updatedAt: sql`updated_at` })
    .where(
      and(
        eq(workshops.id, workshopId),
        eq(workshops.clerkUserId, userId)
      )
    );

  revalidatePath('/dashboard');
}

/**
 * Updates lastVisitedAt on a workshop when the facilitator opens it.
 * Called from the step page on load.
 */
export async function trackWorkshopVisit(workshopId: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  await db
    .update(workshops)
    .set({ lastVisitedAt: new Date(), updatedAt: sql`updated_at` })
    .where(
      and(
        eq(workshops.id, workshopId),
        eq(workshops.clerkUserId, userId)
      )
    );
}
