/**
 * AI Sense-Making Seed API Endpoint
 *
 * POST /api/ai/sense-making-seed
 * Deterministically maps EVERY Step 3 research insight into an empathy-map zone
 * (Says/Thinks/Feels/Does), preserving persona attribution, and proposes a few
 * synthesized cross-cutting theme cards. A server-side completeness backfill
 * guarantees no insight is dropped — the conversational chat model tends to
 * over-consolidate, so this structured pass is the source of truth for the board.
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { checkRateLimit, rateLimitResponse, getRateLimitId } from '@/lib/ai/rate-limiter';
import { loadWorkshopContext } from '@/lib/ai/workshop-context';
import { loadCanvasState } from '@/actions/canvas-actions';

export const maxDuration = 45;

const ZONES = ['says', 'thinks', 'feels', 'does'] as const;

const seedSchema = z.object({
  mapped: z
    .array(
      z.object({
        index: z.number().int().describe('The index number of the source insight, exactly as given in the list'),
        zone: z.enum(ZONES).describe('Which empathy-map zone this insight best fits'),
        text: z.string().describe('The insight, lightly reworded to fit the zone voice — keep the original meaning, do not invent'),
      }),
    )
    .describe('One entry for EVERY source insight. Do not skip any index.'),
  synthesized: z
    .array(
      z.object({
        zone: z.enum(ZONES),
        text: z.string().describe('A cross-cutting theme/value that spans multiple people — headline length'),
      }),
    )
    .describe('A few (2-5) synthesized cross-cutting themes/values, not attributable to one person'),
});

type RequestBody = { workshopId: string };

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
    const { workshopId }: RequestBody = await req.json();
    if (!workshopId) {
      return new Response(JSON.stringify({ error: 'workshopId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const canvas = await loadCanvasState(workshopId, 'user-research');
    const insights = (canvas?.stickyNotes || [])
      .filter((n) => (!n.type || n.type === 'stickyNote') && !n.isPreview && n.cluster)
      .map((n) => ({ persona: n.cluster as string, text: n.text.trim() }));

    if (insights.length === 0) {
      return new Response(JSON.stringify({ data: { items: [], synthesized: [] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const workshopContext = await loadWorkshopContext(workshopId);
    const challenge = workshopContext.problemStatement || workshopContext.originalIdea || '';

    const numbered = insights.map((ins, i) => `${i}. [${ins.persona}] ${ins.text}`).join('\n');

    const prompt = `You are sorting user-research insights into an empathy map (zones: says, thinks, feels, does).
${challenge ? `Workshop challenge: ${challenge}\n` : ''}
Classify EVERY insight below into the single best-fit zone:
- says: things people stated out loud (quotes, claims)
- thinks: inferred beliefs, mental models, assumptions
- feels: emotional states (frustration, hope, anxiety, resignation)
- does: observable behaviors, actions, workarounds

RULES:
- Return exactly one "mapped" entry for EVERY index 0 through ${insights.length - 1}. Do NOT skip, merge, or drop any insight — completeness is mandatory.
- Keep each insight's meaning; you may lightly reword to fit the zone's voice, but never invent content that isn't in the source.
- Then add 2-5 "synthesized" cards: cross-cutting themes or shared values that span multiple people (these are not attributed to one person).

INSIGHTS (index. [persona] text):
${numbered}`;

    const result = await generateObject({
      model: google('gemini-2.0-flash'),
      schema: seedSchema,
      prompt,
      temperature: 0.2,
    });

    recordUsageEvent({
      workshopId,
      stepId: 'sense-making',
      operation: 'sense-making-seed',
      model: 'gemini-2.0-flash',
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
    });

    // Completeness backfill: every source insight MUST appear. Any index the
    // model skipped is added with its original text in a default zone, so the
    // board can never silently lose an insight.
    const byIndex = new Map<number, { zone: (typeof ZONES)[number]; text: string }>();
    for (const m of result.object.mapped) {
      if (m.index >= 0 && m.index < insights.length && m.text?.trim()) {
        byIndex.set(m.index, { zone: m.zone, text: m.text.trim() });
      }
    }
    const items = insights.map((ins, i) => {
      const m = byIndex.get(i);
      return {
        persona: ins.persona,
        zone: m?.zone || 'says',
        text: m?.text || ins.text,
      };
    });
    const synthesized = (result.object.synthesized || [])
      .filter((s) => s.text?.trim())
      .map((s) => ({ zone: s.zone, text: s.text.trim() }));

    return new Response(JSON.stringify({ data: { items, synthesized } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('sense-making-seed endpoint error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
