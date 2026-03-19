/**
 * Brain Rewriting Types
 * Type definitions for Brain Rewriting exercise (iterate on selected Crazy 8s sketches)
 * Used in Step 8d visual ideation — dynamic grid per selected concept
 * Slot count matches participant count (solo: original + 1 iteration)
 */

export type BrainRewritingCellId = string;

export interface BrainRewritingCell {
  cellId: BrainRewritingCellId;
  imageUrl?: string;      // PNG from Vercel Blob
  drawingId?: string;     // Reference into stepArtifacts.drawings[]
  title?: string;         // Sketch title (same as Crazy 8s slots)
  description?: string;   // Brief description
  sketchPrompt?: string;  // AI-woven concept prompt for Generate Sketch
  assigneeName?: string;  // Participant name for this iteration cell
  assigneeId?: string;    // Participant ID for this iteration cell
}

export interface BrainRewritingMatrix {
  slotId: string;              // Source Crazy 8s slot ('slot-1', etc.) — or first slot of a group
  sourceImageUrl?: string;     // Read-only copy of original sketch (or merged group image)
  sourceDescription?: string;  // Carried forward from original Crazy 8s slot
  sourceSketchPrompt?: string; // Carried forward from original Crazy 8s slot
  cells: BrainRewritingCell[]; // Dynamic count based on participants (solo: 1, multiplayer: participants.length - 1)
  includedInConcepts?: boolean; // Whether to carry forward into concept development (default true)
  groupId?: string;            // When set, this matrix represents a merged group (not an individual slot)
  creatorName?: string;        // Name of the participant who created the original sketch
  creatorId?: string;          // ID of the participant who created the original sketch
}

/**
 * Canvas size for Brain Rewriting sketches
 * Slightly smaller than Crazy 8s since they're in a 2x2 grid
 */
export const BRAIN_REWRITING_CANVAS_SIZE = { width: 600, height: 450 };

export interface BrainRewritingParticipant {
  id: string;
  name: string;
}

/**
 * Create an empty brain rewriting matrix for a selected Crazy 8s slot.
 * @param slotId - The source Crazy 8s slot ID
 * @param sourceImageUrl - The original sketch image URL
 * @param participants - Optional array of participants (excluding creator). When provided,
 *   creates one cell per participant with assignee info. When absent (solo), creates 1 cell.
 */
export function createEmptyMatrix(
  slotId: string,
  sourceImageUrl?: string,
  participants?: BrainRewritingParticipant[],
): BrainRewritingMatrix {
  const cells: BrainRewritingCell[] =
    participants && participants.length > 0
      ? participants.map((p, i) => ({
          cellId: `iteration-${i + 1}`,
          assigneeName: p.name,
          assigneeId: p.id,
        }))
      : [{ cellId: 'iteration-1' }]; // Solo: 1 iteration cell ("Your Iteration")

  return {
    slotId,
    sourceImageUrl,
    cells,
    includedInConcepts: true,
  };
}
