'use client';

import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import type { StageEmotion } from '@/lib/journey-mapper/types';

export type StageHeaderData = {
  stageId: string;
  stageName: string;
  description: string;
  emotion: StageEmotion;
  isDip: boolean;
  [key: string]: unknown;
};

export type StageHeaderNodeType = Node<StageHeaderData, 'stageHeader'>;

const EMOTION_DOT: Record<StageEmotion, string> = {
  positive: 'bg-emerald-500',
  neutral: 'bg-amber-400',
  negative: 'bg-red-500',
};

export const JourneyStageHeader = memo(
  ({ data }: NodeProps<StageHeaderNodeType>) => {
    return (
      <div className="w-[260px] select-none">
        <div
          className={cn(
            'rounded-lg border bg-muted/50 px-3 py-3',
            data.isDip && 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
          )}
        >
          {/* Stage name + emotion indicator */}
          <div className="flex items-center gap-2">
            <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', EMOTION_DOT[data.emotion])} />
            <h3 className="text-sm font-semibold text-foreground truncate">
              {data.stageName}
            </h3>
            {data.isDip && (
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            )}
          </div>

          {/* Description */}
          {data.description && (
            <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">
              {data.description}
            </p>
          )}
        </div>
      </div>
    );
  }
);

JourneyStageHeader.displayName = 'JourneyStageHeader';
