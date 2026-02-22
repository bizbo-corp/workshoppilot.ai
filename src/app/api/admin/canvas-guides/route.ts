import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/auth/roles';
import { loadCanvasGuides, upsertCanvasGuide } from '@/actions/canvas-guide-actions';

async function checkAdmin(): Promise<boolean> {
  const { sessionClaims } = await auth();
  if (isAdmin(sessionClaims)) return true;
  // Fallback: email-based check (matches step page logic)
  const user = await currentUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  return !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());
}

/**
 * GET /api/admin/canvas-guides?stepId=xxx
 */
export async function GET(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const stepId = req.nextUrl.searchParams.get('stepId');
  if (!stepId) {
    return NextResponse.json({ error: 'stepId query param required' }, { status: 400 });
  }

  const guides = await loadCanvasGuides(stepId);
  return NextResponse.json(guides);
}

/**
 * POST /api/admin/canvas-guides
 */
export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const variantsWithoutBody = ['frame', 'arrow'];
  const needsBody = !variantsWithoutBody.includes(body.variant ?? 'sticker');
  if (!body.stepId || (needsBody && !body.body)) {
    return NextResponse.json({ error: 'stepId is required (body required for most variants)' }, { status: 400 });
  }

  const guide = await upsertCanvasGuide(body);
  return NextResponse.json(guide, { status: 201 });
}
