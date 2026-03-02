import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/auth/roles';
import {
  getAsset,
  updateAssetMetadata,
  deleteAsset,
} from '@/actions/asset-library-actions';

async function checkAdmin(): Promise<boolean> {
  const { sessionClaims } = await auth();
  if (isAdmin(sessionClaims)) return true;
  const user = await currentUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  return !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());
}

/**
 * GET /api/admin/assets/[assetId]
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { assetId } = await params;
  const asset = await getAsset(assetId);
  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  return NextResponse.json(asset);
}

/**
 * PATCH /api/admin/assets/[assetId] — update metadata
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { assetId } = await params;
  const body = await req.json();
  const updated = await updateAssetMetadata(assetId, body);
  return NextResponse.json(updated);
}

/**
 * DELETE /api/admin/assets/[assetId]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { assetId } = await params;
  const result = await deleteAsset(assetId);

  if (!result.deleted) {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}
