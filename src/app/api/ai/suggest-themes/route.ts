/**
 * AI Theme Suggestion API Endpoint
 *
 * POST /api/ai/suggest-themes
 * Generates 3-5 theme branch suggestions for mind map based on workshop context.
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { db } from '@/db/client';
import { stepArtifacts, workshopSteps } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Increase timeout for AI generation
 */
export const maxDuration = 30;

/**
 * POST /api/ai/suggest-themes
 * Generate theme branch suggestions for mind map
 *
 * Request body:
 * - workshopId: string - The workshop ID (wks_xxx)
 * - hmwStatement: string - The HMW statement from root node
 * - existingThemes?: string[] - Already-added theme labels (to avoid duplicates)
 *
 * Response:
 * - 200: { themes: string[] }
 * - 400: Missing required parameters
 * - 404: Workshop not found
 * - 500: AI generation failure
 */
export async function POST(req: Request) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const { workshopId, hmwStatement, existingThemes } = body;

    if (!workshopId || !hmwStatement) {
      return new Response(
        JSON.stringify({
          error: 'workshopId and hmwStatement are required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load workshop context from database
    // Fetch stepArtifacts for earlier steps to gather context
    const artifactRows = await db
      .select({
        stepId: stepArtifacts.stepId,
        artifact: stepArtifacts.artifact,
      })
      .from(stepArtifacts)
      .innerJoin(workshopSteps, eq(stepArtifacts.workshopStepId, workshopSteps.id))
      .where(eq(workshopSteps.workshopId, workshopId));

    // Note: Empty artifactRows is OK - we'll use HMW statement only
    // No need to fail if workshop has no prior artifacts

    // Extract relevant context from prior steps
    let personaName = '';
    let personaDescription = '';
    let pains: string[] = [];
    let gains: string[] = [];
    let insights: string[] = [];

    artifactRows.forEach((row) => {
      const artifact = row.artifact as Record<string, any> | null;
      if (!artifact) return;

      // Extract persona (Step 5)
      if (row.stepId === 'persona' && artifact.name) {
        personaName = artifact.name;
        personaDescription = artifact.bio || artifact.role || '';
        if (Array.isArray(artifact.pains)) {
          pains = artifact.pains.map((p: any) =>
            typeof p === 'string' ? p : p.description || p.text || ''
          ).filter(Boolean);
        }
        if (Array.isArray(artifact.gains)) {
          gains = artifact.gains.map((g: any) =>
            typeof g === 'string' ? g : g.description || g.text || ''
          ).filter(Boolean);
        }
      }

      // Extract insights from sense-making (Step 4)
      if (row.stepId === 'sense-making' && Array.isArray(artifact.themes)) {
        insights = artifact.themes.map((t: any) =>
          typeof t === 'string' ? t : t.name || t.title || ''
        ).filter(Boolean);
      }
    });

    // Build AI prompt
    const existingThemesText = Array.isArray(existingThemes) && existingThemes.length > 0
      ? `\n\n**Already explored themes (avoid duplicating):** ${existingThemes.join(', ')}`
      : '';

    const contextText = [];
    if (personaName) {
      contextText.push(`- Persona: ${personaName}${personaDescription ? ` - ${personaDescription}` : ''}`);
    }
    if (pains.length > 0) {
      contextText.push(`- Key Pains: ${pains.slice(0, 3).join('; ')}`);
    }
    if (gains.length > 0) {
      contextText.push(`- Key Gains: ${gains.slice(0, 3).join('; ')}`);
    }
    if (insights.length > 0) {
      contextText.push(`- Key Insights: ${insights.slice(0, 3).join('; ')}`);
    }

    const prompt = `You are facilitating Step 8 (Ideation) of a design thinking workshop.

**Context:**
- HMW Statement: ${hmwStatement}
${contextText.length > 0 ? contextText.join('\n') : '- No additional context available'}${existingThemesText}

**Task:**
Generate 3-5 high-level theme branches for a mind map exploring solutions to the HMW statement.

**Requirements:**
- Each theme should be broad enough to spawn multiple sub-ideas (2-4 words)
- Themes should be diverse and not overlap with each other
- Themes should connect to persona needs and research insights
- Do NOT duplicate any already-explored themes

Output as JSON array of strings. Example: ["Mobile-First Experience", "Community Features", "Gamification Elements"]`;

    // Call Gemini via Vercel AI SDK
    const result = await generateObject({
      model: google('gemini-2.0-flash'),
      schema: z.object({
        themes: z.array(z.string()).describe('Array of 3-5 theme branch names'),
      }),
      prompt,
    });

    // Validate AI response
    if (!result.object?.themes || result.object.themes.length === 0) {
      // Return fallback generic themes
      return new Response(
        JSON.stringify({
          themes: [
            'Technology Solutions',
            'Process Improvements',
            'User Experience',
            'Community & Social',
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return generated themes
    return new Response(
      JSON.stringify({
        themes: result.object.themes.slice(0, 5), // Max 5 themes
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI suggest-themes error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.cause) {
      console.error('AI suggest-themes error cause:', error.cause);
    }

    // Return fallback on AI failure
    return new Response(
      JSON.stringify({
        themes: [
          'Technology Solutions',
          'Process Improvements',
          'User Experience',
          'Community & Social',
        ],
        fallback: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
