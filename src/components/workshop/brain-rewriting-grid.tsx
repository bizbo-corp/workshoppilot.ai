'use client';

/**
 * Brain Rewriting Grid
 * Pure display component — 2x2 CSS grid for iterating on a selected Crazy 8s sketch
 * Top-left: original (read-only), other 3 cells: EzyDraw-clickable iterations
 */

import { cn } from '@/lib/utils';
import { Pencil, Lock, Check } from 'lucide-react';
import type { BrainRewritingMatrix, BrainRewritingCellId } from '@/lib/canvas/brain-rewriting-types';
import { BRAIN_REWRITING_CELL_ORDER } from '@/lib/canvas/brain-rewriting-types';

interface BrainRewritingGridProps {
  matrix: BrainRewritingMatrix;
  onCellClick: (cellId: BrainRewritingCellId) => void;
  activeCellId: BrainRewritingCellId | null;
}

const CELL_LABELS: Record<string, string> = {
  'top-right': 'Iteration 1',
  'bottom-left': 'Iteration 2',
  'bottom-right': 'Iteration 3',
};

export function BrainRewritingGrid({
  matrix,
  onCellClick,
  activeCellId,
}: BrainRewritingGridProps) {
  // Determine cell states
  const getCellState = (cellId: BrainRewritingCellId): 'completed' | 'active' | 'locked' => {
    const cell = matrix.cells.find((c) => c.cellId === cellId);
    if (cell?.imageUrl) return 'completed';

    const activeIndex = activeCellId ? BRAIN_REWRITING_CELL_ORDER.indexOf(activeCellId) : -1;
    const cellIndex = BRAIN_REWRITING_CELL_ORDER.indexOf(cellId);

    if (cellId === activeCellId) return 'active';
    if (activeIndex >= 0 && cellIndex > activeIndex) return 'locked';
    return 'active'; // Cells before active can be re-edited
  };

  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-3 aspect-square max-w-[540px] mx-auto">
      {/* Top-left: Original sketch (read-only) */}
      <div className="relative rounded-lg border-2 border-muted bg-muted/30 overflow-hidden">
        <div className="absolute top-2 left-2 z-10">
          <span className="rounded-md bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shadow-sm">
            Original
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

      {/* Iteration cells */}
      {BRAIN_REWRITING_CELL_ORDER.map((cellId) => {
        const cell = matrix.cells.find((c) => c.cellId === cellId);
        const state = getCellState(cellId);
        const label = CELL_LABELS[cellId];

        return (
          <button
            key={cellId}
            onClick={() => state !== 'locked' && onCellClick(cellId)}
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
              {cell?.imageUrl ? (
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
