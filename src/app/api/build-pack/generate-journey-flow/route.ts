/**
 * Generate Journey Flow API
 *
 * POST /api/build-pack/generate-journey-flow
 *
 * Hybrid pipeline: Gemini LLM first (via buildJourneyFlowPrompt), heuristic
 * generator fallback (heuristicGenerateFlow). Normalizes output into
 * JourneyFlowNode[] / JourneyFlowEdge[], persists to build_packs under
 * the 'Journey Flow:' prefix, returns state to the client.
 *
 * This is the single entry point the scope chooser and Regenerate button call.
 */

import { auth } from '@clerk/nextjs/server';
import { google } from '@ai-sdk/google';
import { db } from '@/db/client';
import { buildPacks, workshops } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';
import { generateTextWithRetry } from '@/lib/ai/gemini-retry';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { loadAllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';
import { buildJourneyFlowPrompt } from '@/lib/ai/prompts/journey-flow-prompt';
import type { JourneyFlowGenerationResult } from '@/lib/ai/prompts/journey-flow-prompt';
import {
  extractConceptsForFlow,
  detectTwoSided,
  normalizeUiType,
  layoutPositions,
  buildAnnotationNode,
  heuristicGenerateFlow,
} from '@/lib/journey-flow/generator';
import type { JourneyFlowNode, JourneyFlowEdge, JourneyFlowState, FlowArchetype, TestScope } from '@/lib/journey-flow/types';
import { ARCHETYPE_TO_INTENT } from '@/lib/journey-flow/types';
import type { StrategicIntent } from '@/lib/journey-mapper/types';

export const maxDuration = 60;

const VALID_ARCHETYPES = new Set<string>([
  'linear-sequence', 'hub-and-spoke', 'single-page-sections',
  'funnel', 'branching', 'single-screen-tool', 'loop',
]);

const VALID_STRATEGIC_INTENTS = new Set<string>([
  'marketing-site', 'admin-portal', 'dashboard', 'tool', 'web-app',
]);

const VALID_PRIORITIES = new Set<string>(['must-have', 'should-have', 'nice-to-have']);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workshopId, scope, selectedConceptId, force } = body as {
      workshopId?: string;
      scope?: string;
      selectedConceptId?: string;
      force?: boolean;
    };

    // --- Validate body ---
    if (!workshopId) {
      return new Response(
        JSON.stringify({ error: 'workshopId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!scope || !['journey', 'feature'].includes(scope)) {
      return new Response(
        JSON.stringify({ error: 'scope must be "journey" or "feature"' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (scope === 'feature' && !selectedConceptId) {
      return new Response(
        JSON.stringify({ error: 'selectedConceptId is required when scope is "feature"' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const testScope = scope as TestScope;

    // --- Auth + ownership ---
    const { userId } = await auth();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const workshop = await db
      .select({ id: workshops.id, clerkUserId: workshops.clerkUserId, title: workshops.title })
      .from(workshops)
      .where(eq(workshops.id, workshopId))
      .limit(1);

    if (workshop.length === 0 || workshop[0].clerkUserId !== userId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --- Cache check (skip when force=true) ---
    if (!force) {
      const existingRows = await db
        .select()
        .from(buildPacks)
        .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, 'Journey Flow:%')));

      const cached = existingRows.find((r) => r.formatType === 'json' && r.content);
      if (cached) {
        try {
          const parsed = JSON.parse(cached.content!) as JourneyFlowState;
          // Only return cache if it has nodes AND matches the requested scope
          if (parsed.nodes && parsed.nodes.length > 0 && parsed.testScope === testScope) {
            return new Response(
              JSON.stringify({ state: parsed, buildPackId: cached.id, cached: true }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
        } catch {
          // Invalid cache — regenerate
        }
      }
    }

    // --- Load artifacts ---
    const artifacts = await loadAllWorkshopArtifacts(workshopId);

    if (!artifacts.concept) {
      return new Response(
        JSON.stringify({ error: 'Step 9 (Concept) must be completed before generating a baseline flow.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --- Extract inputs ---
    const concepts = extractConceptsForFlow(artifacts.concept as Record<string, unknown>);
    const challengeContext = ((artifacts.challenge as Record<string, unknown>)?.challenge as string) || '';

    const personaArtifact = artifacts.persona as Record<string, unknown> | null;
    const persona = personaArtifact
      ? {
          name: (personaArtifact.name as string) || (personaArtifact.personaName as string) || undefined,
          pains: [
            ...((personaArtifact.pains as string[]) || []),
            ...((personaArtifact.painPoints as string[]) || []),
            ...((personaArtifact.frustrations as string[]) || []),
          ].filter(Boolean).slice(0, 5),
        }
      : null;

    // --- Generation: LLM path, heuristic fallback ---
    let nodes: JourneyFlowNode[] = [];
    let edges: JourneyFlowEdge[] = [];
    let flowArchetype: FlowArchetype = 'linear-sequence';
    let strategicIntent: StrategicIntent = 'web-app';
    let isTwoSided = false;
    let usedLlm = false;

    try {
      // LLM path
      const prompt = buildJourneyFlowPrompt(artifacts, { scope: testScope, selectedConceptName: selectedConceptId });
      const result = await generateTextWithRetry({
        model: google('gemini-2.5-flash-lite'),
        temperature: 0.3,
        prompt,
      });

      recordUsageEvent({
        workshopId,
        stepId: 'validate',
        operation: 'generate-journey-flow',
        model: 'gemini-2.5-flash-lite',
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
      });

      // Strip fences (same chain as generate-journey-map lines 147-151)
      const cleaned = result.text.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      const parsed = JSON.parse(cleaned) as JourneyFlowGenerationResult;

      // Validate archetype
      if (!VALID_ARCHETYPES.has(parsed.flowArchetype)) {
        throw new Error(`Invalid flowArchetype from LLM: ${parsed.flowArchetype}`);
      }
      flowArchetype = parsed.flowArchetype as FlowArchetype;

      // Accept LLM strategicIntent if valid, else derive from archetype
      strategicIntent = VALID_STRATEGIC_INTENTS.has(parsed.strategicIntent)
        ? (parsed.strategicIntent as StrategicIntent)
        : ARCHETYPE_TO_INTENT[flowArchetype];

      // Normalize nodes
      const rawNodes = parsed.nodes.filter((n) => n.name && n.name.trim().length > 0);
      const positions = layoutPositions(flowArchetype, rawNodes.length);

      nodes = rawNodes.map((n, i) => ({
        id: `jf-node-gen-${i}`,
        name: n.name.trim(),
        uiType: normalizeUiType(n.uiType),
        purpose: n.purpose || '',
        keyElements: Array.isArray(n.keyElements)
          ? n.keyElements.filter((el): el is string => typeof el === 'string' && el.trim().length > 0).slice(0, 5)
          : [],
        priority: (n.priority && VALID_PRIORITIES.has(n.priority))
          ? (n.priority as JourneyFlowNode['priority'])
          : i < 3 ? 'must-have' : 'should-have',
        position: positions[i] ?? { x: i * 340, y: 160 },
        ...(n.addressesPain ? { addressesPain: n.addressesPain } : {}),
      }));

      // Feature-mode guard (Pitfall 5): max 4 screen nodes in feature scope
      const screenNodeCount = nodes.length;
      if (testScope === 'feature' && screenNodeCount > 4) {
        throw new Error(`feature scope produced ${screenNodeCount} nodes (max 4); falling back to heuristic`);
      }

      if (nodes.length === 0) {
        throw new Error('LLM produced 0 valid nodes; falling back to heuristic');
      }

      // Normalize edges — keep only edges whose indices land on surviving nodes
      const nodeCount = nodes.length;
      edges = parsed.edges
        .filter((e) => e.sourceIndex >= 0 && e.sourceIndex < nodeCount && e.targetIndex >= 0 && e.targetIndex < nodeCount)
        .map((e, i) => ({
          id: `jf-edge-gen-${i}`,
          sourceNodeId: `jf-node-gen-${e.sourceIndex}`,
          targetNodeId: `jf-node-gen-${e.targetIndex}`,
        }));

      // Two-sided: if LLM says so, append annotation node
      isTwoSided = !!parsed.isTwoSided;
      if (isTwoSided) {
        const riskierSide = parsed.twoSidedNote || 'supply/provider side';
        const annotationNode = buildAnnotationNode(riskierSide);
        // Override purpose with twoSidedNote when provided
        if (parsed.twoSidedNote) {
          annotationNode.purpose = parsed.twoSidedNote;
        }
        nodes = [annotationNode, ...nodes];
      }

      usedLlm = true;
    } catch (llmError) {
      // Heuristic fallback
      console.warn('[generate-journey-flow] LLM path failed, falling back to heuristic:', llmError instanceof Error ? llmError.message : llmError);

      const fallback = heuristicGenerateFlow({
        concepts,
        challengeContext,
        persona,
        scope: testScope,
        selectedConceptName: selectedConceptId,
      });

      nodes = fallback.nodes;
      edges = fallback.edges;
      flowArchetype = fallback.flowArchetype;
      strategicIntent = fallback.strategicIntent;
      isTwoSided = fallback.isTwoSided;
      usedLlm = false;
    }

    // --- Belt-and-braces two-sided check ---
    // If no annotation node present, run keyword heuristic as the floor (GEN-05)
    const hasAnnotation = nodes.some((n) => n.isAnnotation);
    if (!hasAnnotation) {
      const { isTwoSided: detected, riskierSide } = detectTwoSided(challengeContext, concepts);
      if (detected) {
        isTwoSided = true;
        nodes = [buildAnnotationNode(riskierSide), ...nodes];
      }
    }

    // --- Build state (must match save-route content shape) ---
    const state: JourneyFlowState = {
      nodes,
      edges,
      isApproved: false,          // regeneration always resets approval
      isDirty: false,
      lastSavedAt: new Date().toISOString(),
      _schemaVersion: 1,
      flowArchetype,
      strategicIntent,
      isTwoSided,
      testScope,
      selectedConceptId: testScope === 'feature' ? selectedConceptId : undefined,
      lastGeneratedAt: new Date().toISOString(),
    };

    // --- Upsert into build_packs ---
    // CRITICAL: prefix 'Journey Flow:' only — never 'Journey Map:' (that row belongs to the old mapper)
    const existingRows = await db
      .select()
      .from(buildPacks)
      .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, 'Journey Flow:%')));

    const existingJson = existingRows.find((r) => r.formatType === 'json');
    const content = JSON.stringify({
      ...state,
      isDirty: false,
      lastSavedAt: new Date().toISOString(),
      _schemaVersion: 1,
    });

    let buildPackId: string;
    if (existingJson) {
      await db
        .update(buildPacks)
        .set({ content })
        .where(eq(buildPacks.id, existingJson.id));
      buildPackId = existingJson.id;
    } else {
      const [inserted] = await db
        .insert(buildPacks)
        .values({
          workshopId,
          title: `Journey Flow:${workshop[0].title || 'Product'}`,
          formatType: 'json',
          content,
        })
        .returning({ id: buildPacks.id });
      buildPackId = inserted.id;
    }

    return new Response(
      JSON.stringify({ state, buildPackId, cached: false, usedLlm }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[generate-journey-flow] error:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate journey flow' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
