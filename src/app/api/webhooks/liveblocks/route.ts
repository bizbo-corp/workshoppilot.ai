import { WebhookHandler } from '@liveblocks/node';

/**
 * Liveblocks webhook handler — receives StorageUpdated events and logs room state.
 *
 * This route is publicly accessible via the existing '/api/webhooks(.*)' matcher
 * in src/proxy.ts — no middleware changes needed.
 *
 * Design decisions (mirrors Stripe webhook pattern):
 * - Raw body via request.text(): HMAC is computed over raw bytes. NEVER use
 *   request.json() as it breaks signature verification.
 * - 400 for invalid signatures: Liveblocks will NOT retry 4xx. Bad signature
 *   is not transient — it means the event is invalid or untrusted.
 * - 500 for handler errors: Liveblocks WILL retry 5xx.
 * - 200 for unhandled event types: Liveblocks sends many events; returning 400
 *   causes needless delivery failures in the Dashboard.
 *
 * TODO (Phase 55): Wire actual Drizzle upsert to stepArtifacts table.
 * The StorageUpdated event fires ~60s after the last change. Phase 55 needs to:
 * 1. Find the active session for the workshopId (query workshop_sessions)
 * 2. Get the current step from the session
 * 3. Upsert the storage snapshot into step_artifacts (or a new canvas_snapshots table)
 *
 * Docs: https://liveblocks.io/docs/platform/webhooks
 */

const webhookHandler = new WebhookHandler(
  process.env.LIVEBLOCKS_WEBHOOK_SECRET!
);

export async function POST(request: Request) {
  // Step 1: Read raw body — NEVER use request.json() as it breaks HMAC verification
  const body = await request.text();

  // Step 2: Verify HMAC signature — invalid signature returns 400 (no retry)
  let event: ReturnType<WebhookHandler['verifyRequest']>;
  try {
    event = webhookHandler.verifyRequest({
      headers: request.headers,
      rawBody: body,
    });
  } catch (err) {
    console.error('Liveblocks webhook signature verification failed:', err);
    return new Response('Invalid webhook signature', { status: 400 });
  }

  // Step 3: Handle events
  try {
    if (event.type === 'storageUpdated') {
      const { roomId } = event.data;

      // Extract workshopId from room name using the established convention:
      // getRoomId(workshopId) => 'workshop-{workshopId}'
      const workshopId = roomId.replace(/^workshop-/, '');

      // Fetch the current storage snapshot from the Liveblocks REST API
      const storageRes = await fetch(
        `https://api.liveblocks.io/v2/rooms/${roomId}/storage`,
        {
          headers: {
            Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
          },
        }
      );

      if (!storageRes.ok) {
        console.error(
          `Liveblocks StorageUpdated: failed to fetch storage for room=${roomId} status=${storageRes.status}`
        );
        // Return 500 so Liveblocks retries — storage fetch failure is transient
        return new Response('Failed to fetch room storage', { status: 500 });
      }

      const storagePayload = await storageRes.text();
      const bytes = Buffer.byteLength(storagePayload, 'utf8');
      console.log(
        `Liveblocks StorageUpdated: workshopId=${workshopId}, bytes=${bytes}`
      );

      // TODO (Phase 55): Wire the actual Drizzle upsert to stepArtifacts.
      // Need active step context from workshop_sessions to know which step to persist.
      // 1. SELECT * FROM workshop_sessions WHERE liveblocks_room_id = roomId AND status = 'active'
      // 2. Extract currentStep from session
      // 3. UPSERT INTO step_artifacts (workshopId, step, canvasSnapshot, updatedAt)
    }
    // All other event types: acknowledge receipt (200), do not process
  } catch (err) {
    console.error('Liveblocks webhook handler error:', err);
    // Return 500 so Liveblocks retries on transient errors
    return new Response('Internal error', { status: 500 });
  }

  // Step 4: Acknowledge receipt for all successfully handled events
  return new Response(null, { status: 200 });
}
