'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';
import {
  createCanvasStore,
  type CanvasStore,
  type StickyNote,
  type GridColumn,
  type DrawingNode,
  type MindMapNodeState,
  type MindMapEdgeState,
} from '@/stores/canvas-store';
import {
  createMultiplayerCanvasStore,
  type MultiplayerCanvasStoreApi,
} from '@/stores/multiplayer-canvas-store';
import { getRoomId } from '@/lib/liveblocks/config';
import type { ConceptCardData } from '@/lib/canvas/concept-card-types';
import type { PersonaTemplateData } from '@/lib/canvas/persona-template-types';
import type { HmwCardData } from '@/lib/canvas/hmw-card-types';
import type { Crazy8sSlot, SlotGroup } from '@/lib/canvas/crazy-8s-types';
import type { BrainRewritingMatrix } from '@/lib/canvas/brain-rewriting-types';
import type { DotVote, VotingSession } from '@/lib/canvas/voting-types';
import type { IdeationPhase } from '@/stores/canvas-store';

type SoloCanvasStoreApi = ReturnType<typeof createCanvasStore>;
type CanvasStoreApi = SoloCanvasStoreApi | MultiplayerCanvasStoreApi;

const CanvasStoreContext = createContext<CanvasStoreApi | null>(null);

export interface CanvasStoreProviderProps {
  children: React.ReactNode;
  workshopType?: 'solo' | 'multiplayer';
  workshopId?: string; // required for multiplayer (room ID)
  stepId?: string; // semantic step ID — used to create per-step Liveblocks Storage rooms
  initialStickyNotes?: StickyNote[];
  initialGridColumns?: GridColumn[];
  initialDrawingNodes?: DrawingNode[];
  initialMindMapNodes?: MindMapNodeState[];
  initialMindMapEdges?: MindMapEdgeState[];
  initialCrazy8sSlots?: Crazy8sSlot[];
  initialConceptCards?: ConceptCardData[];
  initialPersonaTemplates?: PersonaTemplateData[];
  initialHmwCards?: HmwCardData[];
  initialSelectedSlotIds?: string[];
  initialSlotGroups?: SlotGroup[];
  initialBrainRewritingMatrices?: BrainRewritingMatrix[];
  initialDotVotes?: DotVote[];
  initialVotingSession?: VotingSession;
  initialVotingCardPositions?: Record<string, { x: number; y: number }>;
  initialIdeationPhase?: IdeationPhase;
  initialConceptActivityStarted?: boolean;
}

