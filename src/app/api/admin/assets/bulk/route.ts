import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/auth/roles';
import { deleteAsset } from '@/actions/asset-library-actions';

async function checkAdmin(): Promise<boolean> {
  const { sessionClaims } = await auth();
  if (isAdmin(sessionClaims)) return true;
  const user = await currentUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  return !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());
}

/**
 * POST /api/admin/assets/bulk — batch delete unused assets
 * Body: { action: 'delete', assetIds: string[] }
 */
export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();

  if (body.action !== 'delete' || !Array.isArray(body.assetIds)) {
    return NextResponse.json(
      { error: 'Expected { action: "delete", assetIds: string[] }' },
      { status: 400 }
    );
  }

  const results = await Promise.all(
    body.assetIds.map(async (id: string) => {
      const result = await deleteAsset(id);
      return { id, ...result };
    })
  );

  const deleted = results.filter((r) => r.deleted).length;
  const skipped = results.filter((r) => !r.deleted);

  return NextResponse.json({ deleted, skipped });
}
