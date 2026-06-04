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
  idea: 'the idea or opportunity to explore — 3 short phrases (e.g. "A mobile app for booking dog walkers")',
  problem: "the underlying problem or tension — 3 short sentences describing what's broken or frustrating",
  audience:
    'who this is for — 3 to 5 SHORT group labels of 2-4 words each (e.g. "Busy dog owners", "Marketing teams", "CEOs", "B2B companies", "Work-from-home professionals"). These render as pills the user can pick several of, so make them distinct standalone groups — NOT full sentences.',
};

/** Titles that carry no usable signal — treat as "no name". */
const GENERIC_TITLES = new Set(['', 'new workshop', 'untitled', 'untitled workshop']);

function isMeaningfulTitle(title?: string): boolean {
  return !!title && !GENERIC_TITLES.has(title.trim().toLowerCase());
}

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

    const workshopContext = await loadWorkshopContext(workshopId);
    const title = workshopContext.title?.trim();
    const originalIdea = workshopContext.originalIdea?.trim();
    const hasTitle = isMeaningfulTitle(title);
    const anyFilled = Object.keys(norm).length > 0;

    // Nothing empty → nothing to suggest. No signal at all (no usable title AND
    // nothing filled) → let the client keep its static cold-start chips rather
    // than spending a model call.
    if (emptyFields.length === 0 || (!hasTitle && !anyFilled)) {
      return new Response(
        JSON.stringify({ data: { idea: [], problem: [], audience: [] } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const filledLines = FIELDS.filter((f) => norm[f])
      .map((f) => `- ${f}: ${norm[f]}`)
      .join('\n');
    const wantLines = emptyFields
      .map((f) => `- ${f}: ${FIELD_BRIEF[f]}`)
      .join('\n');

    // Audience is special: it should be inferred from the idea/problem and may
    // span MULTIPLE groups. The user picks several pills that compose a sentence.
    const audienceEmpty = emptyFields.includes('audience');
    const ideaProblemKnown = !!norm.idea || !!norm.problem || (hasTitle && !anyFilled);

    const prompt = `You are helping someone frame a design-thinking workshop. They fill three cards: an Idea, a Problem, and an Audience. Suggest short, concrete EXAMPLES for the cards they haven't filled yet.

${hasTitle ? `Workshop name: "${title}"` : 'Workshop name: (none yet)'}
${originalIdea ? `Workshop seed idea: ${originalIdea}` : ''}
Already filled:
${filledLines || '(none)'}

Suggest examples ONLY for these still-empty cards:
${wantLines}

RULES:
- Return exactly the requested number of suggestions for each EMPTY card; return an EMPTY array for already-filled cards: ${FIELDS.filter((f) => norm[f]).join(', ') || '(none)'}.
${hasTitle ? `- Use the workshop name "${title}" as your main steer for the idea and problem — make the examples feel like they belong to that named project. Don't force a connection that isn't there; if the name is too abstract, lean on generic but useful examples (an app, a service, or a process change for a business).` : '- There is no usable workshop name yet, so offer broadly useful generic examples spanning an app, a service, and a process change for a business.'}
${audienceEmpty ? `- For AUDIENCE, ${ideaProblemKnown ? 'infer who is affected from the idea/problem/name above' : 'offer common workshop audiences'}. Return several DISTINCT short group labels (2-4 words each) — people may pick more than one (e.g. "Marketing teams", "HR leads", "CEOs", "B2B companies", "Dog walkers", "Work-from-home professionals"). Do NOT write full sentences for audience.` : ''}
- Keep idea/problem suggestions short, specific, and plausible — something the user could pick as-is. Offer a little variety across the options.
- Plain text only. No numbering, quotes, or trailing punctuation beyond what reads naturally.`;

    const result = await generateObject({
      model: google('gemini-2.5-flash-lite'),
      schema: suggestionsSchema,
      prompt,
      temperature: 0.8,
    });

    recordUsageEvent({
      workshopId,
      stepId: 'challenge',
      operation: 'setup-suggestions',
      model: 'gemini-2.5-flash-lite',
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    });

    // Only surface suggestions for empty fields; trim + cap.
    const clean = (arr: string[] | undefined, max: number) =>
      (arr || []).map((s) => s.trim()).filter(Boolean).slice(0, max);

    const data = {
      idea: norm.idea ? [] : clean(result.object.idea, 3),
      problem: norm.problem ? [] : clean(result.object.problem, 3),
      audience: norm.audience ? [] : clean(result.object.audience, 5),
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
