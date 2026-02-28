'use client';

/**
 * Crazy 8s Grid Component
 * 2x4 grid (4 columns x 2 rows) for rapid sketching exercise
 * Each slot is a canvas for one sketch idea (8 ideas in 8 minutes)
 */

import { cn } from '@/lib/utils';
import type { Crazy8sSlot } from '@/lib/canvas/crazy-8s-types';
import type { DotVote } from '@/lib/canvas/voting-types';
import { Pencil, Loader2 } from 'lucide-react';

interface Crazy8sGridProps {
  slots: Crazy8sSlot[];
  onSlotClick: (slotId: string) => void;
  onTitleChange: (slotId: string, title: string) => void;
  onDescriptionChange: (slotId: string, description: string) => void;
  aiPrompts?: string[];  // Optional sketch prompts from AI (Plan 28-05 feature hook)
  savingSlotId?: string | null;
  // Voting mode props
  votingMode?: boolean;
  dotVotes?: DotVote[];
  voterId?: string;
  remainingBudget?: number;
  onCastVote?: (slotId: string) => void;
  onRetractVote?: (voteId: string) => void;
}

/**
 * Crazy 8s Grid Component
 * Displays 8 sketch slots in a 2x4 layout with empty/filled states
 * Supports editable titles, descriptions, and AI-suggested prompts
 */
export function Crazy8sGrid({ slots, onSlotClick, onTitleChange, onDescriptionChange, aiPrompts, savingSlotId, votingMode, dotVotes, voterId, remainingBudget, onCastVote, onRetractVote }: Crazy8sGridProps) {
  return (
    <div className="w-full">
      {/* Instructions header */}
      <div className="mb-4 p-4 rounded-lg border bg-muted/50">
        <p className="text-sm text-muted-foreground">
          Sketch 8 different ideas in 8 minutes. Tap any slot to draw, then add a title.
        </p>
      </div>

      {/* 2x4 grid */}
      <div className="grid grid-cols-4 gap-4">
        {slots.map((slot, index) => {
          const hasImage = Boolean(slot.imageUrl);
          const hasPreFill = Boolean(slot.title || slot.description);
          const isSaving = savingSlotId === slot.slotId;

          // Voting mode computed values
          const slotVoteCount = votingMode
            ? (dotVotes || []).filter((v) => v.slotId === slot.slotId).length
            : 0;
          const myVotesOnSlot = votingMode
            ? (dotVotes || []).filter((v) => v.slotId === slot.slotId && v.voterId === voterId)
            : [];

          return (
            <div
              key={slot.slotId}
              className={cn(
                "relative aspect-square border-2 rounded-lg overflow-hidden transition-all cursor-pointer",
                hasImage
                  ? "border-primary/50 hover:border-primary"
                  : "border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 bg-muted/20"
              )}
              onClick={() => onSlotClick(slot.slotId)}
            >
              {/* Slot number badge (always visible) */}
              <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-background border flex items-center justify-center text-xs font-semibold">
                {index + 1}
              </div>

              {/* Vote count badge (top-right, clickable for retract) */}
              {votingMode && slotVoteCount > 0 && (
                <button
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-sm hover:bg-primary/80 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Retract the most recent vote on this slot from this voter
                    const lastVote = myVotesOnSlot[myVotesOnSlot.length - 1];
                    if (lastVote) onRetractVote?.(lastVote.id);
                  }}
                  title="Click to retract one vote"
                >
                  {slotVoteCount}
                </button>
              )}

              {/* Vote button (bottom-left, "+1") */}
              {votingMode && (
                <button
                  className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2.5 py-1 text-xs font-semibold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={(e) => { e.stopPropagation(); onCastVote?.(slot.slotId); }}
                  disabled={(remainingBudget ?? 0) <= 0}
                  title="Cast a vote"
                >
                  +1
                </button>
              )}

              {/* Saving spinner overlay */}
              {isSaving && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                  <div className="flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 shadow-sm border">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Saving...</span>
                  </div>
                </div>
              )}

              {hasImage ? (
                <>
                  {/* Filled slot: show image */}
                  <img
                    src={slot.imageUrl}
                    alt={slot.title || `Sketch ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Title + description overlay at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm p-2 space-y-0.5">
                    <input
                      type="text"
                      value={slot.title}
                      onChange={(e) => onTitleChange(slot.slotId, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Add title..."
                      className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-muted-foreground/50"
                    />
                    <input
                      type="text"
                      value={slot.description || ''}
                      onChange={(e) => onDescriptionChange(slot.slotId, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Add description..."
                      className="w-full bg-transparent text-[10px] text-muted-foreground outline-none placeholder:text-muted-foreground/30"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Empty slot: show pencil icon and prompt */}
                  <div className="flex flex-col items-center justify-center h-full p-4">
                    <Pencil className="h-12 w-12 text-muted-foreground opacity-40" />

                    {hasPreFill ? (
                      <>
                        {/* Pre-filled title + description as sketch prompt */}
                        <p className="text-xs font-medium text-foreground/80 mt-2 text-center line-clamp-2">
                          {slot.title}
                        </p>
                        {slot.description && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 text-center line-clamp-2 max-w-[90%]">
                            {slot.description}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground mt-2">Click to sketch</p>

                        {/* AI prompt (if available) */}
                        {aiPrompts?.[index] && (
                          <p className="text-xs text-muted-foreground/70 mt-1 italic max-w-[80%] text-center">
                            {aiPrompts[index]}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
