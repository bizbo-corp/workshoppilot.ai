'use client';

import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import TextareaAutosize from 'react-textarea-autosize';
import { cn } from '@/lib/utils';
import type { PostItColor } from '@/stores/canvas-store';

export const COLOR_CLASSES: Record<PostItColor, string> = {
  yellow: 'bg-amber-100',
  pink: 'bg-pink-100',
  blue: 'bg-blue-100',
  green: 'bg-green-100',
  orange: 'bg-orange-100',
};

export type PostItNodeData = {
  text: string;
  color: PostItColor;
  isEditing: boolean;
  dragging?: boolean; // true during drag for opacity feedback
  isPreview?: boolean;
  previewReason?: string;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
  onTextChange?: (id: string, text: string) => void;
  onEditComplete?: (id: string) => void;
};

export type PostItNode = Node<PostItNodeData, 'postIt'>;

export const PostItNode = memo(({ data, selected, id }: NodeProps<PostItNode>) => {
  const bgColor = COLOR_CLASSES[data.color || 'yellow'];

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      data.onEditComplete?.(id);
    }
  }, [id, data]);

  if (data.isPreview) {
    return (
      <div
        className={cn(
          bgColor,
          'shadow-md rounded-sm p-3',
          'font-sans text-sm text-gray-800',
          'opacity-60',
          'ring-2 ring-blue-400 ring-offset-1',
        )}
        style={{
          width: '120px',
          minHeight: '120px',
          touchAction: 'none',
        }}
      >
        <Handle type="target" position={Position.Top} className="!opacity-0 !w-0 !h-0" />

        <p className="break-words whitespace-pre-wrap mb-2 text-xs">{data.text || ''}</p>

        {data.previewReason && (
          <p className="text-[10px] text-gray-500 italic mb-2 leading-tight">{data.previewReason}</p>
        )}

        <div className="flex gap-1.5 mt-auto pt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onConfirm?.(id);
            }}
            className="nodrag nopan flex-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium"
          >
            Add
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onReject?.(id);
            }}
            className="nodrag nopan flex-1 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Skip
          </button>
        </div>

        <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        bgColor,
        'shadow-md rounded-sm p-3',
        'font-sans text-sm text-gray-800',
        'hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150',
        'cursor-pointer',
        selected && 'ring-2 ring-blue-500 ring-offset-1',
        data.isEditing && 'ring-2 ring-blue-400 ring-offset-1',
        data.dragging && 'shadow-xl'
      )}
      style={{
        width: '120px',
        minHeight: '120px',
        touchAction: 'none',
        opacity: data.dragging ? 0.85 : 1,
        transform: data.dragging ? 'scale(1.03)' : 'none',
        transition: 'opacity 150ms ease, transform 150ms ease, box-shadow 150ms ease',
      }}
    >
      {/* Hidden handles for future edge connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="!opacity-0 !w-0 !h-0"
      />

      {data.isEditing ? (
        <TextareaAutosize
          autoFocus
          maxLength={200}
          minRows={3}
          maxRows={10}
          className="nodrag nopan bg-transparent border-none outline-none resize-none w-full"
          defaultValue={data.text}
          onBlur={() => data.onEditComplete?.(id)}
          onChange={(e) => data.onTextChange?.(id, e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type here..."
          style={{ overflow: 'hidden' }}
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
