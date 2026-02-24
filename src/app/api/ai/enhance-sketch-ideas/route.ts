/**
 * AI Enhance Sketch Ideas API Endpoint
 *
 * POST /api/ai/enhance-sketch-ideas
 * Transforms raw mind map labels into snappy titles and expanded descriptions
 * for Crazy 8s sketch slots.
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { db } from '@/db/client';
import { stepArtifacts, workshopSteps } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const maxDuration = 30;

/**
 * POST /api/ai/enhance-sketch-ideas
 * Transform starred mind map labels into polished titles + descriptions
 *
 * Request body:
 * - workshopId: string - The workshop ID (wks_xxx)
 * - ideas: string[] - Raw mind map node labels (up to 8)
 *
 * Response:
 * - 200: { slots: { title: string; description: string }[] }
 * - 400: Missing required parameters
 * - 500: AI generation failure (returns fallback)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workshopId, ideas } = body;

    if (!workshopId || !Array.isArray(ideas) || ideas.length === 0) {
      return new Response(
        JSON.stringify({ error: 'workshopId and ideas[] are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load workshop context from earlier steps
    const artifactRows = await db
      .select({
        stepId: stepArtifacts.stepId,
        artifact: stepArtifacts.artifact,
      })
      .from(stepArtifacts)
      .innerJoin(workshopSteps, eq(stepArtifacts.workshopStepId, workshopSteps.id))
      .where(eq(workshopSteps.workshopId, workshopId));

    let hmwStatement = '';
    let personaName = '';

    artifactRows.forEach((row) => {
      const artifact = row.artifact as Record<string, any> | null;
      if (!artifact) return;

      if (row.stepId === 'define' && artifact.hmwStatement) {
        hmwStatement = artifact.hmwStatement;
      }
      if (row.stepId === 'persona' && artifact.name) {
        personaName = artifact.name;
      }
    });

    // Build context
    const contextParts = [];
    if (hmwStatement) contextParts.push(`HMW: ${hmwStatement}`);
    if (personaName) contextParts.push(`Persona: ${personaName}`);
    const contextString = contextParts.length > 0
      ? contextParts.join('\n')
      : 'No prior context available';

    const prompt = `You are a design thinking facilitator enhancing raw brainstorm ideas for a Crazy 8s sketching exercise.

**Workshop Context:**
${contextString}

**Raw Ideas from Mind Map:**
${ideas.map((idea, i) => `${i + 1}. ${idea}`).join('\n')}

**Task:**
For each raw idea above, create:
1. A SHORT, SNAPPY title (3-5 words max) that "sells" the idea — think product feature names, catchy and memorable
2. A brief description (1-2 sentences) that expands the concept into something sketchable

**Rules:**
- Titles should be punchy and action-oriented (e.g., "One-Tap Check-In", "Smart Budget Buddy")
- Descriptions should guide what to sketch, not just restate the title
- Keep the same order as the input ideas
- Output exactly ${ideas.length} items`;

    try {
      const result = await generateObject({
        model: google('gemini-2.0-flash'),
        schema: z.object({
          slots: z.array(z.object({
            title: z.string().describe('Short snappy title, 3-5 words'),
            description: z.string().describe('1-2 sentence expanded description'),
          })),
        }),
        prompt,
      });

      // Record usage
      recordUsageEvent({
        workshopId,
        stepId: 'ideation',
        operation: 'enhance-sketch-ideas',
        model: 'gemini-2.0-flash',
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
      });

      // Validate and pad/trim to match input length
      const slots = result.object?.slots || [];
      const normalized = ideas.map((idea, i) => ({
        title: slots[i]?.title || idea,
        description: slots[i]?.description || '',
      }));

      return new Response(
        JSON.stringify({ slots: normalized }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (aiError) {
      console.error('AI enhance-sketch-ideas generation failed:', aiError);

      // Fallback: use raw labels as titles, empty descriptions
      const fallbackSlots = ideas.map((idea) => ({
        title: idea,
        description: '',
      }));

      return new Response(
        JSON.stringify({ slots: fallbackSlots, fallback: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('enhance-sketch-ideas endpoint error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
