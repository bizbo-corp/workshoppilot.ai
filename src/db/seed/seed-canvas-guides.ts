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
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { canvasGuides } from '../schema/canvas-guides';
import { eq, and } from 'drizzle-orm';
import { STEP_CANVAS_GUIDES } from '../../lib/canvas/canvas-guide-config';
import { getStepTemplateStickyNotes } from '../../lib/canvas/template-sticky-note-config';

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
        variant: guide.variant ?? 'card',
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

  console.log(`\nCard guides: ${total} inserted, ${skipped} steps skipped.`);

  // --- Second pass: seed template-sticky-note guides ---
  const templateSteps = ['challenge']; // Steps that have template sticky notes
  let templateTotal = 0;

  for (const stepId of templateSteps) {
    // Check if step already has template-sticky-note guides WITH templateKey populated
    const existingTemplates = await db
      .select({ id: canvasGuides.id, templateKey: canvasGuides.templateKey })
      .from(canvasGuides)
      .where(
        and(
          eq(canvasGuides.stepId, stepId),
          eq(canvasGuides.variant, 'template-sticky-note'),
        )
      );

    const hasPopulatedTemplates = existingTemplates.some(t => !!t.templateKey);
    if (hasPopulatedTemplates) {
      console.log(`  Skip template guides: ${stepId} (already has ${existingTemplates.length} template guides with keys)`);
      continue;
    }

    const templateDefs = getStepTemplateStickyNotes(stepId);
    for (let i = 0; i < templateDefs.length; i++) {
      const def = templateDefs[i];
      await db.insert(canvasGuides).values({
        stepId,
        title: def.label,
        body: def.placeholderText,
        variant: 'template-sticky-note',
        color: def.color,
        layer: 'foreground',
        placementMode: 'on-canvas',
        canvasX: def.position.x,
        canvasY: def.position.y,
        width: def.width,
        height: def.height,
        dismissBehavior: 'persistent',
        showOnlyWhenEmpty: false,
        sortOrder: i,
        templateKey: def.key,
        placeholderText: def.placeholderText,
      });
      templateTotal++;
    }
    console.log(`  Seeded template guides: ${stepId} (${templateDefs.length} templates)`);
  }

  console.log(`Template guides: ${templateTotal} inserted.`);
  console.log(`\nDone.`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
