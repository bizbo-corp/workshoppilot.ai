import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { workshopSteps } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

async function uploadSingle(
  imageBase64: string,
  blobPath: string
): Promise<string> {
  const base64Data = imageBase64.split(',')[1];
  if (!base64Data) throw new Error('Invalid base64 data URL format');

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn(
      `[upload-step-snapshot] No BLOB_READ_WRITE_TOKEN — storing data URL (${Math.round(base64Data.length / 1024)}KB)`
    );
    return imageBase64;
  }

  const fileBuffer = Buffer.from(base64Data, 'base64');
  const blob = await put(blobPath, fileBuffer, {
    access: 'public',
    addRandomSuffix: false,
  });
  return blob.url;
}

/**
 * POST /api/upload-step-snapshot
 *
 * Uploads step snapshot image(s) to Vercel Blob storage and stores the URL(s)
 * in the workshop_steps table.
 *
 * Body (JSON):
 *   Single:   { imageBase64: string, workshopId: string, stepId: string }
 *   Multiple: { imageBase64: string[], workshopId: string, stepId: string }
 *
 * Returns: { snapshotUrl: string }
 *   For multiple images, snapshotUrl is a JSON array string.
 */
export async function POST(req: Request) {
  try {
    const { imageBase64, workshopId, stepId } = await req.json();

    if (!imageBase64 || !workshopId || !stepId) {
      return NextResponse.json(
        { error: 'imageBase64, workshopId, and stepId are required' },
        { status: 400 }
      );
    }

    let snapshotUrl: string;

    if (Array.isArray(imageBase64)) {
      // Multiple images (e.g. individual persona cards)
      const urls: string[] = [];
      for (let i = 0; i < imageBase64.length; i++) {
        const url = await uploadSingle(
          imageBase64[i],
          `snapshots/${workshopId}/${stepId}-${i}.jpg`
        );
        urls.push(url);
      }
      snapshotUrl = JSON.stringify(urls);
    } else {
      // Single image
      snapshotUrl = await uploadSingle(
        imageBase64,
        `snapshots/${workshopId}/${stepId}.jpg`
      );
    }

    // Update workshop_steps with the snapshot URL(s)
    await db
      .update(workshopSteps)
      .set({ snapshotUrl })
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, stepId)
        )
      );

    return NextResponse.json({ snapshotUrl });
  } catch (error) {
    console.error('Upload step snapshot error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
