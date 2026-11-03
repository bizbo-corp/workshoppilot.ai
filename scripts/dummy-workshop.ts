/**
 * Run random dummy workshops from the command line (the nightly job).
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/dummy-workshop.ts          # one run, random seed
 *   npx dotenv -e .env.local -- npx tsx scripts/dummy-workshop.ts 5        # five runs
 *   npx dotenv -e .env.local -- npx tsx scripts/dummy-workshop.ts 1 abc123 # replay a seed
 *
 * Exits non-zero if any run fails, so CI goes red.
 */
import { runDummyWorkshop } from '../src/lib/testing/dummy-workshop';

async function main() {
  const count = Number(process.argv[2] ?? 1);
  const seed = process.argv[3];
  let failed = 0;
  for (let i = 0; i < count; i++) {
    const { report, seed: used, workshopId } = await runDummyWorkshop({ seed: count === 1 ? seed : undefined, triggeredBy: process.env.CI ? 'nightly' : 'cli' });
    console.log(`${report.pass ? 'PASS' : 'FAIL'} seed=${used} workshop=${workshopId} ${report.summary}`);
    for (const low of report.lowReplies) console.log(`   weak: "${low.turn.slice(0, 70)}" -> ${low.note}`);
    for (const e of report.errors) console.log(`   error: ${e.slice(0, 200)}`);
    if (!report.pass) failed++;
  }
  console.log(`\n${count - failed}/${count} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
