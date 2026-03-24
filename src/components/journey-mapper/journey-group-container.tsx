'use client';

import { memo } from 'react';
import { NodeResizer, type NodeProps, type Node } from '@xyflow/react';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type GroupContainerData = {
  groupId: string;
  label: string;
  width: number;
  height: number;
  onEdit?: (groupId: string) => void;
  onDelete?: (groupId: string) => void;
  [key: string]: unknown;
};

export type JourneyGroupContainerType = Node<GroupContainerData, 'groupContainer'>;

export const JourneyGroupContainer = memo(
  ({ data, selected }: NodeProps<JourneyGroupContainerType>) => {
    return (
      <>
        <NodeResizer
          minWidth={300}
          minHeight={200}
          isVisible={!!selected}
          lineClassName="!border-primary/40"
          handleClassName="!w-2.5 !h-2.5 !bg-primary !border-background !border-2 !rounded-sm"
        />
        <div
          className={cn(
            'w-full h-full rounded-xl border border-dashed bg-muted/20 transition-colors',
            selected
              ? 'border-primary/50 bg-muted/30'
              : 'border-muted-foreground/20'
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-1 px-3 pt-2 pb-1">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 cursor-grab shrink-0" />
            <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider flex-1 truncate">
              {data.label}
            </span>
            {selected && (
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  className="p-1 rounded hover:bg-muted transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onEdit?.(data.groupId);
                  }}
                  title="Edit group"
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
                <button
                  className="p-1 rounded hover:bg-destructive/10 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onDelete?.(data.groupId);
                  }}
                  title="Delete group"
                >
                  <Trash2 className="h-3 w-3 text-destructive/70" />
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
);

JourneyGroupContainer.displayName = 'JourneyGroupContainer';
