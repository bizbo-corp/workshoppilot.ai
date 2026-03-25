/**
 * AI HMW Card Generate API Endpoint
 *
 * POST /api/ai/hmw-card-generate
 * Handles three operations on HMW cards:
 * - generate-all: Fill all fields in one call
 * - generate-field: Generate a single field
 * - elaborate: Polish existing content with user instructions
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { auth } from '@clerk/nextjs/server';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { checkRateLimit, rateLimitResponse, getRateLimitId } from '@/lib/ai/rate-limiter';
import { loadWorkshopContext } from '@/lib/ai/workshop-context';
import { assembleStepContext } from '@/lib/context/assemble-context';
import type { HmwFieldId, HmwCardData } from '@/lib/canvas/hmw-card-types';
import {
  buildHmwPreamble,
  getHmwFieldPrompt,
  getHmwFieldSchema,
  getHmwGenerateAllPrompt,
  getHmwElaboratePrompt,
  hmwCardFullSchema,
  elaborateSchema,
} from '@/lib/ai/prompts/hmw-card-prompts';

export const maxDuration = 30;

type RequestBody = {
  workshopId: string;
  cardId: string;
  cardData: HmwCardData;
  operation: 'generate-all' | 'generate-field' | 'elaborate';
  field?: HmwFieldId;
  currentContent?: string;
  instructions?: string;
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rl = checkRateLimit(getRateLimitId(req, userId), 'text-gen');
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  try {
    const body: RequestBody = await req.json();
    const { workshopId, cardId, cardData, operation, field, currentContent, instructions } = body;

    if (!workshopId || !cardId || !cardData || !operation) {
      return new Response(
        JSON.stringify({ error: 'workshopId, cardId, cardData, and operation are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (operation === 'generate-field' && !field) {
      return new Response(
        JSON.stringify({ error: 'field is required for generate-field operation' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (operation === 'elaborate' && (!field || !currentContent)) {
      return new Response(
        JSON.stringify({ error: 'field and currentContent are required for elaborate operation' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Load context: workshop-level + step summaries
    const [workshopContext, stepContext] = await Promise.all([
      loadWorkshopContext(workshopId),
      assembleStepContext(workshopId, 'reframe'),
    ]);

    const preamble = buildHmwPreamble({
      originalIdea: workshopContext.originalIdea,
      problemStatement: workshopContext.problemStatement,
      reframedHmw: workshopContext.reframedHmw,
      stepSummaries: stepContext.summaries,
    });

    // Slim card snapshot for prompt context
    const cardJson = JSON.stringify({
      givenThat: cardData.givenThat || '(empty)',
      persona: cardData.persona || '(empty)',
      immediateGoal: cardData.immediateGoal || '(empty)',
      deeperGoal: cardData.deeperGoal || '(empty)',
      fullStatement: cardData.fullStatement || '(empty)',
    }, null, 2);

    let prompt: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let schema: any;

    switch (operation) {
      case 'generate-all':
        prompt = getHmwGenerateAllPrompt(preamble, cardJson);
        schema = hmwCardFullSchema;
        break;

      case 'generate-field':
        prompt = getHmwFieldPrompt(field!, preamble, cardJson);
        schema = getHmwFieldSchema(field!);
        break;

      case 'elaborate':
        prompt = getHmwElaboratePrompt(preamble, field!, currentContent!, instructions || 'Improve and polish this content');
        schema = elaborateSchema;
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown operation: ${operation}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        );
    }

    const result = await generateObject({
      model: google('gemini-2.0-flash'),
      schema,
      prompt,
    });

    recordUsageEvent({
      workshopId,
      stepId: 'reframe',
      operation: `hmw-card-${operation}${field ? `-${field}` : ''}`,
      model: 'gemini-2.0-flash',
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    });

    return new Response(
      JSON.stringify({
        data: result.object,
        operation,
        field: field || null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('hmw-card-generate endpoint error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
