/**
 * Migration script: Move inline SVGs from canvas_guides to asset_library.
 *
 * Usage: npx tsx src/db/seed/migrate-inline-svgs.ts
 *
 * Behavior:
 * 1. Finds all canvas_guides with imageSvg set and no libraryAssetId
 * 2. SHA-256 hashes each SVG to deduplicate
 * 3. Uploads unique SVGs to Vercel Blob → creates asset_library rows
 * 4. Sets libraryAssetId on each guide, increments usage counts
 * 5. Idempotent: skips already-migrated guides
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { canvasGuides } from '../schema/canvas-guides';
import { assetLibrary } from '../schema/asset-library';
import { eq, sql } from 'drizzle-orm';
import { put } from '@vercel/blob';
import { createHash } from 'crypto';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = neon(connectionString);
const db = drizzle(client);

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/** Extract viewBox dimensions as a human-readable name hint */
function extractViewBox(svg: string): string {
  const match = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  return match ? `${match[1]}x${match[2]}` : 'unknown-size';
}

async function main() {
  console.log('=== Migrate Inline SVGs to Asset Library ===\n');

  // 1. Find un-migrated image guides
  const guides = await db
    .select()
    .from(canvasGuides)
    .where(
      sql`${canvasGuides.imageSvg} IS NOT NULL AND ${canvasGuides.libraryAssetId} IS NULL`
    );

  console.log(`Found ${guides.length} un-migrated image guides with inline SVG.\n`);

  if (guides.length === 0) {
    console.log('Nothing to migrate. Exiting.');
    return;
  }

  // 2. Deduplicate by SVG hash
  const hashToGuides = new Map<string, typeof guides>();
  const hashToSvg = new Map<string, string>();

  for (const guide of guides) {
    if (!guide.imageSvg) continue;
    const hash = sha256(guide.imageSvg);
    hashToSvg.set(hash, guide.imageSvg);
    const existing = hashToGuides.get(hash) || [];
    existing.push(guide);
    hashToGuides.set(hash, existing);
  }

  console.log(`Unique SVGs: ${hashToSvg.size} (from ${guides.length} guides)\n`);

  // 3. Create asset_library rows for each unique SVG
  const hashToAssetId = new Map<string, string>();
  let created = 0;
  let skipped = 0;

  for (const [hash, svgContent] of hashToSvg.entries()) {
    const relatedGuides = hashToGuides.get(hash) || [];
    const firstGuide = relatedGuides[0];
    const dims = extractViewBox(svgContent);
    const stepIds = [...new Set(relatedGuides.map((g) => g.stepId))].join('+');
    const name =
      firstGuide?.title || `sticker-${stepIds}-${dims}-${hash.slice(0, 6)}`;

    try {
      // Upload to Vercel Blob
      let blobUrl: string;
      const svgBuffer = Buffer.from(svgContent, 'utf-8');

      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        // Dev: data URL fallback
        blobUrl = `data:image/svg+xml;base64,${svgBuffer.toString('base64')}`;
        console.log(`  [DEV] Using data URL for "${name}"`);
      } else {
        const blob = await put(
          `library/sticker/${Date.now()}-${hash.slice(0, 8)}.svg`,
          svgBuffer,
          { access: 'public', addRandomSuffix: true }
        );
        blobUrl = blob.url;
        console.log(`  Uploaded to Vercel Blob: ${blob.url}`);
      }

      // Insert asset
      const [asset] = await db
        .insert(assetLibrary)
        .values({
          name,
          blobUrl,
          mimeType: 'image/svg+xml',
          inlineSvg: svgContent,
          fileSize: svgBuffer.length,
          category: 'sticker',
          tags: 'migrated',
          usageCount: 0, // Will be set correctly below
        })
        .returning();

      hashToAssetId.set(hash, asset.id);
      created++;
      console.log(`  Created asset "${name}" (${asset.id})`);
    } catch (err) {
      console.error(
        `  FAILED to create asset for hash ${hash.slice(0, 8)}:`,
        err
      );
      skipped++;
    }
  }

  console.log(`\nCreated ${created} assets, skipped ${skipped}.\n`);

  // 4. Link guides to assets
  let linked = 0;
  for (const [hash, relatedGuides] of hashToGuides.entries()) {
    const assetId = hashToAssetId.get(hash);
    if (!assetId) continue;

    for (const guide of relatedGuides) {
      try {
        await db
          .update(canvasGuides)
          .set({ libraryAssetId: assetId })
          .where(eq(canvasGuides.id, guide.id));
        linked++;
        console.log(`  Linked guide ${guide.id} [${guide.stepId}] → ${assetId}`);
      } catch (err) {
        console.error(`  FAILED to link guide ${guide.id}:`, err);
      }
    }
  }

  console.log(`\nLinked ${linked} guides to library assets.\n`);

  // 5. Recompute usage counts
  console.log('Recomputing usage counts...');
  for (const [, assetId] of hashToAssetId.entries()) {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(canvasGuides)
      .where(eq(canvasGuides.libraryAssetId, assetId));

    await db
      .update(assetLibrary)
      .set({ usageCount: result?.count ?? 0 })
      .where(eq(assetLibrary.id, assetId));
  }

  console.log('Done!\n');
  console.log('=== Migration Complete ===');
  console.log(`  Assets created: ${created}`);
  console.log(`  Guides linked:  ${linked}`);
  console.log(`  Deduped:        ${guides.length - hashToSvg.size} duplicate SVGs`);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
