import { del } from '@vercel/blob';

/**
 * Delete blob files by URL. Fire-and-forget safe — logs errors, never throws.
 *
 * - Filters to valid https:// URLs (ignores data: URLs, empty, nullish)
 * - No-op when BLOB_READ_WRITE_TOKEN is not set (local dev)
 * - Uses `del(urls)` which accepts arrays natively for batch delete
 */
export async function deleteBlobUrls(
  urls: (string | undefined | null)[]
): Promise<{ deleted: number }> {
  const validUrls = urls.filter(
    (u): u is string => typeof u === 'string' && u.startsWith('https://')
  );

  if (validUrls.length === 0) {
    return { deleted: 0 };
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { deleted: 0 };
  }

  try {
    await del(validUrls);
    return { deleted: validUrls.length };
  } catch (error) {
    console.warn('[deleteBlobUrls] Failed to delete blobs:', error);
    return { deleted: 0 };
  }
}
