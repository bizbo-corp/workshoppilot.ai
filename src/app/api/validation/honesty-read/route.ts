/**
 * POST /api/validation/honesty-read
 * Generate the in-session honesty read for an assembled validation plan.
 *
 * Body: { workshopId: string, outputTypes?: OutputType[], assumption?: string, signal?: Signal }
 * Response: 200 { read: HonestyRead }
 */

import { auth } from '@clerk/nextjs/server';
import { checkRateLimit, rateLimitResponse, getRateLimitId } from '@/lib/ai/rate-limiter';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { resolveValidateAccess } from '@/lib/validation/access';
import { generateHonestyRead } from '@/lib/validation/honesty-read';
import { outputTypeSchema, signalSchema } from '@/lib/schemas/validation-schemas';

export const maxDuration = 30;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return json({ error: 'Unauthorized' }, 401);

  const rl = checkRateLimit(getRateLimitId(req, userId), 'text-gen');
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  try {
    const { workshopId, outputTypes, assumption, signal } = await req.json();
    if (!workshopId) return json({ error: 'workshopId is required' }, 400);

    const parsedTypes = (Array.isArray(outputTypes) ? outputTypes : [])
      .flatMap((t) => {
        const r = outputTypeSchema.safeParse(t);
        return r.success ? [r.data] : [];
      })
      .slice(0, 2);

    const parsedSignal = signal ? signalSchema.safeParse(signal) : null;

    if (!(await resolveValidateAccess(workshopId))) return json({ error: 'Access denied' }, 403);

    const result = await generateHonestyRead(workshopId, {
      outputTypes: parsedTypes,
      assumption: typeof assumption === 'string' ? assumption : undefined,
      signal: parsedSignal?.success ? parsedSignal.data : null,
    });

    recordUsageEvent({
      workshopId,
      stepId: 'validate',
      operation: 'validate-honesty-read',
      model: 'gemini-2.5-flash-lite',
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    });

    return json({ read: result.read });
  } catch (error) {
    console.error(
      '[validation/honesty-read] error:',
      error instanceof Error ? error.message : error
    );
    return json({ error: 'Internal server error' }, 500);
  }
}
