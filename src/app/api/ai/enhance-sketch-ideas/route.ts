/**
 * AI Enhance Sketch Ideas API Endpoint
 *
 * POST /api/ai/enhance-sketch-ideas
 * Transforms raw mind map labels into snappy titles, expanded descriptions,
 * sketch hints, and optional wildcard bonus ideas for Crazy 8s sketch slots.
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { db } from '@/db/client';
import { stepArtifacts, workshopSteps } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { checkRateLimit, rateLimitResponse, getRateLimitId } from '@/lib/ai/rate-limiter';

export const maxDuration = 30;

/**
 * POST /api/ai/enhance-sketch-ideas
 * Transform starred mind map labels into polished titles + descriptions + sketch hints
 *
 * Request body (backwards-compatible):
 * - workshopId: string - The workshop ID (wks_xxx)
 * - ideas?: string[] - Raw mind map node labels (legacy solo compat)
 * - owners?: Array<{ ownerId: string; ideas: Array<{ title: string; description?: string }> }> - Batch mode
 * - totalSlots?: number - Total slots to fill (default 8)
 * - generateWildcards?: boolean - Fill remaining slots with AI bonus ideas
 *
 * Response:
 * - 200: { slots: EnhancedSlot[]; ownerSlots?: Record<string, EnhancedSlot[]> }
 * - 400: Missing required parameters
 * - 500: AI generation failure (returns fallback)
 */

