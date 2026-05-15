/**
 * One-off repair script for the drizzle migration ledger.
 *
 * Problem: at some point the dev DB had migrations applied via `db:push:dev` or
 * direct SQL, which doesn't write to `drizzle.__drizzle_migrations`. The ledger
 * is out of sync with reality — it only records 13 entries (last tag `0016_…`)
 * while the codebase has migrations up through `0022`. As a result,
 * `npm run db:migrate` re-runs already-applied migrations and fails with
 * "relation already exists" errors.
 *
 * Fix: for each of migrations 0017–0022, verify the migration's intent is
 * already present in the DB, then insert a ledger row with the SHA-256 hash of
 * the .sql file content (which is what drizzle-kit compares against) and the
 * `when` timestamp from `_journal.json`. After this runs, `db:migrate` will
 * see all six as applied and skip them.
 *
 * Idempotent: re-running this script does not duplicate entries (it skips any
 * migration whose hash is already in the ledger).
 *
 * Safety: this script only INSERTs ledger rows; it never alters schema. If a
 * verification check fails for a migration (i.e. the migration's effects are
 * NOT in the DB), the script aborts before inserting that row.
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/^DATABASE_URL="([^"]+)"/m)[1];
const sql = neon(url);

const DRIZZLE_DIR = 'drizzle';
const journal = JSON.parse(fs.readFileSync(path.join(DRIZZLE_DIR, 'meta', '_journal.json'), 'utf8'));

// ── Verifiers ──────────────────────────────────────────────────────────────
// One per migration we're repairing. Each returns null if the migration's
// effects are in the DB, or a string describing what's missing.

async function tableExists(name) {
  const r = await sql`SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=${name}`;
  return r.length > 0;
}
async function columnExists(table, col) {
  const r = await sql`SELECT 1 FROM information_schema.columns WHERE table_name=${table} AND column_name=${col}`;
  return r.length > 0;
}
async function indexExists(name) {
  const r = await sql`SELECT 1 FROM pg_indexes WHERE indexname=${name}`;
  return r.length > 0;
}

const verifiers = {
  '0017_chunky_fat_cobra': async () => {
    if (!(await tableExists('guided_pilot_inquiries'))) return 'missing table guided_pilot_inquiries';
    return null;
  },
  '0018_sturdy_lenny_balinger': async () => {
    if (!(await columnExists('chat_messages', 'participant_id'))) return 'missing chat_messages.participant_id';
    if (!(await indexExists('chat_messages_session_step_participant_message_uniq'))) return 'missing index chat_messages_session_step_participant_message_uniq';
    return null;
  },
  '0019_overconfident_blink': async () => {
    if (!(await columnExists('workshop_steps', 'snapshot_url'))) return 'missing workshop_steps.snapshot_url';
    return null;
  },
  '0020_sharp_victor_mancha': async () => {
    if (!(await tableExists('workshop_invitations'))) return 'missing table workshop_invitations';
    if (!(await tableExists('challenge_approvals'))) return 'missing table challenge_approvals';
    if (!(await columnExists('workshops', 'facilitator_mode'))) return 'missing workshops.facilitator_mode';
    if (!(await columnExists('workshops', 'challenge_published_at'))) return 'missing workshops.challenge_published_at';
    if (!(await columnExists('workshops', 'challenge_revision'))) return 'missing workshops.challenge_revision';
    if (!(await columnExists('workshops', 'last_visited_at'))) return 'missing workshops.last_visited_at';
    if (!(await columnExists('session_participants', 'rejoin_token'))) return 'missing session_participants.rejoin_token';
    return null;
  },
  '0021_wise_spyke': async () => {
    if (!(await columnExists('workshops', 'scheduled_start_at'))) return 'missing workshops.scheduled_start_at';
    if (!(await columnExists('workshops', 'scheduled_duration_minutes'))) return 'missing workshops.scheduled_duration_minutes';
    if (!(await columnExists('workshops', 'scheduled_timezone'))) return 'missing workshops.scheduled_timezone';
    if (!(await columnExists('workshops', 'workshop_started_at'))) return 'missing workshops.workshop_started_at';
    return null;
  },
  '0022_unknown_shooting_star': async () => {
    if (!(await tableExists('white_glove_bookings'))) return 'missing table white_glove_bookings';
    if (!(await columnExists('workshops', 'tier'))) return 'missing workshops.tier';
    if (!(await columnExists('workshops', 'tier_paid_at'))) return 'missing workshops.tier_paid_at';
    if (!(await columnExists('credit_transactions', 'sku'))) return 'missing credit_transactions.sku';
    return null;
  },
};

// ── Main ───────────────────────────────────────────────────────────────────

const existing = await sql`SELECT hash FROM drizzle.__drizzle_migrations`;
const existingHashes = new Set(existing.map((r) => r.hash));

const targets = ['0017_chunky_fat_cobra', '0018_sturdy_lenny_balinger', '0019_overconfident_blink', '0020_sharp_victor_mancha', '0021_wise_spyke', '0022_unknown_shooting_star'];

for (const tag of targets) {
  const entry = journal.entries.find((e) => e.tag === tag);
  if (!entry) {
    console.error(`✗ ${tag} — no journal entry`);
    process.exit(1);
  }

  const sqlPath = path.join(DRIZZLE_DIR, `${tag}.sql`);
  const content = fs.readFileSync(sqlPath, 'utf8');
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  if (existingHashes.has(hash)) {
    console.log(`· ${tag} — already in ledger, skipping`);
    continue;
  }

  const problem = await verifiers[tag]?.();
  if (problem) {
    console.error(`✗ ${tag} — DB state does not match migration intent: ${problem}`);
    console.error(`  Refusing to mark applied. Investigate and re-run.`);
    process.exit(1);
  }

  await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${hash}, ${entry.when})`;
  console.log(`✓ ${tag} — verified, inserted ledger row (hash=${hash.slice(0, 16)}…)`);
}

const finalCount = await sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`;
console.log(`\nLedger now contains ${finalCount[0].n} entries.`);
