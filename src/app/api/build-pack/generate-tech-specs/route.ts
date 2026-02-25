/**
 * Generate Tech Specs API
 *
 * POST /api/build-pack/generate-tech-specs
 * Body: { workshopId: string }
 *
 * Generates Technical Specifications from all 10 workshop step artifacts.
 * Stores results as both Markdown and JSON in the build_packs table.
 * Subsequent calls return cached results without re-invoking Gemini.
 */

import { auth } from '@clerk/nextjs/server';
import { google } from '@ai-sdk/google';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { db } from '@/db/client';
import { buildPacks, workshops } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';
import { generateTextWithRetry } from '@/lib/ai/gemini-retry';
import { loadAllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';
import { buildTechSpecsPrompt, buildTechSpecsJsonPrompt } from '@/lib/ai/prompts/tech-specs-generation';

export const maxDuration = 60;

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

    // Check cache: look for existing Tech Specs rows (both markdown and json)
    const existingRows = await db
      .select()
      .from(buildPacks)
      .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, 'Tech Specs:%')));

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
    const techSpecsTitle = `Tech Specs: ${conceptName}`;

    // Generate Markdown and JSON in parallel
    const [mdResult, jsonResult] = await Promise.allSettled([
      generateTextWithRetry({
        model: google('gemini-2.0-flash'),
        temperature: 0.3,
        prompt: buildTechSpecsPrompt(artifacts),
      }),
      generateTextWithRetry({
        model: google('gemini-2.0-flash'),
        temperature: 0.2,
        prompt: buildTechSpecsJsonPrompt(artifacts),
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
        operation: 'generate-tech-specs-md',
        model: 'gemini-2.0-flash',
        inputTokens: mdResult.value.usage?.inputTokens,
        outputTokens: mdResult.value.usage?.outputTokens,
      });
    }
    if (jsonResult.status === 'fulfilled') {
      recordUsageEvent({
        workshopId,
        stepId: 'validate',
        operation: 'generate-tech-specs-json',
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
          .set({ content: markdownText, title: techSpecsTitle })
          .where(eq(buildPacks.id, existingMd.id));
      } else {
        await db.insert(buildPacks).values({
          workshopId,
          title: techSpecsTitle,
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
          .set({ content: jsonText, title: techSpecsTitle })
          .where(eq(buildPacks.id, existingJsonRow.id));
      } else {
        await db.insert(buildPacks).values({
          workshopId,
          title: techSpecsTitle,
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
        title: techSpecsTitle,
        cached: false,
        ...(mdResult.status === 'rejected' && { markdownError: 'Failed to generate markdown Tech Specs' }),
        ...(jsonResult.status === 'rejected' && { jsonError: 'Failed to generate JSON Tech Specs' }),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('generate-tech-specs error:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate Tech Specs' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
