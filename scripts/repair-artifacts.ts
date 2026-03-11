/**
 * One-time script: Repair missing structured artifact fields for a workshop.
 *
 * Usage:
 *   env $(grep -v '^#' .env.local | xargs) npx tsx scripts/repair-artifacts.ts <workshopId>
 */
import { db } from '../src/db/client';
import { workshopSteps, stepArtifacts } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { unwrapLiveblocksStorage } from '../src/lib/liveblocks/unwrap-storage';

const workshopId = process.argv[2];
if (!workshopId) {
  console.error('Usage: npx tsx scripts/repair-artifacts.ts <workshopId>');
  process.exit(1);
}

function getRoomId(wid: string) { return `workshop-${wid}`; }

async function main() {
  console.log(`Repairing artifacts for workshop: ${workshopId}\n`);

  for (const stepId of ['challenge', 'reframe'] as const) {
    console.log(`--- Step: ${stepId} ---`);

    const [wsRecord] = await db
      .select({ id: workshopSteps.id, status: workshopSteps.status })
      .from(workshopSteps)
      .where(and(eq(workshopSteps.workshopId, workshopId), eq(workshopSteps.stepId, stepId)))
      .limit(1);

    if (!wsRecord) {
      console.log('  Step not found, skipping.\n');
      continue;
    }
    console.log(`  Step record: ${wsRecord.id} (status: ${wsRecord.status})`);

    // Check existing artifact
    const [existingArt] = await db
      .select({ id: stepArtifacts.id, artifact: stepArtifacts.artifact, version: stepArtifacts.version })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, wsRecord.id))
      .limit(1);

    const existingFields = (existingArt?.artifact || {}) as Record<string, unknown>;
    console.log(`  Existing artifact keys: ${Object.keys(existingFields).join(', ') || '(none)'}`);

    if (stepId === 'challenge' && existingFields.hmwStatement) {
      console.log(`  Already has hmwStatement: "${(existingFields.hmwStatement as string).slice(0, 80)}..."`);
      console.log('  Skipping.\n');
      continue;
    }
    if (stepId === 'reframe' && existingFields.hmwStatements) {
      console.log(`  Already has hmwStatements (${(existingFields.hmwStatements as unknown[]).length} entries).`);
      console.log('  Skipping.\n');
      continue;
    }

    // Fetch from Liveblocks
    const liveblocksRoomId = `${getRoomId(workshopId)}-step-${stepId}`;
    console.log(`  Fetching Liveblocks storage for room: ${liveblocksRoomId}`);
    let canvasData: Record<string, unknown> | null = null;

    try {
      const res = await fetch(
        `https://api.liveblocks.io/v2/rooms/${encodeURIComponent(liveblocksRoomId)}/storage`,
        { headers: { Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}` } }
      );
      if (res.ok) {
        const raw = await res.json();
        canvasData = unwrapLiveblocksStorage(raw) as Record<string, unknown>;
        console.log(`  Liveblocks storage keys: ${Object.keys(canvasData).join(', ')}`);
      } else {
        console.log(`  Liveblocks fetch failed: ${res.status}`);
        // Fallback: try _canvas from existing artifact
        if (existingFields._canvas && typeof existingFields._canvas === 'object') {
          const rawCanvas = existingFields._canvas as Record<string, unknown>;
          canvasData = ('liveblocksType' in rawCanvas || 'type' in rawCanvas)
            ? unwrapLiveblocksStorage(rawCanvas) as Record<string, unknown>
            : rawCanvas;
          console.log(`  Falling back to existing _canvas. Keys: ${Object.keys(canvasData).join(', ')}`);
        }
      }
    } catch (err) {
      console.log(`  Liveblocks fetch error: ${err}`);
    }

    if (!canvasData) {
      console.log('  No canvas data available. Skipping.\n');
      continue;
    }

    // Extract
    const structuredFields: Record<string, unknown> = {};

    if (stepId === 'challenge') {
      const stickyNotes = canvasData.stickyNotes as Array<{ templateKey?: string; text?: string }> | undefined;
      console.log(`  Sticky notes: ${stickyNotes?.length ?? 0}`);
      if (stickyNotes) {
        for (const n of stickyNotes) {
          if (n.templateKey) console.log(`    templateKey=${n.templateKey} text="${(n.text || '').slice(0, 60)}..."`);
        }
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
      console.log(`  HMW cards: ${hmwCards?.length ?? 0}`);
      if (hmwCards) {
        for (const c of hmwCards) {
          console.log(`    ownerId=${c.ownerId} fullStatement="${(c.fullStatement || '').slice(0, 60)}..." parts=${!!(c.givenThat && c.persona)}`);
        }
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
      console.log('  No extractable data found. Skipping.\n');
      continue;
    }

    console.log(`  Extracted fields: ${Object.keys(structuredFields).join(', ')}`);

    // Save
    if (existingArt) {
      const merged = { ...existingFields, ...structuredFields };
      await db
        .update(stepArtifacts)
        .set({ artifact: merged, version: existingArt.version + 1, extractedAt: new Date() })
        .where(eq(stepArtifacts.id, existingArt.id));
      console.log(`  Updated artifact ${existingArt.id} (v${existingArt.version} -> v${existingArt.version + 1})`);
    } else {
      await db.insert(stepArtifacts).values({
        workshopStepId: wsRecord.id,
        stepId,
        artifact: structuredFields,
        schemaVersion: '1.0',
        version: 1,
      });
      console.log(`  Created new artifact for ${wsRecord.id}`);
    }
    console.log('  Done.\n');
  }

  console.log('Repair complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
