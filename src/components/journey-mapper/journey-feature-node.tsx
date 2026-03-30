'use client';

import { memo, useRef, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Settings2, Pencil, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JourneyMapperNode, UiType, Priority } from '@/lib/journey-mapper/types';

export type JourneyFeatureNodeData = JourneyMapperNode & {
  conceptColor: string;
  groupColor?: string;
  onFieldChange?: (id: string, field: keyof JourneyMapperNode, value: string) => void;
  onDeleteNode?: (id: string) => void;
  onSetEditMode?: (id: string) => void;
  onAddNodeAt?: (id: string, direction: 'top' | 'right' | 'bottom' | 'left') => void;
  editModeNodeId?: string | null;
  [key: string]: unknown;
};

export type JourneyFeatureNodeType = Node<JourneyFeatureNodeData, 'featureNode'>;

const UI_TYPE_LABELS: Record<UiType, string> = {
  dashboard: 'Dashboard',
  'landing-page': 'Landing Page',
  form: 'Form',
  table: 'Table',
  'detail-view': 'Detail View',
  wizard: 'Wizard',
  modal: 'Modal',
  settings: 'Settings',
  auth: 'Auth',
  onboarding: 'Onboarding',
  search: 'Search',
  error: 'Error Page',
};

const PRIORITY_STYLES: Record<Priority, { dot: string; label: string }> = {
  'must-have': { dot: 'bg-red-500', label: 'Must Have' },
  'should-have': { dot: 'bg-amber-500', label: 'Should Have' },
  'nice-to-have': { dot: 'bg-blue-400', label: 'Nice to Have' },
};

function InlineEdit({
  value,
  placeholder,
  onBlur,
  multiline,
  truncated,
}: {
  value?: string;
  placeholder: string;
  onBlur: (value: string) => void;
  multiline?: boolean;
  truncated?: boolean;
}) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current && ref.current !== document.activeElement) {
      ref.current.value = value || '';
    }
  }, [value]);

  const sharedClasses =
    'w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/50 nodrag nopan';

  if (multiline && truncated) {
    return (
      <p className={cn(sharedClasses, 'line-clamp-2 cursor-text')} title={value}>
        {value || <span className="text-muted-foreground/50">{placeholder}</span>}
      </p>
    );
  }

  if (multiline) {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        defaultValue={value || ''}
        placeholder={placeholder}
        rows={2}
        className={cn(sharedClasses, 'resize-none overflow-hidden')}
        onBlur={(e) => onBlur(e.target.value)}
        onInput={(e) => {
          const el = e.currentTarget;
          el.style.height = 'auto';
          el.style.height = `${el.scrollHeight}px`;
        }}
      />
    );
  }

  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      type="text"
      defaultValue={value || ''}
      placeholder={placeholder}
      className={sharedClasses}
      onBlur={(e) => onBlur(e.target.value)}
    />
  );
}

export const JourneyFeatureNode = memo(
  ({ data, id, selected }: NodeProps<JourneyFeatureNodeType>) => {
    const priority = PRIORITY_STYLES[data.priority] ?? PRIORITY_STYLES['should-have'];
    const isPeripheral = data.nodeCategory === 'peripheral';
    const [isHovered, setIsHovered] = useState(false);
    const isEditMode = data.editModeNodeId === id;
    const hasActions = !!data.onDeleteNode;
    const accentColor = data.groupColor || (isPeripheral ? 'var(--muted-foreground)' : data.conceptColor);

    return (
      <div
        className={cn(
          'w-[260px] rounded-lg border bg-card shadow-sm transition-shadow relative group',
          selected && 'ring-2 ring-primary shadow-md',
          isPeripheral && 'opacity-75'
        )}
        style={{ borderLeftWidth: 4, borderLeftColor: accentColor }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Action button — pencil or trash */}
        {hasActions && isHovered && !isEditMode && (
          <button
            className="absolute top-1 right-1 z-10 p-1 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors nodrag"
            onClick={(e) => {
              e.stopPropagation();
              data.onSetEditMode?.(id);
            }}
            title="Edit node"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {hasActions && isEditMode && (
          <button
            className="absolute top-1 right-1 z-10 p-1 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors nodrag"
            onClick={(e) => {
              e.stopPropagation();
              data.onDeleteNode?.(id);
            }}
            title="Delete node"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Header */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-start justify-between gap-1">
            <InlineEdit
              value={data.featureName}
              placeholder="Feature name"
              onBlur={(v) => data.onFieldChange?.(id, 'featureName', v)}
            />
            <div className="flex items-center gap-1 shrink-0">
              {isPeripheral && (
                <span className="inline-flex items-center rounded-full bg-muted/80 px-1.5 py-0.5" title="Peripheral service">
                  <Settings2 className="h-2.5 w-2.5 text-muted-foreground" />
                </span>
              )}
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                  'bg-muted text-muted-foreground'
                )}
              >
                {UI_TYPE_LABELS[data.uiType] || data.uiType}
              </span>
            </div>
          </div>

          {/* Concept source */}
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            {data.conceptName}
          </p>
        </div>

        {/* Description */}
        <div className="px-3 py-1">
          <InlineEdit
            value={data.featureDescription}
            placeholder="Feature description..."
            onBlur={(v) => data.onFieldChange?.(id, 'featureDescription', v)}
            multiline
            truncated={!selected}
          />
        </div>

        {/* Footer */}
        <div className="px-3 pb-2 pt-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', priority.dot)} />
            <span className="text-[10px] text-muted-foreground">{priority.label}</span>
          </div>
          {data.addressesPain && (
            <span className="text-[10px] text-muted-foreground/60 truncate max-w-[120px]" title={data.addressesPain}>
              {data.addressesPain}
            </span>
          )}
        </div>

        {/* Handles for edges — 8 handles (target + source on each side) for many-to-many */}
        {([
          { type: 'target' as const, position: Position.Left, id: 'target-left' },
          { type: 'source' as const, position: Position.Left, id: 'source-left' },
          { type: 'target' as const, position: Position.Right, id: 'target-right' },
          { type: 'source' as const, position: Position.Right, id: 'source-right' },
          { type: 'target' as const, position: Position.Top, id: 'target-top' },
          { type: 'source' as const, position: Position.Top, id: 'source-top' },
          { type: 'target' as const, position: Position.Bottom, id: 'target-bottom' },
          { type: 'source' as const, position: Position.Bottom, id: 'source-bottom' },
        ]).map((h) => (
          <Handle
            key={h.id}
            id={h.id}
            type={h.type}
            position={h.position}
            className={cn(
              '!rounded-full !border-2 !border-background hover:!bg-primary hover:!scale-125 transition-colors',
              isHovered ? '!w-3.5 !h-3.5 !bg-primary/60' : '!w-3 !h-3 !bg-muted-foreground/40'
            )}
            style={{ pointerEvents: 'all', cursor: 'crosshair', zIndex: 5 }}
          />
        ))}

        {/* Directional + buttons for adding nodes */}
        {data.onAddNodeAt && (
          <>
            {(['top', 'right', 'bottom', 'left'] as const).map((dir) => (
              <button
                key={dir}
                onClick={(e) => {
                  e.stopPropagation();
                  data.onAddNodeAt?.(id, dir);
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
                  backgroundColor: 'var(--card)',
                  borderColor: accentColor,
                  color: accentColor,
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
  }
);

JourneyFeatureNode.displayName = 'JourneyFeatureNode';
