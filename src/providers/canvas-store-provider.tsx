'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useStore } from 'zustand';
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

type SoloCanvasStoreApi = ReturnType<typeof createCanvasStore>;
type CanvasStoreApi = SoloCanvasStoreApi | MultiplayerCanvasStoreApi;

const CanvasStoreContext = createContext<CanvasStoreApi | null>(null);

export interface CanvasStoreProviderProps {
  children: React.ReactNode;
  workshopType?: 'solo' | 'multiplayer';
  workshopId?: string; // required for multiplayer (room ID)
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
}

export function CanvasStoreProvider({
  children,
  workshopType,
  workshopId,
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
}: CanvasStoreProviderProps) {
  const isMultiplayer = workshopType === 'multiplayer';

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
    };
    if (isMultiplayer) {
      return createMultiplayerCanvasStore(initState);
    }
    return createCanvasStore(initState);
  });

  // Multiplayer room lifecycle — connect to Liveblocks room on mount, leave on unmount
  useEffect(() => {
    if (!isMultiplayer || !workshopId) return;
    const multiStore = store as MultiplayerCanvasStoreApi;
    const { enterRoom, leaveRoom } = multiStore.getState().liveblocks;
    enterRoom(getRoomId(workshopId));
    return () => {
      leaveRoom();
    };
  }, [isMultiplayer, workshopId, store]);

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

  return useStore(store, selector as (state: CanvasStore) => T);
}

export function useCanvasStoreApi(): SoloCanvasStoreApi {
  const store = useContext(CanvasStoreContext);

  if (!store) {
    throw new Error('useCanvasStoreApi must be used within CanvasStoreProvider');
  }

  return store as SoloCanvasStoreApi;
}
