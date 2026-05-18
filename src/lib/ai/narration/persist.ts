/**
 * Server-only: persist a narration payload to the DB and broadcast a
 * FACILITATOR_NARRATION event to the workshop's Liveblocks room.
 *
 * Called from the chat route's onFinish hook after a facilitator AI message
 * completes. Broadcast failures are non-fatal — the DB row is the source of
 * truth and participants will SSR-hydrate from it on their next page load.
 */

import 'server-only';
import { Liveblocks } from '@liveblocks/node';
import { db } from '@/db/client';
import { workshopStepNarration } from '@/db/schema';
import { getRoomId } from '@/lib/liveblocks/config';
import type { NarrationPayload } from '@/lib/ai/narration';

let _liveblocksServer: Liveblocks | null = null;
function getLiveblocksServer(): Liveblocks {
  if (!_liveblocksServer) {
    _liveblocksServer = new Liveblocks({
      secret: process.env.LIVEBLOCKS_SECRET_KEY!,
    });
  }
  return _liveblocksServer;
}

export async function persistAndBroadcastNarration(args: {
  workshopId: string;
  stepId: string;
  messageId: string;
  payload: NarrationPayload;
}): Promise<void> {
  const { workshopId, stepId, messageId, payload } = args;

  // DB write first — this is the source of truth for SSR hydration. If the
  // broadcast below fails, late joiners still see the latest state.
  let narrationId: string;
  try {
    const [inserted] = await db
      .insert(workshopStepNarration)
      .values({
        workshopId,
        stepId,
        messageId,
        content: payload.content,
        cta: payload.cta,
        rowId: payload.rowId,
        progressLabel: payload.progressLabel,
      })
      .returning({ id: workshopStepNarration.id });
    narrationId = inserted.id;
  } catch (err) {
    console.error('[narration] persist failed:', err);
    return;
  }

  // Broadcast — non-fatal. getOrCreateRoom is idempotent and protects against
  // the "REST broadcast 404 when room never registered for REST" gotcha (see
  // workshop-actions.ts advanceToNextStep for the same pattern).
  const roomId = getRoomId(workshopId);
  try {
    const liveblocks = getLiveblocksServer();
    await liveblocks.getOrCreateRoom(roomId, { defaultAccesses: [] });
    await liveblocks.broadcastEvent(roomId, {
      type: 'FACILITATOR_NARRATION',
      stepId,
      narrationId,
      content: payload.content,
      cta: payload.cta,
      rowId: payload.rowId,
      progressLabel: payload.progressLabel,
    });
  } catch (broadcastErr) {
    console.warn(
      `[narration] broadcast failed workshop=${workshopId} step=${stepId}:`,
      broadcastErr,
    );
  }
}
