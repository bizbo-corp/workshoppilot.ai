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
        'bg-gray-100/70 border-2 border-dashed border-gray-300 rounded-lg',
        'min-w-[160px] min-h-[160px] w-full h-full',
        selected && 'border-blue-400'
      )}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        minHeight={160}
        handleClassName="!w-2 !h-2 !bg-blue-500 !border-blue-500"
      />
    </div>
  );
});

GroupNode.displayName = 'GroupNode';