export function CanvasStoreProvider({
  children,
  workshopType,
  workshopId,
  stepId,
  initialStickyNotes,
  initialGridColumns,
  initialDrawingNodes,
  initialMindMapNodes,
  initialMindMapEdges,
  initialCrazy8sSlots,
  initialConceptCards,
  initialPersonaTemplates,
  initialHmwCards,
  initialSelectedSlotIds,
  initialSlotGroups,
  initialBrainRewritingMatrices,
  initialDotVotes,
  initialVotingSession,
  initialVotingCardPositions,
  initialIdeationPhase,
  initialConceptActivityStarted,
}: CanvasStoreProviderProps) {
  const isMultiplayer = workshopType === 'multiplayer';

  // Track owner IDs that have been deleted this session — prevents recovery from restoring them.
  // Populated explicitly when deleteOwnerContent removes nodes from the store.
  const deletedOwnerIdsRef = useRef<Set<string>>(new Set());

  // Capture server-loaded initial state so we can re-apply after Liveblocks clears it.
  // When enterRoom is called, the Liveblocks middleware clears all storageMapping fields
  // while connecting. For a NEW room (empty Storage), the cleared state persists — wiping
  // template stickies and other server-seeded data. The ref lets us restore them.
  // Updated on every render so router.refresh() delivers fresh server data to recovery.
  //
  // IMPORTANT: All updates filter out deleted owners to prevent them from being
  // restored by applyRecovery after Liveblocks reconnect.
  const filterDeletedOwners = <T extends { ownerId?: string }>(items: T[]): T[] => {
    const deleted = deletedOwnerIdsRef.current;
    return deleted.size > 0 ? items.filter((item) => !item.ownerId || !deleted.has(item.ownerId)) : items;
  };

  const initialStateRef = useRef({
    stickyNotes: initialStickyNotes || [],
    gridColumns: initialGridColumns || [],
    drawingNodes: initialDrawingNodes || [],
    mindMapNodes: initialMindMapNodes || [],
    mindMapEdges: initialMindMapEdges || [],
    crazy8sSlots: initialCrazy8sSlots || [],
    conceptCards: initialConceptCards || [],
    personaTemplates: initialPersonaTemplates || [],
    hmwCards: initialHmwCards || [],
    brainRewritingMatrices: initialBrainRewritingMatrices || [],
    dotVotes: initialDotVotes || [],
    votingCardPositions: initialVotingCardPositions || {},
    ideationPhase: initialIdeationPhase || 'mind-mapping',
  });
  // Keep ref fresh across re-renders (e.g. after router.refresh())
  // Filter out deleted owners so stale server props don't resurrect them.
  initialStateRef.current.hmwCards = filterDeletedOwners(initialHmwCards || []);
  initialStateRef.current.stickyNotes = filterDeletedOwners(initialStickyNotes || []);
  initialStateRef.current.personaTemplates = initialPersonaTemplates || [];
  initialStateRef.current.mindMapNodes = filterDeletedOwners(initialMindMapNodes || []);
  initialStateRef.current.mindMapEdges = filterDeletedOwners(initialMindMapEdges || []);
  initialStateRef.current.crazy8sSlots = filterDeletedOwners(initialCrazy8sSlots || []);

  // Create store ONCE per mount — ensures per-request isolation in SSR
  const [store] = useState<CanvasStoreApi>(() => {
    const initState = {
      stickyNotes: initialStickyNotes || [],
      gridColumns: initialGridColumns || [],
      drawingNodes: initialDrawingNodes || [],
      mindMapNodes: initialMindMapNodes || [],
      mindMapEdges: initialMindMapEdges || [],
      crazy8sSlots: initialCrazy8sSlots || [],
      conceptCards: initialConceptCards || [],
      personaTemplates: initialPersonaTemplates || [],
      hmwCards: initialHmwCards || [],
      selectedSlotIds: initialSelectedSlotIds || [],
      slotGroups: initialSlotGroups || [],
      brainRewritingMatrices: initialBrainRewritingMatrices || [],
      dotVotes: initialDotVotes || [],
      votingSession: initialVotingSession,
      votingCardPositions: initialVotingCardPositions || {},
      ideationPhase: initialIdeationPhase,
      conceptActivityStarted: initialConceptActivityStarted,
    };
    if (isMultiplayer) {
      return createMultiplayerCanvasStore(initState);
    }
    return createCanvasStore(initState);
  });

  // Track deleted owners by intercepting deleteOwnerContent calls.
  // We wrap the store's deleteOwnerContent to also record the ownerId in our ref,
  // ensuring applyRecovery and initialStateRef updates exclude deleted owners.
  useEffect(() => {
    if (!isMultiplayer) return;
    const originalDeleteOwnerContent = store.getState().deleteOwnerContent;
    // Monkey-patch: record deleted owner ID before delegating to original
    const patchedDelete = (ownerId: string) => {
      deletedOwnerIdsRef.current.add(ownerId);
      originalDeleteOwnerContent(ownerId);
    };
    store.setState({ deleteOwnerContent: patchedDelete } as Partial<CanvasStore>);

    return () => {
      // Restore original on cleanup (unlikely but clean)
      store.setState({ deleteOwnerContent: originalDeleteOwnerContent } as Partial<CanvasStore>);
    };
  }, [isMultiplayer, store]);

  // Multiplayer room lifecycle — connect to a STEP-SPECIFIC Liveblocks room for Storage.
  // Each step gets its own Storage room (e.g. "workshop-{wid}-step-challenge") so canvas
  // data from one step doesn't leak into another. The workshop-level room (via RoomProvider
  // in MultiplayerRoomLoader) handles broadcasts and presence separately.
  useEffect(() => {
    if (!isMultiplayer || !workshopId || !stepId) return;
    const multiStore = store as MultiplayerCanvasStoreApi;
    const { enterRoom, leaveRoom } = multiStore.getState().liveblocks;
    enterRoom(`${getRoomId(workshopId)}-step-${stepId}`);

    // After entering the room, the Liveblocks middleware clears all storageMapping fields
    // while waiting for Storage to load. For an EXISTING room, Storage data will replace
    // the cleared values. For a NEW room (empty Storage), the cleared state persists —
    // wiping server-loaded template stickies and other seed data.
    // Fix: when connected (or on failure fallback), re-apply any fields that
    // the middleware cleared but the server had initial data for.
    const applyRecovery = () => {
      const init = initialStateRef.current;
      const current = multiStore.getState();
      const patch: Record<string, unknown> = {};
      const deleted = deletedOwnerIdsRef.current;

      // Helper: filter out items belonging to deleted owners
      const excludeDeleted = <T extends { ownerId?: string }>(items: T[]): T[] =>
        deleted.size > 0 ? items.filter((item) => !item.ownerId || !deleted.has(item.ownerId)) : items;

      if (current.stickyNotes.length === 0 && init.stickyNotes.length > 0) {
        patch.stickyNotes = excludeDeleted(init.stickyNotes);
      }
      if (current.gridColumns.length === 0 && init.gridColumns.length > 0) {
        patch.gridColumns = init.gridColumns;
      }
      if (current.drawingNodes.length === 0 && init.drawingNodes.length > 0) {
        patch.drawingNodes = init.drawingNodes;
      }
      if (current.mindMapNodes.length === 0 && init.mindMapNodes.length > 0) {
        patch.mindMapNodes = excludeDeleted(init.mindMapNodes);
      }
      if (current.mindMapEdges.length === 0 && init.mindMapEdges.length > 0) {
        patch.mindMapEdges = excludeDeleted(init.mindMapEdges);
      }
      if (current.crazy8sSlots.length === 0 && init.crazy8sSlots.length > 0) {
        patch.crazy8sSlots = excludeDeleted(init.crazy8sSlots);
      }
      if (current.conceptCards.length === 0 && init.conceptCards.length > 0) {
        patch.conceptCards = init.conceptCards;
      }
      if (current.personaTemplates.length === 0 && init.personaTemplates.length > 0) {
        patch.personaTemplates = init.personaTemplates;
      }
      if (current.hmwCards.length === 0 && init.hmwCards.length > 0) {
        patch.hmwCards = excludeDeleted(init.hmwCards);
      } else if (
        // Ownership migration: server has per-participant cards but Liveblocks
        // has legacy cards without ownership. Replace with server version.
        init.hmwCards.some((c) => c.ownerId) &&
        current.hmwCards.length > 0 &&
        !current.hmwCards.some((c) => c.ownerId)
      ) {
        patch.hmwCards = excludeDeleted(init.hmwCards);
      }
      if (current.brainRewritingMatrices.length === 0 && init.brainRewritingMatrices.length > 0) {
        patch.brainRewritingMatrices = init.brainRewritingMatrices;
      }
      if (current.dotVotes.length === 0 && init.dotVotes.length > 0) {
        patch.dotVotes = init.dotVotes;
      }
      if (Object.keys(current.votingCardPositions).length === 0 && Object.keys(init.votingCardPositions).length > 0) {
        patch.votingCardPositions = init.votingCardPositions;
      }
      if (current.ideationPhase === 'mind-mapping' && init.ideationPhase !== 'mind-mapping') {
        patch.ideationPhase = init.ideationPhase;
      }

      if (Object.keys(patch).length > 0) {
        multiStore.setState(patch);
      }
    };

    // Subscribe to ALL status changes. applyRecovery is idempotent — it only
    // patches fields that are empty or missing ownership. Keeping the subscriber
    // alive handles: initial connect, auth-failure-then-retry reconnects, and
    // any future disconnect/reconnect cycles that re-clear the store.
    const unsub = multiStore.subscribe((state) => {
      const s = state.liveblocks.status;
      if (s === 'connected' || s === 'disconnected') {
        applyRecovery();
      }
    });

    // Fallback: if Liveblocks stays stuck in 'connecting', force-apply after 3s.
    const fallbackTimer = setTimeout(() => applyRecovery(), 3000);

    return () => {
      unsub();
      clearTimeout(fallbackTimer);
      leaveRoom();
    };
  }, [isMultiplayer, workshopId, stepId, store]);

  // Sync concept cards from server props into the store.
  // Handles navigation (store reused from previous step), post-reset refresh,
  // and repair scenarios (store has fewer cards or missing step 8 data).
  useEffect(() => {
    if (!initialConceptCards || initialConceptCards.length === 0) return;
    const current = store.getState().conceptCards;
    if (current.length === 0) {
      // Store is empty but server has cards (post-reset refresh or step navigation)
      store.getState().setConceptCards(initialConceptCards);
      store.getState().markDirty();
    } else {
      // Merge server cards into store: patch existing cards with missing step 8 data
      // (sketchImageUrl, sketchSlotId, ideaSource) and append any new cards.
      let changed = false;
      const serverByIndex = new Map(
        initialConceptCards.filter(c => c.cardIndex !== undefined).map(c => [c.cardIndex!, c])
      );
      const serverBySlotId = new Map(
        initialConceptCards.filter(c => c.sketchSlotId).map(c => [c.sketchSlotId!, c])
      );

      // Patch existing store cards with step 8 data they're missing
      const patched = current.map(card => {
        const serverCard = (card.cardIndex !== undefined && serverByIndex.get(card.cardIndex))
          || (card.sketchSlotId && serverBySlotId.get(card.sketchSlotId))
          || undefined;
        if (!serverCard) return card;
        const updates: Partial<typeof card> = {};
        if (!card.sketchImageUrl && serverCard.sketchImageUrl) updates.sketchImageUrl = serverCard.sketchImageUrl;
        if (!card.sketchSlotId && serverCard.sketchSlotId) updates.sketchSlotId = serverCard.sketchSlotId;
        if (!card.ideaSource && serverCard.ideaSource) updates.ideaSource = serverCard.ideaSource;
        // Patch ownership from SSR rebalancing into existing store cards
        if (!card.ownerId && serverCard.ownerId) {
          updates.ownerId = serverCard.ownerId;
          updates.ownerName = serverCard.ownerName;
          updates.ownerColor = serverCard.ownerColor;
        }
        // Re-assignment: if server says different owner, server wins (SSR rebalanced)
        if (card.ownerId && serverCard.ownerId && card.ownerId !== serverCard.ownerId) {
          updates.ownerId = serverCard.ownerId;
          updates.ownerName = serverCard.ownerName;
          updates.ownerColor = serverCard.ownerColor;
        }
        if (Object.keys(updates).length === 0) return card;
        changed = true;
        return { ...card, ...updates };
      });

      // Append cards from server that don't exist in store
      const existingSlotIds = new Set(patched.map(c => c.sketchSlotId).filter(Boolean));
      const existingIndexes = new Set(patched.map(c => c.cardIndex ?? -1));
      const missing = initialConceptCards.filter(c => {
        if (c.sketchSlotId && existingSlotIds.has(c.sketchSlotId)) return false;
        if (c.cardIndex !== undefined && existingIndexes.has(c.cardIndex)) return false;
        return true;
      });

      if (changed || missing.length > 0) {
        store.getState().setConceptCards([...patched, ...missing]);
        store.getState().markDirty();
      } else if (
        current.length === initialConceptCards.length &&
        current.every(c => c.cardState === 'skeleton') &&
        initialConceptCards.every(c => c.cardState === 'skeleton')
      ) {
        // All skeletons match — just mark dirty for persistence
        store.getState().markDirty();
      }
    }
  }, [initialConceptCards, store]);

  // Sync persona templates from server props into the store.
  // Same pattern as concept cards above — when the store is reused across step
  // navigation, the useState initializer doesn't re-run and persona templates
  // from the server would be lost without this effect.
  useEffect(() => {
    if (!initialPersonaTemplates || initialPersonaTemplates.length === 0) return;
    const current = store.getState().personaTemplates;
    if (current.length === 0) {
      store.getState().setPersonaTemplates(initialPersonaTemplates);
      store.getState().markDirty();
    }
  }, [initialPersonaTemplates, store]);

  // Sync HMW cards from server props into the store.
  // After reset + router.refresh(), the store is preserved (same key={stepId}) but
  // the server provides fresh per-participant cards. Without this sync, the store
  // stays empty and the server-rendered cards flash then vanish.
  useEffect(() => {
    if (!initialHmwCards || initialHmwCards.length === 0) return;
    const current = store.getState().hmwCards;
    if (current.length === 0) {
      store.getState().setHmwCards(initialHmwCards);
      store.getState().markDirty();
    } else if (
      initialHmwCards.some((c) => c.ownerId) &&
      !current.some((c) => c.ownerId)
    ) {
      // Server has per-participant cards but store has legacy cards — upgrade
      store.getState().setHmwCards(initialHmwCards);
      store.getState().markDirty();
    }
  }, [initialHmwCards, store]);

  return (
    <CanvasStoreContext.Provider value={store}>
      {children}
    </CanvasStoreContext.Provider>
  );
}

export function useCanvasStore<T>(selector: (store: CanvasStore) => T): T {
  const store = useContext(CanvasStoreContext);

  if (!store) {
    throw new Error('useCanvasStore must be used within CanvasStoreProvider');
  }

  return useStoreWithEqualityFn(store, selector as (state: CanvasStore) => T, shallow);
}

export function useCanvasStoreApi(): SoloCanvasStoreApi {
  const store = useContext(CanvasStoreContext);

  if (!store) {
    throw new Error('useCanvasStoreApi must be used within CanvasStoreProvider');
  }

  return store as SoloCanvasStoreApi;
}
