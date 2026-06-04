/**
 * AI Persona Fill API Endpoint
 *
 * POST /api/ai/persona-fill
 * Fills the AI-generatable zones of a persona card (6 empathy fields, narrative,
 * quote) in one call, grounded in the workshop challenge + prior-step research.
 *
 * Powers the in-card "Complete with AI" button. The client applies the returned
 * fields only to zones that are currently empty, so it never overwrites edits.
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { checkRateLimit, rateLimitResponse } from '@/lib/ai/rate-limiter';
import { loadWorkshopContext } from '@/lib/ai/workshop-context';
import { assembleStepContext } from '@/lib/context/assemble-context';
import {
  authenticateWorkshopRequest,
  unauthorizedResponse,
} from '@/lib/auth/workshop-request-auth';
import {
  personaFillSchema,
  getPersonaFillPrompt,
} from '@/lib/ai/prompts/persona-fill-prompts';

export const maxDuration = 30;

const MODEL = 'gemini-2.5-flash-lite';

type RequestBody = {
  workshopId?: string;
  templateId?: string;
  persona?: {
    name?: string;
    age?: number;
    job?: string;
    archetype?: string;
    archetypeRole?: string;
    empathySays?: string;
    empathyThinks?: string;
    empathyFeels?: string;
    empathyDoes?: string;
    empathyPains?: string;
    empathyGains?: string;
    narrative?: string;
    quote?: string;
  };
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as RequestBody | null;
  if (!body || typeof body !== 'object') {
    return json({ error: 'Invalid request body' }, 400);
  }

  const { workshopId, templateId, persona } = body;
  if (!workshopId || !templateId || !persona) {
    return json(
      { error: 'workshopId, templateId, and persona are required' },
      400,
    );
  }

  // Clerk session + workshop membership (owner or participant), matching the
  // persona-image endpoint so participants can complete their own cards.
  const authResult = await authenticateWorkshopRequest(workshopId);
  if (!authResult) return unauthorizedResponse();

  const rl = checkRateLimit(authResult.rateLimitKey, 'text-gen');
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  try {
    const [workshopContext, stepContext] = await Promise.all([
      loadWorkshopContext(workshopId),
      assembleStepContext(workshopId, 'persona'),
    ]);

    const prompt = getPersonaFillPrompt({
      workshopContext,
      stepSummaries: stepContext.summaries,
      persona,
    });

    const result = await generateObject({
      model: google(MODEL),
      schema: personaFillSchema,
      prompt,
    });

    recordUsageEvent({
      workshopId,
      stepId: 'persona',
      operation: 'persona-fill',
      model: MODEL,
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    });

    return json({ data: result.object }, 200);
  } catch (error) {
    console.error('persona-fill endpoint error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500,
    );
  }
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
