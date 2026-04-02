'use client';

import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { Pencil, Trash2 } from 'lucide-react';

export type GroupContainerData = {
  groupId: string;
  label: string;
  width: number;
  height: number;
  fillColor?: string;
  borderColor?: string;
  textColor?: string;
  headerBg?: string;
  isSelected?: boolean;
  onHeaderClick?: (groupId: string) => void;
  onEdit?: (groupId: string) => void;
  onDelete?: (groupId: string) => void;
  [key: string]: unknown;
};

export type JourneyGroupContainerType = Node<GroupContainerData, 'groupContainer'>;

const HEADER_H = 28;

export const JourneyGroupContainer = memo(
  ({ data }: NodeProps<JourneyGroupContainerType>) => {
    const fillColor = data.fillColor || 'rgba(120,120,120,0.08)';
    const borderColor = data.borderColor || 'rgba(120,120,120,0.30)';
    const headerBg = data.headerBg || 'rgba(120,120,120,0.70)';
    const isSelected = data.isSelected ?? false;

    return (
      <>
        {/* Body — dashed border + tinted fill, pointer-events-none so handles underneath are clickable */}
        <div
          className="w-full h-full"
          style={{
            background: fillColor,
            border: `1.5px dashed ${borderColor}`,
            borderRadius: 10,
            pointerEvents: 'none',
          }}
        />

        {/* Header bar — colored, sits at top, pointer-events-auto for interaction */}
        <div
          className="absolute top-0 left-0 flex items-center gap-1.5"
          style={{
            width: '100%',
            height: HEADER_H,
            background: headerBg,
            borderRadius: '10px 10px 0 0',
            paddingLeft: 8,
            paddingRight: 8,
            pointerEvents: 'auto',
            cursor: 'pointer',
          }}
          onClick={() => data.onHeaderClick?.(data.groupId)}
        >
          {/* Grip dots */}
          <svg width="6" height="10" viewBox="0 0 6 10" fill="white" opacity={0.5} className="flex-shrink-0">
            <circle cx="1" cy="1" r="1" />
            <circle cx="5" cy="1" r="1" />
            <circle cx="1" cy="5" r="1" />
            <circle cx="5" cy="5" r="1" />
            <circle cx="1" cy="9" r="1" />
            <circle cx="5" cy="9" r="1" />
          </svg>

          <span className="text-[11px] font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis flex-1">
            {data.label}
          </span>

          {isSelected && (
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                className="p-1 rounded hover:bg-white/20 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onEdit?.(data.groupId);
                }}
                title="Edit group"
              >
                <Pencil className="h-3 w-3 text-white/80" />
              </button>
              <button
                className="p-1 rounded hover:bg-white/20 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onDelete?.(data.groupId);
                }}
                title="Delete group"
              >
                <Trash2 className="h-3 w-3 text-white/80" />
              </button>
            </div>
          )}
        </div>
      </>
    );
  }
);

JourneyGroupContainer.displayName = 'JourneyGroupContainer';
