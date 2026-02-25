/**
 * GET /api/workshops/[workshopId]/outputs
 *
 * Returns all build_pack rows for a workshop, grouped by deliverable type.
 *
 * Response shape:
 * {
 *   deliverables: Array<{
 *     type: 'prd' | 'tech-specs' | 'other';
 *     title: string;
 *     formats: Array<{ id: string; formatType: 'markdown' | 'json' | 'pdf'; content: string | null; createdAt: Date; updatedAt: Date }>;
 *   }>
 * }
 */

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import { buildPacks, workshops } from '@/db/schema';
import { eq } from 'drizzle-orm';

type DeliverableType = 'prd' | 'tech-specs' | 'other';

interface DeliverableFormat {
  id: string;
  formatType: 'markdown' | 'json' | 'pdf';
  content: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Deliverable {
  type: DeliverableType;
  title: string;
  formats: DeliverableFormat[];
}

function getDeliverableType(title: string): DeliverableType {
  if (title.startsWith('PRD:')) return 'prd';
  if (title.startsWith('Tech Specs:')) return 'tech-specs';
  return 'other';
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workshopId: string }> }
) {
  try {
    const { workshopId } = await params;

    // Auth check
    const { userId } = await auth();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Ownership check
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

    // Fetch all build_packs for this workshop
    const rows = await db
      .select()
      .from(buildPacks)
      .where(eq(buildPacks.workshopId, workshopId))
      .orderBy(buildPacks.createdAt);

    // Group rows by deliverable type (using title prefix detection)
    const groupMap = new Map<string, Deliverable>();

    for (const row of rows) {
      const type = getDeliverableType(row.title);

      // Use a stable group key: type + normalized title (strip prefix for display)
      const groupKey = type;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          type,
          title: row.title,
          formats: [],
        });
      }

      const group = groupMap.get(groupKey)!;
      group.formats.push({
        id: row.id,
        formatType: row.formatType,
        content: row.content ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    }

    const deliverables = Array.from(groupMap.values());

    return new Response(
      JSON.stringify({ deliverables }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('GET /api/workshops/[workshopId]/outputs error:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
