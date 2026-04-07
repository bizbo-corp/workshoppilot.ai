import type { AllWorkshopArtifacts } from '@/lib/build-pack/load-workshop-artifacts';
import type { JourneyMapperState } from '@/lib/journey-mapper/types';

/**
 * Build the Gemini prompt for generating a prioritized feature list
 * from journey map nodes and workshop artifacts.
 */
export function buildFeaturePrioritizationPrompt(
  artifacts: AllWorkshopArtifacts,
  journeyMapState: JourneyMapperState
): string {
  // Serialize journey map nodes into a compact form
  const nodesJson = journeyMapState.nodes.map((n) => ({
    id: n.id,
    featureName: n.featureName,
    featureDescription: n.featureDescription,
    conceptName: n.conceptName,
    stageId: n.stageId,
    stageName: n.stageName,
    nodeCategory: n.nodeCategory,
    priority: n.priority,
    uiType: n.uiType,
    groupId: n.groupId,
    features: (n as unknown as Record<string, unknown>).features,
  }));

  return `You are a senior product strategist. Your task is to create a prioritized feature list from the journey map nodes and workshop data below.

<workshop_data>
CHALLENGE: ${JSON.stringify(artifacts.challenge, null, 2)}

PERSONA: ${JSON.stringify(artifacts.persona, null, 2)}

CONCEPT: ${JSON.stringify(artifacts.concept, null, 2)}
</workshop_data>

<journey_map_nodes>
${JSON.stringify(nodesJson, null, 2)}
</journey_map_nodes>

INSTRUCTIONS:
1. Group journey map nodes by their conceptName to create Features
2. For each Feature, break it into actionable Subfeatures derived from:
   - The node's featureDescription and features lists
   - The user journey context (what the user needs at each stage)
   - The persona's goals and pain points
3. Separate features into "core" (from core journey nodes) and "peripheral" (auth, settings, support, etc.)
4. Order features by strategic importance: must-have first, then should-have, then nice-to-have
5. Each feature should have 2-5 subfeatures

Return ONLY valid JSON matching this exact schema — no markdown fences, no commentary:

{
  "features": [
    {
      "id": "feat-0",
      "name": "string — descriptive feature name",
      "description": "string — what this feature does and why it matters",
      "category": "core" or "peripheral",
      "priority": "must-have" or "should-have" or "nice-to-have",
      "conceptName": "string — which concept this belongs to (optional)",
      "journeyNodeIds": ["string — IDs of journey map nodes this feature covers"],
      "subfeatures": [
        {
          "id": "sf-0",
          "name": "string — specific subfeature name",
          "description": "string — what this subfeature does",
          "sourceNodeId": "string — journey map node ID if applicable (optional)"
        }
      ]
    }
  ]
}

RULES:
- Use sequential IDs: feat-0, feat-1, ... and sf-0, sf-1, ... (global counter for subfeatures)
- Core features come first, ordered by priority (must-have → should-have → nice-to-have)
- Peripheral features come after all core features
- Each feature MUST have at least 2 subfeatures
- Derive feature names and descriptions from the actual journey map data, not generic names
- Priority should reflect the persona's needs: features addressing primary pain points are must-have
- Return ONLY valid JSON`;
}
