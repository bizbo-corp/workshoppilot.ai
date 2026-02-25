import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

/**
 * POST /api/upload-drawing-png
 *
 * Uploads a drawing image to Vercel Blob storage, bypassing the server action
 * body size limit. Accepts either:
 *   - FormData with 'file' (binary Blob) + optional 'workshopId'
 *   - JSON with 'pngBase64' (data URL) + optional 'workshopId'  (fallback)
 *
 * Returns:
 * - { pngUrl: string } on success
 * - { error: string } on failure
 */
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let fileBuffer: Buffer;
    let workshopId = 'unknown';
    let extension = 'jpg';

    if (contentType.includes('multipart/form-data')) {
      // Binary FormData upload (preferred — no base64 overhead)
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      workshopId = (formData.get('workshopId') as string) || 'unknown';

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    } else {
      // JSON fallback (for backwards compatibility)
      const { pngBase64, workshopId: wid } = await req.json();
      workshopId = wid || 'unknown';

      if (!pngBase64) {
        return NextResponse.json({ error: 'pngBase64 is required' }, { status: 400 });
      }

      const base64Data = pngBase64.split(',')[1];
      if (!base64Data) {
        return NextResponse.json({ error: 'Invalid base64 data URL format' }, { status: 400 });
      }

      fileBuffer = Buffer.from(base64Data, 'base64');
      extension = pngBase64.includes('image/png') ? 'png' : pngBase64.includes('image/webp') ? 'webp' : 'jpg';
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      // Local dev fallback: convert to a small data URL.
      // Re-encode as base64 and return. This is still large, but downstream
      // code handles it by passing it directly to the DB (not via server action).
      const mimeType = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
      const base64 = fileBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64}`;
      console.warn(`[upload-drawing-png] No BLOB_READ_WRITE_TOKEN — returning data URL (${Math.round(base64.length / 1024)}KB)`);
      return NextResponse.json({ pngUrl: dataUrl });
    }

    const blob = await put(
      `drawings/${workshopId}/${Date.now()}.${extension}`,
      fileBuffer,
      {
        access: 'public',
        addRandomSuffix: true,
      }
    );

    return NextResponse.json({ pngUrl: blob.url });
  } catch (error) {
    console.error('Upload drawing image error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
