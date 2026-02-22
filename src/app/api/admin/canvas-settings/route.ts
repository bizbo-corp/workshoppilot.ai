import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/auth/roles';
import {
  loadStepCanvasSettings,
  upsertStepCanvasSettings,
} from '@/actions/step-canvas-settings-actions';

async function checkAdmin(): Promise<boolean> {
  const { sessionClaims } = await auth();
  if (isAdmin(sessionClaims)) return true;
  const user = await currentUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  return !!(
    adminEmail &&
    userEmail &&
    userEmail.toLowerCase() === adminEmail.toLowerCase()
  );
}

/**
 * GET /api/admin/canvas-settings?stepId=xxx
 */
export async function GET(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const stepId = req.nextUrl.searchParams.get('stepId');
  if (!stepId) {
    return NextResponse.json(
      { error: 'stepId query param required' },
      { status: 400 }
    );
  }

  const settings = await loadStepCanvasSettings(stepId);
  return NextResponse.json(settings);
}

/**
 * POST /api/admin/canvas-settings
 */
export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  if (!body.stepId) {
    return NextResponse.json(
      { error: 'stepId is required' },
      { status: 400 }
    );
  }

  const settings = await upsertStepCanvasSettings({
    stepId: body.stepId,
    defaultZoom: body.defaultZoom ?? 1,
    defaultX: body.defaultX ?? 0,
    defaultY: body.defaultY ?? 0,
    viewportMode: body.viewportMode ?? 'center-offset',
  });

  return NextResponse.json(settings);
}
