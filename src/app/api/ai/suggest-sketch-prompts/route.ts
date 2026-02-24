import { google } from '@ai-sdk/google';
import { generateTextWithRetry } from '@/lib/ai/gemini-retry';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { db } from '@/db/client';
import { workshops, workshopSteps, stepArtifacts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Increase Vercel serverless timeout for AI responses
 */
export const maxDuration = 30;

/**
 * POST /api/ai/suggest-sketch-prompts
 * Generates 8 contextual sketch prompts for Crazy 8s exercise
 *
 * Request body:
 * - workshopId: string - The workshop ID (wks_xxx)
 * - themes?: string[] - Optional mind map themes to incorporate
 */
export async function POST(req: Request) {
  try {
    const { workshopId, themes } = await req.json();

    if (!workshopId) {
      return new Response(
        JSON.stringify({ error: 'workshopId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load workshop context (HMW statement, persona)
    const workshop = await db
      .select({
        id: workshops.id,
      })
      .from(workshops)
      .where(eq(workshops.id, workshopId))
      .limit(1);

    if (workshop.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Workshop not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load HMW statement from Step 3 (define)
    let hmwStatement = '';
    const defineStep = await db
      .select({
        id: workshopSteps.id,
      })
      .from(workshopSteps)
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, 'define')
        )
      )
      .limit(1);

    if (defineStep.length > 0) {
      const defineArtifacts = await db
        .select({
          artifact: stepArtifacts.artifact,
        })
        .from(stepArtifacts)
        .where(eq(stepArtifacts.workshopStepId, defineStep[0].id))
        .limit(1);

      if (defineArtifacts.length > 0) {
        const artifact = defineArtifacts[0].artifact as Record<string, unknown>;
        hmwStatement = (artifact?.hmwStatement as string) || '';
      }
    }

    // Load persona from Step 4 (empathize)
    let personaName = '';
    const empathizeStep = await db
      .select({
        id: workshopSteps.id,
      })
      .from(workshopSteps)
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, 'empathize')
        )
      )
      .limit(1);

    if (empathizeStep.length > 0) {
      const empathizeArtifacts = await db
        .select({
          artifact: stepArtifacts.artifact,
        })
        .from(stepArtifacts)
        .where(eq(stepArtifacts.workshopStepId, empathizeStep[0].id))
        .limit(1);

      if (empathizeArtifacts.length > 0) {
        const artifact = empathizeArtifacts[0].artifact as Record<
          string,
          unknown
        >;
        const persona = artifact?.persona as Record<string, unknown> | undefined;
        personaName = (persona?.name as string) || '';
      }
    }

    // Build context string
    const contextParts = [];
    if (hmwStatement) contextParts.push(`HMW: ${hmwStatement}`);
    if (personaName) contextParts.push(`Persona: ${personaName}`);
    if (themes && themes.length > 0)
      contextParts.push(`Mind Map Themes: ${themes.join(', ')}`);

    const contextString =
      contextParts.length > 0 ? contextParts.join('\n') : 'No prior context available';

    // Generate sketch prompts via Gemini
    const prompt = `You are facilitating Step 8b (Crazy 8s) of a design thinking workshop.

Context:
${contextString}

Generate exactly 8 short sketch prompts (1 sentence each) to help the user sketch 8 different ideas.
Each prompt should suggest a specific, sketchable concept related to the context above.

IMPORTANT: Output ONLY a valid JSON array of 8 strings. Do not include markdown formatting or code blocks.
Keep each prompt under 80 characters.

Example format:
["Sketch a mobile app home screen with...", "Draw a notification that...", "Illustrate a user flow for...", "Sketch a dashboard showing...", "Draw a widget that...", "Visualize a modal dialog for...", "Sketch an onboarding screen with...", "Draw a settings panel featuring..."]`;

    try {
      const result = await generateTextWithRetry({
        model: google('gemini-2.0-flash'),
        temperature: 0.7, // Higher for creative prompts
        prompt,
      });

      // Record usage (fire-and-forget)
      recordUsageEvent({
        workshopId,
        stepId: 'ideation',
        operation: 'suggest-sketch-prompts',
        model: 'gemini-2.0-flash',
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
      });

      // Parse JSON response
      let prompts: string[];
      try {
        // Clean response (remove markdown code blocks if present)
        let cleanedText = result.text.trim();
        if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/```json?\n?/g, '').replace(/```\n?/g, '');
        }

        prompts = JSON.parse(cleanedText) as string[];

        // Validate: must be array of 8 strings
        if (!Array.isArray(prompts) || prompts.length !== 8) {
          throw new Error('Invalid prompt count');
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        // Fallback: return generic prompts
        prompts = [
          'Sketch your best idea so far',
          'Try a mobile-first approach',
          'Draw a different perspective',
          'Sketch the simplest version',
          'Try a visual metaphor',
          'Draw an unexpected solution',
          'Sketch a key user interaction',
          'Try combining two ideas',
        ];
      }

      return new Response(JSON.stringify({ prompts }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (aiError) {
      console.error('AI generation failed:', aiError);

      // Fallback on AI error
      const fallbackPrompts = [
        'Sketch your best idea',
        'Try a mobile app concept',
        'Draw a web interface',
        'Sketch a physical product',
        'Try a service flow diagram',
        'Draw a feature detail',
        'Sketch an alternative approach',
        'Try a combination of ideas',
      ];

      return new Response(JSON.stringify({ prompts: fallbackPrompts }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Sketch prompts endpoint error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
