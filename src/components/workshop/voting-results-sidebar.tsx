'use client';

/**
 * VotingResultsSidebar — Compact floating panel for the results phase,
 * positioned inside MindMapCanvas as a ReactFlow Panel.
 *
 * Shows ranked results with checkboxes (facilitator) or read-only (participants).
 * Groups show a "Merge" button if no merged image exists yet.
 */

import * as React from 'react';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Merge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMultiplayerContext } from './multiplayer-room';
import type { VotingResult } from '@/lib/canvas/voting-types';

interface VotingResultsSidebarProps {
  onConfirmSelection: (selectedIds: string[]) => void;
  onReVote: () => void;
  onStartMerge: (groupId: string) => void;
}

export function VotingResultsSidebar({
  onConfirmSelection,
  onReVote,
  onStartMerge,
}: VotingResultsSidebarProps) {
  const votingSession = useCanvasStore((s) => s.votingSession);
  const crazy8sSlots = useCanvasStore((s) => s.crazy8sSlots);
  const slotGroups = useCanvasStore((s) => s.slotGroups);
  const { isFacilitator, isMultiplayer } = useMultiplayerContext();
  const readOnly = isMultiplayer && !isFacilitator;

  // Sort results by rank ascending
  const sortedResults = React.useMemo<VotingResult[]>(() => {
    if (!votingSession.results?.length) return [];
    return [...votingSession.results].sort((a, b) => a.rank - b.rank);
  }, [votingSession.results]);

  // Pre-check all targets with votes > 0
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() =>
    sortedResults.filter((r) => r.totalVotes > 0).map((r) => r.slotId)
  );

  // Sync when results change
  React.useEffect(() => {
    setSelectedIds(sortedResults.filter((r) => r.totalVotes > 0).map((r) => r.slotId));
  }, [sortedResults]);

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (sortedResults.length === 0) return null;

  return (
    <div className="w-[320px] bg-background border rounded-xl shadow-lg overflow-hidden">
      <div className="p-3 border-b">
        <h3 className="text-sm font-semibold">Voting Results</h3>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        <div className="p-2 space-y-1">
          {sortedResults.map((result, idx) => {
            // Look up as slot or group
            const slot = crazy8sSlots.find((s) => s.slotId === result.slotId);
            const group = slotGroups.find((g) => g.id === result.slotId);
            const title = group?.label ?? slot?.title ?? 'Untitled';
            const imageUrl = group?.mergedImageUrl ?? slot?.imageUrl;
            const isGroup = !!group;
            const hasMergedImage = isGroup && !!group.mergedImageUrl;

            return (
              <div
                key={`${result.slotId}-${idx}`}
                className={cn(
                  'flex items-center gap-2 rounded-lg p-2 transition-colors',
                  result.totalVotes === 0 && 'opacity-50',
                  selectedIds.includes(result.slotId) && 'bg-accent/50',
                )}
              >
                {/* Rank badge */}
                <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  #{result.rank}
                </span>

                {/* Mini thumbnail */}
                <div className="w-10 h-8 rounded border bg-muted flex-shrink-0 overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground">
                      {isGroup ? 'GRP' : '—'}
                    </div>
                  )}
                </div>

                {/* Title + vote count */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {result.totalVotes} vote{result.totalVotes !== 1 ? 's' : ''}
                    {isGroup && ` · ${group.slotIds.length} ideas`}
                  </p>
                </div>

                {/* Group merge button */}
                {isGroup && !hasMergedImage && isFacilitator && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    title="Merge group"
                    onClick={() => onStartMerge(group.id)}
                  >
                    <Merge className="h-3 w-3" />
                  </Button>
                )}

                {/* Checkbox (facilitator only) */}
                {!readOnly && (
                  <Checkbox
                    checked={selectedIds.includes(result.slotId)}
                    onCheckedChange={() => handleToggle(result.slotId)}
                    className="flex-shrink-0"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer actions */}
      <div className="p-3 border-t">
        {readOnly ? (
          <p className="text-xs text-muted-foreground italic text-center">
            Waiting for facilitator to select ideas...
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="flex-1 text-xs"
              disabled={selectedIds.length === 0}
              onClick={() => onConfirmSelection(selectedIds)}
            >
              Continue with {selectedIds.length} idea{selectedIds.length !== 1 ? 's' : ''}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={onReVote}
            >
              Vote Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
