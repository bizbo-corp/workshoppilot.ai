'use client';

/**
 * Brain Rewriting Grid
 * Dynamic grid display — original sketch + N iteration cells (one per participant).
 * Solo: original + 1 iteration. Multiplayer: original + (participants - 1) iterations.
 * Participant name pills are overlaid ON the card image.
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
        {/* Creator name pill */}
        {matrix.creatorName && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              {matrix.creatorName}
            </span>
          </div>
        )}
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
        const label = cell.assigneeName
          || (cells.length === 1 ? 'Your Iteration' : `Iteration ${index + 1}`);

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
            {/* Participant name pill */}
            {cell.assigneeName && (
              <div className="absolute top-2.5 left-2.5 z-10">
                <span className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold shadow-sm',
                  state === 'completed'
                    ? 'bg-purple-500/90 text-white'
                    : 'bg-purple-400/80 text-white'
                )}>
                  {state === 'completed' && <Check className="inline h-3 w-3 mr-1 -mt-0.5" />}
                  {cell.assigneeName}
                </span>
              </div>
            )}

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
