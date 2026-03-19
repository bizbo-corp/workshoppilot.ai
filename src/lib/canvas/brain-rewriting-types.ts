/**
 * Brain Rewriting Types
 * Type definitions for Brain Rewriting exercise (iterate on selected Crazy 8s sketches)
 * Used in Step 8d visual ideation — 2x2 grid per selected concept
 */

export type BrainRewritingCellId = 'top-right' | 'bottom-left' | 'bottom-right';

export interface BrainRewritingCell {
  cellId: BrainRewritingCellId;
  imageUrl?: string;      // PNG from Vercel Blob
  drawingId?: string;     // Reference into stepArtifacts.drawings[]
  title?: string;         // Sketch title (same as Crazy 8s slots)
  description?: string;   // Brief description
  sketchPrompt?: string;  // AI-woven concept prompt for Generate Sketch
}

export interface BrainRewritingMatrix {
  slotId: string;              // Source Crazy 8s slot ('slot-1', etc.) — or first slot of a group
  sourceImageUrl?: string;     // Read-only copy of original sketch (or merged group image)
  sourceDescription?: string;  // Carried forward from original Crazy 8s slot
  sourceSketchPrompt?: string; // Carried forward from original Crazy 8s slot
  cells: BrainRewritingCell[]; // Always 3 cells
  includedInConcepts?: boolean; // Whether to carry forward into concept development (default true)
  groupId?: string;            // When set, this matrix represents a merged group (not an individual slot)
}

export const BRAIN_REWRITING_CELL_ORDER: BrainRewritingCellId[] = [
  'top-right',
  'bottom-left',
  'bottom-right',
];

/**
 * Canvas size for Brain Rewriting sketches
 * Slightly smaller than Crazy 8s since they're in a 2x2 grid
 */
export const BRAIN_REWRITING_CANVAS_SIZE = { width: 600, height: 450 };

/**
 * Create an empty brain rewriting matrix for a selected Crazy 8s slot
 */
export function createEmptyMatrix(slotId: string, sourceImageUrl?: string): BrainRewritingMatrix {
  return {
    slotId,
    sourceImageUrl,
    cells: BRAIN_REWRITING_CELL_ORDER.map((cellId) => ({ cellId })),
    includedInConcepts: true,
  };
}
