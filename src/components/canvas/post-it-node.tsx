'use client';

import { memo, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node, NodeResizer } from '@xyflow/react';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PostItColor } from '@/stores/canvas-store';

export const COLOR_CLASSES: Record<PostItColor, string> = {
  yellow: 'bg-amber-100 dark:bg-amber-200',
  pink: 'bg-pink-100 dark:bg-pink-200',
  blue: 'bg-blue-100 dark:bg-blue-200',
  green: 'bg-green-100 dark:bg-green-200',
  orange: 'bg-orange-100 dark:bg-orange-200',
  red: 'bg-red-100 dark:bg-red-200',
};

export type PostItNodeData = {
  text: string;
  color: PostItColor;
  isEditing: boolean;
  isPreview?: boolean;
  previewReason?: string;
  clusterLabel?: string;
  clusterChildCount?: number;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
  onTextChange?: (id: string, text: string) => void;
  onEditComplete?: (id: string) => void;
  onResize?: (id: string, width: number, height: number) => void;
  onResizeEnd?: (id: string, width: number, height: number, x: number, y: number) => void;
};

export type PostItNode = Node<PostItNodeData, 'postIt'>;

// `dragging` comes from ReactFlow's NodeProps — no React state needed for drag feedback
export const PostItNode = memo(({ data, selected, id, dragging }: NodeProps<PostItNode>) => {
  const bgColor = COLOR_CLASSES[data.color || 'yellow'];
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      data.onEditComplete?.(id);
    }
  }, [id, data]);

  // Auto-focus textarea when entering edit mode and place cursor at end.
  // setTimeout ensures focus survives ReactFlow's own focus management after node creation.
  useEffect(() => {
    if (data.isEditing) {
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [data.isEditing]);

  if (data.isPreview) {
    return (
      <div
        className={cn(
          bgColor,
          'shadow-md rounded-sm p-3',
          'font-sans text-sm text-neutral-olive-800 dark:text-neutral-olive-900',
          'opacity-60',
          'ring-2 ring-olive-500 ring-offset-1',
          'w-full h-full flex flex-col',
        )}
        style={{ touchAction: 'none' }}
      >
        <Handle type="target" position={Position.Top} className="!opacity-0 !w-0 !h-0" />

        <p className="break-words whitespace-pre-wrap mb-2 text-xs flex-1">{data.text || ''}</p>

        {data.previewReason && (
          <p className="text-[10px] text-neutral-olive-500 italic mb-2 leading-tight">{data.previewReason}</p>
        )}

        <div className="flex gap-1.5 pt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onConfirm?.(id);
            }}
            className="nodrag nopan flex-1 px-2 py-1 text-xs bg-olive-600 text-white rounded hover:bg-olive-700 transition-colors font-medium"
          >
            Add
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onReject?.(id);
            }}
            className="nodrag nopan flex-1 px-2 py-1 text-xs bg-neutral-olive-200 dark:bg-neutral-olive-300 text-neutral-olive-700 dark:text-neutral-olive-800 rounded hover:bg-neutral-olive-300 dark:hover:bg-neutral-olive-400 transition-colors"
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
        'font-sans text-sm text-neutral-olive-800 dark:text-neutral-olive-900',
        // Transitions only when not actively dragging — instant feedback during manipulation
        !dragging && 'transition-[box-shadow,transform,opacity] duration-150',
        !dragging && !selected && 'hover:shadow-lg hover:-translate-y-0.5',
        'cursor-pointer',
        'w-full h-full flex flex-col overflow-hidden',
        selected && !dragging && 'ring-2 ring-olive-600 ring-offset-1',
        data.isEditing && 'ring-2 ring-olive-500 ring-offset-1',
        // Miro-like drag: clean shadow lift, subtle scale, no rotation or opacity change
        dragging && 'shadow-2xl scale-[1.02] ring-2 ring-olive-500/40'
      )}
      style={{ touchAction: 'none' }}
    >
      {/* Resize handles — visible when selected but not editing */}
      <NodeResizer
        isVisible={!!selected && !data.isEditing}
        minWidth={80}
        minHeight={80}
        onResize={(_, { width, height }) => {
          data.onResize?.(id, width, height);
        }}
        onResizeEnd={(_, { x, y, width, height }) => {
          data.onResizeEnd?.(id, width, height, x, y);
        }}
        handleClassName="!w-2.5 !h-2.5 !bg-olive-600 !border-olive-600 !rounded-full"
        lineClassName="!border-olive-500/50"
      />

      {/* Hidden handles for future edge connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="!opacity-0 !w-0 !h-0"
      />

      {data.isEditing ? (
        <textarea
          ref={textareaRef}
          maxLength={200}
          className="nodrag nopan bg-transparent border-none outline-none resize-none w-full flex-1 text-sm overflow-y-auto"
          defaultValue={data.text}
          onBlur={() => data.onEditComplete?.(id)}
          onChange={(e) => data.onTextChange?.(id, e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type here..."
        />
      ) : (
        <>
          <p className="break-words whitespace-pre-wrap overflow-hidden flex-1">{data.text || ''}</p>
          {data.clusterLabel && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-olive-500 dark:text-neutral-olive-600 mt-1">
              <Layers className="w-2.5 h-2.5" />
              {data.clusterLabel} ({data.clusterChildCount ?? 0})
            </span>
          )}
        </>
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
