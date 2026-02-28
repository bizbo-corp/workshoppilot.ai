'use client';

/**
 * VotingResultsPanel — Displays ranked voting results after voting closes.
 *
 * Shows all 8 sketches ordered by vote count with:
 *  - Rank badge (#1, #2, ...)
 *  - Sketch thumbnail (if imageUrl exists)
 *  - Vote count
 *  - Title and description
 *  - Checkbox (pre-checked for all slots with votes > 0)
 *  - Zero-vote sketches dimmed at the bottom
 *
 * Actions:
 *  - "Continue with N idea(s)" → calls onConfirmSelection with selected slot IDs
 *  - "Vote Again" → calls onReVote to reset and re-open voting
 */

import * as React from 'react';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { VotingResult } from '@/lib/canvas/voting-types';
import type { Crazy8sSlot } from '@/lib/canvas/crazy-8s-types';

interface VotingResultsPanelProps {
  onConfirmSelection: (selectedSlotIds: string[]) => void;
  onReVote: () => void;
}

interface ResultCardProps {
  result: VotingResult;
  slot: Crazy8sSlot | undefined;
  index: number;
  slotNumber: number;
  isSelected: boolean;
  onToggle: (slotId: string) => void;
}

function ResultCard({ result, slot, index, slotNumber, isSelected, onToggle }: ResultCardProps) {
  const isZeroVote = result.totalVotes === 0;
  const isTopRanked = result.rank === 1;

  return (
    <div
      className={cn(
        'flex items-start gap-4 p-4 rounded-lg border bg-card transition-all duration-200 cursor-pointer hover:border-primary/50',
        isZeroVote && 'opacity-50',
        isSelected && 'border-primary/70 bg-primary/5'
      )}
      onClick={() => onToggle(result.slotId)}
    >
      {/* Rank badge */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
          isTopRanked
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        #{result.rank}
      </div>

      {/* Thumbnail */}
      {slot?.imageUrl ? (
        <div className="flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border bg-muted">
          <img
            src={slot.imageUrl}
            alt={slot.title || `Sketch ${slotNumber}`}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="flex-shrink-0 w-20 h-20 rounded-md border border-dashed bg-muted/30 flex items-center justify-center">
          <span className="text-xs text-muted-foreground font-medium">{slotNumber}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {slot?.title || `Sketch ${slotNumber}`}
        </p>
        {slot?.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {slot.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1.5 font-medium">
          {result.totalVotes === 0
            ? 'No votes'
            : result.totalVotes === 1
              ? '1 vote'
              : `${result.totalVotes} votes`}
        </p>
      </div>

      {/* Checkbox */}
      <div className="flex-shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(result.slotId)}
          aria-label={`Select ${slot?.title || `Sketch ${slotNumber}`}`}
        />
      </div>
    </div>
  );
}

export function VotingResultsPanel({ onConfirmSelection, onReVote }: VotingResultsPanelProps) {
  const votingSession = useCanvasStore((s) => s.votingSession);
  const crazy8sSlots = useCanvasStore((s) => s.crazy8sSlots);

  // Sort results by rank (ascending) — same rank = tied
  const sortedResults = React.useMemo<VotingResult[]>(() => {
    if (!votingSession.results || votingSession.results.length === 0) return [];
    return [...votingSession.results].sort((a, b) => a.rank - b.rank);
  }, [votingSession.results]);

  // Pre-check all slots with at least 1 vote
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() =>
    sortedResults.filter((r) => r.totalVotes > 0).map((r) => r.slotId)
  );

  // Sync selectedIds when results change (e.g. vote again then re-close)
  React.useEffect(() => {
    setSelectedIds(sortedResults.filter((r) => r.totalVotes > 0).map((r) => r.slotId));
  }, [sortedResults]);

  // Fade-in on mount
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleToggle = (slotId: string) => {
    setSelectedIds((prev) =>
      prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]
    );
  };

  const handleConfirm = () => {
    onConfirmSelection(selectedIds);
  };

  if (sortedResults.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">No voting results available.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'h-full overflow-auto p-6 transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Voting Results</h3>
        <p className="text-sm text-muted-foreground">
          Select the ideas you want to develop further
        </p>
      </div>

      {/* Results list — ordered by rank */}
      <div className="space-y-3">
        {sortedResults.map((result, i) => {
          const slot = crazy8sSlots.find((s) => s.slotId === result.slotId);
          // Derive slot number from slotId (e.g. "slot-3" → 3)
          const slotNumber = parseInt(result.slotId.replace('slot-', ''), 10) || i + 1;
          return (
            <ResultCard
              key={result.slotId}
              result={result}
              slot={slot}
              index={i}
              slotNumber={slotNumber}
              isSelected={selectedIds.includes(result.slotId)}
              onToggle={handleToggle}
            />
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex items-center gap-3">
        <Button
          onClick={handleConfirm}
          disabled={selectedIds.length === 0}
        >
          Continue with {selectedIds.length} idea{selectedIds.length === 1 ? '' : 's'}
        </Button>
        <Button variant="outline" onClick={onReVote}>
          Vote Again
        </Button>
      </div>
    </div>
  );
}
