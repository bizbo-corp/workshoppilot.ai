import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/auth/roles';
import { getWorkshopUsageSummary } from '@/lib/ai/usage-tracking';

async function checkAdmin(): Promise<boolean> {
  const { sessionClaims } = await auth();
  if (isAdmin(sessionClaims)) return true;
  const user = await currentUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  return !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());
}

/**
 * GET /api/workshops/[workshopId]/usage
 * Returns aggregated AI usage summary for a workshop (admin only)
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workshopId: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { workshopId } = await params;
  const summary = await getWorkshopUsageSummary(workshopId);
  return NextResponse.json(summary);
}
