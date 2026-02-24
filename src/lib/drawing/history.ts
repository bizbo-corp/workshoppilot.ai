/**
 * Drawing history manager for undo/redo functionality
 *
 * Maintains a stack of drawing snapshots with a 50-step limit.
 * Each snapshot includes elements and optional background image.
 * Uses structuredClone() for deep cloning to prevent reference issues.
 */

import type { DrawingElement } from './types';

export type DrawingSnapshot = {
  elements: DrawingElement[];
  backgroundImageUrl: string | null;
};

export class DrawingHistory {
  private history: DrawingSnapshot[] = [];
  private currentStep = -1;
  private readonly maxSteps = 50;

  /**
   * Push a new snapshot to the history stack
   * Truncates any future history if user has undone and then makes a new change
   */
  push(snapshot: DrawingSnapshot): void {
    // Remove any future history after current step
    this.history = this.history.slice(0, this.currentStep + 1);

    // Deep clone elements, keep backgroundImageUrl as-is (string is immutable)
    const cloned: DrawingSnapshot = {
      elements: structuredClone(snapshot.elements),
      backgroundImageUrl: snapshot.backgroundImageUrl,
    };
    this.history.push(cloned);

    // Enforce max steps limit (keep most recent)
    if (this.history.length > this.maxSteps) {
      this.history.shift();
    } else {
      this.currentStep++;
    }
  }

  /**
   * Undo to previous snapshot
   * Returns the snapshot or null if at the start
   */
  undo(): DrawingSnapshot | null {
    if (!this.canUndo) {
      return null;
    }

    this.currentStep--;
    const snap = this.history[this.currentStep];
    return {
      elements: structuredClone(snap.elements),
      backgroundImageUrl: snap.backgroundImageUrl,
    };
  }

  /**
   * Redo to next snapshot
   * Returns the snapshot or null if at the end
   */
  redo(): DrawingSnapshot | null {
    if (!this.canRedo) {
      return null;
    }

    this.currentStep++;
    const snap = this.history[this.currentStep];
    return {
      elements: structuredClone(snap.elements),
      backgroundImageUrl: snap.backgroundImageUrl,
    };
  }

  /**
   * Check if undo is available
   */
  get canUndo(): boolean {
    return this.currentStep > 0;
  }

  /**
   * Check if redo is available
   */
  get canRedo(): boolean {
    return this.currentStep < this.history.length - 1;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.currentStep = -1;
  }

  /**
   * Get current history length (useful for debugging)
   */
  get length(): number {
    return this.history.length;
  }
}
