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

    // Diagnostic logging
    console.log('[journey-map] concept artifact keys:', Object.keys(conceptArtifact));
    console.log('[journey-map] concept artifact preview:', JSON.stringify(conceptArtifact).slice(0, 300));

    const concepts = extractConcepts(conceptArtifact);
    console.log('[journey-map] extractConcepts returned', concepts.length, 'concepts');
    for (const c of concepts) {
      console.log('[journey-map]   concept keys:', Object.keys(c), 'name:', c.name || c.conceptName || c.title || '(none)');
    }
    const personaArtifact = artifacts.persona as Record<string, unknown> | null;
    const personaName = (personaArtifact?.name as string) || 'the target user';
    const challengeContext = (artifacts.challenge as Record<string, unknown>)?.challenge as string || '';

    // Extract persona name and journey stage names for enhanced intent detection
    const personaNameForDetection = (personaArtifact?.name as string) || (personaArtifact?.role as string) || null;
    const canvasStageNames = buildStagesFromCanvas(journeyCanvasData)?.map((s) => s.name) || [];

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
      console.warn('LLM journey mapping failed, falling back to heuristic:', llmError instanceof Error ? llmError.message : llmError);

      // Build stages from canvas data or detect intent-appropriate defaults
      const detectedIntent = detectStrategicIntent(
        challengeContext,
        concepts as Array<Record<string, unknown>>,
        personaNameForDetection,
        canvasStageNames
      );
      const stages = buildStagesFromCanvas(journeyCanvasData) || getDefaultStagesForIntent(detectedIntent) || DEFAULT_STAGES;
      mappingResult = heuristicMap(concepts, stages, challengeContext, personaArtifact);
    }

    console.log('[journey-map] mapping result: features=%d stages=%d edges=%d', mappingResult.features.length, mappingResult.stages.length, mappingResult.edges.length);

    // Emergency fallback: if both LLM and heuristic produced 0 features, create one per concept
    if (mappingResult.features.length === 0) {
      console.warn('[journey-map] Generation produced 0 features, using emergency fallback');
      const fallbackStageId = mappingResult.stages[0]?.id || DEFAULT_STAGES[0].id;
      if (mappingResult.stages.length === 0) {
        mappingResult.stages = DEFAULT_STAGES;
      }
      for (let ci = 0; ci < concepts.length; ci++) {
        const c = concepts[ci];
        const cName = (c.name as string) || (c.title as string) || (c.conceptName as string) || `Concept ${ci + 1}`;
        const cDesc = (c.description as string) || (c.elevatorPitch as string) || (c.usp as string) || (c.valueProposition as string) || 'Core product feature';
        mappingResult.features.push({
          conceptIndex: ci,
          conceptName: cName,
          featureName: cName,
          featureDescription: cDesc,
          stageId: fallbackStageId,
          uiType: 'detail-view',
          uiPatternSuggestion: `${cName} overview`,
          addressesPain: 'General improvement',
          priority: 'must-have',
          nodeCategory: 'core',
          groupId: 'main',
        });
      }
    }

    // Apply layout positions — propagate nodeCategory and groupId
    // Ensure required fields have defaults (LLM may omit priority, uiType, etc.)
    const nodesWithIds = mappingResult.features.map((f, i) => ({
      id: `jm-node-${i}`,
      ...f,
      stageName: mappingResult.stages.find((s) => s.id === f.stageId)?.name || f.stageId,
      position: { x: 0, y: 0 },
      priority: f.priority || (i < 3 ? 'must-have' as const : i < 7 ? 'should-have' as const : 'nice-to-have' as const),
      uiType: f.uiType || ('detail-view' as const),
      nodeCategory: f.nodeCategory || ('core' as const),
      groupId: f.groupId || 'main',
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
      groups: mappingResult.groups || [],
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
  // 1. concepts[] — standard multi-concept format
  if (Array.isArray(conceptArtifact.concepts) && conceptArtifact.concepts.length > 0) {
    return conceptArtifact.concepts as Array<Record<string, unknown>>;
  }
  // 2. selectedConcepts[] — post-selection format
  if (Array.isArray(conceptArtifact.selectedConcepts) && conceptArtifact.selectedConcepts.length > 0) {
    return conceptArtifact.selectedConcepts as Array<Record<string, unknown>>;
  }
  // 3. cards[] — concept cards format (Step 9 canvas cards at top level)
  if (Array.isArray(conceptArtifact.cards) && conceptArtifact.cards.length > 0) {
    console.log('[journey-map] extractConcepts: found cards[] at top level');
    return mapConceptCards(conceptArtifact.cards as Array<Record<string, unknown>>);
  }
  // 4. _canvas.conceptCards[] — Step 9 canvas artifact shape
  const canvas = conceptArtifact._canvas as Record<string, unknown> | undefined;
  if (canvas && Array.isArray(canvas.conceptCards) && canvas.conceptCards.length > 0) {
    console.log('[journey-map] extractConcepts: found _canvas.conceptCards[]', canvas.conceptCards.length, 'cards');
    return mapConceptCards(canvas.conceptCards as Array<Record<string, unknown>>);
  }
  // 5. concept (singular object)
  if (conceptArtifact.concept && typeof conceptArtifact.concept === 'object' && !Array.isArray(conceptArtifact.concept)) {
    return [conceptArtifact.concept as Record<string, unknown>];
  }
  // 6. Check for any array value that looks like concept objects (has name/title + description)
  for (const key of Object.keys(conceptArtifact)) {
    if (key.startsWith('_')) continue; // skip internal keys like _canvas
    const val = conceptArtifact[key];
    if (Array.isArray(val) && val.length > 0) {
      const first = val[0] as Record<string, unknown>;
      if (typeof first === 'object' && first !== null && (first.name || first.title || first.conceptName)) {
        console.log(`[journey-map] extractConcepts: found concept-like array under key "${key}"`);
        return val as Array<Record<string, unknown>>;
      }
    }
  }
  // 7. Final fallback: wrap entire artifact, but warn
  console.warn('[journey-map] extractConcepts: no recognized concept shape, wrapping entire artifact');
  return [conceptArtifact];
}

/** Map raw concept card objects to a normalized shape with expected field names */
function mapConceptCards(cards: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return cards.map((card) => ({
    ...card,
    name: card.title || card.name || card.conceptName || 'Concept',
    description: card.description || card.summary || '',
    usp: card.usp || card.valueProposition || '',
    elevatorPitch: card.elevatorPitch || card.pitch || card.description || '',
    features: card.features || card.keyFeatures || card.key_features || [],
    strengths: card.strengths || card.swotStrengths || [],
  }));
}
