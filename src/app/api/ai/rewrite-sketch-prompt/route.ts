/**
 * POST /api/ai/rewrite-sketch-prompt
 *
 * Lightweight Gemini Flash call that takes a raw idea title + description
 * and workshop context, then returns a coherent, woven concept prompt
 * suitable for an AI image generator.
 */

import { google } from '@ai-sdk/google';
import { auth } from '@clerk/nextjs/server';
import { generateTextWithRetry } from '@/lib/ai/gemini-retry';
import { loadWorkshopContext } from '@/lib/ai/workshop-context';
import { checkRateLimit, rateLimitResponse, getRateLimitId } from '@/lib/ai/rate-limiter';

export const maxDuration = 15;

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
    const { workshopId, ideaTitle, ideaDescription } = await req.json();

    if (!workshopId || !ideaTitle) {
      return new Response(
        JSON.stringify({ error: 'workshopId and ideaTitle are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const workshopContext = await loadWorkshopContext(workshopId);
    const challenge =
      workshopContext.reframedHmw ||
      workshopContext.hmwStatement ||
      workshopContext.problemStatement ||
      workshopContext.originalIdea ||
      '';

    const result = await generateTextWithRetry({
      model: google('gemini-2.0-flash'),
      messages: [
        {
          role: 'user',
          content: `You are an expert at writing image generation prompts for concept sketches shown on a tablet screen.

Given an idea title, description, and workshop context, do two things:

1. CLASSIFY the idea as one of:
   - UI: A digital interface, app, dashboard, website, tool, or ANY idea that can be represented as a screen with interactive elements. When in doubt, choose UI.
   - PROCESS: ONLY for ideas that are inherently physical — hardware, spatial layouts, architecture, physical products that cannot be represented as a screen.

DEFAULT TO UI.

2. REWRITE into a coherent 2-4 sentence prompt describing a single tablet app screen. CRITICAL RULES:
   - The screen title/header MUST be the IDEA TITLE exactly — do not invent a different name
   - Every UI element (inputs, buttons, cards, labels) MUST directly reflect the IDEA DESCRIPTION — pull specific words, concepts, and actions from the description to use as labels, placeholder text, and section headings
   - Do NOT invent a loosely related or tangential app — the screen must be a direct visual representation of what the description says
   - Describe concrete UI elements: text inputs, buttons, cards, lists, sticky notes, toggles, progress bars, tabs, etc.
   - Describe the layout: what's at the top, what's in the main content area, what actions are available
   - NEVER mention people, personas, characters, or users by name
   - NEVER describe comic panels, storyboards, speech bubbles, or multi-scene layouts
   - For PROCESS ideas only: describe the physical object, environment, or spatial layout instead

IDEA TITLE: ${ideaTitle}
IDEA DESCRIPTION: ${ideaDescription || 'No description provided'}
WORKSHOP CHALLENGE: ${challenge || 'No challenge context available'}

Respond in exactly this format:
CLASSIFICATION: <UI|PROCESS>
PROMPT: <your 2-4 sentence concept prompt>`,
        },
      ],
    });

    const text = result.text.trim();
    const classificationMatch = text.match(/CLASSIFICATION:\s*(UI|PROCESS)/i);
    const promptMatch = text.match(/PROMPT:\s*([\s\S]+)/i);

    if (classificationMatch && promptMatch) {
      return new Response(
        JSON.stringify({
          conceptPrompt: promptMatch[1].trim(),
          classification: classificationMatch[1].toUpperCase(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Fallback: simple concatenation
    const fallback = [ideaTitle, ideaDescription].filter(Boolean).join(': ');
    return new Response(
      JSON.stringify({ conceptPrompt: fallback, classification: 'UI' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('rewrite-sketch-prompt error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to rewrite prompt',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
