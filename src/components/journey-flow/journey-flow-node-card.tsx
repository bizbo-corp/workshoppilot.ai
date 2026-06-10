'use client';

import { memo, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import type { JourneyFlowNode, JourneyFlowUiType } from '@/lib/journey-flow/types';
import { UI_TYPE_LABELS } from '@/lib/journey-flow/types';

export type JourneyFlowNodeData = JourneyFlowNode & {
  onOpenDetail?: (id: string) => void;
  onAddNodeAt?: (id: string, direction: 'top' | 'right' | 'bottom' | 'left') => void;
  [key: string]: unknown;
};

export type JourneyFlowNodeType = Node<JourneyFlowNodeData, 'screenCard'>;

export const JourneyFlowNodeCard = memo(
  ({ data, id, selected }: NodeProps<JourneyFlowNodeType>) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <div
        className={cn(
          'w-[260px] rounded-lg border bg-card shadow-sm transition-shadow relative group cursor-pointer',
          selected && 'ring-2 ring-selection shadow-md'
        )}
        style={{ borderLeftWidth: 4, borderLeftColor: 'var(--primary)' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          data.onOpenDetail?.(id);
        }}
      >
        {/* Content */}
        <div className="px-3 py-2.5">
          <p className="text-sm font-medium text-foreground leading-snug truncate">
            {data.name || 'Untitled Screen'}
          </p>
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground mt-1">
            {UI_TYPE_LABELS[data.uiType as JourneyFlowUiType] ?? data.uiType}
          </span>
          {data.purpose && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {data.purpose}
            </p>
          )}
        </div>

        {/* Handles for edges — hidden until hover */}
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
              '!rounded-full !border-2 !border-background hover:!bg-primary hover:!scale-125 transition-all',
              isHovered
                ? '!w-3.5 !h-3.5 !bg-primary/60 opacity-100'
                : '!w-3 !h-3 !bg-muted-foreground/40 opacity-0'
            )}
            style={{ pointerEvents: 'all', cursor: 'crosshair', zIndex: 5 }}
          />
        ))}

        {/* Directional (+) buttons for adding nodes */}
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
                  'nodrag nopan absolute flex items-center justify-center w-5 h-5 rounded-full border shadow-sm',
                  'opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity duration-150',
                  dir === 'top' && 'left-1/2 -translate-x-1/2 -top-7',
                  dir === 'bottom' && 'left-1/2 -translate-x-1/2 -bottom-7',
                  dir === 'left' && 'top-1/2 -translate-y-1/2 -left-7',
                  dir === 'right' && 'top-1/2 -translate-y-1/2 -right-7'
                )}
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--primary)',
                  color: 'var(--primary)',
                }}
                title={`Add screen ${dir}`}
              >
                <Icon name="plus" className="h-3 w-3" />
              </button>
            ))}
          </>
        )}
      </div>
    );
  }
);

JourneyFlowNodeCard.displayName = 'JourneyFlowNodeCard';
