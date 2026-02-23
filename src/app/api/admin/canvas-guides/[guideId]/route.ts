import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/auth/roles';
import { upsertCanvasGuide, deleteCanvasGuide } from '@/actions/canvas-guide-actions';

async function checkAdmin(): Promise<boolean> {
  const { sessionClaims } = await auth();
  if (isAdmin(sessionClaims)) return true;
  // Fallback: email-based check (matches step page logic)
  const user = await currentUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  return !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());
}

interface RouteParams {
  params: Promise<{ guideId: string }>;
}

/**
 * PATCH /api/admin/canvas-guides/[guideId]
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { guideId } = await params;
  const body = await req.json();

  const guide = await upsertCanvasGuide({ ...body, id: guideId });
  return NextResponse.json(guide);
}

/**
 * DELETE /api/admin/canvas-guides/[guideId]
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { guideId } = await params;
  await deleteCanvasGuide(guideId);
  return NextResponse.json({ success: true });
}
