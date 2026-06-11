/**
 * Save Journey Flow API
 *
 * POST /api/build-pack/save-journey-flow
 *
 * Autosaves journey flow state to build_packs under the 'Journey Flow:' prefix.
 * Uses a separate prefix from 'Journey Map:' to never clobber the old mapper's saved state.
 */

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import { buildPacks, workshops } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';
import type { JourneyFlowState } from '@/lib/journey-flow/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workshopId, state } = body as {
      workshopId: string;
      state: JourneyFlowState;
    };

    if (!workshopId || !state) {
      return Response.json({ error: 'workshopId and state are required' }, { status: 400 });
    }

    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workshop = await db
      .select({ id: workshops.id, clerkUserId: workshops.clerkUserId, title: workshops.title })
      .from(workshops)
      .where(eq(workshops.id, workshopId))
      .limit(1);

    if (workshop.length === 0 || workshop[0].clerkUserId !== userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Guard: never save empty state
    if (!state.nodes || state.nodes.length === 0) {
      return Response.json({ saved: false, reason: 'empty-state' });
    }

    // Find existing journey flow build pack — CRITICAL: prefix 'Journey Flow:' only, never 'Journey Map:'
    const existingRows = await db
      .select()
      .from(buildPacks)
      .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, 'Journey Flow:%')));

    const existing = existingRows.find((r) => r.formatType === 'json');
    const content = JSON.stringify({
      ...state,
      isDirty: false,
      lastSavedAt: new Date().toISOString(),
      _schemaVersion: 1,
    });

    let buildPackId: string;

    if (existing) {
      await db
        .update(buildPacks)
        .set({ content })
        .where(eq(buildPacks.id, existing.id));
      buildPackId = existing.id;
    } else {
      const [inserted] = await db
        .insert(buildPacks)
        .values({
          workshopId,
          title: `Journey Flow:${workshop[0].title || 'Product'}`,
          formatType: 'json',
          content,
        })
        .returning({ id: buildPacks.id });
      buildPackId = inserted.id;
    }

    return Response.json({ saved: true, buildPackId });
  } catch (error) {
    console.error('save-journey-flow error:', error instanceof Error ? error.message : error);
    return Response.json({ error: 'Failed to save journey flow' }, { status: 500 });
  }
}
