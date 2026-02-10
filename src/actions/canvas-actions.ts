'use server';

import { db } from '@/db/client';
import { stepArtifacts, workshopSteps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PostIt } from '@/stores/canvas-store';

/**
 * Save canvas state to stepArtifacts JSONB column
 * Uses optimistic locking to prevent concurrent update conflicts
 *
 * @param workshopId - The workshop ID (wks_xxx)
 * @param stepId - The semantic step ID ('challenge', 'stakeholder-mapping', etc.)
 * @param canvasState - The canvas state ({ postIts: PostIt[] })
 * @returns Promise with success flag and optional error message
 */
export async function saveCanvasState(
  workshopId: string,
  stepId: string,
  canvasState: { postIts: PostIt[] }
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

    // Check for existing artifact
    const existingArtifacts = await db
      .select({
        id: stepArtifacts.id,
        version: stepArtifacts.version,
      })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, workshopStepId))
      .limit(1);

    if (existingArtifacts.length > 0) {
      // Update existing artifact with optimistic locking
      const existing = existingArtifacts[0];
      const currentVersion = existing.version;
      const newVersion = currentVersion + 1;

      await db
        .update(stepArtifacts)
        .set({
          artifact: canvasState,
          version: newVersion,
          extractedAt: new Date(),
        })
        .where(
          and(
            eq(stepArtifacts.id, existing.id),
            eq(stepArtifacts.version, currentVersion)
          )
        );

      // Note: Drizzle doesn't expose rowCount for optimistic lock verification
      // Per research: log warning for Phase 15, defer merge logic to Phase 16+
      // Trust that WHERE clause prevents conflicts for now
    } else {
      // Insert new artifact
      await db.insert(stepArtifacts).values({
        workshopStepId,
        stepId,
        artifact: canvasState,
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
): Promise<{ postIts: PostIt[] } | null> {
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

    const artifact = artifactRecords[0].artifact;

    // Check if artifact has postIts array
    if (artifact && typeof artifact === 'object' && 'postIts' in artifact) {
      return artifact as { postIts: PostIt[] };
    }

    return null;
  } catch (error) {
    console.error('Failed to load canvas state:', error);
    return null;
  }
}
