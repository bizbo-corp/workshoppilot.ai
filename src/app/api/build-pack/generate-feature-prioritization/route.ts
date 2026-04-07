/**
 * Generate Feature Prioritization API
 *
 * POST /api/build-pack/generate-feature-prioritization
 *
 * Derives a prioritized feature list from the journey map nodes and workshop artifacts.
 * Falls back to heuristic grouping if LLM fails.
 */

import { auth } from '@clerk/nextjs/server';
import { google } from '@ai-sdk/google';
import { recordUsageEvent } from '@/lib/ai/usage-tracking';
import { db } from '@/db/client';
import { buildPacks, workshops } from '@/db/schema';
import { eq, and, like } from 'drizzle-orm';
import { generateTextWithRetry } from '@/lib/ai/gemini-retry';
import { loadAllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';
import { buildFeaturePrioritizationPrompt } from '@/lib/ai/prompts/feature-prioritization-prompt';
import type { JourneyMapperState } from '@/lib/journey-mapper/types';
import type { Feature, FeaturePrioritizationState } from '@/lib/feature-prioritization/types';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workshopId, force } = body;

    if (!workshopId) {
      return Response.json({ error: 'workshopId is required' }, { status: 400 });
    }

    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workshop = await db
      .select({ id: workshops.id, clerkUserId: workshops.clerkUserId })
      .from(workshops)
      .where(eq(workshops.id, workshopId))
      .limit(1);

    if (workshop.length === 0 || workshop[0].clerkUserId !== userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check cache (unless force regeneration)
    if (!force) {
      const existingRows = await db
        .select()
        .from(buildPacks)
        .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, 'Feature Prioritization:%')));

      const cached = existingRows.find((r) => r.formatType === 'json' && r.content);
      if (cached) {
        try {
          const state = JSON.parse(cached.content!) as FeaturePrioritizationState;
          return Response.json({ state, buildPackId: cached.id, cached: true });
        } catch {
          // Invalid cache, regenerate
        }
      }
    }

    // Load journey map from buildPacks
    const journeyRows = await db
      .select()
      .from(buildPacks)
      .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, 'Journey Map:%')));

    const journeyJsonRow = journeyRows.find((r) => r.formatType === 'json' && r.content);
    if (!journeyJsonRow) {
      return Response.json(
        { error: 'Journey Map must be generated before Feature Prioritization.' },
        { status: 400 }
      );
    }

    let journeyMapState: JourneyMapperState;
    try {
      journeyMapState = JSON.parse(journeyJsonRow.content!) as JourneyMapperState;
    } catch {
      return Response.json({ error: 'Invalid journey map data.' }, { status: 400 });
    }

    // Load artifacts
    const artifacts = await loadAllWorkshopArtifacts(workshopId);

    const personaArtifact = artifacts.persona as Record<string, unknown> | null;
    const personaName = (personaArtifact?.name as string) || 'the target user';
    const challengeContext = (artifacts.challenge as Record<string, unknown>)?.challenge as string || '';
    const conceptArtifact = artifacts.concept as Record<string, unknown> | null;
    const workshopTitle = (conceptArtifact?.name as string) || (conceptArtifact?.conceptName as string) || 'Product';

    // Try LLM generation
    let features: Feature[];

    try {
      const prompt = buildFeaturePrioritizationPrompt(artifacts, journeyMapState);
      const result = await generateTextWithRetry({
        model: google('gemini-2.0-flash'),
        temperature: 0.3,
        prompt,
      });

      recordUsageEvent({
        workshopId,
        stepId: 'validate',
        operation: 'generate-feature-prioritization',
        model: 'gemini-2.0-flash',
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
      });

      const cleaned = result.text.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      const parsed = JSON.parse(cleaned) as { features: Feature[] };
      features = parsed.features;
    } catch (llmError) {
      console.warn('LLM feature prioritization failed, falling back to heuristic:', llmError instanceof Error ? llmError.message : llmError);
      features = heuristicFeatureExtraction(journeyMapState);
    }

    // Ensure features have valid IDs
    features = features.map((f, i) => ({
      ...f,
      id: f.id || `feat-${i}`,
      subfeatures: (f.subfeatures || []).map((sf, j) => ({
        ...sf,
        id: sf.id || `sf-${i}-${j}`,
      })),
    }));

    const state: FeaturePrioritizationState = {
      features,
      workshopTitle,
      personaName,
      challengeContext,
      generatedAt: new Date().toISOString(),
      isDirty: false,
      _schemaVersion: 1,
    };

    // Upsert into build_packs
    const title = `Feature Prioritization:${workshopTitle}`;
    const existingRows = await db
      .select()
      .from(buildPacks)
      .where(and(eq(buildPacks.workshopId, workshopId), like(buildPacks.title, 'Feature Prioritization:%')));

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

    return Response.json({ state, buildPackId, cached: false });
  } catch (error) {
    console.error('generate-feature-prioritization error:', error instanceof Error ? error.message : error);
    return Response.json({ error: 'Failed to generate feature prioritization' }, { status: 500 });
  }
}

/**
 * Heuristic fallback: group journey map nodes by conceptName (core) + peripheral nodes
 */
function heuristicFeatureExtraction(journeyMapState: JourneyMapperState): Feature[] {
  const features: Feature[] = [];
  const conceptGroups = new Map<string, typeof journeyMapState.nodes>();

  // Group core nodes by conceptName
  for (const node of journeyMapState.nodes) {
    const category = node.nodeCategory || 'core';
    const groupKey = category === 'peripheral'
      ? `__peripheral__${node.featureName}`
      : (node.conceptName || node.featureName || 'Unknown');

    if (!conceptGroups.has(groupKey)) {
      conceptGroups.set(groupKey, []);
    }
    conceptGroups.get(groupKey)!.push(node);
  }

  let featIdx = 0;
  let sfIdx = 0;

  for (const [groupKey, nodes] of conceptGroups) {
    const isPeripheral = groupKey.startsWith('__peripheral__');
    const primaryNode = nodes[0];

    const subfeatures = nodes.map((n) => ({
      id: `sf-${sfIdx++}`,
      name: n.featureName || 'Feature',
      description: n.featureDescription || '',
      sourceNodeId: n.id,
    }));

    features.push({
      id: `feat-${featIdx++}`,
      name: isPeripheral ? primaryNode.featureName : groupKey,
      description: primaryNode.featureDescription || '',
      category: isPeripheral ? 'peripheral' : 'core',
      priority: primaryNode.priority || 'should-have',
      conceptName: isPeripheral ? undefined : (primaryNode.conceptName || undefined),
      journeyNodeIds: nodes.map((n) => n.id),
      subfeatures,
    });
  }

  // Sort: core first (must-have → should-have → nice-to-have), then peripheral
  const priorityOrder = { 'must-have': 0, 'should-have': 1, 'nice-to-have': 2 };
  features.sort((a, b) => {
    if (a.category !== b.category) return a.category === 'core' ? -1 : 1;
    return (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
  });

  return features;
}
