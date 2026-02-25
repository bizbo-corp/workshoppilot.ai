/**
 * Generate PRD API
 *
 * POST /api/build-pack/generate-prd
 *
 * Supports two generation paths:
 *   { workshopId }               — V0 prototype prompt (backward compatible, existing behavior)
 *   { workshopId, type: 'full-prd' } — Full PRD as Markdown + JSON (new Build Pack path)
 */

import { auth } from '@clerk/nextjs/server';
import { google } from '@ai-sdk/google';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { db } from '@/db/client';
import { buildPacks, workshops } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';
import { generateTextWithRetry } from '@/lib/ai/gemini-retry';
import { loadWorkshopArtifacts, validateRequiredArtifacts, loadAllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';
import { buildPrdGenerationPrompt, buildV0SystemPrompt, buildFullPrdPrompt, buildFullPrdJsonPrompt } from '@/lib/ai/prompts/prd-generation';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workshopId, type } = body;

    if (!workshopId) {
      return new Response(
        JSON.stringify({ error: 'workshopId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Auth check: verify user is authenticated
    const { userId } = await auth();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Ownership check: verify user owns this workshop
    const workshop = await db
      .select({ id: workshops.id, clerkUserId: workshops.clerkUserId })
      .from(workshops)
      .where(eq(workshops.id, workshopId))
      .limit(1);

    if (workshop.length === 0 || workshop[0].clerkUserId !== userId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Route: full PRD generation (new Build Pack path)
    if (type === 'full-prd') {
      return await generateFullPrd(workshopId);
    }

    // Default: V0 prototype prompt (existing behavior, backward compatible)
    return await generateV0Prompt(workshopId);
  } catch (error) {
    console.error('generate-prd error:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate PRD' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Generate full PRD as both Markdown and JSON, stored in build_packs table.
 * Checks cache first — subsequent calls return stored content without re-invoking Gemini.
 */
async function generateFullPrd(workshopId: string): Promise<Response> {
  // Check cache: look for existing PRD rows (both markdown and json)
  const existingRows = await db
    .select()
    .from(buildPacks)
    .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, 'PRD:%')));

  const cachedMarkdown = existingRows.find((r) => r.formatType === 'markdown' && r.content);
  const cachedJson = existingRows.find((r) => r.formatType === 'json' && r.content);

  if (cachedMarkdown && cachedJson) {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(cachedJson.content!);
    } catch {
      parsedJson = { raw: cachedJson.content };
    }
    return new Response(
      JSON.stringify({
        markdown: cachedMarkdown.content,
        json: parsedJson,
        title: cachedMarkdown.title,
        cached: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Load all 10 step artifacts
  const artifacts = await loadAllWorkshopArtifacts(workshopId);

  // Derive title from concept name
  const concept = artifacts.concept as Record<string, unknown> | null;
  const conceptName = (concept?.name as string) || (concept?.conceptName as string) || 'Product';
  const prdTitle = `PRD: ${conceptName}`;

  // Generate Markdown and JSON in parallel
  const [mdResult, jsonResult] = await Promise.allSettled([
    generateTextWithRetry({
      model: google('gemini-2.0-flash'),
      temperature: 0.3,
      prompt: buildFullPrdPrompt(artifacts),
    }),
    generateTextWithRetry({
      model: google('gemini-2.0-flash'),
      temperature: 0.2,
      prompt: buildFullPrdJsonPrompt(artifacts),
    }),
  ]);

  // Extract results
  const markdownText = mdResult.status === 'fulfilled' ? mdResult.value.text.trim() : null;
  let jsonData: unknown = null;
  let jsonText: string | null = null;

  if (jsonResult.status === 'fulfilled') {
    const rawText = jsonResult.value.text.trim();
    // Strip any markdown fences if present
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    try {
      jsonData = JSON.parse(cleaned);
      jsonText = JSON.stringify(jsonData);
    } catch {
      jsonData = { raw: rawText };
      jsonText = JSON.stringify(jsonData);
    }
  }

  // Record usage events (fire-and-forget)
  if (mdResult.status === 'fulfilled') {
    recordUsageEvent({
      workshopId,
      stepId: 'validate',
      operation: 'generate-full-prd-md',
      model: 'gemini-2.0-flash',
      inputTokens: mdResult.value.usage?.inputTokens,
      outputTokens: mdResult.value.usage?.outputTokens,
    });
  }
  if (jsonResult.status === 'fulfilled') {
    recordUsageEvent({
      workshopId,
      stepId: 'validate',
      operation: 'generate-full-prd-json',
      model: 'gemini-2.0-flash',
      inputTokens: jsonResult.value.usage?.inputTokens,
      outputTokens: jsonResult.value.usage?.outputTokens,
    });
  }

  // Store results in build_packs table (upsert)
  if (markdownText) {
    const existingMd = existingRows.find((r) => r.formatType === 'markdown');
    if (existingMd) {
      await db
        .update(buildPacks)
        .set({ content: markdownText, title: prdTitle })
        .where(eq(buildPacks.id, existingMd.id));
    } else {
      await db.insert(buildPacks).values({
        workshopId,
        title: prdTitle,
        formatType: 'markdown',
        content: markdownText,
      });
    }
  }

  if (jsonText) {
    const existingJsonRow = existingRows.find((r) => r.formatType === 'json');
    if (existingJsonRow) {
      await db
        .update(buildPacks)
        .set({ content: jsonText, title: prdTitle })
        .where(eq(buildPacks.id, existingJsonRow.id));
    } else {
      await db.insert(buildPacks).values({
        workshopId,
        title: prdTitle,
        formatType: 'json',
        content: jsonText,
      });
    }
  }

  // Return response — note partial failures if applicable
  return new Response(
    JSON.stringify({
      markdown: markdownText,
      json: jsonData,
      title: prdTitle,
      cached: false,
      ...(mdResult.status === 'rejected' && { markdownError: 'Failed to generate markdown PRD' }),
      ...(jsonResult.status === 'rejected' && { jsonError: 'Failed to generate JSON PRD' }),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Generate V0 prototype prompt — existing behavior, preserved for backward compatibility.
 */
async function generateV0Prompt(workshopId: string): Promise<Response> {
  // Check for existing build pack (cached result)
  const existing = await db
    .select()
    .from(buildPacks)
    .where(and(eq(buildPacks.workshopId, workshopId), eq(buildPacks.formatType, 'json')))
    .limit(1);

  if (existing.length > 0 && existing[0].content) {
    // Only return as cache if it's a V0 prompt (not a PRD json)
    const cached = JSON.parse(existing[0].content);
    if (cached.prompt && cached.systemPrompt) {
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

  // Record usage (fire-and-forget)
  recordUsageEvent({
    workshopId,
    stepId: 'validate',
    operation: 'generate-prd',
    model: 'gemini-2.0-flash',
    inputTokens: result.usage?.inputTokens,
    outputTokens: result.usage?.outputTokens,
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
}
