import type { DrawingElement, StampElement } from '@/lib/drawing/types';
import { getAsset } from '@/actions/asset-library-actions';

/**
 * Resolve stamp asset URLs at load time.
 *
 * When drawings are loaded from DB, stamp `src` URLs may be stale
 * if an admin replaced the asset file. This function fetches the latest
 * blobUrl/inlineSvg for each stamp and updates the elements in-place.
 *
 * Falls back to the stored `src` if the asset was deleted.
 */
export async function resolveStampAssets(
  elements: DrawingElement[]
): Promise<DrawingElement[]> {
  const stamps = elements.filter(
    (el): el is StampElement => el.type === 'stamp'
  );

  if (stamps.length === 0) return elements;

  // Deduplicate asset IDs
  const uniqueAssetIds = [...new Set(stamps.map((s) => s.assetId))];

  // Fetch latest asset data in parallel
  const assetMap = new Map<string, { blobUrl: string; inlineSvg?: string | null; mimeType: string }>();
  await Promise.all(
    uniqueAssetIds.map(async (id) => {
      const asset = await getAsset(id);
      if (asset) {
        assetMap.set(id, {
          blobUrl: asset.blobUrl,
          inlineSvg: asset.inlineSvg,
          mimeType: asset.mimeType,
        });
      }
    })
  );

  // Update stamp elements with fresh URLs
  return elements.map((el) => {
    if (el.type !== 'stamp') return el;

    const latest = assetMap.get(el.assetId);
    if (!latest) return el; // Asset deleted — keep stored src as fallback

    let src = latest.blobUrl;
    if (latest.inlineSvg && latest.mimeType === 'image/svg+xml') {
      src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(latest.inlineSvg)))}`;
    }

    return { ...el, src };
  });
}
