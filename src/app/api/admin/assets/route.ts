import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';
import { isAdmin } from '@/lib/auth/roles';
import { listAssets, createAsset } from '@/actions/asset-library-actions';
import type { AssetCategory } from '@/lib/asset-library/asset-library-types';

async function checkAdmin(): Promise<{ allowed: boolean; userId?: string }> {
  const { sessionClaims, userId } = await auth();
  if (isAdmin(sessionClaims)) return { allowed: true, userId: userId ?? undefined };
  const user = await currentUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  if (adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase()) {
    return { allowed: true, userId: userId ?? undefined };
  }
  return { allowed: false };
}

/**
 * GET /api/admin/assets — list assets with optional filters
 */
export async function GET(req: NextRequest) {
  const { allowed } = await checkAdmin();
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const search = req.nextUrl.searchParams.get('search') ?? undefined;
  const category = req.nextUrl.searchParams.get('category') as AssetCategory | undefined;
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10);
  const pageSize = parseInt(req.nextUrl.searchParams.get('pageSize') ?? '50', 10);

  const result = await listAssets({ search, category, page, pageSize });
  return NextResponse.json(result);
}

/**
 * POST /api/admin/assets — upload file to Vercel Blob + create asset row
 * Expects FormData with: file (required), name, category, tags, description
 */
export async function POST(req: NextRequest) {
  const { allowed, userId } = await checkAdmin();
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const name = (formData.get('name') as string) || file.name.replace(/\.[^.]+$/, '');
    const category = ((formData.get('category') as string) || 'sticker') as AssetCategory;
    const tags = (formData.get('tags') as string) || null;
    const description = (formData.get('description') as string) || null;

    const mimeType = file.type || 'application/octet-stream';
    const ext = file.name.split('.').pop() || 'bin';
    const isSvg = mimeType === 'image/svg+xml';

    // Upload to Vercel Blob
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    let blobUrl: string;
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      // Dev fallback: return data URL
      const base64 = fileBuffer.toString('base64');
      blobUrl = `data:${mimeType};base64,${base64}`;
    } else {
      const blob = await put(
        `library/${category}/${Date.now()}.${ext}`,
        fileBuffer,
        { access: 'public', addRandomSuffix: true }
      );
      blobUrl = blob.url;
    }

    // Extract inline SVG for SVG files
    let inlineSvg: string | null = null;
    if (isSvg) {
      inlineSvg = fileBuffer.toString('utf-8');
    }

    const asset = await createAsset({
      name,
      blobUrl,
      mimeType,
      inlineSvg,
      fileSize: fileBuffer.length,
      category,
      tags,
      description,
      uploadedBy: userId,
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error('Asset upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
