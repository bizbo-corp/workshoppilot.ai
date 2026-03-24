/**
 * Save Journey Map API
 *
 * POST /api/build-pack/save-journey-map
 *
 * Autosaves journey mapper state changes (drag, edit, etc.)
 */

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import { buildPacks, workshops } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';
import type { JourneyMapperState } from '@/lib/journey-mapper/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workshopId, state, v0Prompt, v0SystemPrompt } = body as {
      workshopId: string;
      state: JourneyMapperState;
      v0Prompt?: string;
      v0SystemPrompt?: string;
    };

    if (!workshopId || !state) {
      return new Response(
        JSON.stringify({ error: 'workshopId and state are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const workshop = await db
      .select({ id: workshops.id, clerkUserId: workshops.clerkUserId })
      .from(workshops)
      .where(eq(workshops.id, workshopId))
      .limit(1);

    if (workshop.length === 0 || workshop[0].clerkUserId !== userId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Guard: never save empty state to DB (prevents autosave race after reset)
    if (!state.nodes || state.nodes.length === 0) {
      console.warn('[journey-map] save blocked: empty nodes array, skipping DB write');
      return new Response(
        JSON.stringify({ saved: false, reason: 'empty-state' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find existing journey map build pack
    const existingRows = await db
      .select()
      .from(buildPacks)
      .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, 'Journey Map:%')));

    const existing = existingRows.find((r) => r.formatType === 'json');
    const statePayload: Record<string, unknown> = { ...state, isDirty: false };
    if (v0Prompt) {
      statePayload.prompt = v0Prompt;
    }
    if (v0SystemPrompt) {
      statePayload.systemPrompt = v0SystemPrompt;
    }
    const content = JSON.stringify(statePayload);

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
        title: 'Journey Map: Product',
        formatType: 'json',
        content,
      }).returning({ id: buildPacks.id });
      buildPackId = inserted.id;
    }

    return new Response(
      JSON.stringify({ saved: true, buildPackId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('save-journey-map error:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: 'Failed to save journey map' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
