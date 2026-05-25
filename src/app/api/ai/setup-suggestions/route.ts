/**
 * AI Setup Suggestions API Endpoint
 *
 * POST /api/ai/setup-suggestions
 * Powers the contextual example chips on the Step 1 "Set up your workshop" cards.
 * Given whatever the user has already filled in (any of idea / problem / audience),
 * returns short example suggestions for the cards that are still EMPTY, tuned to be
 * coherent with what's already there. Filled cards get an empty array (no chips needed).
 *
 * Cold start (nothing filled) is handled client-side with static suggestions, so this
 * endpoint is only meaningfully called once at least one card has content.
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { checkRateLimit, rateLimitResponse, getRateLimitId } from '@/lib/ai/rate-limiter';
import { loadWorkshopContext } from '@/lib/ai/workshop-context';

export const maxDuration = 30;

const FIELDS = ['idea', 'problem', 'audience'] as const;
type Field = (typeof FIELDS)[number];

const suggestionsSchema = z.object({
  idea: z.array(z.string()).describe('Example "idea" suggestions (empty array if the idea is already provided)'),
  problem: z.array(z.string()).describe('Example "problem" suggestions (empty array if the problem is already provided)'),
  audience: z.array(z.string()).describe('Example "audience" suggestions (empty array if the audience is already provided)'),
});

type Filled = Partial<Record<Field, string>>;
type RequestBody = { workshopId: string; filled?: Filled };

const FIELD_BRIEF: Record<Field, string> = {
  idea: 'the idea or opportunity to explore (one short phrase, e.g. "A mobile app for booking dog walkers")',
  problem: 'the underlying problem or tension (one short sentence describing what\'s broken or frustrating)',
  audience: 'the people who feel this most acutely (a concrete group, e.g. "Busy pet owners in big cities")',
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
    const { workshopId, filled = {} }: RequestBody = await req.json();
    if (!workshopId) {
      return new Response(JSON.stringify({ error: 'workshopId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const norm: Filled = {};
    for (const f of FIELDS) {
      const v = (filled[f] || '').trim();
      if (v) norm[f] = v;
    }

    const emptyFields = FIELDS.filter((f) => !norm[f]);

    // Nothing empty → nothing to suggest. Nothing filled → let the client use
    // static cold-start suggestions instead of spending a model call.
    if (emptyFields.length === 0 || Object.keys(norm).length === 0) {
      return new Response(
        JSON.stringify({ data: { idea: [], problem: [], audience: [] } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const workshopContext = await loadWorkshopContext(workshopId);
    const originalIdea = workshopContext.originalIdea?.trim();

    const filledLines = FIELDS.filter((f) => norm[f])
      .map((f) => `- ${f}: ${norm[f]}`)
      .join('\n');
    const wantLines = emptyFields
      .map((f) => `- ${f}: ${FIELD_BRIEF[f]}`)
      .join('\n');

    const prompt = `You are helping someone frame a design-thinking workshop. They fill three cards: an Idea, a Problem, and an Audience. Your job is to suggest short, concrete EXAMPLES for the cards they haven't filled yet, so the examples stay coherent with what they've already written.

${originalIdea ? `Workshop seed idea: ${originalIdea}\n` : ''}Already filled:
${filledLines || '(none)'}

Suggest examples ONLY for these still-empty cards:
${wantLines}

RULES:
- Return exactly 3 suggestions for each EMPTY card listed above.
- Return an EMPTY array for any card that is already filled: ${FIELDS.filter((f) => norm[f]).join(', ') || '(none)'}.
- Keep each suggestion short (a phrase or single sentence), specific, and plausible — something the user could pick as-is.
- Make the suggestions cohere with what's already filled (same domain/scenario), but offer a little variety across the three options.
- Plain text only. No numbering, quotes, or trailing punctuation beyond what reads naturally.`;

    const result = await generateObject({
      model: google('gemini-2.0-flash'),
      schema: suggestionsSchema,
      prompt,
      temperature: 0.8,
    });

    recordUsageEvent({
      workshopId,
      stepId: 'challenge',
      operation: 'setup-suggestions',
      model: 'gemini-2.0-flash',
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    });

    // Only surface suggestions for empty fields; trim + cap at 3.
    const clean = (arr: string[] | undefined) =>
      (arr || []).map((s) => s.trim()).filter(Boolean).slice(0, 3);

    const data = {
      idea: norm.idea ? [] : clean(result.object.idea),
      problem: norm.problem ? [] : clean(result.object.problem),
      audience: norm.audience ? [] : clean(result.object.audience),
    };

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('setup-suggestions endpoint error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
