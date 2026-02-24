'use client';

import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { BrainRewritingCanvas } from '@/components/workshop/brain-rewriting-canvas';
import { GitBranchPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import type { BrainRewritingMatrix } from '@/lib/canvas/brain-rewriting-types';

export type BrainRewritingGroupNodeData = {
  workshopId: string;
  stepId: string;
  matrix: BrainRewritingMatrix;
  slotTitle: string;
  indexLabel: string; // e.g. "1 of 3"
  onCellUpdate: (slotId: string, cellId: string, imageUrl: string, drawingId: string) => void;
  onToggleIncluded: (slotId: string) => void;
};

export type BrainRewritingGroupNode = Node<BrainRewritingGroupNodeData, 'brainRewritingGroupNode'>;

export const BR_NODE_WIDTH = 580;
export const BR_NODE_HEIGHT = 620;
export const BR_NODE_GAP = 40;

export const BrainRewritingGroupNode = memo(({ data }: NodeProps<BrainRewritingGroupNode>) => {
  // Default to included when undefined (backwards compat with existing data)
  const isIncluded = data.matrix.includedInConcepts !== false;
  const checkboxId = `include-${data.matrix.slotId}`;

  return (
    <div
      className="nodrag nopan cursor-default"
      style={{ width: BR_NODE_WIDTH, height: BR_NODE_HEIGHT, pointerEvents: 'all' }}
    >
      <div className={cn(
        'rounded-xl border-2 bg-background shadow-lg h-full flex flex-col',
        isIncluded ? 'border-purple-400/60' : 'border-muted'
      )}>
        <div className={cn(
          'flex items-center justify-between border-b px-4 py-2.5 shrink-0 rounded-t-[10px]',
          isIncluded
            ? 'bg-purple-50 dark:bg-purple-950/20'
            : 'bg-muted/30'
        )}>
          <div className="flex items-center gap-2">
            <GitBranchPlus className={cn('h-4 w-4', isIncluded ? 'text-purple-600' : 'text-muted-foreground')} />
            <span className={cn(
              'text-sm font-semibold',
              isIncluded ? 'text-purple-900 dark:text-purple-200' : 'text-muted-foreground'
            )}>
              {data.slotTitle}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              'text-xs',
              isIncluded ? 'text-purple-600/70 dark:text-purple-300/70' : 'text-muted-foreground/70'
            )}>
              {data.indexLabel}
            </span>
            <label
              htmlFor={checkboxId}
              className="flex items-center gap-1.5 cursor-pointer select-none"
            >
              <Checkbox
                id={checkboxId}
                checked={isIncluded}
                onCheckedChange={() => data.onToggleIncluded(data.matrix.slotId)}
                className="border-purple-400 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
              />
              <span className={cn(
                'text-xs font-medium',
                isIncluded ? 'text-purple-700 dark:text-purple-300' : 'text-muted-foreground'
              )}>
                Include in concepts
              </span>
            </label>
          </div>
        </div>
        <div className={cn('flex-1 min-h-0', !isIncluded && 'opacity-50')}>
          <BrainRewritingCanvas
            matrix={data.matrix}
            workshopId={data.workshopId}
            stepId={data.stepId}
            slotTitle={data.slotTitle}
            onCellUpdate={data.onCellUpdate}
          />
        </div>
      </div>
    </div>
  );
});

BrainRewritingGroupNode.displayName = 'BrainRewritingGroupNode';
