/**
 * v2.1 backfill script
 *
 * Ensures workshops created before the facilitator-led flow keep behaving as solo:
 *   1. Sets `workshops.facilitatorMode = 'solo'` for any row still on the schema default
 *      (a no-op if Drizzle's default already wrote 'solo' on migration, but cheap to assert).
 *   2. Inserts `challenge_approvals` rows for every existing `session_participants` record
 *      with status='approved' so legacy multiplayer workshops don't suddenly lock people out
 *      if we ever flip their facilitatorMode to 'team'.
 *
 * Safe to run multiple times — the approvals insert uses ON CONFLICT DO NOTHING via the
 * unique (workshop_id, session_participant_id) index.
 *
 * Usage:
 *   npx dotenv -e .env.local -- tsx scripts/backfill-facilitator-mode.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../src/db/client';
import { workshops } from '../src/db/schema';

async function main() {
  console.log('Backfilling facilitator_mode + challenge_approvals…');

  const updatedRows = await db.execute(sql`
    UPDATE workshops
    SET facilitator_mode = 'solo'
    WHERE facilitator_mode IS NULL
    RETURNING id;
  `);
  console.log(`  • facilitator_mode set to 'solo' for ${updatedRows.rows.length} rows`);

  const insertedApprovals = await db.execute(sql`
    INSERT INTO challenge_approvals
      (id, workshop_id, session_participant_id, status, challenge_revision, responded_at, created_at, updated_at)
    SELECT
      'chap_' || substr(md5(random()::text || sp.id), 1, 24),
      ws.id,
      sp.id,
      'approved',
      ws.challenge_revision,
      NOW(),
      NOW(),
      NOW()
    FROM session_participants sp
    JOIN workshop_sessions wses ON wses.id = sp.session_id
    JOIN workshops ws ON ws.id = wses.workshop_id
    ON CONFLICT (workshop_id, session_participant_id) DO NOTHING
    RETURNING id;
  `);
  console.log(`  • challenge_approvals inserted for ${insertedApprovals.rows.length} participants`);

  // Quick stats
  const stats = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM workshops)::int AS total_workshops,
      (SELECT COUNT(*) FROM workshops WHERE facilitator_mode = 'solo')::int AS solo_workshops,
      (SELECT COUNT(*) FROM workshops WHERE facilitator_mode = 'team')::int AS team_workshops,
      (SELECT COUNT(*) FROM challenge_approvals)::int AS approvals;
  `);
  const row = stats.rows[0] as Record<string, number>;
  console.log('\nFinal state:');
  console.log(`  • Workshops total      : ${row.total_workshops}`);
  console.log(`  • Workshops in solo    : ${row.solo_workshops}`);
  console.log(`  • Workshops in team    : ${row.team_workshops}`);
  console.log(`  • Challenge approvals  : ${row.approvals}`);
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
