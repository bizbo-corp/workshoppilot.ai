'use server';

import { db } from '@/db/client';
import { stepArtifacts, workshopSteps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { put } from '@vercel/blob';

/**
 * Drawing record stored in stepArtifacts.drawings[] array
 * Internal type for server actions only
 */
type Drawing = {
  id: string;
  pngUrl: string;
  vectorJson: string; // JSON.stringify'd DrawingElement[]
  width: number;
  height: number;
  createdAt: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp, set on update
};

/**
 * Save new drawing with PNG upload and vector JSON storage
 *
 * @param params - Drawing data including workshop context, PNG base64, and vector JSON
 * @returns Drawing ID and PNG URL, or error
 */
export async function saveDrawing(params: {
  workshopId: string;
  stepId: string;
  pngBase64: string;
  vectorJson: string;
  width: number;
  height: number;
}): Promise<
  | { success: true; drawingId: string; pngUrl: string }
  | { success: false; error: string }
> {
  try {
    const { workshopId, stepId, pngBase64, vectorJson, width, height } = params;

    // Upload PNG to Vercel Blob (or fall back to data URL for local dev)
    let url: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const base64Data = pngBase64.split(',')[1];
      if (!base64Data) {
        return { success: false, error: 'Invalid base64 data URL format' };
      }
      const buffer = Buffer.from(base64Data, 'base64');

      const blob = await put(
        `drawings/${workshopId}/${Date.now()}.png`,
        buffer,
        {
          access: 'public',
          addRandomSuffix: true,
        }
      );
      url = blob.url;
    } else {
      // Fallback: store data URL directly (works for dev, not recommended for production)
      console.warn('BLOB_READ_WRITE_TOKEN not set — storing drawing as data URL. Set token in .env.local for Vercel Blob storage.');
      url = pngBase64;
    }

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
      pngUrl: url,
      vectorJson,
      width,
      height,
      createdAt: new Date().toISOString(),
    };

    if (existingArtifacts.length > 0) {
      // Merge into existing artifact
      const existing = existingArtifacts[0];
      const currentVersion = existing.version;
      const newVersion = currentVersion + 1;
      const existingArtifact = (existing.artifact || {}) as Record<
        string,
        unknown
      >;
      const existingDrawings = (existingArtifact.drawings || []) as Drawing[];

      const mergedArtifact = {
        ...existingArtifact,
        drawings: [...existingDrawings, newDrawing],
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
      pngUrl: url,
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
 * Update existing drawing with new PNG and vector data
 *
 * @param params - Drawing data including new PNG base64 and vector JSON
 * @returns New PNG URL or error
 */
export async function updateDrawing(params: {
  workshopId: string;
  stepId: string;
  drawingId: string;
  pngBase64: string;
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
      pngBase64,
      vectorJson,
      width,
      height,
    } = params;

    // Upload PNG to Vercel Blob (or fall back to data URL for local dev)
    let url: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const base64Data = pngBase64.split(',')[1];
      if (!base64Data) {
        return { success: false, error: 'Invalid base64 data URL format' };
      }
      const buffer = Buffer.from(base64Data, 'base64');

      const blob = await put(
        `drawings/${workshopId}/${Date.now()}.png`,
        buffer,
        {
          access: 'public',
          addRandomSuffix: true,
        }
      );
      url = blob.url;
    } else {
      console.warn('BLOB_READ_WRITE_TOKEN not set — storing drawing as data URL.');
      url = pngBase64;
    }

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

    const existing = existingArtifacts[0];
    const currentVersion = existing.version;
    const newVersion = currentVersion + 1;
    const existingArtifact = (existing.artifact || {}) as Record<
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
      pngUrl: url,
      vectorJson,
      width,
      height,
      updatedAt: new Date().toISOString(),
    };

    const mergedArtifact = {
      ...existingArtifact,
      drawings: updatedDrawings,
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

    return {
      success: true,
      pngUrl: url,
    };
  } catch (error) {
    console.error('Failed to update drawing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
