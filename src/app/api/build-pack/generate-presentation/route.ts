/**
 * Generate Stakeholder Presentation API
 *
 * POST /api/build-pack/generate-presentation
 * Body: { workshopId, stepImages: Record<string, string>, force?: boolean }
 *
 * Accepts captured canvas images (base64 JPEG) and builds a PPTX with
 * embedded image slides. Text summaries are derived from artifact data.
 * Only the executive summary uses a Gemini call.
 * Returns a .pptx file as binary download.
 */

import { auth } from '@clerk/nextjs/server';
import { google } from '@ai-sdk/google';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { db } from '@/db/client';
import { buildPacks, workshops } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';
import { generateTextWithRetry } from '@/lib/ai/gemini-retry';
import { loadAllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';
import { buildPresentationSummaryPrompt } from '@/lib/ai/prompts/presentation-generation';
import type { PresentationSummary } from '@/lib/ai/prompts/presentation-generation';
import { buildPresentation, generateSummariesFromArtifacts } from '@/lib/build-pack/presentation-builder';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workshopId, stepImages, force } = body as {
      workshopId: string;
      stepImages?: Record<string, string>;
      force?: boolean;
    };

    if (!workshopId) {
      return new Response(
        JSON.stringify({ error: 'workshopId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Auth check
    const { userId } = await auth();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Ownership check
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

    // Load all 10 step artifacts (needed for summaries + exec summary)
    const artifacts = await loadAllWorkshopArtifacts(workshopId);

    // Derive concept name
    const concept = artifacts.concept as Record<string, unknown> | null;
    const concepts = (concept?.concepts as Array<Record<string, unknown>>) || [];
    const primaryConcept = concepts[0] || concept || {};
    const conceptName = (primaryConcept.name as string) || (primaryConcept.conceptName as string) || (concept?.name as string) || 'Product';

    // Generate per-step text summaries from artifacts (no AI needed)
    const summaries = generateSummariesFromArtifacts(artifacts);

    // Check cache for existing exec summary JSON
    const existingRows = await db
      .select()
      .from(buildPacks)
      .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, 'Presentation:%')));

    const cachedJson = existingRows.find((r) => r.formatType === 'json' && r.content);

    // Force regenerate: delete existing cached row
    if (force && cachedJson) {
      await db.delete(buildPacks).where(eq(buildPacks.id, cachedJson.id));
    }

    let summary: PresentationSummary;

    if (cachedJson && !force) {
      // Use cached summary — skip Gemini call
      summary = JSON.parse(cachedJson.content!) as PresentationSummary;
    } else {
      // Generate executive summary via Gemini (small, fast call)
      const result = await generateTextWithRetry({
        model: google('gemini-2.0-flash'),
        temperature: 0.3,
        prompt: buildPresentationSummaryPrompt(artifacts),
      });

      // Record usage (fire-and-forget)
      recordUsageEvent({
        workshopId,
        stepId: 'validate',
        operation: 'generate-presentation',
        model: 'gemini-2.0-flash',
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
      });

      // Parse JSON response
      const rawText = result.text.trim();
      const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      try {
        summary = JSON.parse(cleaned) as PresentationSummary;
      } catch {
        // Fallback: derive summary from artifacts directly
        const challenge = artifacts.challenge as Record<string, unknown> | null;
        summary = {
          executiveSummary: `${challenge?.problemStatement || 'A design thinking workshop'} has been explored and validated through a structured 10-step process, resulting in ${conceptName}.`,
          subtitle: (primaryConcept.elevatorPitch as string)?.slice(0, 80) || 'Stakeholder Presentation',
        };
      }

      // Cache summary in build_packs table
      const presentationTitle = `Presentation: ${conceptName}`;
      const jsonContent = JSON.stringify(summary);

      await db.insert(buildPacks).values({
        workshopId,
        title: presentationTitle,
        formatType: 'json',
        content: jsonContent,
      });
    }

    // Build PPTX with captured images + summaries
    const pptxBuffer = await buildPresentation(
      stepImages || {},
      summaries,
      conceptName,
      summary,
    );

    // Sanitize filename
    const safeConceptName = conceptName.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
    const filename = `${safeConceptName}-Stakeholder-Presentation.pptx`;

    return new Response(new Uint8Array(pptxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('generate-presentation error:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate presentation' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
