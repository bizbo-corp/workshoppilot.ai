'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { cn } from '@/lib/utils';

export type MindMapNodeData = {
  label: string;
  themeColorId?: string;
  themeColor: string; // border and text hex
  themeBgColor: string; // background hex
  isRoot?: boolean;
  level: number;
  onLabelChange?: (id: string, label: string) => void;
  onAddChild?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export type MindMapNode = Node<MindMapNodeData, 'mindMapNode'>;

export const MindMapNode = memo(({ data, id }: NodeProps<MindMapNode>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(data.label);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleLabelClick = useCallback(() => {
    setIsEditing(true);
    setEditLabel(data.label);
  }, [data.label]);

  const handleSave = useCallback(() => {
    if (editLabel !== data.label) {
      data.onLabelChange?.(id, editLabel);
    }
    setIsEditing(false);
  }, [id, editLabel, data]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setEditLabel(data.label);
        setIsEditing(false);
      }
    },
    [data.label, handleSave]
  );

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      textareaRef.current.focus();
    }
  }, [isEditing, editLabel]);

  const handleAddChild = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      data.onAddChild?.(id);
    },
    [id, data]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      data.onDelete?.(id);
    },
    [id, data]
  );

  const isRoot = data.isRoot;

  // Handle style: hidden by default, visible on hover
  const handleClass = '!w-2 !h-2 !bg-current !opacity-0 group-hover:!opacity-100 !transition-opacity';

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 shadow-sm group',
        'transition-all duration-150 hover:shadow-md',
        isRoot
          ? 'min-w-[280px] max-w-[400px]'
          : 'min-w-[140px] max-w-[280px]'
      )}
      style={{
        borderColor: data.themeColor,
        backgroundColor: data.themeBgColor,
      }}
    >
      {/* Handles on all 4 sides — both source and target */}
      <Handle type="target" position={Position.Top} id="target-top" className={handleClass} style={{ color: data.themeColor }} />
      <Handle type="target" position={Position.Bottom} id="target-bottom" className={handleClass} style={{ color: data.themeColor }} />
      <Handle type="target" position={Position.Left} id="target-left" className={handleClass} style={{ color: data.themeColor }} />
      <Handle type="target" position={Position.Right} id="target-right" className={handleClass} style={{ color: data.themeColor }} />

      <Handle type="source" position={Position.Top} id="source-top" className={handleClass} style={{ color: data.themeColor }} />
      <Handle type="source" position={Position.Bottom} id="source-bottom" className={handleClass} style={{ color: data.themeColor }} />
      <Handle type="source" position={Position.Left} id="source-left" className={handleClass} style={{ color: data.themeColor }} />
      <Handle type="source" position={Position.Right} id="source-right" className={handleClass} style={{ color: data.themeColor }} />

      {/* Label with inline editing */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={cn(
            'nodrag nopan w-full bg-transparent outline-none font-medium border-b-2 resize-none overflow-hidden',
            isRoot ? 'text-base' : 'text-sm'
          )}
          style={{ borderColor: data.themeColor, color: data.themeColor }}
          rows={1}
        />
      ) : (
        <div
          onClick={handleLabelClick}
          className={cn(
            'cursor-text break-words font-medium',
            isRoot ? 'text-base' : 'text-sm'
          )}
          style={{ color: data.themeColor }}
        >
          {data.label || 'Click to edit'}
        </div>
      )}

      {/* Action buttons (hover) */}
      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Add Child / +Branch button */}
        <button
          onClick={handleAddChild}
          className="nodrag nopan text-xs px-2 py-0.5 rounded hover:bg-neutral-olive-100/50 transition-colors"
          style={{ color: data.themeColor }}
        >
          {isRoot ? '+Branch' : '+Child'}
        </button>

        {/* Delete button — hidden for root */}
        {!isRoot && (
          <button
            onClick={handleDelete}
            className="nodrag nopan text-xs px-2 py-0.5 rounded hover:bg-red-100 text-red-600 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';
