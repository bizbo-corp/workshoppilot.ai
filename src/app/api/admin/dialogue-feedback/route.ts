import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/auth/roles';
import { db } from '@/db/client';
import { dialogueFeedback } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

async function checkAdmin(): Promise<boolean> {
  const { sessionClaims } = await auth();
  if (isAdmin(sessionClaims)) return true;
  const user = await currentUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  return !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());
}

/**
 * GET /api/admin/dialogue-feedback?status=pending
 * Lists feedback entries. Defaults to pending if no status filter provided.
 */
export async function GET(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get('status') as 'pending' | 'resolved' | null;

  const rows = status
    ? await db.select().from(dialogueFeedback)
        .where(eq(dialogueFeedback.status, status))
        .orderBy(desc(dialogueFeedback.createdAt))
    : await db.select().from(dialogueFeedback)
        .orderBy(desc(dialogueFeedback.createdAt));

  return NextResponse.json(rows);
}

/**
 * POST /api/admin/dialogue-feedback
 * Creates a new feedback entry.
 *
 * Body: {
 *   feedbackText: string,
 *   dialogueStepId: string,
 *   arcPhase?: string,
 *   filePath: string,
 *   componentName: string,
 *   contextSnapshot: Record<string, unknown>,
 * }
 */
export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();

  if (!body.feedbackText || !body.dialogueStepId || !body.filePath || !body.componentName || !body.contextSnapshot) {
    return NextResponse.json(
      { error: 'feedbackText, dialogueStepId, filePath, componentName, and contextSnapshot are required' },
      { status: 400 },
    );
  }

  const [entry] = await db.insert(dialogueFeedback).values({
    feedbackText: body.feedbackText,
    dialogueStepId: body.dialogueStepId,
    arcPhase: body.arcPhase ?? null,
    filePath: body.filePath,
    componentName: body.componentName,
    contextSnapshot: body.contextSnapshot,
  }).returning();

  return NextResponse.json(entry, { status: 201 });
}
