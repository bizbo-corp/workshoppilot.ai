/**
 * AI Billboard Text Generation API Endpoint
 *
 * POST /api/ai/generate-billboard-text
 * Generates billboard headline/subheadline/CTA from Step 9 concept data.
 * Supports combined mode (all concepts → 1 billboard) or separate mode (1 per concept).
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';

export const maxDuration = 30;

const billboardSchema = z.object({
  billboards: z.array(
    z.object({
      headline: z.string().describe('Bold, memorable headline (5-10 words)'),
      subheadline: z.string().describe('Supporting value proposition (10-20 words)'),
      cta: z.string().describe('Call to action button text (2-5 words)'),
      conceptName: z.string().optional().describe('Source concept name (separate mode only)'),
    })
  ),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workshopId, concepts, mode, userPrompt } = body as {
      workshopId: string;
      concepts: Array<{ conceptName: string; elevatorPitch: string; usp: string }>;
      mode: 'combined' | 'separate';
      userPrompt?: string;
    };

    if (!workshopId || !concepts || concepts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'workshopId and at least one concept are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const conceptsText = concepts
      .map((c, i) => `${i + 1}. **${c.conceptName}**\n   Elevator Pitch: ${c.elevatorPitch}\n   USP: ${c.usp}`)
      .join('\n\n');

    const modeInstruction = mode === 'combined'
      ? `Create exactly 1 billboard that synthesizes ALL concepts into a single compelling message. Do NOT include conceptName.`
      : `Create exactly ${concepts.length} billboard(s), one for each concept. Include the conceptName field matching the concept name.`;

    const creativeDirection = userPrompt?.trim()
      ? `\n\n**Creative Direction from user:** ${userPrompt.trim()}`
      : '';

    const prompt = `You are a world-class advertising copywriter creating billboard advertisements for a product/service.

**Concepts to work with:**
${conceptsText}

**Task:**
${modeInstruction}

**Requirements:**
- Headlines should be bold, memorable, and emotionally compelling (5-10 words)
- Subheadlines should communicate the core value proposition clearly (10-20 words)
- CTAs should be action-oriented and create urgency (2-5 words)
- Think Times Square billboard / premium SaaS landing page hero
- Be creative and punchy — avoid generic corporate-speak${creativeDirection}`;

    const result = await generateObject({
      model: google('gemini-2.0-flash'),
      schema: billboardSchema,
      prompt,
      temperature: 0.6,
    });

    recordUsageEvent({
      workshopId,
      stepId: 'validate',
      operation: 'generate-billboard-text',
      model: 'gemini-2.0-flash',
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    });

    if (!result.object?.billboards || result.object.billboards.length === 0) {
      return new Response(
        JSON.stringify({ error: 'AI failed to generate billboard text' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ billboards: result.object.billboards }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Generate billboard text error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate billboard text',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
