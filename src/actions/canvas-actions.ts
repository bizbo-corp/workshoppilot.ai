'use server';

import { db } from '@/db/client';
import { stepArtifacts, workshopSteps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PostIt, GridColumn } from '@/stores/canvas-store';

/**
 * Save canvas state to stepArtifacts JSONB column under the `_canvas` key.
 * Merges with existing artifact data so AI extraction outputs are preserved.
 *
 * @param workshopId - The workshop ID (wks_xxx)
 * @param stepId - The semantic step ID ('challenge', 'stakeholder-mapping', etc.)
 * @param canvasState - The canvas state ({ postIts: PostIt[], gridColumns?: GridColumn[] })
 * @returns Promise with success flag and optional error message
 */
export async function saveCanvasState(
  workshopId: string,
  stepId: string,
  canvasState: { postIts: PostIt[]; gridColumns?: GridColumn[] }
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
      // Merge canvas state into existing artifact, preserving extraction data
      const existing = existingArtifacts[0];
      const currentVersion = existing.version;
      const newVersion = currentVersion + 1;
      const existingArtifact = (existing.artifact || {}) as Record<string, unknown>;

      const mergedArtifact = {
        ...existingArtifact,
        _canvas: canvasState,
      };

      await db
        .update(stepArtifacts)
        .set({
          artifact: mergedArtifact,
          version: newVersion,
        })
        .where(
          and(
            eq(stepArtifacts.id, existing.id),
            eq(stepArtifacts.version, currentVersion)
          )
        );
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
): Promise<{ postIts: PostIt[]; gridColumns?: GridColumn[] } | null> {
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
      const canvas = artifact._canvas as { postIts?: PostIt[]; gridColumns?: GridColumn[] };
      if (canvas?.postIts) {
        return {
          postIts: canvas.postIts,
          ...(canvas.gridColumns ? { gridColumns: canvas.gridColumns } : {}),
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
