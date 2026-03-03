/**
 * CLI script: Export pending dialogue feedback as structured JSON
 *
 * Usage:
 *   npm run get-feedback              # pending only (default)
 *   npm run get-feedback -- --all     # all feedback
 *   npm run get-feedback -- --resolved # resolved only
 *
 * The output is structured so that in a future Claude session you can say:
 *   "Analyze the backlog and refactor the dialogue in the identified files
 *    to address these critiques."
 */

import { db } from '../src/db/client';
import { dialogueFeedback } from '../src/db/schema';
import { eq, desc } from 'drizzle-orm';

async function main() {
  const flag = process.argv[2];
  let statusFilter: 'pending' | 'resolved' | null = 'pending';

  if (flag === '--all') statusFilter = null;
  else if (flag === '--resolved') statusFilter = 'resolved';

  const rows = statusFilter
    ? await db.select().from(dialogueFeedback)
        .where(eq(dialogueFeedback.status, statusFilter))
        .orderBy(desc(dialogueFeedback.createdAt))
    : await db.select().from(dialogueFeedback)
        .orderBy(desc(dialogueFeedback.createdAt));

  if (rows.length === 0) {
    console.log(`\nNo ${statusFilter ?? ''} feedback entries found.\n`);
    process.exit(0);
  }

  // Build Claude-optimized export format
  const backlog = {
    exportedAt: new Date().toISOString(),
    filter: statusFilter ?? 'all',
    totalEntries: rows.length,
    instruction: 'Analyze each entry below. For each, open the file at filePath, find the componentName, and refactor the dialogue to address the critique in feedbackText. Use contextSnapshot for additional context about the application state when the issue was observed.',
    entries: rows.map((row) => ({
      id: row.id,
      status: row.status,
      feedbackText: row.feedbackText,
      dialogueStepId: row.dialogueStepId,
      arcPhase: row.arcPhase,
      technicalMarker: {
        filePath: row.filePath,
        componentName: row.componentName,
      },
      contextSnapshot: row.contextSnapshot,
      resolutionNote: row.resolutionNote,
      createdAt: row.createdAt,
    })),
  };

  console.log(JSON.stringify(backlog, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to export feedback:', err);
  process.exit(1);
});
