'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { cn } from '@/lib/utils';

export type PostItNodeData = {
  text: string;
  isEditing: boolean;
  onTextChange?: (id: string, text: string) => void;
  onEditComplete?: (id: string) => void;
};

export type PostItNode = Node<PostItNodeData, 'postIt'>;

export const PostItNode = memo(({ data, selected, id }: NodeProps<PostItNode>) => {
  return (
    <div
      className={cn(
        'bg-amber-100 shadow-md rounded-sm p-3',
        'font-sans text-sm text-gray-800',
        'hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150',
        selected && 'ring-2 ring-blue-500 ring-offset-1'
      )}
      style={{ width: '120px', minHeight: '120px' }}
    >
      {/* Hidden handles for future edge connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="!opacity-0 !w-0 !h-0"
      />

      {data.isEditing ? (
        <textarea
          autoFocus
          className="nodrag nopan bg-transparent border-none outline-none resize-none w-full h-full"
          defaultValue={data.text}
          onBlur={() => data.onEditComplete?.(id)}
          onChange={(e) => data.onTextChange?.(id, e.target.value)}
          placeholder="Type here..."
        />
      ) : (
        <p className="break-words whitespace-pre-wrap">{data.text || ''}</p>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!opacity-0 !w-0 !h-0"
      />
    </div>
  );
});

PostItNode.displayName = 'PostItNode';
