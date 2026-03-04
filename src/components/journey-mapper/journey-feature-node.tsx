'use client';

import { memo, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { JourneyMapperNode, UiType, Priority } from '@/lib/journey-mapper/types';

export type JourneyFeatureNodeData = JourneyMapperNode & {
  conceptColor: string;
  onFieldChange?: (id: string, field: keyof JourneyMapperNode, value: string) => void;
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
}: {
  value?: string;
  placeholder: string;
  onBlur: (value: string) => void;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current && ref.current !== document.activeElement) {
      ref.current.value = value || '';
    }
  }, [value]);

  const sharedClasses =
    'w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/50 nodrag nopan';

  if (multiline) {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        defaultValue={value || ''}
        placeholder={placeholder}
        rows={2}
        className={cn(sharedClasses, 'resize-none')}
        onBlur={(e) => onBlur(e.target.value)}
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
    const priority = PRIORITY_STYLES[data.priority];

    return (
      <div
        className={cn(
          'w-[260px] rounded-lg border bg-card shadow-sm transition-shadow',
          selected && 'ring-2 ring-primary shadow-md'
        )}
        style={{ borderLeftWidth: 4, borderLeftColor: data.conceptColor }}
      >
        {/* Header */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-start justify-between gap-1">
            <InlineEdit
              value={data.featureName}
              placeholder="Feature name"
              onBlur={(v) => data.onFieldChange?.(id, 'featureName', v)}
            />
            <span
              className={cn(
                'shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                'bg-muted text-muted-foreground'
              )}
            >
              {UI_TYPE_LABELS[data.uiType]}
            </span>
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

        {/* Handles for edges */}
        <Handle type="target" position={Position.Left} className="!opacity-0 !w-0 !h-0" />
        <Handle type="source" position={Position.Right} className="!opacity-0 !w-0 !h-0" />
      </div>
    );
  }
);

JourneyFeatureNode.displayName = 'JourneyFeatureNode';
