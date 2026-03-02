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
import type { Crazy8sSlot } from '@/lib/canvas/crazy-8s-types';
import type { BrainRewritingMatrix } from '@/lib/canvas/brain-rewriting-types';
import type { DotVote, VotingSession } from '@/lib/canvas/voting-types';

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
  initialBrainRewritingMatrices?: BrainRewritingMatrix[];
  initialDotVotes?: DotVote[];
  initialVotingSession?: VotingSession;
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
  initialBrainRewritingMatrices,
  initialDotVotes,
  initialVotingSession,
}: CanvasStoreProviderProps) {
  const isMultiplayer = workshopType === 'multiplayer';

  // Capture server-loaded initial state so we can re-apply after Liveblocks clears it.
  // When enterRoom is called, the Liveblocks middleware clears all storageMapping fields
  // while connecting. For a NEW room (empty Storage), the cleared state persists — wiping
  // template stickies and other server-seeded data. The ref lets us restore them.
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
  });

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
      brainRewritingMatrices: initialBrainRewritingMatrices || [],
      dotVotes: initialDotVotes || [],
      votingSession: initialVotingSession,
    };
    if (isMultiplayer) {
      return createMultiplayerCanvasStore(initState);
    }
    return createCanvasStore(initState);
  });

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
    // Fix: subscribe to status changes, and when connected, re-apply any fields that
    // the middleware cleared but the server had initial data for.
    let applied = false;
    const unsub = multiStore.subscribe((state) => {
      if (applied) return;
      if (state.liveblocks.status !== 'connected') return;
      applied = true;
      unsub();

      const init = initialStateRef.current;
      const current = multiStore.getState();
      const patch: Record<string, unknown> = {};

      if (current.stickyNotes.length === 0 && init.stickyNotes.length > 0) {
        patch.stickyNotes = init.stickyNotes;
      }
      if (current.gridColumns.length === 0 && init.gridColumns.length > 0) {
        patch.gridColumns = init.gridColumns;
      }
      if (current.drawingNodes.length === 0 && init.drawingNodes.length > 0) {
        patch.drawingNodes = init.drawingNodes;
      }
      if (current.mindMapNodes.length === 0 && init.mindMapNodes.length > 0) {
        patch.mindMapNodes = init.mindMapNodes;
      }
      if (current.mindMapEdges.length === 0 && init.mindMapEdges.length > 0) {
        patch.mindMapEdges = init.mindMapEdges;
      }
      if (current.crazy8sSlots.length === 0 && init.crazy8sSlots.length > 0) {
        patch.crazy8sSlots = init.crazy8sSlots;
      }
      if (current.conceptCards.length === 0 && init.conceptCards.length > 0) {
        patch.conceptCards = init.conceptCards;
      }
      if (current.personaTemplates.length === 0 && init.personaTemplates.length > 0) {
        patch.personaTemplates = init.personaTemplates;
      }
      if (current.hmwCards.length === 0 && init.hmwCards.length > 0) {
        patch.hmwCards = init.hmwCards;
      }
      if (current.brainRewritingMatrices.length === 0 && init.brainRewritingMatrices.length > 0) {
        patch.brainRewritingMatrices = init.brainRewritingMatrices;
      }
      if (current.dotVotes.length === 0 && init.dotVotes.length > 0) {
        patch.dotVotes = init.dotVotes;
      }

      if (Object.keys(patch).length > 0) {
        multiStore.setState(patch);
      }
    });

    return () => {
      unsub();
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
