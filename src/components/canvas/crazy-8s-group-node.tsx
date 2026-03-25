'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { Crazy8sCanvas } from '@/components/workshop/crazy-8s-canvas';
import { Zap, Save, Check, Loader2, SkipForward, CheckCircle2, Pencil, Link2, Unlink, X, Wand2, Image, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import type { SlotGroup } from '@/lib/canvas/crazy-8s-types';

export type Crazy8sGroupNodeData = {
  workshopId: string;
  stepId: string;
  onSave?: () => Promise<void>;
  // Per-participant owner filtering
  ownerId?: string;       // filter slots to this owner
  ownerName?: string;     // display name for header
  ownerColor?: string;    // hex accent color for border/bg
  // Selection mode props
  selectionMode?: boolean;
  selectedSlotIds?: string[];
  onSelectionChange?: (slotIds: string[]) => void;
  onConfirmSelection?: (skip: boolean) => void;
  onBackToDrawing?: () => void;
  // Voting mode props (pass-through to Crazy8sCanvas)
  votingMode?: boolean;
  onVoteSelectionConfirm?: (selectedSlotIds: string[]) => void;
  onReVote?: () => void;
  // Merge dialog trigger
  onStartMerge?: (groupId: string) => void;
  // Inline results control (multiplayer "All" view keeps grid visible after voting)
  showResultsInline?: boolean;
  // Sync starred mind map nodes → slot titles (may be async for AI enhancement)
  onSyncStars?: () => void | Promise<void>;
  // Multiplayer completion info — shown as waiting overlay after save
  completionInfo?: {
    totalParticipants: number;
    completedCount: number;
  };
};

export type Crazy8sGroupNode = Node<Crazy8sGroupNodeData, 'crazy8sGroupNode'>;

export const CRAZY_8S_NODE_ID = 'crazy-8s-group';
export const CRAZY_8S_NODE_WIDTH = 900;
export const CRAZY_8S_NODE_HEIGHT = 620;

const MAX_SELECTION = 4;

/**
 * Count how many "selection units" are used.
 * Each ungrouped selected slot = 1 unit.
 * Each group (regardless of member count) = 1 unit.
 */
function countSelectionUnits(selectedSlotIds: string[], slotGroups: SlotGroup[]): number {
  const groupedSlotIds = new Set(slotGroups.flatMap((g) => g.slotIds));
  const selectedGroupIds = new Set<string>();
  let ungroupedCount = 0;

  for (const slotId of selectedSlotIds) {
    if (groupedSlotIds.has(slotId)) {
      const group = slotGroups.find((g) => g.slotIds.includes(slotId));
      if (group) selectedGroupIds.add(group.id);
    } else {
      ungroupedCount++;
    }
  }

  return ungroupedCount + selectedGroupIds.size;
}

export const Crazy8sGroupNode = memo(({ data }: NodeProps<Crazy8sGroupNode>) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const allCrazy8sSlots = useCanvasStore((s) => s.crazy8sSlots);
  const slotGroups = useCanvasStore((s) => s.slotGroups);
  const addSlotGroup = useCanvasStore((s) => s.addSlotGroup);
  const removeSlotGroup = useCanvasStore((s) => s.removeSlotGroup);

  // Deduplicate by slotId (Liveblocks CRDT sync can produce duplicates), then filter by owner
  const crazy8sSlots = useMemo(() => {
    const seen = new Set<string>();
    return allCrazy8sSlots
      .filter((s) => {
        if (seen.has(s.slotId)) return false;
        seen.add(s.slotId);
        return true;
      })
      .filter((s) => !data.ownerId || s.ownerId === data.ownerId);
  }, [allCrazy8sSlots, data.ownerId]);

  // Owner color overrides — use owner's accent or fallback to amber
  const borderColor = data.ownerColor || undefined; // undefined → use default amber
  const headerTitle = data.ownerName
    ? `${data.ownerName} — Rapid Sketching`
    : 'Crazy 8s — Rapid Sketching';

  // Group creation state
  const [isNamingGroup, setIsNamingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');

  // At least one slot must have an image to enable save
  const hasDrawings = crazy8sSlots.some((slot) => slot.imageUrl);

  const handleSave = async () => {
    if (!data.onSave || isSaving) return;
    setIsSaving(true);
    try {
      await data.onSave();
      setSaved(true);
    } catch (err) {
      console.error('Failed to save Crazy 8s:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Selection mode helpers
  const filledSlots = crazy8sSlots.filter((slot) => slot.imageUrl);
  const selectedSlotIds = data.selectedSlotIds ?? [];
  const selectionUnits = countSelectionUnits(selectedSlotIds, slotGroups);

  // Find which group a slot belongs to (if any)
  const getSlotGroup = useCallback((slotId: string): SlotGroup | undefined => {
    return slotGroups.find((g) => g.slotIds.includes(slotId));
  }, [slotGroups]);

  // Get all slot IDs in a group
  const getGroupMembers = useCallback((slotId: string): string[] => {
    const group = getSlotGroup(slotId);
    return group ? group.slotIds : [slotId];
  }, [getSlotGroup]);

  const toggleSelection = (slotId: string) => {
    if (!data.onSelectionChange) return;
    const members = getGroupMembers(slotId);
    const isAnySelected = members.some((id) => selectedSlotIds.includes(id));

    if (isAnySelected) {
      // Deselect all members
      data.onSelectionChange(selectedSlotIds.filter((id) => !members.includes(id)));
    } else {
      // Check if adding this would exceed limit
      const group = getSlotGroup(slotId);
      const wouldAdd = group ? 1 : 1; // Groups count as 1 unit
      if (selectionUnits + wouldAdd <= MAX_SELECTION) {
        data.onSelectionChange([...selectedSlotIds, ...members]);
      }
    }
  };

  // Group creation
  const handleCreateGroup = useCallback(() => {
    if (!groupName.trim() || selectedSlotIds.length < 2) return;

    // Filter to only ungrouped selected slots
    const ungroupedSelected = selectedSlotIds.filter((id) => !getSlotGroup(id));
    if (ungroupedSelected.length < 2) return;

    const newGroup: SlotGroup = {
      id: crypto.randomUUID(),
      label: groupName.trim(),
      slotIds: ungroupedSelected,
    };

    addSlotGroup(newGroup);
    setGroupName('');
    setIsNamingGroup(false);
  }, [groupName, selectedSlotIds, getSlotGroup, addSlotGroup]);

  const handleUngroup = useCallback((groupId: string) => {
    removeSlotGroup(groupId);
  }, [removeSlotGroup]);

  // Count ungrouped selected slots (for showing group button)
  const ungroupedSelectedCount = selectedSlotIds.filter((id) => !getSlotGroup(id)).length;

  // --- Selection mode rendering ---
  if (data.selectionMode) {
    return (
      <div
        className="cursor-default"
        style={{ width: CRAZY_8S_NODE_WIDTH, height: CRAZY_8S_NODE_HEIGHT, pointerEvents: 'all' }}
      >
        <div className="rounded-xl border-2 border-amber-400/60 bg-background shadow-lg h-full flex flex-col">
          {/* Header — acts as drag handle */}
          <div className="flex items-center justify-between border-b bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5 shrink-0 rounded-t-[10px] cursor-grab active:cursor-grabbing">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Select Your Best Ideas
              </span>
              <span className="text-xs text-amber-600/70 dark:text-amber-400/70">
                {selectionUnits}/{MAX_SELECTION} selected
              </span>
            </div>
            <div className="nodrag nopan flex items-center gap-2">
              {/* Group button — shown when 2+ ungrouped items are selected */}
              {ungroupedSelectedCount >= 2 && !isNamingGroup && (
                <button
                  onClick={() => setIsNamingGroup(true)}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40 transition-colors"
                  title="Group selected ideas as parts of one solution"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Group
                </button>
              )}
              {data.onBackToDrawing && (
                <button
                  onClick={data.onBackToDrawing}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Sketches
                </button>
              )}
              <button
                onClick={() => data.onConfirmSelection?.(true)}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40 transition-colors"
              >
                <SkipForward className="h-3.5 w-3.5" />
                Skip
              </button>
              <button
                onClick={() => data.onConfirmSelection?.(false)}
                disabled={selectedSlotIds.length === 0}
                className="flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Continue to Brain Rewriting
              </button>
            </div>
          </div>

          {/* Group naming bar */}
          {isNamingGroup && (
            <div className="nodrag nopan flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/20 border-b">
              <Link2 className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="text-xs text-blue-700 dark:text-blue-300 shrink-0">Name this group:</span>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateGroup();
                  if (e.key === 'Escape') { setIsNamingGroup(false); setGroupName(''); }
                }}
                placeholder="e.g., Home Page Design"
                className="flex-1 rounded-md border border-blue-300 bg-white dark:bg-blue-950/40 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim()}
                className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => { setIsNamingGroup(false); setGroupName(''); }}
                className="rounded-md p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Active groups display */}
          {slotGroups.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b bg-muted/30">
              <span className="text-xs text-muted-foreground">Groups:</span>
              {slotGroups.map((group) => {
                const memberTitles = group.slotIds
                  .map((id) => {
                    const slot = crazy8sSlots.find((s) => s.slotId === id);
                    return slot?.title || `Sketch ${id.split('-slot-').pop() || id.replace('slot-', '')}`;
                  })
                  .join(' + ');
                const hasMerged = !!group.mergedImageUrl;
                return (
                  <span
                    key={group.id}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 px-2.5 py-0.5 text-xs text-blue-800 dark:text-blue-200"
                  >
                    <Link2 className="h-3 w-3" />
                    {group.label}
                    <span className="text-blue-500 dark:text-blue-400">({memberTitles})</span>
                    {/* Merge button */}
                    <button
                      onClick={() => data.onStartMerge?.(group.id)}
                      className={cn(
                        'ml-0.5 rounded-full p-0.5 transition-colors',
                        hasMerged
                          ? 'text-green-600 hover:bg-green-200 dark:text-green-400 dark:hover:bg-green-900/40'
                          : 'text-amber-600 hover:bg-amber-200 dark:text-amber-400 dark:hover:bg-amber-900/40'
                      )}
                      title={hasMerged ? 'View/edit merged sketch' : 'Merge into single sketch'}
                    >
                      {hasMerged ? <Image className="h-3 w-3" /> : <Wand2 className="h-3 w-3" />}
                    </button>
                    <button
                      onClick={() => handleUngroup(group.id)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      title="Ungroup"
                    >
                      <Unlink className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Thumbnail selection grid */}
          <div className="nodrag nopan flex-1 min-h-0 overflow-y-auto p-4">
            {filledSlots.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {filledSlots.map((slot) => {
                  const isSelected = selectedSlotIds.includes(slot.slotId);
                  const group = getSlotGroup(slot.slotId);
                  const isGrouped = !!group;
                  const isDisabled = !isSelected && selectionUnits >= MAX_SELECTION;
                  const slotNumber = slot.slotId.split('-slot-').pop() || slot.slotId.replace('slot-', '');

                  return (
                    <button
                      key={slot.slotId}
                      onClick={() => toggleSelection(slot.slotId)}
                      disabled={isDisabled}
                      className={cn(
                        'relative rounded-lg border-2 p-2 transition-all text-left',
                        isSelected && !isGrouped
                          ? 'border-olive-600 ring-2 ring-olive-600/20 bg-olive-50/30 dark:bg-olive-950/20'
                          : isSelected && isGrouped
                            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30 dark:bg-blue-950/20'
                            : 'border-muted hover:border-amber-400/60',
                        isDisabled && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      <div className="aspect-square w-full overflow-hidden rounded bg-muted">
                        {slot.imageUrl && (
                          <img
                            src={slot.imageUrl}
                            alt={slot.title || `Sketch ${slotNumber}`}
                            className="h-full w-full object-contain"
                          />
                        )}
                      </div>
                      <div className="mt-1.5 text-xs font-medium truncate text-foreground">
                        {slot.title || `Sketch ${slotNumber}`}
                      </div>
                      {/* Group badge */}
                      {isGrouped && (
                        <div className="absolute top-3 left-3 flex items-center gap-0.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-white shadow-md">
                          <Link2 className="h-2.5 w-2.5" />
                          <span className="text-[10px] font-medium max-w-[60px] truncate">{group.label}</span>
                        </div>
                      )}
                      {isSelected && (
                        <div className={cn(
                          'absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-md',
                          isGrouped ? 'bg-blue-600' : 'bg-olive-600'
                        )}>
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No sketches to select from. Draw some ideas first.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Normal drawing mode ---
  return (
    <div
      className="cursor-default"
      style={{ width: CRAZY_8S_NODE_WIDTH, height: CRAZY_8S_NODE_HEIGHT, pointerEvents: 'all' }}
    >
      <div
        className={cn('rounded-xl border-2 bg-background shadow-lg h-full flex flex-col relative', !borderColor && 'border-amber-400/60')}
        style={borderColor ? { borderColor: `color-mix(in srgb, ${borderColor} 60%, transparent)` } : undefined}
      >
        <div
          className={cn('flex items-center justify-between border-b px-4 py-2.5 shrink-0 rounded-t-[10px] cursor-grab active:cursor-grabbing', !borderColor && 'bg-amber-50 dark:bg-amber-950/20')}
          style={borderColor ? { backgroundColor: `color-mix(in srgb, ${borderColor} 10%, transparent)` } : undefined}
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: borderColor || '#d97706' }} />
            <span className="text-sm font-semibold" style={{ color: borderColor || undefined }}>
              {headerTitle}
            </span>
          </div>
          <div className="nodrag nopan flex items-center gap-2">
            {data.onSyncStars && (
              <button
                onClick={async () => {
                  setIsSyncing(true);
                  try { await data.onSyncStars?.(); } finally { setIsSyncing(false); }
                }}
                disabled={isSyncing}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50"
                title="Update slot titles from starred mind map nodes"
              >
                {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5 fill-current" />}
                {isSyncing ? 'Syncing...' : 'Sync Stars'}
              </button>
            )}
            {data.onSave && hasDrawings && (
              <button
                onClick={handleSave}
                disabled={isSaving || saved}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  saved
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50'
                }`}
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : saved ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {isSaving ? 'Saving...' : saved ? 'Saved' : 'Save & Continue'}
              </button>
            )}
          </div>
        </div>
        <div className="nodrag nopan flex-1 min-h-0">
          <Crazy8sCanvas
            workshopId={data.workshopId}
            stepId={data.stepId}
            ownerId={data.ownerId}
            votingMode={data.votingMode}
            onVoteSelectionConfirm={data.onVoteSelectionConfirm}
            onReVote={data.onReVote}
            showResultsInline={data.showResultsInline}
          />
        </div>
        {/* Waiting overlay — shown after save in multiplayer */}
        {saved && data.completionInfo && (
          <div className="absolute inset-0 rounded-xl bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-sm font-semibold text-foreground">Sketches Saved!</div>
            <div className="text-xs text-muted-foreground">Waiting for other participants...</div>
            {/* Progress bar */}
            <div className="w-48 space-y-1">
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${(data.completionInfo.completedCount / data.completionInfo.totalParticipants) * 100}%` }}
                />
              </div>
              <div className="text-center text-[11px] text-muted-foreground">
                {data.completionInfo.completedCount}/{data.completionInfo.totalParticipants} ready
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

Crazy8sGroupNode.displayName = 'Crazy8sGroupNode';
