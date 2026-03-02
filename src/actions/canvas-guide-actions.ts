'use server';

import { db } from '@/db/client';
import { canvasGuides, assetLibrary } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { CanvasGuideData } from '@/lib/canvas/canvas-guide-types';

/**
 * Load all canvas guides for a step, ordered by sortOrder.
 * Joins with asset_library to include linked asset data inline.
 */
export async function loadCanvasGuides(stepId: string): Promise<CanvasGuideData[]> {
  const rows = await db
    .select({
      guide: canvasGuides,
      assetInlineSvg: assetLibrary.inlineSvg,
      assetBlobUrl: assetLibrary.blobUrl,
      assetName: assetLibrary.name,
    })
    .from(canvasGuides)
    .leftJoin(assetLibrary, eq(canvasGuides.libraryAssetId, assetLibrary.id))
    .where(eq(canvasGuides.stepId, stepId))
    .orderBy(asc(canvasGuides.sortOrder));

  return rows.map((r) => ({
    ...mapRow(r.guide),
    linkedAsset: r.guide.libraryAssetId
      ? { inlineSvg: r.assetInlineSvg, blobUrl: r.assetBlobUrl ?? '', name: r.assetName ?? '' }
      : null,
  }));
}

/**
 * Create or update a canvas guide (admin only).
 * For updates: only fields present in `guide` are modified (partial update).
 * For creates: missing fields get sensible defaults.
 */
export async function upsertCanvasGuide(
  guide: Partial<CanvasGuideData> & { id?: string }
): Promise<CanvasGuideData> {
  if (guide.id) {
    // Partial update — only set fields that are explicitly provided
    const setClause: Record<string, unknown> = {};
    if ('stepId' in guide) setClause.stepId = guide.stepId;
    if ('title' in guide) setClause.title = guide.title ?? null;
    if ('body' in guide) setClause.body = guide.body;
    if ('variant' in guide) setClause.variant = guide.variant;
    if ('color' in guide) setClause.color = guide.color ?? null;
    if ('layer' in guide) setClause.layer = guide.layer;
    if ('placementMode' in guide) setClause.placementMode = guide.placementMode;
    if ('pinnedPosition' in guide) setClause.pinnedPosition = guide.pinnedPosition ?? null;
    if ('canvasX' in guide) setClause.canvasX = guide.canvasX ?? null;
    if ('canvasY' in guide) setClause.canvasY = guide.canvasY ?? null;
    if ('dismissBehavior' in guide) setClause.dismissBehavior = guide.dismissBehavior;
    if ('showOnlyWhenEmpty' in guide) setClause.showOnlyWhenEmpty = guide.showOnlyWhenEmpty;
    if ('sortOrder' in guide) setClause.sortOrder = guide.sortOrder;
    if ('showStroke' in guide) setClause.showStroke = guide.showStroke;
    if ('showFill' in guide) setClause.showFill = guide.showFill;
    if ('width' in guide) setClause.width = guide.width ?? null;
    if ('height' in guide) setClause.height = guide.height ?? null;
    if ('rotation' in guide) setClause.rotation = guide.rotation ?? null;
    if ('imageUrl' in guide) setClause.imageUrl = guide.imageUrl ?? null;
    if ('imageSvg' in guide) setClause.imageSvg = guide.imageSvg ?? null;
    if ('imagePosition' in guide) setClause.imagePosition = guide.imagePosition ?? null;
    if ('templateKey' in guide) setClause.templateKey = guide.templateKey ?? null;
    if ('placeholderText' in guide) setClause.placeholderText = guide.placeholderText ?? null;
    if ('libraryAssetId' in guide) {
      setClause.libraryAssetId = guide.libraryAssetId ?? null;

      // When linking to an asset, clear the legacy inline SVG fallback
      if (guide.libraryAssetId) {
        setClause.imageSvg = null;
      }

      // Usage count management: if libraryAssetId is changing, adjust counts
      const [existing] = await db
        .select({ libraryAssetId: canvasGuides.libraryAssetId })
        .from(canvasGuides)
        .where(eq(canvasGuides.id, guide.id))
        .limit(1);

      const oldAssetId = existing?.libraryAssetId;
      const newAssetId = guide.libraryAssetId ?? null;

      if (oldAssetId !== newAssetId) {
        const { incrementAssetUsage, decrementAssetUsage } = await import(
          '@/actions/asset-library-actions'
        );
        if (oldAssetId) await decrementAssetUsage(oldAssetId);
        if (newAssetId) await incrementAssetUsage(newAssetId);
      }
    }

    if (Object.keys(setClause).length === 0) {
      // Nothing to update, just return existing
      const [existing] = await db
        .select()
        .from(canvasGuides)
        .where(eq(canvasGuides.id, guide.id))
        .limit(1);
      return mapRow(existing);
    }

    const [updated] = await db
      .update(canvasGuides)
      .set(setClause)
      .where(eq(canvasGuides.id, guide.id))
      .returning();
    return mapRow(updated);
  }

  // Create new — require stepId; body is optional for frame/arrow variants
  if (!guide.stepId) {
    throw new Error('stepId is required for creating a guide');
  }
  const variantsWithoutBody = ['frame', 'arrow'];
  const needsBody = !variantsWithoutBody.includes(guide.variant ?? 'card');
  if (needsBody && !guide.body) {
    throw new Error('body is required for creating this guide variant');
  }

  const [created] = await db
    .insert(canvasGuides)
    .values({
      stepId: guide.stepId,
      title: guide.title ?? null,
      body: guide.body ?? '',
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
      showStroke: guide.showStroke ?? true,
      showFill: guide.showFill ?? false,
      width: guide.width ?? null,
      height: guide.height ?? null,
      rotation: guide.rotation ?? null,
      imageUrl: guide.imageUrl ?? null,
      imageSvg: guide.imageSvg ?? null,
      imagePosition: guide.imagePosition ?? null,
      libraryAssetId: guide.libraryAssetId ?? null,
      templateKey: guide.templateKey ?? null,
      placeholderText: guide.placeholderText ?? null,
    })
    .returning();

  // Increment usage count for newly linked asset
  if (created.libraryAssetId) {
    const { incrementAssetUsage } = await import('@/actions/asset-library-actions');
    await incrementAssetUsage(created.libraryAssetId);
  }

  return mapRow(created);
}

