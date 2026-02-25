/**
 * Dev/Admin Orphaned Blob Cleanup Route
 *
 * POST /api/dev/cleanup-orphaned-blobs
 *
 * Reconciles Vercel Blob storage against the database to find and delete
 * blob files that are no longer referenced by any stepArtifact.
 *
 * Query params:
 *   ?dryRun=true  — (default) list orphans without deleting
 *   ?dryRun=false — actually delete orphaned blobs
 *
 * Returns JSON report with counts and lists of orphaned URLs.
 *
 * Guards:
 *   - Requires BLOB_READ_WRITE_TOKEN
 *   - Requires Clerk auth
 *   - Production-safe: defaults to dry run
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';
import { db } from '@/db/client';
import { stepArtifacts } from '@/db/schema';
import { extractBlobUrlsFromArtifact } from '@/lib/blob/extract-urls';

export const maxDuration = 120; // Large stores may take time to paginate

export async function POST(request: Request) {
  // ── Auth guard ──────────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN not configured' },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dryRun') !== 'false'; // default true

  try {
    // ── Step 1: Collect all blob URLs referenced in the database ──────
    const allArtifacts = await db
      .select({ artifact: stepArtifacts.artifact })
      .from(stepArtifacts);

    const referencedUrls = new Set<string>();
    for (const row of allArtifacts) {
      const urls = extractBlobUrlsFromArtifact(
        (row.artifact || {}) as Record<string, unknown>
      );
      for (const u of urls) {
        referencedUrls.add(u);
      }
    }

    // ── Step 2: List all blobs in Vercel Blob storage ─────────────────
    const allBlobUrls: { url: string; pathname: string; size: number }[] = [];
    let cursor: string | undefined;
    let pageCount = 0;

    do {
      const result = await list({
        limit: 1000,
        ...(cursor ? { cursor } : {}),
      });

      for (const blob of result.blobs) {
        allBlobUrls.push({
          url: blob.url,
          pathname: blob.pathname,
          size: blob.size,
        });
      }

      cursor = result.hasMore ? result.cursor : undefined;
      pageCount++;
    } while (cursor);

    // ── Step 3: Find orphans (in blob store but not in DB) ────────────
    const orphans = allBlobUrls.filter((blob) => !referencedUrls.has(blob.url));
    const orphanTotalBytes = orphans.reduce((sum, b) => sum + b.size, 0);

    // ── Step 4: Delete orphans (if not dry run) ───────────────────────
    let deletedCount = 0;
    if (!dryRun && orphans.length > 0) {
      // Batch delete in chunks of 1000 (Vercel Blob API limit)
      const BATCH_SIZE = 1000;
      for (let i = 0; i < orphans.length; i += BATCH_SIZE) {
        const batch = orphans.slice(i, i + BATCH_SIZE).map((b) => b.url);
        await del(batch);
        deletedCount += batch.length;
      }
    }

    return NextResponse.json({
      dryRun,
      blobStore: {
        totalBlobs: allBlobUrls.length,
        pagesScanned: pageCount,
      },
      database: {
        artifactRows: allArtifacts.length,
        referencedUrls: referencedUrls.size,
      },
      orphans: {
        count: orphans.length,
        totalSizeMB: Math.round((orphanTotalBytes / 1024 / 1024) * 100) / 100,
        deleted: deletedCount,
        urls: orphans.slice(0, 100).map((b) => ({
          url: b.url,
          pathname: b.pathname,
          sizeMB: Math.round((b.size / 1024 / 1024) * 100) / 100,
        })),
        ...(orphans.length > 100
          ? { note: `Showing first 100 of ${orphans.length} orphans` }
          : {}),
      },
    });
  } catch (error) {
    console.error('Orphaned blob cleanup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cleanup failed' },
      { status: 500 }
    );
  }
}
