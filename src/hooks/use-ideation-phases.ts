'use client';

import * as React from 'react';
import { useCanvasStore, useCanvasStoreApi } from '@/providers/canvas-store-provider';
import { saveCanvasState } from '@/actions/canvas-actions';
import { createEmptyMatrix } from '@/lib/canvas/brain-rewriting-types';
import { EMPTY_CRAZY_8S_SLOTS } from '@/lib/canvas/crazy-8s-types';
import { MindMapCanvas } from '@/components/workshop/mind-map-canvas';
import { VotingHud } from '@/components/workshop/voting-hud';
import { MergeGroupDialog } from '@/components/workshop/merge-group-dialog';
import { useIdeationSeeding, type IdeationOwner } from '@/hooks/use-ideation-seeding';
import type { IdeationPhase } from '@/stores/canvas-store';

export type { IdeationPhase };

interface UseIdeationPhasesOptions {
  enabled: boolean;
  workshopId: string;
  stepId: string;
  stepStatus?: 'not_started' | 'in_progress' | 'complete' | 'needs_regeneration';
  initialArtifact?: Record<string, unknown> | null;
  hmwStatement?: string;
  challengeStatement?: string;
  hmwGoals?: Array<{ label: string; fullStatement: string }>;
  currentOwnerId?: string; // Per-participant filtering (multiplayer ideation)
  ideationOwners?: IdeationOwner[]; // Multiplayer owner metadata for client-side seeding
}

