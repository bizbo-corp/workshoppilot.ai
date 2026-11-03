import { NextResponse } from 'next/server';
import { and, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { workshops, users, reports } from '@/db/schema';
import { append, loadWorkshop } from '@/lib/engine/store';
import { fieldKey } from '@/lib/engine/stages';
import { sendResultReminder } from '@/lib/email/reminder';
import type { Verdict } from '@/lib/reports/schemas';

export const maxDuration = 60;

const DELAY_DAYS = 3;
const LOOKBACK_DAYS = 30;
const BATCH = 50;

/**
 * Daily (vercel.json). Workshops finished 3 to 30 days ago that have a
 * Verdict, no logged result and no reminder yet get one email. The
 * reminder is recorded as an event so it fires once.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const now = Date.now();
  const rows = await db
    .select({ id: workshops.id, title: workshops.title, email: users.email, name: users.name })
    .from(workshops)
    .innerJoin(users, eq(users.id, workshops.ownerId))
    .where(
      and(
        isNull(workshops.deletedAt),
        isNull(workshops.testRunId),
        lte(workshops.completedAt, new Date(now - DELAY_DAYS * 86_400_000)),
        gte(workshops.completedAt, new Date(now - LOOKBACK_DAYS * 86_400_000)),
        sql`exists (select 1 from ${reports} r where r.workshop_id = ${workshops.id} and r.kind = 'verdict')`,
      ),
    )
    .limit(BATCH);

  let sent = 0;
  const skipped: string[] = [];
  for (const row of rows) {
    const loaded = await loadWorkshop(row.id);
    if (!loaded) continue;
    const f = loaded.state.fields;
    if (f[fieldKey('deliver', 'result')] || f[fieldKey('deliver', 'reminder_sent')] || !row.email) {
      skipped.push(row.id);
      continue;
    }
    const [verdictRow] = await db.select({ content: reports.content }).from(reports).where(and(eq(reports.workshopId, row.id), eq(reports.kind, 'verdict'))).limit(1);
    const signal = (verdictRow?.content as unknown as Verdict | undefined)?.signal;
    if (!signal) continue;
    try {
      const r = await sendResultReminder({ to: row.email, name: row.name, workshopId: row.id, title: row.title, target: signal.target, kill: signal.kill, unit: signal.unit });
      await append({ workshopId: row.id, actor: 'system', actorId: 'cron:reminders', payload: { type: 'field.set', stage: 'deliver', field: 'reminder_sent', value: new Date().toISOString() } }, loaded.state);
      if (r.sent) sent++;
    } catch (err) {
      console.error('[reminders]', row.id, err);
    }
  }
  return NextResponse.json({ checked: rows.length, sent, skipped: skipped.length });
}
