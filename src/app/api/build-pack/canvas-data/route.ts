/**
 * Canvas Data API
 *
 * GET /api/build-pack/canvas-data?workshopId=xxx
 *
 * Returns all step artifacts with full _canvas data for presentation capture.
 */

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import { stepArtifacts, workshopSteps, workshops } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const workshopId = url.searchParams.get('workshopId');

    if (!workshopId) {
      return Response.json({ error: 'workshopId is required' }, { status: 400 });
    }

    // Auth check
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ownership check
    const workshop = await db
      .select({ id: workshops.id, clerkUserId: workshops.clerkUserId })
      .from(workshops)
      .where(eq(workshops.id, workshopId))
      .limit(1);

    if (workshop.length === 0 || workshop[0].clerkUserId !== userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Load all step artifacts with full artifact data (including _canvas)
    const rows = await db
      .select({
        stepId: stepArtifacts.stepId,
        artifact: stepArtifacts.artifact,
      })
      .from(stepArtifacts)
      .innerJoin(workshopSteps, eq(stepArtifacts.workshopStepId, workshopSteps.id))
      .where(eq(workshopSteps.workshopId, workshopId));

    const STEP_KEY_MAP: Record<string, string> = {
      'challenge': 'challenge',
      'stakeholder-mapping': 'stakeholderMapping',
      'user-research': 'userResearch',
      'sense-making': 'senseMaking',
      'persona': 'persona',
      'journey-mapping': 'journeyMapping',
      'reframe': 'reframe',
      'ideation': 'ideation',
      'concept': 'concept',
      'validate': 'validate',
    };

    const steps: Record<string, { artifact: Record<string, unknown>; canvas: Record<string, unknown> | null }> = {};

    for (const row of rows) {
      const key = STEP_KEY_MAP[row.stepId];
      if (key) {
        const artifact = row.artifact as Record<string, unknown>;
        const canvas = (artifact._canvas as Record<string, unknown>) || null;
        steps[key] = { artifact, canvas };
      }
    }

    return Response.json({ steps });
  } catch (error) {
    console.error('canvas-data error:', error instanceof Error ? error.message : error);
    return Response.json({ error: 'Failed to load canvas data' }, { status: 500 });
  }
}
