/**
 * Delete Journey Map API
 *
 * POST /api/build-pack/delete-journey-map
 *
 * Deletes the saved journey map for a workshop so users can start fresh.
 */

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import { buildPacks, workshops } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workshopId } = body;

    if (!workshopId) {
      return new Response(
        JSON.stringify({ error: 'workshopId is required' }),
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

    // Delete all journey map build packs for this workshop
    const deleted = await db
      .delete(buildPacks)
      .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, 'Journey Map:%')))
      .returning({ id: buildPacks.id });

    return new Response(
      JSON.stringify({ deleted: deleted.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('delete-journey-map error:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete journey map' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
