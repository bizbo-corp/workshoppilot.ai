import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import { workshops, workshopSteps, stepArtifacts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getRoomId } from '@/lib/liveblocks/config';
import { unwrapLiveblocksStorage } from '@/lib/liveblocks/unwrap-storage';

/**
 * POST /api/workshops/[workshopId]/repair-artifacts
 *
 * One-time repair endpoint for existing multiplayer workshops where
 * steps 1 (challenge) and 7 (reframe) completed before the extraction
 * fix was deployed. Fetches canvas data from Liveblocks Storage and
 * saves structured fields (hmwStatement, hmwStatements) to the artifact.
 *
 * Auth: owner only.
 * Idempotent: safe to call multiple times — merges without overwriting.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ workshopId: string }> }
) {
  const { workshopId } = await params;
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership
  const [workshop] = await db
    .select({ id: workshops.id, workshopType: workshops.workshopType })
    .from(workshops)
    .where(and(eq(workshops.id, workshopId), eq(workshops.clerkUserId, userId)))
    .limit(1);

  if (!workshop) {
    return Response.json({ error: 'Workshop not found or not owned' }, { status: 404 });
  }

  const results: Record<string, { status: string; fields?: string[] }> = {};

  for (const stepId of ['challenge', 'reframe'] as const) {
    // Find the workshop step
    const [wsRecord] = await db
      .select({ id: workshopSteps.id, status: workshopSteps.status })
      .from(workshopSteps)
      .where(and(eq(workshopSteps.workshopId, workshopId), eq(workshopSteps.stepId, stepId)))
      .limit(1);

    if (!wsRecord) {
      results[stepId] = { status: 'step_not_found' };
      continue;
    }

    // Check if structured fields already exist
    const [existingArt] = await db
      .select({ id: stepArtifacts.id, artifact: stepArtifacts.artifact, version: stepArtifacts.version })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, wsRecord.id))
      .limit(1);

    const existingFields = (existingArt?.artifact || {}) as Record<string, unknown>;
    if (stepId === 'challenge' && existingFields.hmwStatement) {
      results[stepId] = { status: 'already_has_data', fields: ['hmwStatement'] };
      continue;
    }
    if (stepId === 'reframe' && existingFields.hmwStatements) {
      results[stepId] = { status: 'already_has_data', fields: ['hmwStatements'] };
      continue;
    }

    // Fetch from Liveblocks REST API
    const liveblocksRoomId = `${getRoomId(workshopId)}-step-${stepId}`;
    let canvasData: Record<string, unknown> | null = null;

    try {
      const res = await fetch(
        `https://api.liveblocks.io/v2/rooms/${encodeURIComponent(liveblocksRoomId)}/storage`,
        { headers: { Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}` } }
      );
      if (res.ok) {
        const raw = await res.json();
        canvasData = unwrapLiveblocksStorage(raw) as Record<string, unknown>;
      } else {
        // Fallback: try existing _canvas in artifact
        if (existingFields._canvas && typeof existingFields._canvas === 'object') {
          const rawCanvas = existingFields._canvas as Record<string, unknown>;
          canvasData = ('liveblocksType' in rawCanvas || 'type' in rawCanvas)
            ? unwrapLiveblocksStorage(rawCanvas) as Record<string, unknown>
            : rawCanvas;
        }
        if (!canvasData) {
          results[stepId] = { status: `liveblocks_fetch_failed_${res.status}` };
          continue;
        }
      }
    } catch (err) {
      results[stepId] = { status: `liveblocks_error: ${err instanceof Error ? err.message : 'unknown'}` };
      continue;
    }

    // Extract structured fields
    const structuredFields: Record<string, unknown> = {};

    if (stepId === 'challenge') {
      const stickyNotes = canvasData.stickyNotes as Array<{ templateKey?: string; text?: string }> | undefined;
      if (stickyNotes) {
        const hmwNote = stickyNotes.find((n) => n.templateKey === 'challenge-statement' && n.text);
        if (hmwNote?.text) {
          structuredFields.hmwStatement = hmwNote.text;
        }
      }
    }

    if (stepId === 'reframe') {
      type HmwCard = {
        fullStatement?: string; givenThat?: string; persona?: string;
        immediateGoal?: string; deeperGoal?: string; cardIndex?: number;
        ownerId?: string; ownerName?: string;
      };
      const hmwCards = canvasData.hmwCards as HmwCard[] | undefined;
      if (hmwCards && hmwCards.length > 0) {
        const statements = hmwCards
          .filter((c) => c.fullStatement || (c.givenThat && c.persona && c.immediateGoal && c.deeperGoal))
          .sort((a, b) => (a.cardIndex ?? 0) - (b.cardIndex ?? 0))
          .map((c) => ({
            givenThat: c.givenThat || '',
            persona: c.persona || '',
            immediateGoal: c.immediateGoal || '',
            deeperGoal: c.deeperGoal || '',
            fullStatement: c.fullStatement ||
              `Given that ${c.givenThat}, how might we help ${c.persona} to ${c.immediateGoal} so they can ${c.deeperGoal}?`,
            ownerId: c.ownerId,
            ownerName: c.ownerName,
          }));
        if (statements.length > 0) {
          structuredFields.hmwStatements = statements;
        }
      }
    }

    if (Object.keys(structuredFields).length === 0) {
      results[stepId] = { status: 'no_extractable_data' };
      continue;
    }

    // Merge into artifact
    if (existingArt) {
      const merged = { ...existingFields, ...structuredFields };
      await db
        .update(stepArtifacts)
        .set({ artifact: merged, version: existingArt.version + 1, extractedAt: new Date() })
        .where(eq(stepArtifacts.id, existingArt.id));
    } else {
      await db.insert(stepArtifacts).values({
        workshopStepId: wsRecord.id,
        stepId,
        artifact: structuredFields,
        schemaVersion: '1.0',
        version: 1,
      });
    }

    results[stepId] = { status: 'repaired', fields: Object.keys(structuredFields) };
  }

  return Response.json({ workshopId, results });
}
