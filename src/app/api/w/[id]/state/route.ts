import { NextResponse } from 'next/server';
import { requireMember, ForbiddenError } from '@/lib/workshops/access';
import { UnauthenticatedError } from '@/lib/auth/current-user';
import { loadWorkshop } from '@/lib/engine/store';

export const runtime = 'nodejs';

/** The current projection; the client refetches this after each AI turn or board edit. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireMember(id);
    const loaded = await loadWorkshop(id);
    if (!loaded) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ state: loaded.state, status: loaded.workshop.status });
  } catch (err) {
    if (err instanceof UnauthenticatedError) return NextResponse.json({ error: 'Sign in' }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    throw err;
  }
}
