/**
 * AI Concept Card Generate API Endpoint
 *
 * POST /api/ai/concept-card-generate
 * Handles three operations on concept cards:
 * - generate-all: Fill all fields in one call
 * - generate-field: Generate a single field
 * - elaborate: Polish existing content with user instructions
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { checkRateLimit, rateLimitResponse, getRateLimitId } from '@/lib/ai/rate-limiter';
import { loadWorkshopContext } from '@/lib/ai/workshop-context';
import { assembleStepContext } from '@/lib/context/assemble-context';
import type { ConceptFieldId } from '@/lib/canvas/concept-card-utils';
import type { ConceptCardData } from '@/lib/canvas/concept-card-types';
import {
  buildContextPreamble,
  getFieldPrompt,
  getFieldSchema,
  getGenerateAllPrompt,
  getElaboratePrompt,
  conceptCardFullSchema,
  elaborateSchema,
} from '@/lib/ai/prompts/concept-card-prompts';

export const maxDuration = 30;

type RequestBody = {
  workshopId: string;
  cardId: string;
  cardData: ConceptCardData;
  operation: 'generate-all' | 'generate-field' | 'elaborate';
  field?: ConceptFieldId;
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
      assembleStepContext(workshopId, 'concept'),
    ]);

    const preamble = buildContextPreamble({
      originalIdea: workshopContext.originalIdea,
      problemStatement: workshopContext.problemStatement,
      hmwStatement: workshopContext.hmwStatement,
      reframedHmw: workshopContext.reframedHmw,
      stepSummaries: stepContext.summaries,
      conceptName: cardData.conceptName || 'Untitled',
      ideaSource: cardData.ideaSource || 'Unknown',
    });

    // Slim card snapshot for prompt context
    const cardJson = JSON.stringify({
      conceptName: cardData.conceptName,
      ideaSource: cardData.ideaSource,
      elevatorPitch: cardData.elevatorPitch || '(empty)',
      usp: cardData.usp || '(empty)',
      swot: cardData.swot,
      feasibility: cardData.feasibility,
    }, null, 2);

    let prompt: string;
    let schema: z.ZodType;

    switch (operation) {
      case 'generate-all':
        prompt = getGenerateAllPrompt(preamble, cardJson);
        schema = conceptCardFullSchema;
        break;

      case 'generate-field':
        prompt = getFieldPrompt(field!, preamble, cardJson);
        schema = getFieldSchema(field!);
        break;

      case 'elaborate':
        prompt = getElaboratePrompt(preamble, field!, currentContent!, instructions || 'Improve and polish this content');
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
      stepId: 'concept',
      operation: `concept-card-${operation}${field ? `-${field}` : ''}`,
      model: 'gemini-2.0-flash',
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    });

    // Return raw AI result — the client hook handles deep merging
    // into the card's existing data (especially for SWOT sub-quadrants
    // and feasibility sub-dimensions).
    return new Response(
      JSON.stringify({
        data: result.object,
        operation,
        field: field || null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('concept-card-generate endpoint error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
