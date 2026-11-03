import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMember, ForbiddenError } from '@/lib/workshops/access';
import { UnauthenticatedError } from '@/lib/auth/current-user';
import { facilitate } from '@/lib/engine/facilitate';

export const runtime = 'nodejs';
export const maxDuration = 60;

const bodySchema = z.object({
  mode: z.enum(['chat', 'canvas', 'greeting']).default('chat'),
  text: z.string().max(4000).optional(),
});

/**
 * One facilitator turn, streamed as a UI message stream. The client sends
 * only the new text (or a trigger); the server builds everything else from
 * the event log. Tool calls stream through as parts, so the UI can refresh
 * boards and fields as they land.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { user } = await requireMember(id);
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    if (parsed.data.mode === 'chat' && !parsed.data.text?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 });

    const { result, finished } = await facilitate({ workshopId: id, userId: user.id, trigger: parsed.data.mode, text: parsed.data.text });
    // Make sure the chat.ai event lands even if the client disconnects.
    void Promise.resolve(finished).catch((err: unknown) => console.error('[chat] finish failed', err));
    return result.toUIMessageStreamResponse();
  } catch (err) {
    if (err instanceof UnauthenticatedError) return NextResponse.json({ error: 'Sign in' }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.error('[chat]', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
