'use client';

/**
 * Brain Rewriting Grid
 * Dynamic grid display — original sketch + N iteration cells (one per participant).
 * Solo: original + 1 iteration. Multiplayer: original + (participants - 1) iterations.
 */

import { cn } from '@/lib/utils';
import { Pencil, Lock, Check } from 'lucide-react';
import type { BrainRewritingMatrix, BrainRewritingCellId } from '@/lib/canvas/brain-rewriting-types';

interface BrainRewritingGridProps {
  matrix: BrainRewritingMatrix;
  onCellClick: (cellId: BrainRewritingCellId) => void;
  activeCellId: BrainRewritingCellId | null;
}

export function BrainRewritingGrid({
  matrix,
  onCellClick,
  activeCellId,
}: BrainRewritingGridProps) {
  const cells = matrix.cells;

  // Determine cell states using array index
  const getCellState = (cellId: BrainRewritingCellId): 'completed' | 'active' | 'locked' => {
    const cell = cells.find((c) => c.cellId === cellId);
    if (cell?.imageUrl) return 'completed';

    const activeIndex = activeCellId ? cells.findIndex((c) => c.cellId === activeCellId) : -1;
    const cellIndex = cells.findIndex((c) => c.cellId === cellId);

    if (cellId === activeCellId) return 'active';
    if (activeIndex >= 0 && cellIndex > activeIndex) return 'locked';
    return 'active'; // Cells before active can be re-edited
  };

  // Label for the original cell
  const originalLabel = matrix.creatorName ? `${matrix.creatorName} — Original` : 'Original';

  // Compute grid rows: (cells + 1 for original) / 2 cols
  const totalSlots = cells.length + 1;
  const gridRows = Math.ceil(totalSlots / 2);

  return (
    <div
      className="grid grid-cols-2 gap-3 max-w-[540px] mx-auto"
      style={{ gridTemplateRows: `repeat(${gridRows}, minmax(200px, 1fr))` }}
    >
      {/* Original sketch (read-only) */}
      <div className="relative rounded-lg border-2 border-muted bg-muted/30 overflow-hidden">
        <div className="absolute top-2 left-2 z-10">
          <span className="rounded-md bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shadow-sm">
            {originalLabel}
          </span>
        </div>
        <div className="flex h-full items-center justify-center p-2">
          {matrix.sourceImageUrl ? (
            <img
              src={matrix.sourceImageUrl}
              alt="Original sketch"
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-xs text-muted-foreground">No image</span>
          )}
        </div>
      </div>

      {/* Iteration cells — one per participant (or 1 for solo) */}
      {cells.map((cell, index) => {
        const state = getCellState(cell.cellId);
        // Use assignee name, fall back to "Your Iteration" (solo) or "Iteration N"
        const label = cell.assigneeName || (cells.length === 1 ? 'Your Iteration' : `Iteration ${index + 1}`);

        return (
          <button
            key={cell.cellId}
            onClick={() => state !== 'locked' && onCellClick(cell.cellId)}
            disabled={state === 'locked'}
            className={cn(
              'relative rounded-lg border-2 transition-all overflow-hidden',
              state === 'active' && 'border-olive-500 hover:border-olive-600 cursor-pointer bg-olive-50/30 dark:bg-olive-950/20',
              state === 'completed' && 'border-olive-400 hover:border-olive-500 cursor-pointer',
              state === 'locked' && 'border-muted opacity-50 cursor-not-allowed bg-muted/20'
            )}
          >
            {/* Badge */}
            <div className="absolute top-2 left-2 z-10">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm',
                  state === 'completed' && 'bg-olive-600 text-white',
                  state === 'active' && 'bg-olive-100 text-olive-800 dark:bg-olive-900 dark:text-olive-200',
                  state === 'locked' && 'bg-muted text-muted-foreground'
                )}
              >
                {state === 'completed' && <Check className="h-3 w-3" />}
                {state === 'locked' && <Lock className="h-3 w-3" />}
                {label}
              </span>
            </div>

            {/* Cell content */}
            <div className="flex h-full items-center justify-center p-2">
              {cell.imageUrl ? (
                <img
                  src={cell.imageUrl}
                  alt={label}
                  className="h-full w-full object-contain"
                />
              ) : state !== 'locked' ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Pencil className="h-6 w-6" />
                  <span className="text-xs">Tap to draw</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                  <Lock className="h-6 w-6" />
                  <span className="text-xs">Complete previous first</span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
