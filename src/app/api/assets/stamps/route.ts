import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listAssets } from '@/actions/asset-library-actions';

/**
 * GET /api/assets/stamps — public read-only asset list for EzyDraw
 * Only returns assets in the "stamp" category.
 * Any signed-in user can access (no admin role required).
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.get('search') ?? undefined;
  const tag = req.nextUrl.searchParams.get('tag') ?? undefined;
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10);
  const pageSize = parseInt(req.nextUrl.searchParams.get('pageSize') ?? '50', 10);

  const result = await listAssets({ search, category: 'stamp', tag, page, pageSize });

  return NextResponse.json(result);
}
