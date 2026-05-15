import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/auth/roles';
import { db } from '@/db/client';
import { chatRequestLogs } from '@/db/schema';
import { eq, lte, and, isNull, desc } from 'drizzle-orm';

async function checkAdmin(): Promise<boolean> {
  const { sessionClaims } = await auth();
  if (isAdmin(sessionClaims)) return true;
  const user = await currentUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  return !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());
}

/**
 * GET /api/admin/chat-request-log?sessionId=...&stepId=...&participantId=...&at=...
 *
 * Returns the most recent chat_request_logs row matching (sessionId, stepId, participantId)
 * whose created_at is at-or-before the given `at` ISO timestamp.
 *
 * Query params:
 * - sessionId: string (required)
 * - stepId: string (required)
 * - participantId: string (optional — empty string or absent means facilitator/NULL)
 * - at: ISO timestamp string (required) — upper bound for created_at
 *
 * Response: { log: <row | null> }
 */
export async function GET(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const sessionId = searchParams.get('sessionId');
  const stepId = searchParams.get('stepId');
  const at = searchParams.get('at');

  if (!sessionId || !stepId || !at) {
    return NextResponse.json(
      { error: 'sessionId, stepId, and at are required' },
      { status: 400 },
    );
  }

  const atDate = new Date(at);
  if (isNaN(atDate.getTime())) {
    return NextResponse.json({ error: 'at must be a valid ISO timestamp' }, { status: 400 });
  }

  // participantId empty string = facilitator (NULL in DB)
  const participantId = searchParams.get('participantId') || null;

  const rows = await db
    .select()
    .from(chatRequestLogs)
    .where(
      and(
        eq(chatRequestLogs.sessionId, sessionId),
        eq(chatRequestLogs.stepId, stepId),
        participantId
          ? eq(chatRequestLogs.participantId, participantId)
          : isNull(chatRequestLogs.participantId),
        lte(chatRequestLogs.createdAt, atDate),
      ),
    )
    .orderBy(desc(chatRequestLogs.createdAt))
    .limit(1);

  return NextResponse.json({ log: rows[0] ?? null });
}
