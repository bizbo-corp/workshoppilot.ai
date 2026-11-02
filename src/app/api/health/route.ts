import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, version: '2.0' });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 503 });
  }
}