type EnhancedSlot = {
  title: string;
  description: string;
  sketchHint: string;
  sketchPrompt: string;
  ideaType?: 'digital_product' | 'service_interaction' | 'physical_process';
  isWildcard?: boolean;
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const rl = checkRateLimit(getRateLimitId(req, userId), 'text-gen');
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  try {
    const body = await req.json();
    const { workshopId, ideas, owners, totalSlots = 8, generateWildcards = false } = body;

    // Validate: need either ideas[] or owners[]
    const hasLegacy = Array.isArray(ideas) && ideas.length > 0;
    const hasBatch = Array.isArray(owners) && owners.length > 0;
    if (!workshopId || (!hasLegacy && !hasBatch)) {
      return new Response(
        JSON.stringify({ error: 'workshopId and either ideas[] or owners[] are required' }),
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

    const slotSchema = z.object({
      title: z.string().describe('Short snappy title, 3-5 words'),
      description: z.string().describe('1-2 sentence expanded description'),
      ideaType: z.enum(['digital_product', 'service_interaction', 'physical_process']).describe('The inferred category: digital_product for apps/websites/software, service_interaction for human-to-human or service touchpoint ideas, physical_process for tangible/hardware/spatial ideas'),
      sketchHint: z.string().describe('A concrete, visual instruction for what to draw — adapted to the idea type (1 sentence)'),
      sketchPrompt: z.string().describe('A detailed prompt for generating a sketch of this idea — adapted to the idea type (1-3 sentences combining the concept + visual direction, suitable for an AI image generator)'),
      isWildcard: z.boolean().optional().describe('True if this is an AI-generated bonus idea, not from the user'),
    });

    // --- Batch mode (multiplayer) ---
    if (hasBatch) {
      // Build a combined prompt for all owners
      const ownerSections = (owners as Array<{ ownerId: string; ideas: Array<{ title: string; description?: string }> }>)
        .map((owner, oi) => {
          const ideaList = owner.ideas
            .map((idea, i) => `  ${i + 1}. "${idea.title}"${idea.description ? ` — ${idea.description}` : ''}`)
            .join('\n');
          const wildcardCount = Math.max(0, totalSlots - owner.ideas.length);
          return `Owner ${oi + 1} (ID: ${owner.ownerId}, ${owner.ideas.length} ideas${wildcardCount > 0 && generateWildcards ? `, generate ${wildcardCount} bonus ideas` : ''}):\n${ideaList}`;
        }).join('\n\n');

      const prompt = `You are a design thinking facilitator enhancing raw brainstorm ideas for a Crazy 8s sketching exercise.

**Workshop Context:**
${contextString}

**Ideas by Owner:**
${ownerSections}

**Task:**
For each owner's ideas:
1. Create a SHORT, SNAPPY title (3-5 words max) that "sells" the idea
2. A brief description (1-2 sentences) that expands the concept
3. Classify the ideaType — infer which category best fits each idea:
   - "digital_product" — apps, websites, software tools, dashboards, digital platforms (MOST COMMON)
   - "service_interaction" — human-to-human services, customer support flows, in-person touchpoints, consultations
   - "physical_process" — hardware, physical products, spatial layouts, manufacturing, logistics
4. A sketch hint adapted to the idea type:
   - digital_product → describe specific app screens/UI layouts (e.g., "Draw a phone screen showing a morning dashboard with 3 cards")
   - service_interaction → describe a storyboard panel of the human interaction (e.g., "Draw a 3-panel storyboard showing the customer greeting, consultation dialog, and follow-up notification")
   - physical_process → describe the physical object or spatial diagram (e.g., "Draw an exploded diagram showing the device components and how they connect")
5. A sketch prompt adapted to the idea type:
   - digital_product → wireframe-style UI screens with layout details (e.g., "A wireframe-style phone screen showing a morning wellness dashboard with three stacked cards: sleep score, hydration tracker, and mood check-in. Clean minimal layout with rounded corners.")
   - service_interaction → storyboard scene with people and dialog/actions (e.g., "A 3-panel storyboard: panel 1 shows a customer arriving at a kiosk, panel 2 shows a split-screen video consultation with a specialist, panel 3 shows a follow-up SMS notification on a phone. Simple line art style.")
   - physical_process → technical/spatial illustration (e.g., "An isometric diagram of a smart packaging station showing the scanner, sorting belt, and labeling arm. Clean technical illustration style with callout labels.")
${generateWildcards ? `6. If an owner has fewer than ${totalSlots} ideas, generate bonus ideas to fill remaining slots. Mark these with isWildcard: true.` : ''}

**Rules:**
- Titles should be punchy and action-oriented (e.g., "One-Tap Check-In", "Smart Budget Buddy")
- Descriptions should guide what to sketch, not just restate the title
- Most ideas will be digital_product — only classify as service_interaction or physical_process when the idea clearly involves human touchpoints or physical/tangible things
- Sketch hints and prompts MUST match the idea type — don't default to phone screens for service or physical ideas
- Keep the same order as the input ideas per owner
- Output results grouped by owner ID`;

      try {
        const result = await generateObject({
          model: google('gemini-2.0-flash'),
          schema: z.object({
            ownerSlots: z.record(z.string(), z.array(slotSchema)),
          }),
          prompt,
        });

        recordUsageEvent({
          workshopId,
          stepId: 'ideation',
          operation: 'enhance-sketch-ideas-batch',
          model: 'gemini-2.0-flash',
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
        });

        // Normalize per-owner results
        const ownerSlotsResult: Record<string, EnhancedSlot[]> = {};
        for (const owner of owners as Array<{ ownerId: string; ideas: Array<{ title: string; description?: string }> }>) {
          const aiSlots = result.object?.ownerSlots?.[owner.ownerId] || [];
          const normalized: EnhancedSlot[] = [];
          const targetCount = generateWildcards ? totalSlots : owner.ideas.length;

          for (let i = 0; i < targetCount; i++) {
            if (i < owner.ideas.length) {
              normalized.push({
                title: aiSlots[i]?.title || owner.ideas[i].title,
                description: aiSlots[i]?.description || owner.ideas[i].description || '',
                sketchHint: aiSlots[i]?.sketchHint || '',
                sketchPrompt: aiSlots[i]?.sketchPrompt || '',
                ideaType: aiSlots[i]?.ideaType || 'digital_product',
                isWildcard: false,
              });
            } else if (aiSlots[i]) {
              normalized.push({
                title: aiSlots[i].title,
                description: aiSlots[i].description,
                sketchHint: aiSlots[i].sketchHint,
                sketchPrompt: aiSlots[i].sketchPrompt,
                ideaType: aiSlots[i].ideaType || 'digital_product',
                isWildcard: true,
              });
            }
          }
          ownerSlotsResult[owner.ownerId] = normalized;
        }

        return new Response(
          JSON.stringify({ ownerSlots: ownerSlotsResult }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (aiError) {
        console.error('AI enhance-sketch-ideas batch generation failed:', aiError);

        // Fallback: use raw labels
        const ownerSlotsResult: Record<string, EnhancedSlot[]> = {};
        for (const owner of owners as Array<{ ownerId: string; ideas: Array<{ title: string; description?: string }> }>) {
          ownerSlotsResult[owner.ownerId] = owner.ideas.map((idea) => ({
            title: idea.title,
            description: idea.description || '',
            sketchHint: '',
            sketchPrompt: '',
          }));
        }

        return new Response(
          JSON.stringify({ ownerSlots: ownerSlotsResult, fallback: true }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // --- Legacy solo mode ---
    const wildcardCount = generateWildcards ? Math.max(0, totalSlots - ideas.length) : 0;

    // Normalize ideas: support both string[] and {title, description}[]
    const normalizedIdeas: Array<{ title: string; description?: string }> = ideas.map((idea: string | { title: string; description?: string }) =>
      typeof idea === 'string' ? { title: idea } : idea
    );

    const ideaList = normalizedIdeas
      .map((idea, i) => `${i + 1}. "${idea.title}"${idea.description ? ` — ${idea.description}` : ''}`)
      .join('\n');

    const prompt = `You are a design thinking facilitator enhancing raw brainstorm ideas for a Crazy 8s sketching exercise.

**Workshop Context:**
${contextString}

**Raw Ideas from Mind Map:**
${ideaList}

**Task:**
For each raw idea above, create:
1. A SHORT, SNAPPY title (3-5 words max) that "sells" the idea — think product feature names, catchy and memorable
2. A brief description (1-2 sentences) that expands the concept into something sketchable
3. Classify the ideaType — infer which category best fits each idea:
   - "digital_product" — apps, websites, software tools, dashboards, digital platforms (MOST COMMON)
   - "service_interaction" — human-to-human services, customer support flows, in-person touchpoints, consultations
   - "physical_process" — hardware, physical products, spatial layouts, manufacturing, logistics
4. A sketch hint adapted to the idea type:
   - digital_product → describe specific app screens/UI layouts (e.g., "Draw a phone screen showing a morning dashboard with 3 cards")
   - service_interaction → describe a storyboard panel of the human interaction (e.g., "Draw a 3-panel storyboard showing the customer greeting, consultation dialog, and follow-up notification")
   - physical_process → describe the physical object or spatial diagram (e.g., "Draw an exploded diagram showing the device components and how they connect")
5. A sketch prompt adapted to the idea type:
   - digital_product → wireframe-style UI screens with layout details (e.g., "A wireframe-style phone screen showing a morning wellness dashboard with three stacked cards: sleep score, hydration tracker, and mood check-in. Clean minimal layout with rounded corners.")
   - service_interaction → storyboard scene with people and dialog/actions (e.g., "A 3-panel storyboard: panel 1 shows a customer arriving at a kiosk, panel 2 shows a split-screen video consultation with a specialist, panel 3 shows a follow-up SMS notification on a phone. Simple line art style.")
   - physical_process → technical/spatial illustration (e.g., "An isometric diagram of a smart packaging station showing the scanner, sorting belt, and labeling arm. Clean technical illustration style with callout labels.")
${wildcardCount > 0 ? `\nThen generate ${wildcardCount} additional BONUS ideas (mark isWildcard: true) that complement the existing ideas and fill the remaining slots to reach ${totalSlots} total.` : ''}

**Rules:**
- Titles should be punchy and action-oriented (e.g., "One-Tap Check-In", "Smart Budget Buddy")
- Descriptions should guide what to sketch, not just restate the title
- Most ideas will be digital_product — only classify as service_interaction or physical_process when the idea clearly involves human touchpoints or physical/tangible things
- Sketch hints and prompts MUST match the idea type — don't default to phone screens for service or physical ideas
- Keep the same order as the input ideas
- Output exactly ${totalSlots} items total`;

    try {
      const result = await generateObject({
        model: google('gemini-2.0-flash'),
        schema: z.object({
          slots: z.array(slotSchema),
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

      // Validate and pad/trim to match target length
      const slots = result.object?.slots || [];
      const normalized: EnhancedSlot[] = [];
      for (let i = 0; i < totalSlots; i++) {
        if (i < normalizedIdeas.length) {
          normalized.push({
            title: slots[i]?.title || normalizedIdeas[i].title,
            description: slots[i]?.description || normalizedIdeas[i].description || '',
            sketchHint: slots[i]?.sketchHint || '',
            sketchPrompt: slots[i]?.sketchPrompt || '',
            ideaType: slots[i]?.ideaType || 'digital_product',
            isWildcard: false,
          });
        } else if (slots[i]) {
          normalized.push({
            title: slots[i].title,
            description: slots[i].description,
            sketchHint: slots[i].sketchHint,
            sketchPrompt: slots[i].sketchPrompt,
            ideaType: slots[i].ideaType || 'digital_product',
            isWildcard: true,
          });
        } else {
          normalized.push({
            title: '',
            description: '',
            sketchHint: '',
            sketchPrompt: '',
          });
        }
      }

      return new Response(
        JSON.stringify({ slots: normalized }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (aiError) {
      console.error('AI enhance-sketch-ideas generation failed:', aiError);

      // Fallback: use raw labels as titles, empty descriptions
      const fallbackSlots = normalizedIdeas.map((idea) => ({
        title: idea.title,
        description: idea.description || '',
        sketchHint: '',
        sketchPrompt: '',
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
