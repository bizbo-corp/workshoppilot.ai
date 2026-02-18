'use server';

import { db } from '@/db/client';
import { stepArtifacts, workshopSteps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PostIt, GridColumn, DrawingNode, MindMapNodeState, MindMapEdgeState } from '@/stores/canvas-store';
import type { Crazy8sSlot } from '@/lib/canvas/crazy-8s-types';
import type { ConceptCardData } from '@/lib/canvas/concept-card-types';
import type { PersonaTemplateData } from '@/lib/canvas/persona-template-types';
import type { HmwCardData } from '@/lib/canvas/hmw-card-types';

/**
 * Save canvas state to stepArtifacts JSONB column under the `_canvas` key.
 * Merges with existing artifact data so AI extraction outputs are preserved.
 *
 * @param workshopId - The workshop ID (wks_xxx)
 * @param stepId - The semantic step ID ('challenge', 'stakeholder-mapping', etc.)
 * @param canvasState - The canvas state
 * @returns Promise with success flag and optional error message
 */
export async function saveCanvasState(
  workshopId: string,
  stepId: string,
  canvasState: {
    postIts: PostIt[];
    gridColumns?: GridColumn[];
    drawingNodes?: DrawingNode[];
    mindMapNodes?: MindMapNodeState[];
    mindMapEdges?: MindMapEdgeState[];
    crazy8sSlots?: Crazy8sSlot[];
    conceptCards?: ConceptCardData[];
    personaTemplates?: PersonaTemplateData[];
    hmwCards?: HmwCardData[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the workshopStep record
    const workshopStepRecords = await db
      .select({
        id: workshopSteps.id,
      })
      .from(workshopSteps)
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, stepId)
        )
      )
      .limit(1);

    if (workshopStepRecords.length === 0) {
      return { success: false, error: 'Workshop step not found' };
    }

    const workshopStepId = workshopStepRecords[0].id;

    // Check for existing artifact — read full artifact to merge
    const existingArtifacts = await db
      .select({
        id: stepArtifacts.id,
        version: stepArtifacts.version,
        artifact: stepArtifacts.artifact,
      })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, workshopStepId))
      .limit(1);

    if (existingArtifacts.length > 0) {
      // Merge canvas state into existing artifact, preserving extraction data.
      // Retry up to 3 times on version conflicts (auto-save and flush-before-send can race).
      const MAX_RETRIES = 3;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        // Re-read on retry to get fresh version
        const record = attempt === 0
          ? existingArtifacts[0]
          : (await db
              .select({ id: stepArtifacts.id, version: stepArtifacts.version, artifact: stepArtifacts.artifact })
              .from(stepArtifacts)
              .where(eq(stepArtifacts.workshopStepId, workshopStepId))
              .limit(1))[0];

        if (!record) return { success: false, error: 'Artifact disappeared during save' };

        const currentVersion = record.version;
        const newVersion = currentVersion + 1;
        const existingArtifact = (record.artifact || {}) as Record<string, unknown>;

        const mergedArtifact = {
          ...existingArtifact,
          _canvas: canvasState,
        };

        const updateResult = await db
          .update(stepArtifacts)
          .set({
            artifact: mergedArtifact,
            version: newVersion,
          })
          .where(
            and(
              eq(stepArtifacts.id, record.id),
              eq(stepArtifacts.version, currentVersion)
            )
          )
          .returning({ id: stepArtifacts.id });

        if (updateResult.length > 0) break; // Success

        // Version conflict — retry with fresh read
        if (attempt === MAX_RETRIES - 1) {
          console.warn('saveCanvasState: version conflict after max retries');
          return { success: false, error: 'version_conflict' };
        }
      }
    } else {
      // Insert new artifact with canvas under _canvas key
      await db.insert(stepArtifacts).values({
        workshopStepId,
        stepId,
        artifact: { _canvas: canvasState },
        schemaVersion: 'canvas-1.0',
        version: 1,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to save canvas state:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Load canvas state from stepArtifacts JSONB column
 *
 * @param workshopId - The workshop ID (wks_xxx)
 * @param stepId - The semantic step ID ('challenge', 'stakeholder-mapping', etc.)
 * @returns Promise with canvas state or null if not found
 */
export async function loadCanvasState(
  workshopId: string,
  stepId: string
): Promise<{
  postIts: PostIt[];
  gridColumns?: GridColumn[];
  drawingNodes?: DrawingNode[];
  mindMapNodes?: MindMapNodeState[];
  mindMapEdges?: MindMapEdgeState[];
  crazy8sSlots?: Crazy8sSlot[];
  conceptCards?: ConceptCardData[];
  personaTemplates?: PersonaTemplateData[];
  hmwCards?: HmwCardData[];
} | null> {
  try {
    // Find the workshopStep record
    const workshopStepRecords = await db
      .select({
        id: workshopSteps.id,
      })
      .from(workshopSteps)
      .where(
        and(
          eq(workshopSteps.workshopId, workshopId),
          eq(workshopSteps.stepId, stepId)
        )
      )
      .limit(1);

    if (workshopStepRecords.length === 0) {
      return null;
    }

    const workshopStepId = workshopStepRecords[0].id;

    // Query stepArtifacts
    const artifactRecords = await db
      .select({
        artifact: stepArtifacts.artifact,
      })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, workshopStepId))
      .limit(1);

    if (artifactRecords.length === 0) {
      return null;
    }

    const artifact = artifactRecords[0].artifact as Record<string, unknown> | null;

    // Read canvas data from the _canvas key (new format)
    if (artifact && typeof artifact === 'object' && '_canvas' in artifact) {
      const canvas = artifact._canvas as {
        postIts?: PostIt[];
        gridColumns?: GridColumn[];
        drawingNodes?: DrawingNode[];
        mindMapNodes?: MindMapNodeState[];
        mindMapEdges?: MindMapEdgeState[];
        crazy8sSlots?: Crazy8sSlot[];
        conceptCards?: ConceptCardData[];
        personaTemplates?: PersonaTemplateData[];
        hmwCards?: HmwCardData[];
      };
      if (canvas?.postIts || canvas?.personaTemplates || canvas?.hmwCards || canvas?.mindMapNodes || canvas?.crazy8sSlots || canvas?.conceptCards) {
        return {
          postIts: canvas.postIts || [],
          ...(canvas.gridColumns ? { gridColumns: canvas.gridColumns } : {}),
          ...(canvas.drawingNodes ? { drawingNodes: canvas.drawingNodes } : {}),
          ...(canvas.mindMapNodes ? { mindMapNodes: canvas.mindMapNodes } : {}),
          ...(canvas.mindMapEdges ? { mindMapEdges: canvas.mindMapEdges } : {}),
          ...(canvas.crazy8sSlots ? { crazy8sSlots: canvas.crazy8sSlots } : {}),
          ...(canvas.conceptCards ? { conceptCards: canvas.conceptCards } : {}),
          ...(canvas.personaTemplates ? { personaTemplates: canvas.personaTemplates } : {}),
          ...(canvas.hmwCards ? { hmwCards: canvas.hmwCards } : {}),
        };
      }
    }

    // Backward compat: if postIts is at the top level (old format before fix),
    // read it but it won't be written back this way
    if (artifact && typeof artifact === 'object' && 'postIts' in artifact) {
      return artifact as { postIts: PostIt[] };
    }

    return null;
  } catch (error) {
    console.error('Failed to load canvas state:', error);
    return null;
  }
}
