/**
 * POST /api/validation/propose-assumption
 * Generate the riskiest assumption + 2–3 alternatives for the Validate step.
 *
 * Body: { workshopId: string, outputType: OutputType, avoid?: string }
 * Response: 200 { assumption, alternatives }
 */

import { auth } from '@clerk/nextjs/server';
import { checkRateLimit, rateLimitResponse, getRateLimitId } from '@/lib/ai/rate-limiter';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { resolveValidateAccess } from '@/lib/validation/access';
import { proposeAssumption } from '@/lib/validation/propose-assumption';
import { outputTypeSchema } from '@/lib/schemas';

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
    const { workshopId, outputType, outputTypes, avoid, scope } = await req.json();
    if (!workshopId) return json({ error: 'workshopId is required' }, 400);

    // Accept an array (max 2) or fall back to a single outputType.
    const rawTypes = Array.isArray(outputTypes) ? outputTypes : [outputType];
    const parsedTypes = rawTypes
      .flatMap((t) => {
        const r = outputTypeSchema.safeParse(t);
        return r.success ? [r.data] : [];
      })
      .slice(0, 2);
    if (parsedTypes.length === 0) return json({ error: 'Valid outputType is required' }, 400);

    if (!(await resolveValidateAccess(workshopId))) return json({ error: 'Access denied' }, 403);

    const result = await proposeAssumption(
      workshopId,
      parsedTypes,
      scope === 'specific' ? 'specific' : 'broad',
      typeof avoid === 'string' ? avoid : undefined
    );

    recordUsageEvent({
      workshopId,
      stepId: 'validate',
      operation: 'validate-assumption',
      model: 'gemini-2.5-flash-lite',
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    });

    return json({
      assumption: result.assumption,
      alternatives: result.alternatives,
      sources: result.sources,
      rationale: result.rationale,
    });
  } catch (error) {
    console.error('[validation/propose-assumption] error:', error instanceof Error ? error.message : error);
    return json({ error: 'Internal server error' }, 500);
  }
}
