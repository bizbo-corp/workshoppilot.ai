/**
 * AI Setup Card Action API Endpoint
 *
 * POST /api/ai/setup-card-action
 * Single-card text actions for the Step 1 "Set up your workshop" cards:
 * - polish:     tighten/clarify the current text, same meaning
 * - elaborate:  rewrite the current text in the direction of `instructions`
 * - regenerate: brand-new content for this card, ignoring the current text
 *
 * (Reset is handled client-side — no model call.) Grounded in the workshop name
 * + the other two cards so the result stays coherent with the rest of the board.
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { checkRateLimit, rateLimitResponse, getRateLimitId } from '@/lib/ai/rate-limiter';
import { loadWorkshopContext } from '@/lib/ai/workshop-context';
import { loadCanvasState } from '@/actions/canvas-actions';

export const maxDuration = 30;

/** Input cards used as context for one another. */
const INPUT_FIELDS = ['idea', 'problem', 'audience'] as const;
/** All cards an action can target — includes the generated challenge statement. */
const FIELDS = ['idea', 'problem', 'audience', 'challenge-statement'] as const;
type Field = (typeof FIELDS)[number];
const ACTIONS = ['polish', 'elaborate', 'regenerate'] as const;
type Action = (typeof ACTIONS)[number];

const resultSchema = z.object({
  text: z.string().describe('The new card content — plain text, no quotes or labels'),
});

const FIELD_LABEL: Record<Field, string> = {
  idea: 'Idea',
  problem: 'Problem',
  audience: 'Audience',
  'challenge-statement': 'workshop challenge',
};

const FIELD_BRIEF: Record<Field, string> = {
  idea: 'the idea or opportunity to explore — a short phrase or a couple of sentences',
  problem: 'the underlying problem or tension — one to three short sentences',
  audience:
    'who this is for — a single short sentence that may name more than one group (e.g. "Small business owners and marketing teams.")',
  'challenge-statement':
    'a single user-centered challenge statement that reads like a rallying cry — one sentence, under 25 words, focused on the people and the outcome, with NO baked-in solution, method, or tool. Lead with a question opener: "How might we…", "How do we help [person] to…", "How do we design for…", "What\'s the best way to…", or "What if we could…". Vary which question opener you use. Use a bold declarative mission ("Make X effortless for Y.") only rarely, when a question feels forced',
};

const GENERIC_TITLES = new Set(['', 'new workshop', 'untitled', 'untitled workshop']);
function isMeaningfulTitle(title?: string): boolean {
  return !!title && !GENERIC_TITLES.has(title.trim().toLowerCase());
}

type RequestBody = {
  workshopId: string;
  field: Field;
  action: Action;
  currentText?: string;
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
    const { workshopId, field, action, currentText, instructions }: RequestBody =
      await req.json();

    if (!workshopId || !FIELDS.includes(field) || !ACTIONS.includes(action)) {
      return new Response(
        JSON.stringify({ error: 'workshopId, valid field, and valid action are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const current = (currentText || '').trim();
    if ((action === 'polish' || action === 'elaborate') && !current) {
      return new Response(JSON.stringify({ error: 'No text to ' + action }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (action === 'elaborate' && !(instructions || '').trim()) {
      return new Response(JSON.stringify({ error: 'instructions are required to elaborate' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Context: workshop name + the OTHER two cards.
    const ctx = await loadWorkshopContext(workshopId);
    const title = ctx.title?.trim();
    const hasTitle = isMeaningfulTitle(title);

    const canvas = await loadCanvasState(workshopId, 'challenge');
    const otherCards = (canvas?.stickyNotes || [])
      .filter(
        (n) =>
          n.templateKey &&
          n.templateKey !== field &&
          (INPUT_FIELDS as readonly string[]).includes(n.templateKey) &&
          (n.text || '').trim(),
      )
      .map((n) => `- ${n.templateKey}: ${n.text.trim()}`)
      .join('\n');

    const contextBlock = [
      hasTitle ? `Workshop name: "${title}"` : '',
      ctx.originalIdea?.trim() ? `Workshop seed idea: ${ctx.originalIdea.trim()}` : '',
      otherCards ? `Other cards already filled:\n${otherCards}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const label = FIELD_LABEL[field];
    let task: string;
    if (action === 'polish') {
      task = `Polish the ${label} below: tighten and clarify the wording, fix any awkward phrasing, keep the SAME meaning and roughly the same length. Do not add new ideas. It should remain ${FIELD_BRIEF[field]}.\n\nCurrent ${label}:\n${current}`;
    } else if (action === 'elaborate') {
      task = `Revise the ${label} below in this direction: "${instructions!.trim()}". Keep what still fits; apply the requested change. It should remain ${FIELD_BRIEF[field]}.\n\nCurrent ${label}:\n${current}`;
    } else {
      task = `Write a brand-new ${label} for this workshop — ${FIELD_BRIEF[field]}. Ignore any previous text; produce a fresh, specific, plausible option${hasTitle ? ` that fits the workshop name` : ''}. Make it coherent with the other cards if present.`;
    }

    const prompt = `You are helping someone frame a design-thinking workshop with three cards: Idea, Problem, Audience.
${contextBlock ? contextBlock + '\n' : ''}
${task}

Return ONLY the new card text — plain text, no quotes, no field label, no preamble.${
      field === 'audience'
        ? ' For audience, write it as a single sentence (it may list multiple groups).'
        : field === 'challenge-statement'
          ? ' Write it as a single user-centered sentence, under 25 words. Lead with a question opener — vary among "How might we…", "How do we help [person] to…", "How do we design for…", "What\'s the best way to…", "What if we could…". Use a bold declarative mission ("Make X effortless for Y.") only rarely, when a question feels forced. Keep it ambitious and anchored to the people and the outcome, with no solution, method, or tool baked in (e.g. not "…through AI").'
          : ''
    }`;

    const result = await generateObject({
      model: google('gemini-2.5-flash-lite'),
      schema: resultSchema,
      prompt,
      temperature: action === 'polish' ? 0.4 : 0.8,
    });

    recordUsageEvent({
      workshopId,
      stepId: 'challenge',
      operation: `setup-card-${action}`,
      model: 'gemini-2.5-flash-lite',
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    });

    const text = result.object.text?.trim() || '';
    if (!text) {
      return new Response(JSON.stringify({ error: 'Empty result' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ data: { text } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('setup-card-action endpoint error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
