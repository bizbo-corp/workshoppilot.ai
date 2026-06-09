/**
 * POST /api/validation/tailor-example
 * Generate ONE tailored "for your solution, e.g. …" example line for an assembled validation plan.
 *
 * Body: { workshopId: string, plan: ValidationPlan }
 * Response: 200 { example }
 */

import { auth } from '@clerk/nextjs/server';
import { checkRateLimit, rateLimitResponse, getRateLimitId } from '@/lib/ai/rate-limiter';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { resolveValidateAccess } from '@/lib/validation/access';
import { generateTailoredExample } from '@/lib/validation/tailor-guidance';
import { validationPlanSchema } from '@/lib/schemas';

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
    const { workshopId, plan } = await req.json();
    if (!workshopId) return json({ error: 'workshopId is required' }, 400);

    const parsedPlan = validationPlanSchema.safeParse(plan);
    if (!parsedPlan.success) return json({ error: 'Valid plan is required' }, 400);

    if (!(await resolveValidateAccess(workshopId))) return json({ error: 'Access denied' }, 403);

    const result = await generateTailoredExample(workshopId, parsedPlan.data);

    recordUsageEvent({
      workshopId,
      stepId: 'validate',
      operation: 'validate-tailor-example',
      model: 'gemini-2.5-flash-lite',
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    });

    return json({ example: result.example });
  } catch (error) {
    console.error('[validation/tailor-example] error:', error instanceof Error ? error.message : error);
    return json({ error: 'Internal server error' }, 500);
  }
}
