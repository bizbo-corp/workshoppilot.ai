'use client';

import { memo, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node, NodeResizer } from '@xyflow/react';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PostItColor } from '@/stores/canvas-store';

export const COLOR_CLASSES: Record<PostItColor, string> = {
  yellow: 'bg-[var(--postit-yellow)]',
  pink: 'bg-[var(--postit-pink)]',
  blue: 'bg-[var(--postit-blue)]',
  green: 'bg-[var(--postit-green)]',
  orange: 'bg-[var(--postit-orange)]',
  red: 'bg-[var(--postit-red)]',
};

export type PostItNodeData = {
  text: string;
  color: PostItColor;
  isEditing: boolean;
  isPreview?: boolean;
  previewReason?: string;
  clusterLabel?: string;
  clusterChildCount?: number;
  templateKey?: string;
  templateLabel?: string;
  placeholderText?: string;
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
          'font-sans text-sm text-neutral-olive-800',
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
            className="nodrag nopan flex-1 px-2 py-1 text-xs bg-neutral-olive-200 text-neutral-olive-700 rounded hover:bg-neutral-olive-300 transition-colors"
          >
            Skip
          </button>
        </div>

        <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0" />
      </div>
    );
  }

  // Template state derivation
  const isTemplate = !!data.templateKey;
  const isEmpty = !data.text?.trim();
  const isTemplatePlaceholder = isTemplate && isEmpty;

  return (
    <div
      className={cn(
        bgColor,
        'shadow-md rounded-sm p-3',
        'font-sans text-sm text-neutral-olive-800',
        // Transitions only when not actively dragging — instant feedback during manipulation
        !dragging && 'transition-[box-shadow,transform,opacity] duration-150',
        !dragging && !selected && 'hover:shadow-lg hover:-translate-y-0.5',
        'cursor-pointer',
        'w-full h-full flex flex-col overflow-hidden',
        selected && !dragging && 'ring-2 ring-olive-600 ring-offset-1',
        data.isEditing && 'ring-2 ring-olive-500 ring-offset-1',
        // Miro-like drag: clean shadow lift, subtle scale, no rotation or opacity change
        dragging && 'shadow-2xl scale-[1.02] ring-2 ring-olive-500/40',
        // Subtle dashed border for unfilled template cards
        isTemplatePlaceholder && !data.isEditing && 'border border-dashed border-neutral-olive-400/50'
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

      {/* Persistent header label for template cards */}
      {data.templateLabel && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-olive-600/70 mb-0.5 block">
          {data.templateLabel}
        </span>
      )}

      {data.isEditing ? (
        <textarea
          ref={textareaRef}
          maxLength={200}
          className="nodrag nopan bg-transparent border-none outline-none resize-none w-full flex-1 text-sm overflow-y-auto"
          defaultValue={data.text}
          onBlur={() => data.onEditComplete?.(id)}
          onChange={(e) => data.onTextChange?.(id, e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={data.placeholderText || "Type here..."}
        />
      ) : (
        <>
          <p className={cn(
            'break-words whitespace-pre-wrap overflow-hidden flex-1',
            isTemplatePlaceholder && 'text-neutral-olive-500/50 italic text-xs'
          )}>
            {data.text || data.placeholderText || ''}
          </p>
          {data.clusterLabel && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-olive-500 mt-1">
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
