/**
 * CLI script: Mark a dialogue feedback entry as resolved.
 *
 * Usage:
 *   npm run resolve-feedback -- <feedback-id> "<resolution summary>"
 *
 * The current short git SHA is prepended to the note automatically, e.g.:
 *   "<short-sha>: <resolution summary>"
 *
 * Pairs with `npm run get-feedback` for the end-to-end backlog loop.
 */

import { execSync } from 'node:child_process';
import { db } from '../src/db/client';
import { dialogueFeedback } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const feedbackId = process.argv[2];
  const summary = process.argv[3];

  if (!feedbackId || !summary) {
    console.error(
      'Usage: npm run resolve-feedback -- <feedback-id> "<resolution summary>"'
    );
    process.exit(1);
  }

  let shaPrefix = '';
  try {
    shaPrefix = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    shaPrefix = 'no-sha';
  }

  const resolutionNote = `${shaPrefix}: ${summary}`;

  const updated = await db
    .update(dialogueFeedback)
    .set({ status: 'resolved', resolutionNote })
    .where(eq(dialogueFeedback.id, feedbackId))
    .returning({ id: dialogueFeedback.id, status: dialogueFeedback.status });

  if (updated.length === 0) {
    console.error(`No feedback entry found with id: ${feedbackId}`);
    process.exit(1);
  }

  console.log(`Resolved ${updated[0].id} — ${resolutionNote}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to resolve feedback:', err);
  process.exit(1);
});