/**
 * Delete a canvas guide (admin only).
 * Decrements usage count if guide references a library asset.
 */
export async function deleteCanvasGuide(guideId: string): Promise<void> {
  // Check for library asset reference before deleting
  const [existing] = await db
    .select({ libraryAssetId: canvasGuides.libraryAssetId })
    .from(canvasGuides)
    .where(eq(canvasGuides.id, guideId))
    .limit(1);

  await db.delete(canvasGuides).where(eq(canvasGuides.id, guideId));

  if (existing?.libraryAssetId) {
    const { decrementAssetUsage } = await import('@/actions/asset-library-actions');
    await decrementAssetUsage(existing.libraryAssetId);
  }
}

/**
 * Bulk reorder guides for a step (admin only).
 */
export async function reorderCanvasGuides(
  _stepId: string,
  orderedIds: string[]
): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      db
        .update(canvasGuides)
        .set({ sortOrder: index })
        .where(eq(canvasGuides.id, id))
    )
  );
}

function mapRow(r: typeof canvasGuides.$inferSelect): CanvasGuideData {
  return {
    id: r.id,
    stepId: r.stepId,
    title: r.title,
    body: r.body,
    variant: r.variant,
    color: r.color,
    layer: r.layer,
    placementMode: r.placementMode,
    pinnedPosition: r.pinnedPosition,
    canvasX: r.canvasX,
    canvasY: r.canvasY,
    dismissBehavior: r.dismissBehavior,
    showOnlyWhenEmpty: r.showOnlyWhenEmpty,
    sortOrder: r.sortOrder,
    showStroke: r.showStroke,
    showFill: r.showFill,
    width: r.width,
    height: r.height,
    rotation: r.rotation,
    imageUrl: r.imageUrl,
    imageSvg: r.imageSvg,
    imagePosition: r.imagePosition as CanvasGuideData['imagePosition'],
    libraryAssetId: r.libraryAssetId,
    templateKey: r.templateKey,
    placeholderText: r.placeholderText,
  };
}
