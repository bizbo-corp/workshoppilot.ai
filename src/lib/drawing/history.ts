/**
 * Drawing history manager for undo/redo functionality
 *
 * Maintains a stack of drawing element snapshots with a 50-step limit.
 * Uses structuredClone() for deep cloning to prevent reference issues.
 */

import type { DrawingElement } from './types';

export class DrawingHistory {
  private history: DrawingElement[][] = [];
  private currentStep = -1;
  private readonly maxSteps = 50;

  /**
   * Push a new snapshot to the history stack
   * Truncates any future history if user has undone and then makes a new change
   */
  push(elements: DrawingElement[]): void {
    // Remove any future history after current step
    this.history = this.history.slice(0, this.currentStep + 1);

    // Deep clone to prevent reference issues
    const snapshot = structuredClone(elements);
    this.history.push(snapshot);

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
  undo(): DrawingElement[] | null {
    if (!this.canUndo) {
      return null;
    }

    this.currentStep--;
    return structuredClone(this.history[this.currentStep]);
  }

  /**
   * Redo to next snapshot
   * Returns the snapshot or null if at the end
   */
  redo(): DrawingElement[] | null {
    if (!this.canRedo) {
      return null;
    }

    this.currentStep++;
    return structuredClone(this.history[this.currentStep]);
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
