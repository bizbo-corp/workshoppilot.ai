'use server';

import { db } from '@/db/client';
import { stepArtifacts, workshopSteps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Drawing record stored in stepArtifacts.drawings[] array
 * Internal type for server actions only
 */
type Drawing = {
  id: string;
  pngUrl: string;
  vectorJson: string; // JSON.stringify'd DrawingElement[] or VectorData wrapper
  width: number;
  height: number;
  createdAt: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp, set on update
};

/**
 * Save new drawing — PNG already uploaded via /api/upload-drawing-png.
 * Only stores the blob URL + vector JSON in the DB.
 *
 * @param params - Drawing data with pre-uploaded PNG URL and vector JSON
 * @returns Drawing ID and PNG URL, or error
 */
export async function saveDrawing(params: {
  workshopId: string;
  stepId: string;
  pngUrl: string;
  vectorJson: string;
  width: number;
  height: number;
}): Promise<
  | { success: true; drawingId: string; pngUrl: string }
  | { success: false; error: string }
> {
  try {
    const { workshopId, stepId, pngUrl, vectorJson, width, height } = params;

    // Find workshopStep record
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

    // Read existing artifact
    const existingArtifacts = await db
      .select({
        id: stepArtifacts.id,
        version: stepArtifacts.version,
        artifact: stepArtifacts.artifact,
      })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, workshopStepId))
      .limit(1);

    // Create drawing record
    const newDrawing: Drawing = {
      id: crypto.randomUUID(),
      pngUrl,
      vectorJson,
      width,
      height,
      createdAt: new Date().toISOString(),
    };

    if (existingArtifacts.length > 0) {
      // Merge into existing artifact.
      // Retry up to 3 times on version conflicts (saveCanvasState auto-save can race).
      const MAX_RETRIES = 3;
      let saved = false;

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
        const existingArtifact = (record.artifact || {}) as Record<
          string,
          unknown
        >;
        const existingDrawings = (existingArtifact.drawings || []) as Drawing[];

        const mergedArtifact = {
          ...existingArtifact,
          drawings: [...existingDrawings, newDrawing],
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

        if (updateResult.length > 0) {
          saved = true;
          break;
        }

        // Version conflict — retry with fresh read
        if (attempt === MAX_RETRIES - 1) {
          console.warn('saveDrawing: version conflict after max retries');
          return { success: false, error: 'version_conflict' };
        }
      }

      if (!saved) {
        return { success: false, error: 'Failed to save drawing after retries' };
      }
    } else {
      // Insert new artifact
      await db.insert(stepArtifacts).values({
        workshopStepId,
        stepId,
        artifact: { drawings: [newDrawing] },
        schemaVersion: 'drawing-1.0',
        version: 1,
      });
    }

    return {
      success: true,
      drawingId: newDrawing.id,
      pngUrl,
    };
  } catch (error) {
    console.error('Failed to save drawing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Load drawing vector JSON and metadata by ID
 *
 * @param params - Workshop context and drawing ID
 * @returns Drawing data or null if not found
 */
export async function loadDrawing(params: {
  workshopId: string;
  stepId: string;
  drawingId: string;
}): Promise<{
  vectorJson: string;
  width: number;
  height: number;
} | null> {
  try {
    const { workshopId, stepId, drawingId } = params;

    // Find workshopStep record
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
      console.warn('loadDrawing: workshop step not found', { workshopId, stepId });
      return null;
    }

    const workshopStepId = workshopStepRecords[0].id;

    // Read artifact
    const artifactRecords = await db
      .select({
        artifact: stepArtifacts.artifact,
      })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, workshopStepId))
      .limit(1);

    if (artifactRecords.length === 0) {
      console.warn('loadDrawing: no artifact found for step', { workshopStepId });
      return null;
    }

    const artifact = artifactRecords[0].artifact as Record<string, unknown>;
    const drawings = (artifact?.drawings || []) as Drawing[];

    // Find drawing by ID
    const drawing = drawings.find((d) => d.id === drawingId);

    if (!drawing) {
      console.warn('loadDrawing: drawing not found in artifact', { drawingId, availableIds: drawings.map(d => d.id) });
      return null;
    }

    // Only return vectorJson (not pngUrl) to avoid large data URL in server action response
    return {
      vectorJson: drawing.vectorJson,
      width: drawing.width,
      height: drawing.height,
    };
  } catch (error) {
    console.error('Failed to load drawing:', error);
    return null;
  }
}

/**
 * Update existing drawing — PNG already uploaded via /api/upload-drawing-png.
 * Only updates the blob URL + vector JSON in the DB.
 *
 * @param params - Drawing data with pre-uploaded PNG URL and vector JSON
 * @returns New PNG URL or error
 */
export async function updateDrawing(params: {
  workshopId: string;
  stepId: string;
  drawingId: string;
  pngUrl: string;
  vectorJson: string;
  width: number;
  height: number;
}): Promise<
  { success: true; pngUrl: string } | { success: false; error: string }
> {
  try {
    const {
      workshopId,
      stepId,
      drawingId,
      pngUrl,
      vectorJson,
      width,
      height,
    } = params;

    // Find workshopStep record
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

    // Read existing artifact
    const existingArtifacts = await db
      .select({
        id: stepArtifacts.id,
        version: stepArtifacts.version,
        artifact: stepArtifacts.artifact,
      })
      .from(stepArtifacts)
      .where(eq(stepArtifacts.workshopStepId, workshopStepId))
      .limit(1);

    if (existingArtifacts.length === 0) {
      return { success: false, error: 'No artifact found for this step' };
    }

    // Retry up to 3 times on version conflicts (saveCanvasState auto-save can race).
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

      if (!record) return { success: false, error: 'Artifact disappeared during update' };

      const currentVersion = record.version;
      const newVersion = currentVersion + 1;
      const existingArtifact = (record.artifact || {}) as Record<
        string,
        unknown
      >;
      const existingDrawings = (existingArtifact.drawings || []) as Drawing[];

      // Find and update drawing
      const drawingIndex = existingDrawings.findIndex((d) => d.id === drawingId);

      if (drawingIndex === -1) {
        return { success: false, error: 'Drawing not found' };
      }

      const updatedDrawings = [...existingDrawings];
      updatedDrawings[drawingIndex] = {
        ...updatedDrawings[drawingIndex],
        pngUrl,
        vectorJson,
        width,
        height,
        updatedAt: new Date().toISOString(),
      };

      const mergedArtifact = {
        ...existingArtifact,
        drawings: updatedDrawings,
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

      if (updateResult.length > 0) {
        return { success: true, pngUrl };
      }

      // Version conflict — retry with fresh read
      if (attempt === MAX_RETRIES - 1) {
        console.warn('updateDrawing: version conflict after max retries');
        return { success: false, error: 'version_conflict' };
      }
    }

    return { success: false, error: 'Failed to update drawing after retries' };
  } catch (error) {
    console.error('Failed to update drawing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
