import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/auth/roles';
import { db } from '@/db/client';
import { dialogueFeedback } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function checkAdmin(): Promise<boolean> {
  const { sessionClaims } = await auth();
  if (isAdmin(sessionClaims)) return true;
  const user = await currentUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  return !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());
}

/**
 * PATCH /api/admin/dialogue-feedback/[feedbackId]
 * Update status or resolution note.
 *
 * Body: { status?: 'pending' | 'resolved', resolutionNote?: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> },
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { feedbackId } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = body.status;
  if (body.resolutionNote !== undefined) updates.resolutionNote = body.resolutionNote;
  if (body.feedbackText) updates.feedbackText = body.feedbackText;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const [updated] = await db.update(dialogueFeedback)
    .set(updates)
    .where(eq(dialogueFeedback.id, feedbackId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

/**
 * DELETE /api/admin/dialogue-feedback/[feedbackId]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> },
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { feedbackId } = await params;

  const [deleted] = await db.delete(dialogueFeedback)
    .where(eq(dialogueFeedback.id, feedbackId))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
