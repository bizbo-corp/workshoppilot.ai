'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import { workshops, sessions, workshopSteps, chatMessages, stepArtifacts, stepSummaries, users } from '@/db/schema';
import { eq, and, isNull, inArray, sql, gt } from 'drizzle-orm';
import { PAYWALL_CUTOFF_DATE } from '@/lib/billing/paywall-config';
import { createPrefixedId } from '@/lib/ids';
import { STEPS, getStepById } from '@/lib/workshop/step-metadata';
import { generateStepSummary } from '@/lib/context/generate-summary';
import { getNextWorkshopColor, WORKSHOP_COLORS } from '@/lib/workshop/workshop-appearance';
import { deleteBlobUrls } from '@/lib/blob/delete-blob-urls';
import { extractBlobUrlsFromArtifact } from '@/lib/blob/extract-urls';
import { dbWithRetry } from '@/db/with-retry';

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

    sessionId = session.id;
  } catch (error) {
    console.error('Failed to create workshop session:', error);
    throw new Error('Failed to create workshop session. Please try again.');
  }

  // Redirect outside try/catch — redirect() throws a special NEXT_REDIRECT
  // error internally, which must not be caught
  redirect(`/workshop/${sessionId}/step/1`);
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
        .select({ id: workshopSteps.id })
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
    // Paywall gate: Step 6 → Step 7 boundary
    const STEP_6_ID = 'journey-mapping';
    if (process.env.PAYWALL_ENABLED !== 'false' && currentStepId === STEP_6_ID) {
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

    // Mark current step complete
    await updateStepStatus(workshopId, currentStepId, 'complete', sessionId);

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

    // Mark next step in_progress
    await updateStepStatus(workshopId, nextStepId, 'in_progress', sessionId);

    // Find next step's order number from STEPS array
    const nextStep = STEPS.find((s) => s.id === nextStepId);
    if (!nextStep) {
      throw new Error(`Step ${nextStepId} not found in STEPS array`);
    }

    nextStepOrder = nextStep.order;
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
      .select({ id: workshopSteps.id, stepId: workshopSteps.stepId })
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
