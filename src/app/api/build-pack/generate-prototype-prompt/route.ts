/**
 * Generate Prototype Prompt API
 *
 * POST /api/build-pack/generate-prototype-prompt
 *
 * Reads the saved Journey Flow row, generates a low-fi prototype prompt via
 * Gemini (with deterministic fallback), prepends the mandatory wireframe
 * preamble, and persists the result to build_packs under 'Prototype Prompt:'.
 *
 * Owner-only route — participants are read-only and never call this.
 * Always regenerates fresh; no cache check (locked decision: regenerate overwrites).
 */

import { auth } from '@clerk/nextjs/server';
import { google } from '@ai-sdk/google';
import { db } from '@/db/client';
import { buildPacks, workshops } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';
import { generateTextWithRetry } from '@/lib/ai/gemini-retry';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { loadValidationBrief } from '@/lib/validation/llm-context';
import { parseScreensFromFlow } from '@/lib/journey-flow/prompt-builder';
import type { JourneyFlowState, TestScope } from '@/lib/journey-flow/types';
import {
  buildLowFiGeminiPrompt,
  assembleLowFiPrompt,
  buildFallbackBody,
} from '@/lib/ai/prompts/low-fi-prototype-prompt';
import type { StoredPrototypePrompt } from '@/lib/ai/prompts/low-fi-prototype-prompt';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // --- Parse body ---
    const body = await req.json();
    const { workshopId } = body as { workshopId?: string };

    if (!workshopId) {
      return new Response(
        JSON.stringify({ error: 'workshopId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --- Auth ---
    const { userId } = await auth();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --- Workshop ownership check ---
    const workshopRows = await db
      .select({ id: workshops.id, clerkUserId: workshops.clerkUserId, title: workshops.title })
      .from(workshops)
      .where(eq(workshops.id, workshopId))
      .limit(1);

    if (workshopRows.length === 0 || workshopRows[0].clerkUserId !== userId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const workshop = workshopRows[0];

    // --- Load Journey Flow row ---
    const flowRows = await db
      .select()
      .from(buildPacks)
      .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, 'Journey Flow:%')));

    const flowRow = flowRows.find((r) => r.formatType === 'json' && r.content);

    if (!flowRow) {
      return new Response(
        JSON.stringify({ error: 'Journey Flow not found. Build and save your Journey Flow first.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let parsed: JourneyFlowState;
    try {
      parsed = JSON.parse(flowRow.content!) as JourneyFlowState;
    } catch {
      return new Response(
        JSON.stringify({ error: 'Journey Flow not found. Build and save your Journey Flow first.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!parsed.nodes || parsed.nodes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Journey Flow not found. Build and save your Journey Flow first.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --- Capture staleness timestamp ---
    const journeyFlowUpdatedAt = flowRow.updatedAt.toISOString();

    // --- Parse screens + nav (annotation nodes excluded) ---
    const { screens, nav } = parseScreensFromFlow(parsed.nodes, parsed.edges ?? []);

    if (screens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Journey Flow contains no screen nodes. Add screens to your Journey Flow and save before generating a prototype prompt.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --- Load workshop brief ---
    const brief = await loadValidationBrief(workshopId);

    // --- Determine scope ---
    const testScope: TestScope = parsed.testScope ?? 'journey';
    const selectedConceptId = testScope === 'feature' ? parsed.selectedConceptId : undefined;

    // --- Gemini generation with deterministic fallback ---
    let body2: string;
    let usedLlm = false;

    try {
      const metaPrompt = buildLowFiGeminiPrompt({
        brief: brief.brief,
        screens,
        nav,
        testScope,
        conceptName: selectedConceptId ?? brief.conceptName,
      });

      const result = await generateTextWithRetry({
        model: google('gemini-2.5-flash-lite'),
        temperature: 0.4,
        prompt: metaPrompt,
      });

      recordUsageEvent({
        workshopId,
        stepId: 'validate',
        operation: 'generate-prototype-prompt',
        model: 'gemini-2.5-flash-lite',
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
      });

      // Strip markdown fences (same chain as generate-journey-flow lines 182–186)
      const stripped = result.text.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      if (stripped.length < 100) {
        throw new Error('LLM output too short after stripping fences; falling back to deterministic');
      }

      body2 = stripped;
      usedLlm = true;
    } catch (llmError) {
      console.warn(
        '[generate-prototype-prompt] LLM failed, using deterministic fallback:',
        llmError instanceof Error ? llmError.message : llmError
      );
      body2 = buildFallbackBody({ brief: brief.brief, screens, nav });
    }

    // --- Assemble final prompt (preamble always prepended) ---
    const promptText = assembleLowFiPrompt(body2, { testScope });

    // --- Build stored content ---
    const storedContent: StoredPrototypePrompt = {
      promptText,
      generatedFromFlowUpdatedAt: journeyFlowUpdatedAt,
      testScope,
      ...(selectedConceptId ? { selectedConceptId } : {}),
      generatedAt: new Date().toISOString(),
    };

    // --- Upsert into build_packs ---
    const protoTitle = `Prototype Prompt:${workshop.title || 'Product'}`;

    const existingProtoRows = await db
      .select()
      .from(buildPacks)
      .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, 'Prototype Prompt:%')));

    const existingJson = existingProtoRows.find((r) => r.formatType === 'json');
    const contentStr = JSON.stringify(storedContent);

    let buildPackId: string;

    if (existingJson) {
      await db
        .update(buildPacks)
        .set({ content: contentStr })
        .where(eq(buildPacks.id, existingJson.id));
      buildPackId = existingJson.id;
    } else {
      const [inserted] = await db
        .insert(buildPacks)
        .values({
          workshopId,
          title: protoTitle,
          formatType: 'json',
          content: contentStr,
        })
        .returning({ id: buildPacks.id });
      buildPackId = inserted.id;
    }

    return new Response(
      JSON.stringify({
        promptText,
        buildPackId,
        generatedFromFlowUpdatedAt: journeyFlowUpdatedAt,
        testScope,
        selectedConceptId,
        usedLlm,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(
      '[generate-prototype-prompt] error:',
      error instanceof Error ? error.message : error
    );
    return new Response(
      JSON.stringify({ error: 'Failed to generate prototype prompt' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
