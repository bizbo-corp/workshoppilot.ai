'use client';

import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';

export type GroupBackgroundData = {
  groupId: string;
  label: string;
  width: number;
  height: number;
  [key: string]: unknown;
};

export type JourneyGroupBackgroundType = Node<GroupBackgroundData, 'groupBackground'>;

export const JourneyGroupBackground = memo(
  ({ data }: NodeProps<JourneyGroupBackgroundType>) => {
    return (
      <div
        className="rounded-xl border border-dashed border-muted-foreground/20 bg-muted/30 pointer-events-none"
        style={{
          width: data.width,
          height: data.height,
        }}
      >
        <span className="absolute top-2 left-3 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
          {data.label}
        </span>
      </div>
    );
  }
);

JourneyGroupBackground.displayName = 'JourneyGroupBackground';
