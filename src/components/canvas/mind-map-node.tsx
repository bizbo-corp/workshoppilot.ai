'use client';

import { memo, useState, useCallback } from 'react';
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
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
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

  return (
    <div
      className={cn(
        'w-[200px] px-4 py-3 rounded-lg border-2 shadow-sm group',
        'transition-all duration-150 hover:shadow-md'
      )}
      style={{
        borderColor: data.themeColor,
        backgroundColor: data.themeBgColor,
      }}
    >
      {/* Target handle (left side) - hidden for root node */}
      {!data.isRoot && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-2 !h-2 !bg-current"
          style={{ color: data.themeColor }}
        />
      )}

      {/* Label with inline editing */}
      {isEditing ? (
        <input
          autoFocus
          type="text"
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="nodrag nopan w-full bg-transparent outline-none text-sm font-medium border-b-2"
          style={{ borderColor: data.themeColor, color: data.themeColor }}
          maxLength={100}
        />
      ) : (
        <div
          onClick={handleLabelClick}
          className="cursor-text truncate font-medium text-sm"
          style={{ color: data.themeColor }}
        >
          {data.label || 'Click to edit'}
        </div>
      )}

      {/* Action buttons (hover) - hidden for root node */}
      {!data.isRoot && (
        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Add Child button - only if level < 3 */}
          {data.level < 3 && (
            <button
              onClick={handleAddChild}
              className="nodrag nopan text-xs px-2 py-0.5 rounded hover:bg-white/50 transition-colors"
              style={{ color: data.themeColor }}
            >
              +Child
            </button>
          )}

          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="nodrag nopan text-xs px-2 py-0.5 rounded hover:bg-red-100 text-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      )}

      {/* Source handle (right side) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-current"
        style={{ color: data.themeColor }}
      />
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';