export function useIdeationPhases({
  enabled,
  workshopId,
  stepId,
  stepStatus,
  initialArtifact,
  hmwStatement,
  challengeStatement,
  hmwGoals,
  currentOwnerId,
  ideationOwners,
}: UseIdeationPhasesOptions) {
  const canvasStoreApi = useCanvasStoreApi();

  // Track deleted owner IDs so they're removed from the filter bar immediately
  // Declared early so it can filter ideationOwners before seeding.
  const [deletedOwnerIds, setDeletedOwnerIds] = React.useState<Set<string>>(new Set());

  // Filter ideationOwners to exclude deleted participants before seeding
  const filteredIdeationOwners = React.useMemo(
    () => (ideationOwners || []).filter((o) => !deletedOwnerIds.has(o.ownerId)),
    [ideationOwners, deletedOwnerIds]
  );

  // Client-side seeding for multiplayer ideation — creates nodes INSIDE the
  // Liveblocks-connected store instead of fighting server-side recovery.
  useIdeationSeeding({
    owners: filteredIdeationOwners,
    challengeStatement,
    hmwStatement,
    currentOwnerId,
  });

  // Canvas store selectors — always called (hooks can't be conditional)
  const mindMapNodes = useCanvasStore(state => state.mindMapNodes);
  const brainRewritingMatrices = useCanvasStore(state => state.brainRewritingMatrices);
  const votingSession = useCanvasStore(state => state.votingSession);
  const slotGroups = useCanvasStore(state => state.slotGroups);

  // Compute initial phase synchronously from store — eliminates flash of wrong phase on refresh
  const initialResumeState = React.useMemo(() => {
    if (!enabled) {
      return { phase: 'mind-mapping' as IdeationPhase, showCrazy8s: false, selectedSlotIds: [] as string[], artifactConfirmed: false };
    }
    const state = canvasStoreApi.getState();
    const isComplete = stepStatus === 'complete';

    if (state.brainRewritingMatrices.length > 0) {
      return {
        phase: 'brain-rewriting' as IdeationPhase,
        showCrazy8s: true,
        selectedSlotIds: state.selectedSlotIds,
        artifactConfirmed: isComplete,
      };
    } else if (state.votingSession.status === 'open' || state.votingSession.status === 'closed') {
      return {
        phase: 'idea-selection' as IdeationPhase,
        showCrazy8s: true,
        selectedSlotIds: state.selectedSlotIds,
        artifactConfirmed: false,
      };
    } else if (state.selectedSlotIds.length > 0) {
      return {
        phase: 'idea-selection' as IdeationPhase,
        showCrazy8s: true,
        selectedSlotIds: state.selectedSlotIds,
        artifactConfirmed: false,
      };
    } else if (state.crazy8sSlots.some(slot => slot.imageUrl)) {
      return {
        phase: 'idea-selection' as IdeationPhase,
        showCrazy8s: true,
        selectedSlotIds: [] as string[],
        artifactConfirmed: false,
      };
    }
    return {
      phase: 'mind-mapping' as IdeationPhase,
      showCrazy8s: false,
      selectedSlotIds: [] as string[],
      artifactConfirmed: isComplete,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only compute once on mount
  }, []);

  // Phase management
  const [currentPhase, setCurrentPhase] = React.useState<IdeationPhase>(initialResumeState.phase);
  const [showCrazy8s, setShowCrazy8s] = React.useState(initialResumeState.showCrazy8s);
  const [liveMessageCount, setLiveMessageCount] = React.useState(0);
  const [isEnhancingIdeas, setIsEnhancingIdeas] = React.useState(false);

  // Selection state
  const [localSelectedSlotIds, setLocalSelectedSlotIds] = React.useState<string[]>(initialResumeState.selectedSlotIds);

  // Merge dialog state
  const [mergeGroupId, setMergeGroupId] = React.useState<string | null>(null);
  const mergeGroup = mergeGroupId ? slotGroups.find(g => g.id === mergeGroupId) : undefined;

  // Artifact confirmation state
  const [artifactConfirmed, setArtifactConfirmed] = React.useState(initialResumeState.artifactConfirmed);
  const [explicitlyConfirmed, setExplicitlyConfirmed] = React.useState(false);

  // Facilitator owner switcher state (for viewing different participants' mind maps)
  // null = "All" (show all owners), undefined = not yet set (falls back to currentOwnerId)
  const [viewingOwnerId, setViewingOwnerId] = React.useState<string | null | undefined>(currentOwnerId);



  // Delete a participant and their canvas content
  const handleDeleteOwner = React.useCallback(async (ownerId: string) => {
    // 1. Remove canvas content (client-side, syncs via Liveblocks)
    const state = canvasStoreApi.getState();
    state.deleteOwnerContent(ownerId);

    // 2. Remove from filter bar immediately
    setDeletedOwnerIds((prev) => new Set([...prev, ownerId]));

    // 3. If viewing this owner, switch to "All"
    setViewingOwnerId((prev) => (prev === ownerId ? null : prev));

    // 4. Hard delete participant from DB (ownerId IS the participantId for non-facilitator)
    try {
      await fetch('/api/remove-participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: ownerId, workshopId }),
      });
    } catch (err) {
      console.error('Failed to delete participant:', err);
    }

    // 5. Persist cleaned canvas state to DB so deleted owner doesn't return on page reload
    if (stepId) {
      try {
        const s = canvasStoreApi.getState();
        await saveCanvasState(workshopId, stepId, {
          stickyNotes: s.stickyNotes,
          ...(s.mindMapNodes.length > 0 ? { mindMapNodes: s.mindMapNodes } : {}),
          ...(s.mindMapEdges.length > 0 ? { mindMapEdges: s.mindMapEdges } : {}),
          ...(s.crazy8sSlots.length > 0 ? { crazy8sSlots: s.crazy8sSlots } : {}),
          ...(s.hmwCards.length > 0 ? { hmwCards: s.hmwCards } : {}),
        });
        s.markClean();
      } catch (err) {
        console.error('Failed to flush canvas state after owner deletion:', err);
      }
    }
  }, [canvasStoreApi, workshopId, stepId]);

  // Sync store ideationPhase to local state (multiplayer: facilitator changes propagate)
  const storeIdeationPhase = useCanvasStore(state => state.ideationPhase);
  const setStoreIdeationPhase = useCanvasStore(state => state.setIdeationPhase);
  React.useEffect(() => {
    if (!enabled) return;
    if (storeIdeationPhase && storeIdeationPhase !== currentPhase) {
      setCurrentPhase(storeIdeationPhase);
      if (storeIdeationPhase !== 'mind-mapping') setShowCrazy8s(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to store changes
  }, [storeIdeationPhase]);

  // Mind map has content when there are level-1 theme nodes
  const mindMapHasThemes = React.useMemo(
    () => mindMapNodes.filter(node => node.level === 1).length > 0,
    [mindMapNodes]
  );

  // Show confirm button after AI's first response
  const hasEnoughMessages = liveMessageCount >= 2;

  // Helper: flush full canvas state to DB
  const flushCanvasState = React.useCallback(async () => {
    if (!stepId) return;
    const state = canvasStoreApi.getState();
    await saveCanvasState(workshopId, stepId, {
      stickyNotes: state.stickyNotes,
      ...(state.gridColumns.length > 0 ? { gridColumns: state.gridColumns } : {}),
      ...(state.drawingNodes.length > 0 ? { drawingNodes: state.drawingNodes } : {}),
      ...(state.mindMapNodes.length > 0 ? { mindMapNodes: state.mindMapNodes } : {}),
      ...(state.mindMapEdges.length > 0 ? { mindMapEdges: state.mindMapEdges } : {}),
      ...(state.crazy8sSlots.length > 0 ? { crazy8sSlots: state.crazy8sSlots } : {}),
      ...(state.conceptCards.length > 0 ? { conceptCards: state.conceptCards } : {}),
      ...(state.personaTemplates.length > 0 ? { personaTemplates: state.personaTemplates } : {}),
      ...(state.hmwCards.length > 0 ? { hmwCards: state.hmwCards } : {}),
      ...(state.selectedSlotIds.length > 0 ? { selectedSlotIds: state.selectedSlotIds } : {}),
      ...(state.slotGroups.length > 0 ? { slotGroups: state.slotGroups } : {}),
      ...(state.brainRewritingMatrices.length > 0 ? { brainRewritingMatrices: state.brainRewritingMatrices } : {}),
      ...(state.dotVotes.length > 0 ? { dotVotes: state.dotVotes } : {}),
      ...(state.votingSession.status !== 'idle' ? { votingSession: state.votingSession } : {}),
    });
    state.markClean();
  }, [workshopId, stepId, canvasStoreApi]);

  // Transition to crazy 8s phase — pre-fill slots with AI-enhanced titles + descriptions
  const handleStartCrazy8s = React.useCallback(async () => {
    const state = canvasStoreApi.getState();
    const isPerParticipant = state.mindMapNodes.some((n) => n.ownerId);

    if (isPerParticipant) {
      // Multiplayer: iterate over all ownerIds, collect starred nodes per owner
      const ownerIds = [...new Set(state.mindMapNodes.map((n) => n.ownerId).filter(Boolean))] as string[];
      const allSlots = [...state.crazy8sSlots];

      for (const ownerId of ownerIds) {
        const ownerStarred = state.mindMapNodes
          .filter((n) => n.ownerId === ownerId && n.isStarred && !n.isRoot && n.label.trim())
          .map((n) => n.label.trim())
          .slice(0, 8);

        // Find this owner's existing slots
        const ownerSlots = allSlots.filter((s) => s.ownerId === ownerId);
        if (ownerSlots.length > 0 && ownerStarred.length > 0) {
          ownerSlots.forEach((slot, i) => {
            slot.title = ownerStarred[i] || slot.title;
          });
        }
      }
      state.setCrazy8sSlots(allSlots);
      state.markDirty();
    } else {
      // Solo mode: original behavior
      const starredLabels = state.mindMapNodes
        .filter((n) => n.isStarred && !n.isRoot && n.label.trim())
        .map((n) => n.label.trim())
        .slice(0, 8);

      if (starredLabels.length > 0) {
        setIsEnhancingIdeas(true);
        try {
          const response = await fetch('/api/ai/enhance-sketch-ideas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workshopId, ideas: starredLabels }),
          });

          if (response.ok) {
            const data = await response.json();
            const aiSlots = data.slots as { title: string; description: string }[];
            const slots = EMPTY_CRAZY_8S_SLOTS.map((slot, i) => ({
              ...slot,
              title: aiSlots[i]?.title || starredLabels[i] || '',
              description: aiSlots[i]?.description || '',
            }));
            state.setCrazy8sSlots(slots);
          } else {
            const slots = EMPTY_CRAZY_8S_SLOTS.map((slot, i) => ({
              ...slot,
              title: starredLabels[i] || '',
            }));
            state.setCrazy8sSlots(slots);
          }
        } catch {
          const slots = EMPTY_CRAZY_8S_SLOTS.map((slot, i) => ({
            ...slot,
            title: starredLabels[i] || '',
          }));
          state.setCrazy8sSlots(slots);
        } finally {
          setIsEnhancingIdeas(false);
        }
        state.markDirty();
      }
    }

    setShowCrazy8s(true);
    setCurrentPhase('crazy-eights');
    setStoreIdeationPhase('crazy-eights');
  }, [canvasStoreApi, workshopId, setStoreIdeationPhase]);

  // Save Crazy 8s: flush canvas state → transition to idea selection
  const handleSaveCrazy8s = React.useCallback(async () => {
    await flushCanvasState();
    setArtifactConfirmed(false);
    setCurrentPhase('idea-selection');
  }, [flushCanvasState]);

  // Back to drawing mode from idea selection
  const handleBackToDrawing = React.useCallback(() => {
    setCurrentPhase('crazy-eights');
  }, []);

  // Build brain rewriting matrices from selection units
  const buildMatricesFromSelection = React.useCallback((selectedIds: string[], state: ReturnType<typeof canvasStoreApi.getState>) => {
    type SelectionUnit = { type: 'slot'; slotId: string } | { type: 'group'; group: typeof state.slotGroups[number] };
    const units: SelectionUnit[] = [];
    const processedSlotIds = new Set<string>();

    for (const slotId of selectedIds) {
      if (processedSlotIds.has(slotId)) continue;
      const group = state.slotGroups.find((g) => g.slotIds.includes(slotId));
      if (group) {
        units.push({ type: 'group', group });
        group.slotIds.forEach((id) => processedSlotIds.add(id));
      } else {
        units.push({ type: 'slot', slotId });
        processedSlotIds.add(slotId);
      }
    }

    return units.map((unit) => {
      if (unit.type === 'group') {
        const firstSlot = state.crazy8sSlots.find((s) => s.slotId === unit.group.slotIds[0]);
        const sourceImage = unit.group.mergedImageUrl || firstSlot?.imageUrl;
        const matrix = createEmptyMatrix(unit.group.slotIds[0], sourceImage);
        matrix.groupId = unit.group.id;
        return matrix;
      } else {
        const slot = state.crazy8sSlots.find((s) => s.slotId === unit.slotId);
        return createEmptyMatrix(unit.slotId, slot?.imageUrl);
      }
    });
  }, [canvasStoreApi]);

  // Confirm selection → brain rewriting (or skip)
  const handleConfirmSelection = React.useCallback(async (skip: boolean) => {
    if (!stepId) return;
    const state = canvasStoreApi.getState();
    state.setSelectedSlotIds(localSelectedSlotIds);

    if (skip) {
      await flushCanvasState();
      setArtifactConfirmed(true);
      setExplicitlyConfirmed(true);
    } else {
      const matrices = buildMatricesFromSelection(localSelectedSlotIds, state);
      state.setBrainRewritingMatrices(matrices);
      await flushCanvasState();
      setCurrentPhase('brain-rewriting');
    }
  }, [stepId, canvasStoreApi, localSelectedSlotIds, flushCanvasState, buildMatricesFromSelection]);

  // Save Brain Rewriting
  const handleSaveBrainRewriting = React.useCallback(async () => {
    await flushCanvasState();
    setArtifactConfirmed(true);
    setExplicitlyConfirmed(true);
  }, [flushCanvasState]);

  // Brain rewriting toggle included
  const handleBrainRewritingToggleIncluded = React.useCallback(
    (slotId: string) => {
      const state = canvasStoreApi.getState();
      state.toggleBrainRewritingIncluded(slotId);
    },
    [canvasStoreApi]
  );

  // Brain rewriting cell update
  const handleBrainRewritingCellUpdate = React.useCallback(
    (slotId: string, cellId: string, imageUrl: string, drawingId: string) => {
      const state = canvasStoreApi.getState();
      state.updateBrainRewritingCell(slotId, cellId, { imageUrl, drawingId });
    },
    [canvasStoreApi]
  );

  // Voting: confirm selected ideas from voting results → brain rewriting
  const handleVoteSelectionConfirm = React.useCallback(async (selectedIds: string[]) => {
    setLocalSelectedSlotIds(selectedIds);
    const state = canvasStoreApi.getState();
    state.setSelectedSlotIds(selectedIds);

    const matrices = buildMatricesFromSelection(selectedIds, state);
    state.setBrainRewritingMatrices(matrices);

    await flushCanvasState();
    setCurrentPhase('brain-rewriting');
  }, [canvasStoreApi, flushCanvasState, buildMatricesFromSelection]);

  // Voting: reset and re-open voting (solo forgiveness)
  const handleReVote = React.useCallback(() => {
    const state = canvasStoreApi.getState();
    state.resetVoting();
    state.openVoting();
  }, [canvasStoreApi]);

  // Compute owner IDs, names, and colors from ideationOwners (canonical order)
  // + mind map nodes (for any late-joined owners not in ideationOwners).
  // ideationOwners order puts the facilitator first (leftmost in "All" view).
  const { ownerIdsList, ownerNamesMap, ownerColorsMap } = React.useMemo(() => {
    const ids: string[] = [];
    const names: Record<string, string> = {};
    const colors: Record<string, string> = {};
    // Start with ideationOwners order (facilitator first, then participants)
    if (ideationOwners) {
      for (const o of ideationOwners) {
        if (!ids.includes(o.ownerId)) {
          ids.push(o.ownerId);
          names[o.ownerId] = o.ownerName;
          if (o.ownerColor) colors[o.ownerId] = o.ownerColor;
        }
      }
    }
    // Add any additional owners found in mind map nodes (late joiners)
    for (const n of mindMapNodes) {
      if (n.ownerId && n.isRoot && !ids.includes(n.ownerId)) {
        ids.push(n.ownerId);
        if (n.ownerName) names[n.ownerId] = n.ownerName;
      }
    }
    // Filter out deleted owners
    const filteredIds = ids.filter((id) => !deletedOwnerIds.has(id));
    return { ownerIdsList: filteredIds, ownerNamesMap: names, ownerColorsMap: colors };
  }, [mindMapNodes, ideationOwners, deletedOwnerIds]);

  // Render the canvas area — always MindMapCanvas, with phase-appropriate props
  const renderCanvas = React.useCallback(() => {
    const isVotingActive = currentPhase === 'idea-selection';
    const useOldSelectionMode = isVotingActive && votingSession.status === 'idle';
    // null = "All" (no filtering), undefined = not yet set (falls back to currentOwnerId)
    const effectiveOwnerId = viewingOwnerId === null ? undefined : (viewingOwnerId || currentOwnerId);

    return React.createElement('div', { className: 'relative h-full' },
      // Voting HUD
      isVotingActive && votingSession.status !== 'closed' && React.createElement(VotingHud),
      // MindMapCanvas
      stepId && React.createElement(MindMapCanvas, {
        workshopId,
        stepId,
        hmwStatement: hmwStatement || (initialArtifact?.reframedHmw as string) || '',
        challengeStatement,
        hmwGoals,
        showCrazy8s,
        onSaveCrazy8s: handleSaveCrazy8s,
        selectionMode: useOldSelectionMode,
        selectedSlotIds: localSelectedSlotIds,
        onSelectionChange: setLocalSelectedSlotIds,
        onConfirmSelection: handleConfirmSelection,
        onBackToDrawing: handleBackToDrawing,
        brainRewritingMatrices: currentPhase === 'brain-rewriting' ? brainRewritingMatrices : undefined,
        onBrainRewritingCellUpdate: handleBrainRewritingCellUpdate,
        onBrainRewritingToggleIncluded: handleBrainRewritingToggleIncluded,
        onBrainRewritingDone: handleSaveBrainRewriting,
        votingMode: isVotingActive,
        onVoteSelectionConfirm: handleVoteSelectionConfirm,
        onReVote: handleReVote,
        onStartMerge: setMergeGroupId,
        // Per-participant filtering
        currentOwnerId: effectiveOwnerId,
        allOwnerIds: ownerIdsList.length > 1 ? ownerIdsList : undefined,
        ownerNames: ownerNamesMap,
        ownerColors: ownerColorsMap,
        onOwnerSwitch: setViewingOwnerId,
        onDeleteOwner: handleDeleteOwner,
        facilitatorOwnerId: 'facilitator',
        isMultiplayerIdeation: !!(ideationOwners && ideationOwners.length > 0),
      }),
      // Merge group dialog
      mergeGroup && React.createElement(MergeGroupDialog, {
        open: !!mergeGroupId,
        onOpenChange: (open: boolean) => { if (!open) setMergeGroupId(null); },
        group: mergeGroup,
        workshopId,
        onMerged: flushCanvasState,
      }),
    );
  }, [
    currentPhase, votingSession.status, stepId, workshopId, hmwStatement,
    initialArtifact, challengeStatement, hmwGoals, showCrazy8s,
    handleSaveCrazy8s, localSelectedSlotIds, handleConfirmSelection,
    handleBackToDrawing, brainRewritingMatrices, handleBrainRewritingCellUpdate,
    handleBrainRewritingToggleIncluded, handleSaveBrainRewriting,
    handleVoteSelectionConfirm, handleReVote, mergeGroupId, mergeGroup, flushCanvasState,
    setMergeGroupId, viewingOwnerId, currentOwnerId, ownerIdsList, ownerNamesMap, ownerColorsMap, handleDeleteOwner,
  ]);

  return {
    currentPhase,
    showCrazy8s,
    isEnhancingIdeas,
    liveMessageCount,
    setLiveMessageCount,
    hasEnoughMessages,
    mindMapHasThemes,
    artifactConfirmed,
    explicitlyConfirmed,
    handleStartCrazy8s,
    flushCanvasState,
    renderCanvas,
  };
}
