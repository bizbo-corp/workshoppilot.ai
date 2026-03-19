'use client';

/**
 * VotingGroupNode — ReactFlow custom node for a group of Crazy8s ideas
 * on the shared multiplayer voting canvas.
 *
 * Dimensions: 300×340px
 */

import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ThumbsUp, Layers, Merge, Unlink } from 'lucide-react';
import type { Crazy8sSlot, SlotGroup } from '@/lib/canvas/crazy-8s-types';

export type VotingGroupNodeData = {
  group: SlotGroup;
  memberSlots: Crazy8sSlot[];
  voteCount: number;
  rank?: number;
  voterDots: Array<{ voterId: string; color: string }>;
  myVoteId?: string;
  canVote: boolean;
  isFacilitator: boolean;
  isSelected?: boolean;
  votingStatus: 'idle' | 'open' | 'closed';
  hasMergedImage: boolean;
  onCastVote: (targetId: string) => void;
  onRetractVote: (voteId: string) => void;
  onToggleSelect: (targetId: string) => void;
  onStartMerge: (groupId: string) => void;
  onUngroup: (groupId: string) => void;
};

export type VotingGroupNodeType = Node<VotingGroupNodeData, 'votingGroupNode'>;

function VotingGroupNodeComponent({ data }: NodeProps<VotingGroupNodeType>) {
  const {
    group,
    memberSlots,
    voteCount,
    rank,
    voterDots,
    myVoteId,
    canVote,
    isFacilitator,
    isSelected,
    votingStatus,
    hasMergedImage,
    onCastVote,
    onRetractVote,
    onToggleSelect,
    onStartMerge,
    onUngroup,
  } = data;

  const showMemberThumbs = !hasMergedImage && memberSlots.length > 0;
  // Show up to 3 stacked thumbnails
  const visibleMembers = memberSlots.filter((s) => s.imageUrl).slice(0, 3);

  return (
    <div
      className={cn(
        'w-[300px] h-[340px] rounded-xl border-2 border-dashed bg-card shadow-md flex flex-col overflow-hidden',
        isSelected && 'ring-2 ring-primary',
        votingStatus === 'closed' && voteCount === 0 && 'opacity-50',
      )}
    >
      {/* Image area */}
      <div className="relative w-full h-[150px] bg-muted flex-shrink-0 overflow-hidden">
        {hasMergedImage && group.mergedImageUrl ? (
          <img
            src={group.mergedImageUrl}
            alt={group.label}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : showMemberThumbs ? (
          <div className="relative w-full h-full">
            {visibleMembers.map((slot, i) => (
              <img
                key={slot.slotId}
                src={slot.imageUrl!}
                alt={slot.title || 'Sketch'}
                className="absolute top-2 rounded border bg-background shadow-sm object-cover"
                style={{
                  left: `${12 + i * 30}px`,
                  width: '120px',
                  height: '90px',
                  zIndex: i + 1,
                }}
                draggable={false}
              />
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            <Layers className="h-6 w-6 mr-1.5 opacity-50" />
            Group
          </div>
        )}
        {/* Vote count badge */}
        {voteCount > 0 && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow">
            {voteCount}
          </div>
        )}
        {/* Rank badge */}
        {rank != null && votingStatus === 'closed' && (
          <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm text-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow border">
            #{rank}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3 gap-1 min-h-0">
        <h4 className="text-sm font-semibold truncate">{group.label || 'Unnamed Group'}</h4>
        <p className="text-xs text-muted-foreground">
          {memberSlots.length} idea{memberSlots.length !== 1 ? 's' : ''}
        </p>

        {/* Voter dots (facilitator only) */}
        {isFacilitator && voterDots.length > 0 && (
          <div className="flex items-center gap-0.5 mt-1">
            {voterDots.map((dot, i) => (
              <span
                key={`${dot.voterId}-${i}`}
                className="w-3 h-3 rounded-full border border-background shadow-sm"
                style={{ backgroundColor: dot.color }}
              />
            ))}
          </div>
        )}

        {/* Facilitator controls: Merge / Ungroup */}
        {isFacilitator && votingStatus !== 'open' && (
          <div className="flex items-center gap-1.5 mt-auto nodrag nopan">
            {!hasMergedImage && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] gap-1 px-2"
                onClick={() => onStartMerge(group.id)}
              >
                <Merge className="h-3 w-3" />
                Merge
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1 px-2"
              onClick={() => onUngroup(group.id)}
            >
              <Unlink className="h-3 w-3" />
              Ungroup
            </Button>
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className="px-3 pb-3 flex-shrink-0 nodrag nopan">
        {votingStatus === 'open' && (
          myVoteId ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => onRetractVote(myVoteId)}
            >
              Retract Vote
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="w-full h-7 text-xs gap-1"
              disabled={!canVote}
              onClick={() => onCastVote(group.id)}
            >
              <ThumbsUp className="h-3 w-3" />
              +1 Vote
            </Button>
          )
        )}
        {votingStatus === 'closed' && isFacilitator && (
          <div className="flex items-center gap-2">
            <Checkbox
              id={`select-${group.id}`}
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(group.id)}
            />
            <label htmlFor={`select-${group.id}`} className="text-xs cursor-pointer">
              Include
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

export const VotingGroupNode = memo(VotingGroupNodeComponent);
