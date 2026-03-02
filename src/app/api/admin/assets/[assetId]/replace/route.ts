import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';
import { isAdmin } from '@/lib/auth/roles';
import { replaceAssetFile, getAsset } from '@/actions/asset-library-actions';

async function checkAdmin(): Promise<boolean> {
  const { sessionClaims } = await auth();
  if (isAdmin(sessionClaims)) return true;
  const user = await currentUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  return !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());
}

/**
 * POST /api/admin/assets/[assetId]/replace — Master Replace
 * Upload new file, swap blob URL, all referencing guides get the new file automatically.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { assetId } = await params;

  // Verify asset exists
  const existing = await getAsset(assetId);
  if (!existing) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const mimeType = file.type || 'application/octet-stream';
    const ext = file.name.split('.').pop() || 'bin';
    const isSvg = mimeType === 'image/svg+xml';

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    let blobUrl: string;
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const base64 = fileBuffer.toString('base64');
      blobUrl = `data:${mimeType};base64,${base64}`;
    } else {
      const blob = await put(
        `library/${existing.category}/${Date.now()}.${ext}`,
        fileBuffer,
        { access: 'public', addRandomSuffix: true }
      );
      blobUrl = blob.url;
    }

    let inlineSvg: string | null = null;
    if (isSvg) {
      inlineSvg = fileBuffer.toString('utf-8');
    }

    const updated = await replaceAssetFile(assetId, {
      blobUrl,
      mimeType,
      inlineSvg,
      fileSize: fileBuffer.length,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Asset replace error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Replace failed' },
      { status: 500 }
    );
  }
}
