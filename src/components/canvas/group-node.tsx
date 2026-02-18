'use client';

import { memo } from 'react';
import { type NodeProps, type Node, NodeResizer } from '@xyflow/react';
import { cn } from '@/lib/utils';

export type GroupNodeData = {
  label?: string;
};

export type GroupNode = Node<GroupNodeData, 'group'>;

export const GroupNode = memo(({ selected }: NodeProps<GroupNode>) => {
  return (
    <div
      className={cn(
        'bg-neutral-olive-100/70 dark:bg-neutral-olive-800/70 border-2 border-dashed border-neutral-olive-300 dark:border-neutral-olive-600 rounded-lg',
        'min-w-[160px] min-h-[160px] w-full h-full',
        selected && 'border-olive-500'
      )}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        minHeight={160}
        handleClassName="!w-2 !h-2 !bg-olive-600 !border-olive-600"
      />
    </div>
  );
});

GroupNode.displayName = 'GroupNode';
