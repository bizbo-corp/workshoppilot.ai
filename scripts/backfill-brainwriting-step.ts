/**
 * Brain Writing step backfill
 *
 * Splits Brain Writing out of Ideation into its own step (order 9), shifting
 * Concept Development → 10 and Validate → 11. Idempotent and FK-safe:
 *
 *   1. Upsert the `brainwriting` step_definition and renumber concept/validate.
 *      (Must run before step 2 — workshop_steps.step_id FK references step_definitions.)
 *   2. Insert a `brainwriting` workshop_steps row for every workshop missing one.
 *   3. For workshops already past the old Ideation→Concept boundary (concept already
 *      in_progress/complete), mark the new brainwriting row complete so they aren't
 *      stranded behind a newly-inserted gate.
 *
 * Safe to run multiple times. The dev DB is the production DB — run deliberately.
 *
 * Usage:
 *   npx dotenv -e .env.local -- tsx scripts/backfill-brainwriting-step.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../src/db/client';

async function main() {
  console.log('Backfilling Brain Writing step…\n');

  // 1. Step definitions: insert brainwriting (order 9), renumber concept/validate.
  await db.execute(sql`
    INSERT INTO step_definitions (id, name, description, "order", prompt_template)
    VALUES (
      'brainwriting',
      'Brain Writing',
      'Iterate on the selected sketches — build on each idea to push it further',
      9,
      NULL
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          "order" = EXCLUDED."order";
  `);
  await db.execute(sql`UPDATE step_definitions SET "order" = 10 WHERE id = 'concept';`);
  await db.execute(sql`UPDATE step_definitions SET "order" = 11 WHERE id = 'validate';`);
  console.log("  • step_definitions: brainwriting=9, concept=10, validate=11");

  // 2. Insert a brainwriting workshop_steps row for every workshop missing one.
  const inserted = await db.execute(sql`
    INSERT INTO workshop_steps (id, workshop_id, step_id, status, arc_phase, created_at, updated_at)
    SELECT
      'wst_' || substr(md5(random()::text || w.id), 1, 24),
      w.id,
      'brainwriting',
      'not_started',
      'orient',
      NOW(),
      NOW()
    FROM workshops w
    WHERE NOT EXISTS (
      SELECT 1 FROM workshop_steps ws
      WHERE ws.workshop_id = w.id AND ws.step_id = 'brainwriting'
    )
    RETURNING id;
  `);
  console.log(`  • workshop_steps: inserted ${inserted.rows.length} brainwriting rows`);

  // 3. Don't strand workshops that already moved past Ideation: if Concept has started,
  //    treat Brain Writing as already complete for them.
  const skipped = await db.execute(sql`
    UPDATE workshop_steps
    SET status = 'complete', completed_at = NOW(), arc_phase = 'complete'
    WHERE step_id = 'brainwriting'
      AND status = 'not_started'
      AND workshop_id IN (
        SELECT workshop_id FROM workshop_steps
        WHERE step_id = 'concept' AND status IN ('in_progress', 'complete')
      )
    RETURNING id;
  `);
  console.log(`  • workshop_steps: marked ${skipped.rows.length} brainwriting rows complete (past Ideation)`);

  // Stats
  const stats = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM workshops)::int AS total_workshops,
      (SELECT COUNT(*) FROM workshop_steps WHERE step_id = 'brainwriting')::int AS brainwriting_rows,
      (SELECT COUNT(*) FROM workshop_steps WHERE step_id = 'brainwriting' AND status = 'complete')::int AS brainwriting_complete,
      (SELECT string_agg(id || '=' || "order", ', ' ORDER BY "order") FROM step_definitions) AS step_orders;
  `);
  const row = stats.rows[0] as Record<string, unknown>;
  console.log('\nFinal state:');
  console.log(`  • Workshops total           : ${row.total_workshops}`);
  console.log(`  • Brain Writing rows        : ${row.brainwriting_rows}`);
  console.log(`  • Brain Writing complete    : ${row.brainwriting_complete}`);
  console.log(`  • Step order                : ${row.step_orders}`);
}

main()
  .then(() => {
    console.log('\nDone.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
