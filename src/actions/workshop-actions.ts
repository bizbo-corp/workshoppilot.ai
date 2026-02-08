'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import { workshops, sessions, workshopSteps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createPrefixedId } from '@/lib/ids';
import { STEPS } from '@/lib/workshop/step-metadata';

/**
 * Creates a new workshop session and redirects to step 1
 * Works for both authenticated and anonymous users
 */
export async function createWorkshopSession() {
  let sessionId: string;

  try {
    // Get current user (or null for anonymous)
    const { userId } = await auth();

    // For anonymous users, use 'anonymous' placeholder
    // Per user decision: "Before AI naming, workshop appears as 'New Workshop'"
    const clerkUserId = userId || 'anonymous';

    // 1. Create workshop record
    const [workshop] = await db
      .insert(workshops)
      .values({
        id: createPrefixedId('ws'),
        clerkUserId,
        title: 'New Workshop',
        originalIdea: '', // Will be populated when AI processes first message
        status: 'active',
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
 * Updates a single workshop step's status in the database
 * Sets appropriate timestamps based on status transition
 */
export async function updateStepStatus(
  workshopId: string,
  stepId: string,
  status: 'not_started' | 'in_progress' | 'complete' | 'needs_regeneration',
  sessionId: string
): Promise<void> {
  try {
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

    // Update the workshop step
    await db
      .update(workshopSteps)
      .set(updates)
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, stepId)
        )
      );

    // Revalidate workshop layout to refresh step status
    revalidatePath(`/workshop/${sessionId}`);
  } catch (error) {
    console.error('Failed to update step status:', error);
    throw error;
  }
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
): Promise<{ nextStepOrder: number }> {
  try {
    // Mark current step complete
    await updateStepStatus(workshopId, currentStepId, 'complete', sessionId);

    // Mark next step in_progress
    await updateStepStatus(workshopId, nextStepId, 'in_progress', sessionId);

    // Find next step's order number from STEPS array
    const nextStep = STEPS.find((s) => s.id === nextStepId);
    if (!nextStep) {
      throw new Error(`Step ${nextStepId} not found in STEPS array`);
    }

    return { nextStepOrder: nextStep.order };
  } catch (error) {
    console.error('Failed to advance to next step:', error);
    throw error;
  }
}
