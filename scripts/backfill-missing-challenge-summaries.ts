/**
 * scripts/backfill-missing-challenge-summaries.ts
 *
 * One-shot backfill for sessions stuck in the Step 2 ABSENCE PROTOCOL refusal
 * (.planning/debug/step-2-absence-protocol-bug.md). Path B
 * (`advanceFromStepOne` in workshop-setup-actions.ts) marked Step 1 complete WITHOUT
 * writing a `step_summaries` row before the upstream fix landed, so downstream steps
 * see the sentinel and the model refuses to greet. This script finds every workshop in
 * that broken state and synthesizes a structured summary from the challenge artifact.
 *
 * Idempotent — uses `onConflictDoNothing` against `step_summaries_workshop_step_id_unique`
 * so re-running is safe even if some rows have since been backfilled manually.
 *
 * The handoff in step-2-absence-protocol-bug.md notes the dev session
 * `ses_lw3pqlqrv272udsyosj5mwtv` (workshop `ws_vutdmmjeidkkx0axi5z3wquq`) has a manual
 * sentinel summary `sum_manual_unstick_62` inserted. This script's `onConflictDoNothing`
 * means we will NOT overwrite that sentinel; pass `--force` to delete + re-insert.
 *
 * Run:    npx tsx scripts/backfill-missing-challenge-summaries.ts
 * Dry run: npx tsx scripts/backfill-missing-challenge-summaries.ts --dry-run
 * Force overwrite of the manual unstick sentinel:
 *         npx tsx scripts/backfill-missing-challenge-summaries.ts --force-manual-unstick
 *
 * Exit codes:
 *   0 — completed (zero affected rows still counts as success)
 *   1 — at least one row failed to backfill
 *   2 — setup failed (DB unreachable)
 */

import 'dotenv/config';
import { db } from '../src/db/client';
import { sql, eq } from 'drizzle-orm';
import { stepSummaries } from '../src/db/schema';
import { generateChallengeSummaryFromArtifact } from '../src/lib/context/generate-summary';

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE_MANUAL_UNSTICK = process.argv.includes('--force-manual-unstick');
const MANUAL_UNSTICK_ID = 'sum_manual_unstick_62';

interface StuckRow {
  workshop_id: string;
  workshop_step_id: string;
  session_id: string | null;
}

async function findStuckWorkshops(): Promise<StuckRow[]> {
  // workshops where Step 1 is complete but step_summaries is missing for that workshop_step row
  const result = await db.execute(sql`
    SELECT ws.workshop_id, ws.id AS workshop_step_id, s.id AS session_id
    FROM workshop_steps ws
    LEFT JOIN step_summaries ss ON ss.workshop_step_id = ws.id
    LEFT JOIN sessions s ON s.workshop_id = ws.workshop_id
    WHERE ws.step_id = 'challenge'
      AND ws.status = 'complete'
      AND ss.id IS NULL
    ORDER BY ws.completed_at ASC NULLS LAST
  `);
  return result.rows as unknown as StuckRow[];
}

async function clearManualUnstickIfPresent(): Promise<void> {
  if (!FORCE_MANUAL_UNSTICK) return;
  console.log(`\n[backfill] --force-manual-unstick: deleting any row with id=${MANUAL_UNSTICK_ID}`);
  if (DRY_RUN) {
    console.log('  (dry-run — no delete executed)');
    return;
  }
  const deleted = await db
    .delete(stepSummaries)
    .where(eq(stepSummaries.id, MANUAL_UNSTICK_ID))
    .returning({ id: stepSummaries.id });
  console.log(`  deleted ${deleted.length} row(s)`);
}

async function main() {
  console.log(`\n[backfill-missing-challenge-summaries] mode=${DRY_RUN ? 'DRY RUN' : 'WRITE'}\n`);

  await clearManualUnstickIfPresent();

  const stuck = await findStuckWorkshops();
  if (stuck.length === 0) {
    console.log('[backfill] No stuck workshops found — nothing to do.');
    process.exit(0);
  }

  console.log(`[backfill] Found ${stuck.length} stuck workshop(s):`);
  for (const row of stuck) {
    console.log(`  - workshop=${row.workshop_id} step=${row.workshop_step_id} session=${row.session_id ?? '(none)'}`);
  }

  if (DRY_RUN) {
    console.log('\n[backfill] Dry run — exiting before writes.');
    process.exit(0);
  }

  let ok = 0;
  let failed = 0;
  for (const row of stuck) {
    try {
      const summary = await generateChallengeSummaryFromArtifact(
        row.workshop_id,
        row.workshop_step_id
      );
      console.log(`\n[backfill] OK workshop=${row.workshop_id}`);
      console.log(summary.split('\n').map((l) => `    ${l}`).join('\n'));
      ok++;
    } catch (err) {
      console.error(`\n[backfill] FAIL workshop=${row.workshop_id}:`, err);
      failed++;
    }
  }

  console.log(`\n[backfill] Done — ok=${ok} failed=${failed}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('[backfill] Fatal setup error:', err);
  process.exit(2);
});
