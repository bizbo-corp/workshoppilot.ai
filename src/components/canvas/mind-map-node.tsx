'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Plus, Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MindMapNodeData = {
  label: string;
  description?: string;
  themeColorId?: string;
  themeColor: string; // border and text hex
  themeBgColor: string; // background hex
  isRoot?: boolean;
  isStarred?: boolean;
  level: number;
  ownerName?: string; // participant name (shown on root nodes in "All" view)
  isNewlyCreated?: boolean; // mount in edit mode with empty label
  onLabelChange?: (id: string, label: string) => void;
  onDescriptionChange?: (id: string, desc: string) => void;
  onAddChild?: (id: string) => void;
  onAddChildAt?: (id: string, direction: 'top' | 'bottom' | 'left' | 'right') => void;
  onDelete?: (id: string) => void;
  onToggleStar?: (id: string) => void;
};

export type MindMapNode = Node<MindMapNodeData, 'mindMapNode'>;

const TITLE_MAX_LEN = 40;

export const MindMapNode = memo(({ data, id }: NodeProps<MindMapNode>) => {
  // Initialize editing state — newly created nodes start in edit mode immediately
  // so the textarea is in the DOM from the very first render
  const [isEditing, setIsEditing] = useState(!!data.isNewlyCreated);
  const [editLabel, setEditLabel] = useState(data.isNewlyCreated ? '' : data.label);
  const [editDescription, setEditDescription] = useState(data.description || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const handleLabelClick = useCallback(() => {
    setIsEditing(true);
    setEditLabel(data.label);
    setEditDescription(data.description || '');
  }, [data.label, data.description]);

  const handleSave = useCallback(() => {
    if (editLabel !== data.label) {
      data.onLabelChange?.(id, editLabel);
    }
    if (editDescription !== (data.description || '')) {
      data.onDescriptionChange?.(id, editDescription);
    }
    setIsEditing(false);
  }, [id, editLabel, editDescription, data]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // Move focus to description if it exists
        if (!data.isRoot && descriptionRef.current) {
          descriptionRef.current.focus();
        } else {
          handleSave();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setEditLabel(data.label);
        setEditDescription(data.description || '');
        setIsEditing(false);
      }
    },
    [data.label, data.description, data.isRoot, handleSave]
  );

  const handleDescKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setEditLabel(data.label);
        setEditDescription(data.description || '');
        setIsEditing(false);
      }
    },
    [data.label, data.description, handleSave]
  );

  // Auto-resize textarea and focus
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      textareaRef.current.focus();
    }
  }, [isEditing, editLabel]);

  // Auto-resize description textarea
  useEffect(() => {
    if (isEditing && descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = descriptionRef.current.scrollHeight + 'px';
    }
  }, [isEditing, editDescription]);

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

  const handleToggleStar = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      data.onToggleStar?.(id);
    },
    [id, data]
  );

  const isRoot = data.isRoot;
  // Read-only when no edit callbacks are provided (other participants' nodes in "All" view)
  const isReadOnly = !data.onLabelChange;

  // Handle style: progressive reveal
  // Default: tiny & invisible | Node hover: visible connection points | Handle hover: clearly draggable
  const handleClass = [
    '!bg-current !border-none !transition-all !duration-150',
    '!w-2 !h-2 !opacity-0',                          // default: 2px, invisible
    'group-hover:!w-3 group-hover:!h-3 group-hover:!opacity-60',  // node hover: 3px, 60%
    'hover:!w-4 hover:!h-4 hover:!opacity-100 hover:!scale-125',  // handle hover: 4px, 100%, scale-up
  ].join(' ');

  return (
    <div
      className={cn(
        'relative px-4 py-3 rounded-lg shadow-sm group',
        'transition-all duration-150 hover:shadow-md',
        isRoot
          ? 'min-w-[280px] max-w-[400px]'
          : 'min-w-[140px] max-w-[280px]'
      )}
      style={{
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
        <div className="space-y-1">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value.slice(0, TITLE_MAX_LEN))}
              onBlur={() => {
                // Delay save to allow focus to move to description
                setTimeout(() => {
                  if (!descriptionRef.current || document.activeElement !== descriptionRef.current) {
                    handleSave();
                  }
                }, 100);
              }}
              onKeyDown={handleKeyDown}
              className={cn(
                'nodrag nopan w-full bg-transparent outline-none font-bold border-b-2 resize-none overflow-hidden',
                isRoot ? 'text-base' : 'text-sm'
              )}
              style={{ borderColor: data.themeColor, color: data.themeColor }}
              rows={1}
            />
            {editLabel.length > TITLE_MAX_LEN - 5 && (
              <span className="absolute right-0 bottom-0 text-[9px] opacity-50" style={{ color: data.themeColor }}>
                {editLabel.length}/{TITLE_MAX_LEN}
              </span>
            )}
          </div>
          {!isRoot && (
            <textarea
              ref={descriptionRef}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleDescKeyDown}
              placeholder="Add description..."
              className="nodrag nopan w-full bg-transparent outline-none text-xs resize-none overflow-hidden opacity-80"
              style={{ color: data.themeColor }}
              rows={1}
            />
          )}
        </div>
      ) : (
        <div onClick={isReadOnly ? undefined : handleLabelClick}>
          <div
            className={cn(
              'break-words font-bold',
              isReadOnly ? 'cursor-default' : 'cursor-text',
              isRoot ? 'text-base' : 'text-sm'
            )}
            style={{ color: data.themeColor }}
          >
            {data.label || (isReadOnly ? '' : 'Click to edit')}
          </div>
          {!isRoot && data.description && (
            <div
              className={cn('break-words text-xs mt-0.5 opacity-70', isReadOnly ? 'cursor-default' : 'cursor-text')}
              style={{ color: data.themeColor }}
            >
              {data.description}
            </div>
          )}
          {!isRoot && !data.description && !isReadOnly && (
            <div
              className="cursor-text text-xs mt-0.5 opacity-40 italic"
              style={{ color: data.themeColor }}
            >
              Add description...
            </div>
          )}
        </div>
      )}

      {/* Owner name below label on root nodes */}
      {isRoot && data.ownerName && (
        <div
          className="text-xs mt-1 font-medium opacity-60"
          style={{ color: data.themeColor }}
        >
          {data.ownerName}
        </div>
      )}

      {/* Action buttons row — hidden for read-only nodes */}
      {!isReadOnly && (
        <div className="flex gap-1 mt-2 items-center">
          {/* Star toggle — always visible when starred, hover-only otherwise */}
          {!isRoot && (
            <button
              onClick={handleToggleStar}
              className={cn(
                'nodrag nopan text-xs px-1.5 py-0.5 rounded hover:bg-neutral-olive-100/50 transition-all',
                data.isStarred ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
              style={{ color: data.themeColor }}
              title={data.isStarred ? 'Unstar idea' : 'Star for Crazy 8s'}
            >
              <Star className={cn('h-3.5 w-3.5', data.isStarred && 'fill-current')} />
            </button>
          )}

          {/* +Child/+Branch and Delete — hover-only always */}
          <button
            onClick={handleAddChild}
            className="nodrag nopan text-xs px-2 py-0.5 rounded hover:bg-neutral-olive-100/50 transition-all opacity-0 group-hover:opacity-100"
            style={{ color: data.themeColor }}
          >
            {isRoot ? '+Branch' : '+Child'}
          </button>

          {!isRoot && (
            <button
              onClick={handleDelete}
              className="nodrag nopan p-1 rounded hover:bg-red-100 text-red-600 transition-all opacity-0 group-hover:opacity-100"
              title="Delete node"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Hover "+" zones — add child at directional offset */}
      {data.onAddChildAt && (
        <>
          {(['top', 'right', 'bottom', 'left'] as const).map((dir) => (
            <button
              key={dir}
              onClick={(e) => {
                e.stopPropagation();
                data.onAddChildAt?.(id, dir);
              }}
              className={cn(
                'nodrag nopan absolute flex items-center justify-center',
                'w-5 h-5 rounded-full border shadow-sm',
                'opacity-0 group-hover:opacity-60 hover:!opacity-100',
                'transition-opacity duration-150',
                dir === 'top' && 'left-1/2 -translate-x-1/2 -top-7',
                dir === 'bottom' && 'left-1/2 -translate-x-1/2 -bottom-7',
                dir === 'left' && 'top-1/2 -translate-y-1/2 -left-7',
                dir === 'right' && 'top-1/2 -translate-y-1/2 -right-7',
              )}
              style={{
                backgroundColor: data.themeBgColor,
                borderColor: data.themeColor,
                color: data.themeColor,
              }}
              title={`Add node ${dir}`}
            >
              <Plus className="h-3 w-3" />
            </button>
          ))}
        </>
      )}
    </div>
  );
});

MindMapNode.displayName = 'MindMapNode';
