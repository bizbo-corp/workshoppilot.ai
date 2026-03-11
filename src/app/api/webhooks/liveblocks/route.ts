import { WebhookHandler } from '@liveblocks/node';
import { db } from '@/db/client';
import { workshopSteps, stepArtifacts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { unwrapLiveblocksStorage } from '@/lib/liveblocks/unwrap-storage';

/**
 * Liveblocks webhook handler — receives StorageUpdated events and persists
 * the canvas snapshot to the stepArtifacts table via Drizzle upsert.
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
 * Storage persistence strategy:
 * The StorageUpdated event fires ~60s after the last change. We find the
 * target step for the workshop and upsert the unwrapped storage under the
 * _canvas key in stepArtifacts, preserving any existing extracted fields
 * (e.g. hmwStatement, hmwStatements).
 *
 * Room ID format:
 * - Per-step storage rooms: 'workshop-{workshopId}-step-{stepId}'
 * - Workshop-level rooms: 'workshop-{workshopId}' (broadcasts/presence only)
 *
 * Docs: https://liveblocks.io/docs/platform/webhooks
 *
 * Implementation note — lazy initialization:
 * WebhookHandler validates the secret at instantiation time. Module-level
 * initialization fails at build time when LIVEBLOCKS_WEBHOOK_SECRET is not set.
 * Lazy initialization inside the POST handler defers validation to request time.
 */

// Lazily initialized webhook handler — avoids build-time env var validation failure
let _webhookHandler: WebhookHandler | null = null;

function getWebhookHandler(): WebhookHandler {
  if (!_webhookHandler) {
    _webhookHandler = new WebhookHandler(process.env.LIVEBLOCKS_WEBHOOK_SECRET!);
  }
  return _webhookHandler;
}

/**
 * Parse a Liveblocks room ID into workshopId and optional stepId.
 *
 * Room naming conventions:
 * - Per-step storage: 'workshop-{workshopId}-step-{stepId}'
 * - Workshop-level:   'workshop-{workshopId}'
 */
function parseRoomId(roomId: string): { workshopId: string; stepId?: string } {
  const suffix = roomId.replace(/^workshop-/, '');
  const stepSepIdx = suffix.indexOf('-step-');
  if (stepSepIdx >= 0) {
    return {
      workshopId: suffix.substring(0, stepSepIdx),
      stepId: suffix.substring(stepSepIdx + 6), // '-step-'.length === 6
    };
  }
  return { workshopId: suffix };
}

export async function POST(request: Request) {
  // Step 1: Read raw body — NEVER use request.json() as it breaks HMAC verification
  const body = await request.text();

  // Step 2: Verify HMAC signature — invalid signature returns 400 (no retry)
  const webhookHandler = getWebhookHandler();
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
      const { workshopId, stepId: stepIdFromRoom } = parseRoomId(roomId);

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
        `Liveblocks StorageUpdated: workshopId=${workshopId} stepId=${stepIdFromRoom ?? '(workshop-level)'} bytes=${bytes}`
      );

      // Parse storage payload to JSON
      let storageJson: unknown;
      try {
        storageJson = JSON.parse(storagePayload);
      } catch {
        console.error('Liveblocks StorageUpdated: failed to parse storage payload as JSON');
        return new Response('Invalid storage payload', { status: 500 });
      }

      // Unwrap CRDT wrappers (LiveObject/LiveList/LiveMap) to plain objects
      const unwrappedStorage = unwrapLiveblocksStorage(storageJson) as Record<string, unknown>;

      // Determine which workshop step to save to.
      // Per-step rooms include the stepId in the room name — use it directly.
      // Workshop-level rooms fall back to the active (in_progress) step.
      let workshopStepId: string;
      let stepId: string;

      if (stepIdFromRoom) {
        // Per-step room — find the exact step
        const stepRecord = await db
          .select({ id: workshopSteps.id, stepId: workshopSteps.stepId })
          .from(workshopSteps)
          .where(
            and(
              eq(workshopSteps.workshopId, workshopId),
              eq(workshopSteps.stepId, stepIdFromRoom)
            )
          )
          .limit(1);

        if (stepRecord.length === 0) {
          console.log(
            `Liveblocks StorageUpdated: no step record for workshopId=${workshopId} stepId=${stepIdFromRoom}, skipping`
          );
          return new Response(null, { status: 200 });
        }
        workshopStepId = stepRecord[0].id;
        stepId = stepRecord[0].stepId;
      } else {
        // Workshop-level room — find the active step
        const activeStepRecord = await db
          .select({ id: workshopSteps.id, stepId: workshopSteps.stepId })
          .from(workshopSteps)
          .where(
            and(
              eq(workshopSteps.workshopId, workshopId),
              eq(workshopSteps.status, 'in_progress')
            )
          )
          .limit(1);

        if (activeStepRecord.length === 0) {
          console.log(
            `Liveblocks StorageUpdated: no in_progress step for workshopId=${workshopId}, skipping upsert`
          );
          return new Response(null, { status: 200 });
        }
        workshopStepId = activeStepRecord[0].id;
        stepId = activeStepRecord[0].stepId;
      }

      // Read existing artifact to MERGE (preserve extracted fields like hmwStatement)
      const existingArtifactRecord = await db
        .select({ id: stepArtifacts.id, artifact: stepArtifacts.artifact, version: stepArtifacts.version })
        .from(stepArtifacts)
        .where(eq(stepArtifacts.workshopStepId, workshopStepId))
        .limit(1);

      if (existingArtifactRecord.length > 0) {
        // Merge: keep existing top-level fields, update _canvas
        const existing = (existingArtifactRecord[0].artifact || {}) as Record<string, unknown>;
        const merged = { ...existing, _canvas: unwrappedStorage };
        const newVersion = existingArtifactRecord[0].version + 1;

        await db
          .update(stepArtifacts)
          .set({
            artifact: merged,
            version: newVersion,
            extractedAt: new Date(),
          })
          .where(eq(stepArtifacts.id, existingArtifactRecord[0].id));
      } else {
        // Insert new artifact
        await db.insert(stepArtifacts).values({
          workshopStepId,
          stepId,
          artifact: { _canvas: unwrappedStorage },
          schemaVersion: 'liveblocks-1.0',
          version: 1,
        });
      }

      console.log(
        `Liveblocks StorageUpdated: upserted stepArtifact for workshopId=${workshopId} stepId=${stepId}`
      );
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
