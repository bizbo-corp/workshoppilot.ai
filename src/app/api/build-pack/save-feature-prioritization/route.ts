/**
 * Save Feature Prioritization API
 *
 * POST /api/build-pack/save-feature-prioritization
 *
 * Autosaves feature prioritization state changes (reorder, edit, etc.)
 */

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import { buildPacks, workshops } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';
import type { FeaturePrioritizationState } from '@/lib/feature-prioritization/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workshopId, state } = body as {
      workshopId: string;
      state: FeaturePrioritizationState;
    };

    if (!workshopId || !state) {
      return Response.json({ error: 'workshopId and state are required' }, { status: 400 });
    }

    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workshop = await db
      .select({ id: workshops.id, clerkUserId: workshops.clerkUserId })
      .from(workshops)
      .where(eq(workshops.id, workshopId))
      .limit(1);

    if (workshop.length === 0 || workshop[0].clerkUserId !== userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Guard: never save empty state
    if (!state.features || state.features.length === 0) {
      return Response.json({ saved: false, reason: 'empty-state' });
    }

    // Find existing feature prioritization build pack
    const existingRows = await db
      .select()
      .from(buildPacks)
      .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, 'Feature Prioritization:%')));

    const existing = existingRows.find((r) => r.formatType === 'json');
    const content = JSON.stringify({ ...state, isDirty: false, _schemaVersion: 1 });

    let buildPackId: string;

    if (existing) {
      await db
        .update(buildPacks)
        .set({ content })
        .where(eq(buildPacks.id, existing.id));
      buildPackId = existing.id;
    } else {
      const [inserted] = await db.insert(buildPacks).values({
        workshopId,
        title: `Feature Prioritization:${state.workshopTitle || 'Product'}`,
        formatType: 'json',
        content,
      }).returning({ id: buildPacks.id });
      buildPackId = inserted.id;
    }

    return Response.json({ saved: true, buildPackId });
  } catch (error) {
    console.error('save-feature-prioritization error:', error instanceof Error ? error.message : error);
    return Response.json({ error: 'Failed to save feature prioritization' }, { status: 500 });
  }
}
