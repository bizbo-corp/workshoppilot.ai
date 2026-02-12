/**
 * Crazy 8s Slot Types
 * Type definitions for Crazy 8s rapid sketching exercise (8 ideas in 8 minutes)
 * Used in Step 8b visual ideation
 */

export interface Crazy8sSlot {
  slotId: string;           // 'slot-1' through 'slot-8'
  title: string;            // User-editable title (empty string = untitled)
  imageUrl?: string;        // PNG URL from Vercel Blob (filled after drawing)
  drawingId?: string;       // Reference to drawing in stepArtifacts.drawings[]
}

/**
 * Empty slots for initializing Crazy 8s grid
 * Creates 8 empty slots numbered 1-8
 */
export const EMPTY_CRAZY_8S_SLOTS: Crazy8sSlot[] = Array.from({ length: 8 }, (_, i) => ({
  slotId: `slot-${i + 1}`,
  title: '',
}));

/**
 * Canvas size for Crazy 8s sketches
 * Square format to avoid aspect ratio distortion issues
 * (Research pitfall #5: maintain 1:1 ratio)
 */
export const CRAZY_8S_CANVAS_SIZE = { width: 800, height: 800 };
