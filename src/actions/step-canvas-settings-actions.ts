'use server';

import { db } from '@/db/client';
import { stepCanvasSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { StepCanvasSettingsData } from '@/lib/canvas/step-canvas-settings-types';

/**
 * Load default canvas viewport settings for a step.
 */
export async function loadStepCanvasSettings(
  stepId: string
): Promise<StepCanvasSettingsData | null> {
  const [row] = await db
    .select()
    .from(stepCanvasSettings)
    .where(eq(stepCanvasSettings.stepId, stepId))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    stepId: row.stepId,
    defaultZoom: row.defaultZoom,
    defaultX: row.defaultX,
    defaultY: row.defaultY,
    viewportMode: row.viewportMode,
  };
}

/**
 * Create or update default canvas viewport settings for a step (admin only).
 */
export async function upsertStepCanvasSettings(
  data: Omit<StepCanvasSettingsData, 'id'> & { id?: string }
): Promise<StepCanvasSettingsData> {
  // Check if settings already exist for this step
  const [existing] = await db
    .select()
    .from(stepCanvasSettings)
    .where(eq(stepCanvasSettings.stepId, data.stepId))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(stepCanvasSettings)
      .set({
        defaultZoom: data.defaultZoom,
        defaultX: data.defaultX,
        defaultY: data.defaultY,
        viewportMode: data.viewportMode,
      })
      .where(eq(stepCanvasSettings.id, existing.id))
      .returning();

    return {
      id: updated.id,
      stepId: updated.stepId,
      defaultZoom: updated.defaultZoom,
      defaultX: updated.defaultX,
      defaultY: updated.defaultY,
      viewportMode: updated.viewportMode,
    };
  }

  const [created] = await db
    .insert(stepCanvasSettings)
    .values({
      stepId: data.stepId,
      defaultZoom: data.defaultZoom,
      defaultX: data.defaultX,
      defaultY: data.defaultY,
      viewportMode: data.viewportMode,
    })
    .returning();

  return {
    id: created.id,
    stepId: created.stepId,
    defaultZoom: created.defaultZoom,
    defaultX: created.defaultX,
    defaultY: created.defaultY,
    viewportMode: created.viewportMode,
  };
}
