/**
 * POST /api/validation/suggest-signal
 * Suggest a complete measurable signal for the Validate step.
 *
 * Body: { workshopId, assumption, outputType, lens, artifactLabel }
 * Response: 200 { signal }
 */

import { auth } from '@clerk/nextjs/server';
import { checkRateLimit, rateLimitResponse, getRateLimitId } from '@/lib/ai/rate-limiter';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { resolveValidateAccess } from '@/lib/validation/access';
import { suggestSignals } from '@/lib/validation/suggest-signal';
import { outputTypeSchema, lensSchema } from '@/lib/schemas';

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
    const { workshopId, assumption, outputType, lens, artifactLabel } = await req.json();
    if (!workshopId) return json({ error: 'workshopId is required' }, 400);

    const parsedType = outputTypeSchema.safeParse(outputType);
    const parsedLens = lensSchema.safeParse(lens);
    if (!parsedType.success || !parsedLens.success || typeof assumption !== 'string') {
      return json({ error: 'assumption, valid outputType and lens are required' }, 400);
    }

    if (!(await resolveValidateAccess(workshopId))) return json({ error: 'Access denied' }, 403);

    const { candidates, usage } = await suggestSignals({
      assumption,
      outputType: parsedType.data,
      lens: parsedLens.data,
      artifactLabel: typeof artifactLabel === 'string' ? artifactLabel : 'a quick test',
    });

    recordUsageEvent({
      workshopId,
      stepId: 'validate',
      operation: 'validate-suggest-signal',
      model: 'gemini-2.5-flash-lite',
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
    });

    return json({ candidates });
  } catch (error) {
    console.error('[validation/suggest-signal] error:', error instanceof Error ? error.message : error);
    return json({ error: 'Internal server error' }, 500);
  }
}
