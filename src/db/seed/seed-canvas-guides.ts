/**
 * Seed script: migrate hardcoded canvas guides into the canvas_guides table.
 *
 * Usage:
 *   npx tsx src/db/seed/seed-canvas-guides.ts
 *
 * Or trigger via POST /api/admin/seed-guides (see route file).
 *
 * Idempotent: skips steps that already have guides in the DB.
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { canvasGuides } from '../schema/canvas-guides';
import { eq } from 'drizzle-orm';
import { STEP_CANVAS_GUIDES } from '../../lib/canvas/canvas-guide-config';

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sql = neon(connectionString);
  const db = drizzle(sql);

  let total = 0;
  let skipped = 0;

  for (const [stepId, guides] of Object.entries(STEP_CANVAS_GUIDES)) {
    // Check if step already has guides
    const existing = await db
      .select({ id: canvasGuides.id })
      .from(canvasGuides)
      .where(eq(canvasGuides.stepId, stepId))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  Skip: ${stepId} (already has ${existing.length}+ guides)`);
      skipped++;
      continue;
    }

    // Insert guides for this step
    for (const guide of guides) {
      await db.insert(canvasGuides).values({
        stepId,
        title: guide.title ?? null,
        body: guide.body,
        variant: guide.variant ?? 'sticker',
        color: guide.color ?? null,
        layer: guide.layer ?? 'foreground',
        placementMode: guide.placementMode ?? 'pinned',
        pinnedPosition: guide.pinnedPosition ?? null,
        canvasX: guide.canvasX ?? null,
        canvasY: guide.canvasY ?? null,
        dismissBehavior: guide.dismissBehavior ?? 'hover-x',
        showOnlyWhenEmpty: guide.showOnlyWhenEmpty ?? false,
        sortOrder: guide.sortOrder ?? 0,
        imageUrl: guide.imageUrl ?? null,
        imageSvg: guide.imageSvg ?? null,
        imagePosition: guide.imagePosition ?? null,
      });
      total++;
    }
    console.log(`  Seeded: ${stepId} (${guides.length} guides)`);
  }

  console.log(`\nDone: ${total} guides inserted, ${skipped} steps skipped.`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
