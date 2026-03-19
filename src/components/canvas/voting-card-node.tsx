'use client';

/**
 * VotingCardNode — ReactFlow custom node for a single Crazy8s idea
 * on the shared multiplayer voting canvas.
 *
 * Dimensions: 240×320px
 */

import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ThumbsUp } from 'lucide-react';
import type { Crazy8sSlot } from '@/lib/canvas/crazy-8s-types';

export type VotingCardNodeData = {
  slot: Crazy8sSlot;
  voteCount: number;
  rank?: number;
  voterDots: Array<{ voterId: string; color: string }>;
  myVoteId?: string;
  canVote: boolean;
  isFacilitator: boolean;
  isSelected?: boolean;
  votingStatus: 'idle' | 'open' | 'closed';
  onCastVote: (targetId: string) => void;
  onRetractVote: (voteId: string) => void;
  onToggleSelect: (targetId: string) => void;
};

export type VotingCardNodeType = Node<VotingCardNodeData, 'votingCardNode'>;

function VotingCardNodeComponent({ data }: NodeProps<VotingCardNodeType>) {
  const {
    slot,
    voteCount,
    rank,
    voterDots,
    myVoteId,
    canVote,
    isFacilitator,
    isSelected,
    votingStatus,
    onCastVote,
    onRetractVote,
    onToggleSelect,
  } = data;

  const displayTitle = slot.title
    || (slot.description
      ? slot.description.replace(/^Activity:\s*/i, '').split(/[.!?]/)[0].slice(0, 50)
      : 'Untitled');

  const initials = slot.ownerName
    ? slot.ownerName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div
      className={cn(
        'w-[240px] h-[320px] rounded-xl border bg-card shadow-md flex flex-col overflow-hidden',
        isSelected && 'ring-2 ring-primary',
        votingStatus === 'closed' && voteCount === 0 && 'opacity-50',
      )}
    >
      {/* Sketch image */}
      <div className="relative w-full h-[150px] bg-muted flex-shrink-0">
        {slot.imageUrl ? (
          <img
            src={slot.imageUrl}
            alt={slot.title || 'Sketch'}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No sketch
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
        <h4 className="text-sm font-semibold truncate">{displayTitle}</h4>
        {slot.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{slot.description}</p>
        )}

        {/* Owner row */}
        <div className="flex items-center gap-1.5 mt-auto">
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
            style={{ backgroundColor: slot.ownerColor ?? '#608850' }}
          >
            {initials}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {slot.ownerName ?? 'Unknown'}
          </span>
        </div>

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
              onClick={() => onCastVote(slot.slotId)}
            >
              <ThumbsUp className="h-3 w-3" />
              +1 Vote
            </Button>
          )
        )}
        {votingStatus === 'closed' && isFacilitator && (
          <div className="flex items-center gap-2">
            <Checkbox
              id={`select-${slot.slotId}`}
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(slot.slotId)}
            />
            <label htmlFor={`select-${slot.slotId}`} className="text-xs cursor-pointer">
              Include
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

export const VotingCardNode = memo(VotingCardNodeComponent);
