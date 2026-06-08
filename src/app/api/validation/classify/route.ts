/**
 * POST /api/validation/classify
 * Classify the workshop output type (classify-once at the Validate step) and persist it.
 *
 * Body: { workshopId: string }
 * Response: 200 { classification }
 */

import { auth } from '@clerk/nextjs/server';
import { checkRateLimit, rateLimitResponse, getRateLimitId } from '@/lib/ai/rate-limiter';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { loadAllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';
import { resolveValidateAccess } from '@/lib/validation/access';
import { classifyOutputType } from '@/lib/validation/classify-output-type';
import { updateValidateArtifact } from '@/lib/validation/save-validation';
import type { OutputTypeClassification } from '@/lib/schemas';

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
    const { workshopId } = await req.json();
    if (!workshopId) return json({ error: 'workshopId is required' }, 400);
    if (!(await resolveValidateAccess(workshopId))) return json({ error: 'Access denied' }, 403);

    const artifacts = await loadAllWorkshopArtifacts(workshopId);
    const result = await classifyOutputType(artifacts);

    recordUsageEvent({
      workshopId,
      stepId: 'validate',
      operation: 'validate-classify',
      model: 'gemini-2.5-flash-lite',
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    });

    const classification: OutputTypeClassification = {
      type: result.type,
      confidence: result.confidence,
      rationale: result.rationale,
      source: 'llm',
      classifiedAt: new Date().toISOString(),
    };

    await updateValidateArtifact(workshopId, (current) => ({ ...current, classification }));

    return json({ classification });
  } catch (error) {
    console.error('[validation/classify] error:', error instanceof Error ? error.message : error);
    return json({ error: 'Internal server error' }, 500);
  }
}
