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
import type { ConceptCardData } from '@/lib/canvas/concept-card-types';
import type { PersonaTemplateData } from '@/lib/canvas/persona-template-types';
import type { HmwCardData } from '@/lib/canvas/hmw-card-types';
import type { Crazy8sSlot } from '@/lib/canvas/crazy-8s-types';
import type { BrainRewritingMatrix } from '@/lib/canvas/brain-rewriting-types';

type CanvasStoreApi = ReturnType<typeof createCanvasStore>;

const CanvasStoreContext = createContext<CanvasStoreApi | null>(null);

export interface CanvasStoreProviderProps {
  children: React.ReactNode;
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
  // Create store ONCE per mount — ensures per-request isolation in SSR
  const [store] = useState(() =>
    createCanvasStore({
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
    })
  );

  // Sync skeleton concept cards from server props into the store.
  // Handles two scenarios:
  // 1. Post-reset refresh: store was cleared but server sends fresh skeletons
  // 2. Fresh load: store has skeletons from constructor but isDirty is false
  useEffect(() => {
    if (!initialConceptCards || initialConceptCards.length === 0) return;
    const current = store.getState().conceptCards;
    if (current.length === 0) {
      // Store is empty but server has cards (post-reset refresh)
      store.getState().setConceptCards(initialConceptCards);
      store.getState().markDirty();
    } else if (
      current.length === initialConceptCards.length &&
      current.every(c => c.cardState === 'skeleton') &&
      initialConceptCards.every(c => c.cardState === 'skeleton')
    ) {
      // Already have matching skeletons from constructor — just mark dirty for persistence
      store.getState().markDirty();
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

  return useStore(store, selector);
}

export function useCanvasStoreApi(): CanvasStoreApi {
  const store = useContext(CanvasStoreContext);

  if (!store) {
    throw new Error('useCanvasStoreApi must be used within CanvasStoreProvider');
  }

  return store;
}
