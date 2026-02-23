/**
 * Generate PRD / V0-Optimized Prompt API
 *
 * POST /api/build-pack/generate-prd
 * Synthesizes workshop artifacts into a V0-optimized prototype prompt via Gemini.
 */

import { google } from '@ai-sdk/google';
import { db } from '@/db/client';
import { buildPacks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateTextWithRetry } from '@/lib/ai/gemini-retry';
import { loadWorkshopArtifacts, validateRequiredArtifacts } from '@/lib/build-pack/load-workshop-artifacts';
import { buildPrdGenerationPrompt, buildV0SystemPrompt } from '@/lib/ai/prompts/prd-generation';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workshopId } = body;

    if (!workshopId) {
      return new Response(
        JSON.stringify({ error: 'workshopId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing build pack (cached result)
    const existing = await db
      .select()
      .from(buildPacks)
      .where(and(eq(buildPacks.workshopId, workshopId), eq(buildPacks.formatType, 'json')))
      .limit(1);

    if (existing.length > 0 && existing[0].content) {
      const cached = JSON.parse(existing[0].content);
      return new Response(
        JSON.stringify({
          prompt: cached.prompt,
          systemPrompt: cached.systemPrompt,
          conceptName: cached.conceptName,
          buildPackId: existing[0].id,
          cached: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load workshop artifacts
    const artifacts = await loadWorkshopArtifacts(workshopId);

    // Validate required steps
    const missing = validateRequiredArtifacts(artifacts);
    if (missing.length > 0) {
      return new Response(
        JSON.stringify({
          error: `Missing required steps: ${missing.join(', ')}. Please complete these steps first.`,
          missingSteps: missing,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate V0 prompt via Gemini
    const geminiPrompt = buildPrdGenerationPrompt(artifacts);

    const result = await generateTextWithRetry({
      model: google('gemini-2.0-flash'),
      temperature: 0.4,
      prompt: geminiPrompt,
    });

    const generatedPrompt = result.text.trim();

    // Extract concept name and persona name for system prompt
    const concept = artifacts.concept as Record<string, unknown>;
    const persona = artifacts.persona as Record<string, unknown>;
    const conceptName = (concept?.name as string) || (concept?.conceptName as string) || 'Prototype';
    const personaName = (persona?.name as string) || 'the target user';

    // Build static V0 system prompt
    const systemPrompt = buildV0SystemPrompt(conceptName, personaName);

    // Save to build_packs table
    const contentJson = JSON.stringify({
      prompt: generatedPrompt,
      systemPrompt,
      conceptName,
      personaName,
    });

    if (existing.length > 0) {
      // Update existing
      await db
        .update(buildPacks)
        .set({ content: contentJson, title: conceptName })
        .where(eq(buildPacks.id, existing[0].id));

      return new Response(
        JSON.stringify({
          prompt: generatedPrompt,
          systemPrompt,
          conceptName,
          buildPackId: existing[0].id,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insert new
    const [inserted] = await db
      .insert(buildPacks)
      .values({
        workshopId,
        title: conceptName,
        formatType: 'json',
        content: contentJson,
      })
      .returning({ id: buildPacks.id });

    return new Response(
      JSON.stringify({
        prompt: generatedPrompt,
        systemPrompt,
        conceptName,
        buildPackId: inserted.id,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('generate-prd error:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate prototype prompt' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
