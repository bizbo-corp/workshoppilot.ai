import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/auth/roles';
import { deleteAsset, bulkUpdateTags, autoTagAssets } from '@/actions/asset-library-actions';

async function checkAdmin(): Promise<boolean> {
  const { sessionClaims } = await auth();
  if (isAdmin(sessionClaims)) return true;
  const user = await currentUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  return !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());
}

/**
 * POST /api/admin/assets/bulk
 * Body: { action: 'delete' | 'tag' | 'auto-tag', assetIds: string[], tags?: string }
 */
export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();

  if (!Array.isArray(body.assetIds) || body.assetIds.length === 0) {
    return NextResponse.json(
      { error: 'Expected { action: string, assetIds: string[] }' },
      { status: 400 }
    );
  }

  switch (body.action) {
    case 'delete': {
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

    case 'tag': {
      if (typeof body.tags !== 'string' || !body.tags.trim()) {
        return NextResponse.json(
          { error: 'Expected { action: "tag", assetIds: string[], tags: string }' },
          { status: 400 }
        );
      }
      const result = await bulkUpdateTags(body.assetIds, body.tags);
      return NextResponse.json(result);
    }

    case 'auto-tag': {
      const result = await autoTagAssets(body.assetIds);
      return NextResponse.json(result);
    }

    default:
      return NextResponse.json(
        { error: `Unknown action: ${body.action}` },
        { status: 400 }
      );
  }
}
