'use client';

import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { Crazy8sCanvas } from '@/components/workshop/crazy-8s-canvas';
import { Zap } from 'lucide-react';

export type Crazy8sGroupNodeData = {
  workshopId: string;
  stepId: string;
};

export type Crazy8sGroupNode = Node<Crazy8sGroupNodeData, 'crazy8sGroupNode'>;

export const CRAZY_8S_NODE_ID = 'crazy-8s-group';
export const CRAZY_8S_NODE_WIDTH = 900;
export const CRAZY_8S_NODE_HEIGHT = 620;

export const Crazy8sGroupNode = memo(({ data }: NodeProps<Crazy8sGroupNode>) => {
  return (
    <div
      className="nodrag nopan nowheel cursor-default"
      style={{ width: CRAZY_8S_NODE_WIDTH, height: CRAZY_8S_NODE_HEIGHT, pointerEvents: 'all' }}
    >
      <div className="rounded-xl border-2 border-amber-400/60 bg-background shadow-lg h-full flex flex-col">
        <div className="flex items-center gap-2 border-b bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5 shrink-0 rounded-t-[10px]">
          <Zap className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Crazy 8s — Rapid Sketching
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <Crazy8sCanvas workshopId={data.workshopId} stepId={data.stepId} />
        </div>
      </div>
    </div>
  );
});

Crazy8sGroupNode.displayName = 'Crazy8sGroupNode';
