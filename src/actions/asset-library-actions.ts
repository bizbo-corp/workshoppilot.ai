'use server';

import { db } from '@/db/client';
import { assetLibrary, canvasGuides } from '@/db/schema';
import { eq, ilike, and, sql, desc, asc, count, inArray } from 'drizzle-orm';
import type {
  AssetData,
  AssetFilters,
  AssetListResult,
  AssetCategory,
} from '@/lib/asset-library/asset-library-types';

/**
 * List assets with filtering, search, and pagination.
 */
export async function listAssets(filters: AssetFilters = {}): Promise<AssetListResult> {
  const { search, category, tag, page = 1, pageSize = 50 } = filters;
  const offset = (page - 1) * pageSize;

  const conditions = [];
  if (category) {
    conditions.push(eq(assetLibrary.category, category));
  }
  if (tag) {
    conditions.push(ilike(assetLibrary.tags, `%${tag}%`));
  }
  if (search) {
    conditions.push(
      sql`(${ilike(assetLibrary.name, `%${search}%`)} OR ${ilike(assetLibrary.tags, `%${search}%`)})`
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(assetLibrary)
      .where(where)
      .orderBy(desc(assetLibrary.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(assetLibrary)
      .where(where),
  ]);

  return {
    assets: rows.map(mapRow),
    total: totalResult[0]?.count ?? 0,
    page,
    pageSize,
  };
}

/**
 * Get a single asset by ID.
 */
export async function getAsset(assetId: string): Promise<AssetData | null> {
  const [row] = await db
    .select()
    .from(assetLibrary)
    .where(eq(assetLibrary.id, assetId))
    .limit(1);

  return row ? mapRow(row) : null;
}

/**
 * Create a new asset in the library.
 */
export async function createAsset(data: {
  name: string;
  blobUrl: string;
  mimeType: string;
  inlineSvg?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  category?: AssetCategory;
  tags?: string | null;
  description?: string | null;
  uploadedBy?: string | null;
}): Promise<AssetData> {
  const [created] = await db
    .insert(assetLibrary)
    .values({
      name: data.name,
      blobUrl: data.blobUrl,
      mimeType: data.mimeType,
      inlineSvg: data.inlineSvg ?? null,
      fileSize: data.fileSize ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
      category: data.category ?? 'stamp',
      tags: data.tags ?? null,
      description: data.description ?? null,
      uploadedBy: data.uploadedBy ?? null,
    })
    .returning();

  return mapRow(created);
}

/**
 * Update asset metadata (name, category, tags, description).
 */
export async function updateAssetMetadata(
  assetId: string,
  updates: {
    name?: string;
    category?: AssetCategory;
    tags?: string | null;
    description?: string | null;
    inlineSvg?: string | null;
  }
): Promise<AssetData> {
  const setClause: Record<string, unknown> = {};
  if ('name' in updates) setClause.name = updates.name;
  if ('category' in updates) setClause.category = updates.category;
  if ('tags' in updates) setClause.tags = updates.tags ?? null;
  if ('description' in updates) setClause.description = updates.description ?? null;
  if ('inlineSvg' in updates) setClause.inlineSvg = updates.inlineSvg ?? null;

  const [updated] = await db
    .update(assetLibrary)
    .set(setClause)
    .where(eq(assetLibrary.id, assetId))
    .returning();

  return mapRow(updated);
}

/**
 * Delete an asset — only if usageCount === 0.
 * Returns true if deleted, false if still in use.
 */
export async function deleteAsset(assetId: string): Promise<{ deleted: boolean; reason?: string }> {
  const [asset] = await db
    .select({ usageCount: assetLibrary.usageCount, blobUrl: assetLibrary.blobUrl })
    .from(assetLibrary)
    .where(eq(assetLibrary.id, assetId))
    .limit(1);

  if (!asset) {
    return { deleted: false, reason: 'Asset not found' };
  }

  if (asset.usageCount > 0) {
    return { deleted: false, reason: `Asset is used by ${asset.usageCount} guide(s)` };
  }

  // Delete blob
  const { deleteBlobUrls } = await import('@/lib/blob/delete-blob-urls');
  await deleteBlobUrls([asset.blobUrl]);

  // Delete row
  await db.delete(assetLibrary).where(eq(assetLibrary.id, assetId));
  return { deleted: true };
}

/**
 * Replace an asset's file — swap blob URL, update inlineSvg/dimensions.
 * All guides referencing this ID automatically get the new file.
 */
export async function replaceAssetFile(
  assetId: string,
  data: {
    blobUrl: string;
    mimeType: string;
    inlineSvg?: string | null;
    fileSize?: number | null;
    width?: number | null;
    height?: number | null;
  }
): Promise<AssetData> {
  // Get old blob URL for cleanup
  const [old] = await db
    .select({ blobUrl: assetLibrary.blobUrl })
    .from(assetLibrary)
    .where(eq(assetLibrary.id, assetId))
    .limit(1);

  const [updated] = await db
    .update(assetLibrary)
    .set({
      blobUrl: data.blobUrl,
      mimeType: data.mimeType,
      inlineSvg: data.inlineSvg ?? null,
      fileSize: data.fileSize ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
    })
    .where(eq(assetLibrary.id, assetId))
    .returning();

  // Delete old blob (fire-and-forget)
  if (old?.blobUrl) {
    const { deleteBlobUrls } = await import('@/lib/blob/delete-blob-urls');
    deleteBlobUrls([old.blobUrl]);
  }

  return mapRow(updated);
}

/**
 * Atomically increment an asset's usage count.
 */
export async function incrementAssetUsage(assetId: string): Promise<void> {
  await db
    .update(assetLibrary)
    .set({ usageCount: sql`${assetLibrary.usageCount} + 1` })
    .where(eq(assetLibrary.id, assetId));
}

/**
 * Atomically decrement an asset's usage count (min 0).
 */
export async function decrementAssetUsage(assetId: string): Promise<void> {
  await db
    .update(assetLibrary)
    .set({
      usageCount: sql`GREATEST(${assetLibrary.usageCount} - 1, 0)`,
    })
    .where(eq(assetLibrary.id, assetId));
}

/**
 * Recompute an asset's usage count from canvas_guides (admin repair tool).
 */
export async function recomputeAssetUsage(assetId: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(canvasGuides)
    .where(eq(canvasGuides.libraryAssetId, assetId));

  const actual = result?.count ?? 0;

  await db
    .update(assetLibrary)
    .set({ usageCount: actual })
    .where(eq(assetLibrary.id, assetId));

  return actual;
}

/**
 * Merge new tags into multiple assets (deduplicated, comma-separated).
 */
export async function bulkUpdateTags(
  assetIds: string[],
  newTags: string
): Promise<{ updated: number }> {
  const tagsToAdd = newTags
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  if (tagsToAdd.length === 0 || assetIds.length === 0) {
    return { updated: 0 };
  }

  const rows = await db
    .select({ id: assetLibrary.id, tags: assetLibrary.tags })
    .from(assetLibrary)
    .where(inArray(assetLibrary.id, assetIds));

  let updated = 0;
  for (const row of rows) {
    const existing = (row.tags || '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const merged = [...new Set([...existing, ...tagsToAdd])];
    await db
      .update(assetLibrary)
      .set({ tags: merged.join(', ') })
      .where(eq(assetLibrary.id, row.id));
    updated++;
  }

  return { updated };
}

/**
 * Auto-tag assets based on name and category heuristics.
 */
export async function autoTagAssets(
  assetIds: string[]
): Promise<{ updated: number }> {
  if (assetIds.length === 0) return { updated: 0 };

  const rows = await db
    .select({
      id: assetLibrary.id,
      name: assetLibrary.name,
      category: assetLibrary.category,
      tags: assetLibrary.tags,
    })
    .from(assetLibrary)
    .where(inArray(assetLibrary.id, assetIds));

  const uiPatterns = /\b(search|input|button|card|dropdown|modal|dialog|form|table|tab|toggle|checkbox|radio|select|slider|tooltip|accordion|menu|nav|sidebar|header|footer|badge|avatar|alert|toast|progress|spinner|skeleton|divider|breadcrumb)\b/i;
  const devicePatterns = /\b(mobile|desktop|tablet|phone|laptop)\b/i;
  const actionPatterns = /\b(heart|star|share|like|bookmark|download|upload|delete|edit|copy|send|save)\b/i;
  const figurePatterns = /\b(figure|person|human|people|man|woman|body|stick)\b/i;

  let updated = 0;
  for (const row of rows) {
    const newTags: string[] = [];
    const name = row.name.toLowerCase();

    // Category-based tags
    if (row.category === 'stamp') newTags.push('stamp');
    if (row.category === 'sticker') newTags.push('sticker');
    if (row.category === 'icon') newTags.push('icon');

    // Name-based tags
    if (name.startsWith('sticker-') || name.includes('sticker')) newTags.push('sticker');
    if (uiPatterns.test(name)) newTags.push('ui');
    if (devicePatterns.test(name)) newTags.push('device');
    if (actionPatterns.test(name)) newTags.push('action');
    if (figurePatterns.test(name)) newTags.push('stick figure');

    if (newTags.length === 0) continue;

    const existing = (row.tags || '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const merged = [...new Set([...existing, ...newTags])];

    await db
      .update(assetLibrary)
      .set({ tags: merged.join(', ') })
      .where(eq(assetLibrary.id, row.id));
    updated++;
  }

  return { updated };
}

function mapRow(r: typeof assetLibrary.$inferSelect): AssetData {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    blobUrl: r.blobUrl,
    inlineSvg: r.inlineSvg,
    mimeType: r.mimeType,
    fileSize: r.fileSize,
    width: r.width,
    height: r.height,
    category: r.category,
    tags: r.tags,
    usageCount: r.usageCount,
    uploadedBy: r.uploadedBy,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}
