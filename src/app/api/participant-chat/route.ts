import { auth } from '@clerk/nextjs/server';
import { loadMessages } from '@/lib/ai/message-persistence';

/**
 * GET /api/participant-chat?sessionId=xxx&stepId=xxx&participantId=xxx
 * Returns full chat history for a specific participant (read-only for facilitator).
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  const stepId = searchParams.get('stepId');
  const participantId = searchParams.get('participantId');

  if (!sessionId || !stepId || !participantId) {
    return Response.json({ error: 'sessionId, stepId, and participantId required' }, { status: 400 });
  }

  const messages = await loadMessages(sessionId, stepId, participantId);
  return Response.json(messages);
}
