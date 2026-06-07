/**
 * Soft-deletes E2E test workshops from the database.
 *
 * Tightly scoped + safe for the shared prod DB:
 *  - only rows with clerkUserId = 'anonymous' (BYPASS_AUTH test owner)
 *  - AND title starting with 'E2E ' (the test-workshop prefix)
 *  - AND not already soft-deleted
 * Soft-delete only (sets deleted_at) — reversible, never a hard delete.
 *
 * Prints matches first; pass --apply to actually delete.
 *   npx tsx scripts/cleanup-e2e-workshops.ts          # dry run (list only)
 *   npx tsx scripts/cleanup-e2e-workshops.ts --apply  # soft-delete
 */
import { and, eq, like, isNull } from 'drizzle-orm';
import { db } from '../src/db/client';
import { workshops } from '../src/db/schema';

async function main() {
  const apply = process.argv.includes('--apply');
  const where = and(
    eq(workshops.clerkUserId, 'anonymous'),
    like(workshops.title, 'E2E %'),
    isNull(workshops.deletedAt),
  );

  const matches = await db
    .select({ id: workshops.id, title: workshops.title, createdAt: workshops.createdAt })
    .from(workshops)
    .where(where);

  console.log(`Found ${matches.length} E2E test workshop(s) (anonymous, title 'E2E %', not deleted):`);
  for (const m of matches) console.log(`  - ${m.id}  "${m.title}"  (${m.createdAt.toISOString()})`);

  if (matches.length === 0) {
    console.log('Nothing to clean up.');
    process.exit(0);
  }
  if (!apply) {
    console.log('\nDry run. Re-run with --apply to soft-delete these.');
    process.exit(0);
  }

  await db.update(workshops).set({ deletedAt: new Date() }).where(where);
  console.log(`\n✅ Soft-deleted ${matches.length} workshop(s).`);
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ cleanup failed:', e);
  process.exit(1);
});
