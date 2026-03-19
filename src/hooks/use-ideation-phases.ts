'use client';

import * as React from 'react';
import { useCanvasStore, useCanvasStoreApi } from '@/providers/canvas-store-provider';
import { saveCanvasState } from '@/actions/canvas-actions';
import { createEmptyMatrix, type BrainRewritingParticipant } from '@/lib/canvas/brain-rewriting-types';
import { EMPTY_CRAZY_8S_SLOTS, type Crazy8sSlot } from '@/lib/canvas/crazy-8s-types';
import { MindMapCanvas } from '@/components/workshop/mind-map-canvas';
import { VotingHud } from '@/components/workshop/voting-hud';
import { MergeGroupDialog } from '@/components/workshop/merge-group-dialog';
import { useIdeationSeeding, type IdeationOwner } from '@/hooks/use-ideation-seeding';
import type { IdeationPhase } from '@/stores/canvas-store';
import type { Crazy8sReadinessMap } from '@/components/canvas/crazy-8s-readiness';

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

    // Use persisted ideationPhase as authoritative source when available.
    // This is the primary resume mechanism — the derivation below is fallback
    // for sessions that don't yet have ideationPhase saved.
    const persisted = state.ideationPhase;
    if (persisted && persisted !== 'mind-mapping') {
      return {
        phase: persisted,
        showCrazy8s: true,
        selectedSlotIds: state.selectedSlotIds,
        artifactConfirmed: isComplete && persisted === 'brain-rewriting',
      };
    }

    // Fallback derivation for legacy sessions without persisted ideationPhase
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

  // Crazy 8s readiness tracking (multiplayer)
  const [crazy8sReadinessMap, setCrazy8sReadinessMap] = React.useState<Crazy8sReadinessMap>({});

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
    ...(Object.keys(state.votingCardPositions).length > 0 ? { votingCardPositions: state.votingCardPositions } : {}),
      ...(state.ideationPhase !== 'mind-mapping' ? { ideationPhase: state.ideationPhase } : {}),
    });
    state.markClean();
  }, [workshopId, stepId, canvasStoreApi]);

  // Transition to crazy 8s phase — pre-fill slots with AI-enhanced titles + descriptions + sketch hints
  const handleStartCrazy8s = React.useCallback(async () => {
    const state = canvasStoreApi.getState();
    const isPerParticipant = state.mindMapNodes.some((n) => n.ownerId);

    setIsEnhancingIdeas(true);

    if (isPerParticipant) {
      // Multiplayer: batch all owners' starred ideas into single API call
      const ownerIds = [...new Set(state.mindMapNodes.map((n) => n.ownerId).filter(Boolean))] as string[];

      const owners = ownerIds.map((ownerId) => {
        const ownerStarred = state.mindMapNodes
          .filter((n) => n.ownerId === ownerId && n.isStarred && !n.isRoot && n.label.trim())
          .slice(0, 8);
        return {
          ownerId,
          ideas: ownerStarred.map((n) => ({ title: n.label.trim(), description: n.description })),
        };
      }).filter((o) => o.ideas.length > 0);

      if (owners.length > 0) {
        try {
          const response = await fetch('/api/ai/enhance-sketch-ideas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workshopId, owners, totalSlots: 8, generateWildcards: true }),
          });

          if (response.ok) {
            const data = await response.json();
            const ownerSlotsMap = data.ownerSlots as Record<string, Array<{ title: string; description: string; sketchHint: string; sketchPrompt?: string; ideaType?: string; isWildcard?: boolean }>>;
            const allSlots = [...state.crazy8sSlots];

            for (const ownerId of ownerIds) {
              const aiSlots = ownerSlotsMap?.[ownerId] || [];
              const ownerSlots = allSlots.filter((s) => s.ownerId === ownerId);
              ownerSlots.forEach((slot, i) => {
                if (aiSlots[i]) {
                  slot.title = aiSlots[i].title || slot.title;
                  slot.description = aiSlots[i].description || slot.description || '';
                  slot.sketchHint = aiSlots[i].sketchHint || '';
                  slot.sketchPrompt = aiSlots[i].sketchPrompt || '';
                  slot.ideaType = (aiSlots[i].ideaType as Crazy8sSlot['ideaType']) || 'digital_product';
                  slot.isWildcard = aiSlots[i].isWildcard || false;
                }
              });
            }
            state.setCrazy8sSlots(allSlots);
          } else {
            // Fallback: raw labels
            const allSlots = [...state.crazy8sSlots];
            for (const ownerId of ownerIds) {
              const ownerStarred = state.mindMapNodes
                .filter((n) => n.ownerId === ownerId && n.isStarred && !n.isRoot && n.label.trim())
                .map((n) => n.label.trim())
                .slice(0, 8);
              const ownerSlots = allSlots.filter((s) => s.ownerId === ownerId);
              ownerSlots.forEach((slot, i) => {
                slot.title = ownerStarred[i] || slot.title;
              });
            }
            state.setCrazy8sSlots(allSlots);
          }
        } catch {
          // Fallback: raw labels
          const allSlots = [...state.crazy8sSlots];
          for (const ownerId of ownerIds) {
            const ownerStarred = state.mindMapNodes
              .filter((n) => n.ownerId === ownerId && n.isStarred && !n.isRoot && n.label.trim())
              .map((n) => n.label.trim())
              .slice(0, 8);
            const ownerSlots = allSlots.filter((s) => s.ownerId === ownerId);
            ownerSlots.forEach((slot, i) => {
              slot.title = ownerStarred[i] || slot.title;
            });
          }
          state.setCrazy8sSlots(allSlots);
        }
      }
      state.markDirty();
    } else {
      // Solo mode: pass title+description pairs, request wildcards
      const starredNodes = state.mindMapNodes
        .filter((n) => n.isStarred && !n.isRoot && n.label.trim())
        .slice(0, 8);

      if (starredNodes.length > 0) {
        const ideaObjects = starredNodes.map((n) => ({ title: n.label.trim(), description: n.description }));

        try {
          const response = await fetch('/api/ai/enhance-sketch-ideas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workshopId,
              ideas: ideaObjects,
              totalSlots: 8,
              generateWildcards: true,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const aiSlots = data.slots as Array<{ title: string; description: string; sketchHint: string; sketchPrompt?: string; ideaType?: string; isWildcard?: boolean }>;
            const slots = EMPTY_CRAZY_8S_SLOTS.map((slot, i) => ({
              ...slot,
              title: aiSlots[i]?.title || starredNodes[i]?.label.trim() || '',
              description: aiSlots[i]?.description || starredNodes[i]?.description || '',
              sketchHint: aiSlots[i]?.sketchHint || '',
              sketchPrompt: aiSlots[i]?.sketchPrompt || '',
              ideaType: (aiSlots[i]?.ideaType as Crazy8sSlot['ideaType']) || 'digital_product',
              isWildcard: aiSlots[i]?.isWildcard || false,
            }));
            state.setCrazy8sSlots(slots);
          } else {
            const slots = EMPTY_CRAZY_8S_SLOTS.map((slot, i) => ({
              ...slot,
              title: starredNodes[i]?.label.trim() || '',
              description: starredNodes[i]?.description || '',
            }));
            state.setCrazy8sSlots(slots);
          }
        } catch {
          const slots = EMPTY_CRAZY_8S_SLOTS.map((slot, i) => ({
            ...slot,
            title: starredNodes[i]?.label.trim() || '',
            description: starredNodes[i]?.description || '',
          }));
          state.setCrazy8sSlots(slots);
        }
        state.markDirty();
      }
    }

    setIsEnhancingIdeas(false);
    setShowCrazy8s(true);
    setCurrentPhase('crazy-eights');
    setStoreIdeationPhase('crazy-eights');
  }, [canvasStoreApi, workshopId, setStoreIdeationPhase]);

  // Save Crazy 8s: flush canvas state → transition to idea selection
  const handleSaveCrazy8s = React.useCallback(async () => {
    await flushCanvasState();
    setArtifactConfirmed(false);
    setCurrentPhase('idea-selection');
    setStoreIdeationPhase('idea-selection');
  }, [flushCanvasState, setStoreIdeationPhase]);

  // Back to drawing mode from idea selection
  const handleBackToDrawing = React.useCallback(() => {
    setCurrentPhase('crazy-eights');
    setStoreIdeationPhase('crazy-eights');
  }, [setStoreIdeationPhase]);

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

  // Build brain rewriting matrices from selection units
  const buildMatricesFromSelection = React.useCallback((selectedIds: string[], state: ReturnType<typeof canvasStoreApi.getState>) => {
    type SelectionUnit = { type: 'slot'; slotId: string } | { type: 'group'; group: typeof state.slotGroups[number] };
    const units: SelectionUnit[] = [];
    const processedSlotIds = new Set<string>();

    for (const id of selectedIds) {
      if (processedSlotIds.has(id)) continue;

      // Check if this is a direct group ID match (from shared voting canvas)
      const directGroup = state.slotGroups.find((g) => g.id === id);
      if (directGroup) {
        units.push({ type: 'group', group: directGroup });
        directGroup.slotIds.forEach((sid) => processedSlotIds.add(sid));
        processedSlotIds.add(id);
        continue;
      }

      // Check if this slot belongs to a group
      const group = state.slotGroups.find((g) => g.slotIds.includes(id));
      if (group) {
        units.push({ type: 'group', group });
        group.slotIds.forEach((sid) => processedSlotIds.add(sid));
      } else {
        units.push({ type: 'slot', slotId: id });
        processedSlotIds.add(id);
      }
    }

    // Build participant list for brain rewriting cell assignment
    const hasMultipleOwners = ideationOwners && ideationOwners.length > 1;

    return units.map((unit) => {
      // Determine the creator of this slot/group
      let creatorOwnerId: string | undefined;
      let sourceSlot: typeof state.crazy8sSlots[number] | undefined;

      if (unit.type === 'group') {
        sourceSlot = state.crazy8sSlots.find((s) => s.slotId === unit.group.slotIds[0]);
      } else {
        sourceSlot = state.crazy8sSlots.find((s) => s.slotId === unit.slotId);
      }
      creatorOwnerId = sourceSlot?.ownerId;

      // Build participants array (everyone except creator) for multiplayer
      let participants: BrainRewritingParticipant[] | undefined;
      let creatorName: string | undefined;
      let creatorId: string | undefined;

      if (hasMultipleOwners && creatorOwnerId) {
        creatorName = ownerNamesMap[creatorOwnerId] || 'Creator';
        creatorId = creatorOwnerId;
        participants = ideationOwners!
          .filter((o) => o.ownerId !== creatorOwnerId)
          .map((o) => ({ id: o.ownerId, name: o.ownerName }));
      }

      const sourceImage = unit.type === 'group'
        ? (unit.group.mergedImageUrl || sourceSlot?.imageUrl)
        : sourceSlot?.imageUrl;

      const slotId = unit.type === 'group' ? unit.group.slotIds[0] : unit.slotId;
      const matrix = createEmptyMatrix(slotId, sourceImage, participants);

      if (unit.type === 'group') {
        matrix.groupId = unit.group.id;
      }
      matrix.sourceDescription = sourceSlot?.description;
      matrix.sourceSketchPrompt = sourceSlot?.sketchPrompt;
      if (creatorName) matrix.creatorName = creatorName;
      if (creatorId) matrix.creatorId = creatorId;

      return matrix;
    });
  }, [canvasStoreApi, ideationOwners, ownerNamesMap]);

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
      setStoreIdeationPhase('brain-rewriting');
      await flushCanvasState();
      setCurrentPhase('brain-rewriting');
    }
  }, [stepId, canvasStoreApi, localSelectedSlotIds, flushCanvasState, buildMatricesFromSelection, setStoreIdeationPhase]);

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
    setStoreIdeationPhase('brain-rewriting');

    await flushCanvasState();
    setCurrentPhase('brain-rewriting');
  }, [canvasStoreApi, flushCanvasState, buildMatricesFromSelection, setStoreIdeationPhase]);

  // Voting: reset and re-open voting (solo forgiveness + multiplayer "Vote Again")
  const handleReVote = React.useCallback(() => {
    const state = canvasStoreApi.getState();
    // Compute scaled budget (25% of filled slots, min 2) — same logic as FacilitatorControls
    const filledSlots = state.crazy8sSlots.filter((s) => s.imageUrl);
    const scaledBudget = Math.max(5, Math.ceil(filledSlots.length * 0.3));
    // Atomic reset+open — single CRDT write avoids race where voteBudget:2 wins
    state.resetAndOpenVoting(scaledBudget);
  }, [canvasStoreApi]);


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
        onCrazy8sReadinessChange: setCrazy8sReadinessMap,
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
    ideationOwners,
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
    crazy8sReadinessMap,
    filteredIdeationOwners,
  };
}
