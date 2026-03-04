/**
 * Generate Journey Map API
 *
 * POST /api/build-pack/generate-journey-map
 *
 * Maps Step 9 concepts onto Step 6 journey stages using Gemini LLM.
 * Falls back to heuristic mapping if LLM fails.
 */

import { auth } from '@clerk/nextjs/server';
import { google } from '@ai-sdk/google';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { db } from '@/db/client';
import { buildPacks, workshops, stepArtifacts, workshopSteps } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';
import { generateTextWithRetry } from '@/lib/ai/gemini-retry';
import { loadAllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';
import { buildJourneyMapperPrompt } from '@/lib/ai/prompts/journey-mapper-prompt';
import { heuristicMap } from '@/lib/journey-mapper/heuristic-mapper';
import { computeJourneyMapLayout } from '@/lib/journey-mapper/layout';
import { detectStrategicIntent, getDefaultStagesForIntent } from '@/lib/journey-mapper/intent-detection';
import { normalizeIntent } from '@/lib/journey-mapper/types';
import type { JourneyMappingResult, JourneyMapperState, JourneyStageColumn } from '@/lib/journey-mapper/types';

export const maxDuration = 60;

const DEFAULT_STAGES: JourneyStageColumn[] = [
  { id: 'awareness', name: 'Awareness', description: 'User discovers the product', emotion: 'neutral', isDip: false, barriers: ['Lack of awareness'], opportunities: ['First impression'] },
  { id: 'consideration', name: 'Consideration', description: 'User evaluates options', emotion: 'neutral', isDip: false, barriers: ['Information overload'], opportunities: ['Clear value proposition'] },
  { id: 'onboarding', name: 'Onboarding', description: 'User starts using the product', emotion: 'negative', isDip: true, barriers: ['Complexity', 'Learning curve'], opportunities: ['Guided setup'] },
  { id: 'active-use', name: 'Active Use', description: 'User engages with core features', emotion: 'positive', isDip: false, barriers: ['Feature discovery'], opportunities: ['Power user features'] },
  { id: 'advocacy', name: 'Advocacy', description: 'User recommends to others', emotion: 'positive', isDip: false, barriers: ['Lack of sharing tools'], opportunities: ['Referral programs'] },
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workshopId, force } = body;

    if (!workshopId) {
      return new Response(
        JSON.stringify({ error: 'workshopId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

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

    // Check cache (unless force regeneration)
    if (!force) {
      const existingRows = await db
        .select()
        .from(buildPacks)
        .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, 'Journey Map:%')));

      const cached = existingRows.find((r) => r.formatType === 'json' && r.content);
      if (cached) {
        try {
          const state = JSON.parse(cached.content!) as JourneyMapperState;
          return new Response(
            JSON.stringify({ state, buildPackId: cached.id, cached: true }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        } catch {
          // Invalid cache, regenerate
        }
      }
    }

    // Load artifacts
    const artifacts = await loadAllWorkshopArtifacts(workshopId);

    if (!artifacts.concept) {
      return new Response(
        JSON.stringify({ error: 'Step 9 (Concept) must be completed before generating a journey map.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load Step 6 canvas data (gridColumns + stickyNotes) directly
    const journeyCanvasData = await loadStep6CanvasData(workshopId);

    // Extract concept data for heuristic fallback
    const conceptArtifact = artifacts.concept as Record<string, unknown>;
    const concepts = extractConcepts(conceptArtifact);
    const personaArtifact = artifacts.persona as Record<string, unknown> | null;
    const personaName = (personaArtifact?.name as string) || 'the target user';
    const challengeContext = (artifacts.challenge as Record<string, unknown>)?.challenge as string || '';

    // Try LLM mapping first
    let mappingResult: JourneyMappingResult;
    let usedLlm = false;

    try {
      const prompt = buildJourneyMapperPrompt(artifacts, journeyCanvasData);
      const result = await generateTextWithRetry({
        model: google('gemini-2.0-flash'),
        temperature: 0.3,
        prompt,
      });

      recordUsageEvent({
        workshopId,
        stepId: 'validate',
        operation: 'generate-journey-map',
        model: 'gemini-2.0-flash',
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
      });

      const cleaned = result.text.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      mappingResult = JSON.parse(cleaned) as JourneyMappingResult;
      usedLlm = true;
    } catch (llmError) {
      console.warn('LLM journey mapping failed, falling back to heuristic:', llmError);

      // Build stages from canvas data or detect intent-appropriate defaults
      const detectedIntent = detectStrategicIntent(challengeContext, concepts as Array<Record<string, unknown>>);
      const stages = buildStagesFromCanvas(journeyCanvasData) || getDefaultStagesForIntent(detectedIntent) || DEFAULT_STAGES;
      mappingResult = heuristicMap(concepts, stages, challengeContext, personaArtifact);
    }

    // Apply layout positions
    const nodesWithIds = mappingResult.features.map((f, i) => ({
      id: `jm-node-${i}`,
      ...f,
      stageName: mappingResult.stages.find((s) => s.id === f.stageId)?.name || f.stageId,
      position: { x: 0, y: 0 },
    }));

    const edgesWithIds = mappingResult.edges.map((e, i) => ({
      id: `jm-edge-${i}`,
      sourceNodeId: `jm-node-${e.sourceFeatureIndex}`,
      targetNodeId: `jm-node-${e.targetFeatureIndex}`,
      label: e.label,
      flowType: e.flowType,
    }));

    const { nodes: positionedNodes } = computeJourneyMapLayout(nodesWithIds, mappingResult.stages);

    // Determine strategic intent (LLM may have set it, otherwise detect) and normalize
    const rawIntent = mappingResult.strategicIntent
      || detectStrategicIntent(challengeContext, concepts as Array<Record<string, unknown>>);
    const strategicIntent = normalizeIntent(rawIntent);

    const state: JourneyMapperState = {
      nodes: positionedNodes,
      edges: edgesWithIds,
      stages: mappingResult.stages,
      challengeContext,
      personaName,
      conceptRelationship: mappingResult.conceptRelationship,
      strategicIntent,
      isApproved: false,
      isDirty: false,
      lastGeneratedAt: new Date().toISOString(),
    };

    // Derive title
    const conceptName = concepts[0]?.name || concepts[0]?.conceptName || 'Product';
    const title = `Journey Map: ${conceptName}`;

    // Upsert into build_packs
    const existingRows = await db
      .select()
      .from(buildPacks)
      .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, 'Journey Map:%')));

    const existingJson = existingRows.find((r) => r.formatType === 'json');
    const content = JSON.stringify(state);

    let buildPackId: string;
    if (existingJson) {
      await db
        .update(buildPacks)
        .set({ content, title })
        .where(eq(buildPacks.id, existingJson.id));
      buildPackId = existingJson.id;
    } else {
      const [inserted] = await db
        .insert(buildPacks)
        .values({ workshopId, title, formatType: 'json', content })
        .returning({ id: buildPacks.id });
      buildPackId = inserted.id;
    }

    return new Response(
      JSON.stringify({ state, buildPackId, cached: false, usedLlm }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('generate-journey-map error:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate journey map' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/** Load Step 6 canvas data (gridColumns + stickyNotes) directly from DB */
async function loadStep6CanvasData(workshopId: string): Promise<{ gridColumns?: unknown[]; stickyNotes?: unknown[] } | undefined> {
  try {
    const rows = await db
      .select({ artifact: stepArtifacts.artifact })
      .from(stepArtifacts)
      .innerJoin(workshopSteps, eq(stepArtifacts.workshopStepId, workshopSteps.id))
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, 'journey-mapping')
        )
      )
      .limit(1);

    if (rows.length === 0) return undefined;

    const artifact = rows[0].artifact as Record<string, unknown>;
    const canvas = artifact?._canvas as Record<string, unknown> | undefined;
    if (!canvas) return undefined;

    return {
      gridColumns: canvas.gridColumns as unknown[] | undefined,
      stickyNotes: canvas.stickyNotes as unknown[] | undefined,
    };
  } catch {
    return undefined;
  }
}

/** Build stage columns from Step 6 canvas gridColumns */
function buildStagesFromCanvas(
  canvasData?: { gridColumns?: unknown[]; stickyNotes?: unknown[] }
): JourneyStageColumn[] | null {
  if (!canvasData?.gridColumns || !Array.isArray(canvasData.gridColumns) || canvasData.gridColumns.length === 0) {
    return null;
  }

  return canvasData.gridColumns.map((col: unknown, i: number) => {
    const c = col as Record<string, unknown>;
    const id = (c.id as string) || `stage-${i}`;
    const name = (c.title as string) || (c.name as string) || `Stage ${i + 1}`;
    const description = (c.description as string) || '';

    // Collect sticky note content for this column to infer barriers/opportunities
    const columnNotes = (canvasData.stickyNotes || []).filter((note: unknown) => {
      const n = note as Record<string, unknown>;
      return n.columnId === id || n.gridColumnId === id;
    });

    const barriers: string[] = [];
    const opportunities: string[] = [];
    for (const note of columnNotes) {
      const n = note as Record<string, unknown>;
      const content = (n.content as string) || (n.text as string) || '';
      const color = (n.color as string) || '';
      if (color.includes('red') || color.includes('pink') || content.toLowerCase().includes('pain')) {
        barriers.push(content);
      } else if (content.trim()) {
        opportunities.push(content);
      }
    }

    return {
      id,
      name,
      description,
      emotion: barriers.length > opportunities.length ? 'negative' as const : 'neutral' as const,
      isDip: barriers.length > opportunities.length,
      barriers: barriers.slice(0, 3),
      opportunities: opportunities.slice(0, 3),
    };
  });
}

/** Extract concept data from the concept artifact (handles single or multiple concepts) */
function extractConcepts(conceptArtifact: Record<string, unknown>): Array<Record<string, unknown>> {
  // Check for concepts array (multiple concepts)
  if (Array.isArray(conceptArtifact.concepts)) {
    return conceptArtifact.concepts as Array<Record<string, unknown>>;
  }
  if (Array.isArray(conceptArtifact.selectedConcepts)) {
    return conceptArtifact.selectedConcepts as Array<Record<string, unknown>>;
  }
  // Single concept — wrap in array
  return [conceptArtifact];
}
