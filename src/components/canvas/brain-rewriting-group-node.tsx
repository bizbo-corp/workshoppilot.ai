'use client';

import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { BrainRewritingCanvas } from '@/components/workshop/brain-rewriting-canvas';
import { GitBranchPlus } from 'lucide-react';
import type { BrainRewritingMatrix } from '@/lib/canvas/brain-rewriting-types';

export type BrainRewritingGroupNodeData = {
  workshopId: string;
  stepId: string;
  matrix: BrainRewritingMatrix;
  slotTitle: string;
  indexLabel: string; // e.g. "1 of 3"
  onCellUpdate: (slotId: string, cellId: string, imageUrl: string, drawingId: string) => void;
};

export type BrainRewritingGroupNode = Node<BrainRewritingGroupNodeData, 'brainRewritingGroupNode'>;

export const BR_NODE_WIDTH = 580;
export const BR_NODE_HEIGHT = 620;
export const BR_NODE_GAP = 40;

export const BrainRewritingGroupNode = memo(({ data }: NodeProps<BrainRewritingGroupNode>) => {
  return (
    <div
      className="nodrag nopan nowheel cursor-default"
      style={{ width: BR_NODE_WIDTH, height: BR_NODE_HEIGHT, pointerEvents: 'all' }}
    >
      <div className="rounded-xl border-2 border-purple-400/60 bg-background shadow-lg h-full flex flex-col">
        <div className="flex items-center justify-between border-b bg-purple-50 dark:bg-purple-950/20 px-4 py-2.5 shrink-0 rounded-t-[10px]">
          <div className="flex items-center gap-2">
            <GitBranchPlus className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-900 dark:text-purple-200">
              {data.slotTitle}
            </span>
          </div>
          <span className="text-xs text-purple-600/70 dark:text-purple-300/70">
            {data.indexLabel}
          </span>
        </div>
        <div className="flex-1 min-h-0">
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
