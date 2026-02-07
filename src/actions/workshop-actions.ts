'use server';

import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import { workshops, sessions, workshopSteps } from '@/db/schema';
import { createPrefixedId } from '@/lib/ids';
import { STEPS } from '@/lib/workshop/step-metadata';

/**
 * Creates a new workshop session and redirects to step 1
 * Works for both authenticated and anonymous users
 */
export async function createWorkshopSession() {
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

    // 4. Redirect to step 1
    redirect(`/workshop/${session.id}/step/1`);
  } catch (error) {
    console.error('Failed to create workshop session:', error);
    throw new Error('Failed to create workshop session. Please try again.');
  }
}
