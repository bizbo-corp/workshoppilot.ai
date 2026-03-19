/**
 * One-time backfill: Copy description & sketchPrompt from Crazy 8s slots
 * into brainRewritingMatrices as sourceDescription / sourceSketchPrompt.
 *
 * Usage:
 *   env $(grep -v '^#' .env.local | xargs) npx tsx scripts/backfill-br-descriptions.ts [workshopId]
 *
 * If no workshopId is provided, backfills ALL workshops that have brain rewriting matrices.
 */
import { db } from '../src/db/client';
import { stepArtifacts } from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';

const workshopId = process.argv[2]; // optional

interface Crazy8sSlot {
  slotId: string;
  title?: string;
  description?: string;
  sketchPrompt?: string;
  [key: string]: unknown;
}

interface BrainRewritingMatrix {
  slotId: string;
  sourceDescription?: string;
  sourceSketchPrompt?: string;
  groupId?: string;
  [key: string]: unknown;
}

interface SlotGroup {
  id: string;
  slotIds: string[];
  [key: string]: unknown;
}

async function main() {
  // Find all step artifacts that have brainRewritingMatrices in _canvas
  const rows = await db
    .select({
      id: stepArtifacts.id,
      artifact: stepArtifacts.artifact,
      version: stepArtifacts.version,
      workshopStepId: stepArtifacts.workshopStepId,
    })
    .from(stepArtifacts)
    .where(
      sql`${stepArtifacts.artifact}->'_canvas'->'brainRewritingMatrices' IS NOT NULL`
    );

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (workshopId && !row.workshopStepId.includes(workshopId)) {
      // If filtering by workshopId, we can't easily match here — just process all
      // The workshopStepId is a generated ID, not directly containing workshopId
    }

    const artifact = row.artifact as Record<string, unknown>;
    const canvas = artifact._canvas as Record<string, unknown> | undefined;
    if (!canvas) { skipped++; continue; }

    const matrices = canvas.brainRewritingMatrices as BrainRewritingMatrix[] | undefined;
    const slots = canvas.crazy8sSlots as Crazy8sSlot[] | undefined;
    if (!matrices || !slots || matrices.length === 0) { skipped++; continue; }

    const slotGroups = (canvas.slotGroups || []) as SlotGroup[];

    let changed = false;
    const updatedMatrices = matrices.map((matrix) => {
      // Skip if already backfilled
      if (matrix.sourceDescription || matrix.sourceSketchPrompt) return matrix;

      // Find the source slot
      let sourceSlot: Crazy8sSlot | undefined;

      if (matrix.groupId) {
        // For groups, find the first slot in the group
        const group = slotGroups.find((g) => g.id === matrix.groupId);
        if (group) {
          sourceSlot = slots.find((s) => s.slotId === group.slotIds[0]);
        }
      }
      if (!sourceSlot) {
        sourceSlot = slots.find((s) => s.slotId === matrix.slotId);
      }

      if (!sourceSlot) return matrix;

      const updates: Partial<BrainRewritingMatrix> = {};
      if (sourceSlot.description) {
        updates.sourceDescription = sourceSlot.description;
        changed = true;
      }
      if (sourceSlot.sketchPrompt) {
        updates.sourceSketchPrompt = sourceSlot.sketchPrompt;
        changed = true;
      }

      if (Object.keys(updates).length === 0) return matrix;

      return { ...matrix, ...updates };
    });

    if (!changed) {
      skipped++;
      continue;
    }

    // Update the artifact
    const updatedCanvas = { ...canvas, brainRewritingMatrices: updatedMatrices };
    const updatedArtifact = { ...artifact, _canvas: updatedCanvas };

    await db
      .update(stepArtifacts)
      .set({ artifact: updatedArtifact, version: row.version + 1 })
      .where(eq(stepArtifacts.id, row.id));

    updated++;
    console.log(`Updated artifact ${row.id} — backfilled ${updatedMatrices.filter((m, i) => m !== matrices[i]).length} matrices`);
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
