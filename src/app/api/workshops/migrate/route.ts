import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { workshops, workshopSteps } from '@/db/schema';
import { AnonymousSessionSchema } from '@/lib/auth/anonymous-session';

/**
 * POST /api/workshops/migrate
 * Migrates anonymous session data to authenticated user's account
 * Creates workshop and workshop step records from localStorage data
 */
export async function POST(request: Request) {
  try {
    // Defense in depth: verify authentication
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const session = AnonymousSessionSchema.parse(body);

    // Check if already migrated
    if (session.migrated) {
      return NextResponse.json(
        { error: 'Session already migrated' },
        { status: 400 }
      );
    }

    // Create workshop record
    const [workshop] = await db
      .insert(workshops)
      .values({
        clerkUserId: userId,
        title: session.workshopTitle || 'Untitled Workshop',
        originalIdea: session.originalIdea || '',
        status: 'active',
      })
      .returning();

    // Create workshop step records if any exist
    if (session.steps && session.steps.length > 0) {
      const stepValues = session.steps.map((step) => ({
        workshopId: workshop.id,
        stepId: step.stepId,
        status: step.status,
        output: step.output || null,
        completedAt: step.completedAt ? new Date(step.completedAt) : null,
      }));

      await db.insert(workshopSteps).values(stepValues);
    }

    return NextResponse.json(
      { workshopId: workshop.id },
      { status: 200 }
    );
  } catch (error) {
    console.error('Workshop migration error:', error);

    // Handle Zod validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid session data format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
