'use client';

import { createContext, useContext, useState } from 'react';
import { useStore } from 'zustand';
import {
  createCanvasStore,
  type CanvasStore,
  type PostIt,
  type GridColumn,
  type DrawingNode,
} from '@/stores/canvas-store';

type CanvasStoreApi = ReturnType<typeof createCanvasStore>;

const CanvasStoreContext = createContext<CanvasStoreApi | null>(null);

export interface CanvasStoreProviderProps {
  children: React.ReactNode;
  initialPostIts?: PostIt[];
  initialGridColumns?: GridColumn[];
  initialDrawingNodes?: DrawingNode[];
}

export function CanvasStoreProvider({
  children,
  initialPostIts,
  initialGridColumns,
  initialDrawingNodes,
}: CanvasStoreProviderProps) {
  // Create store ONCE per mount — ensures per-request isolation in SSR
  const [store] = useState(() =>
    createCanvasStore({ postIts: initialPostIts || [], gridColumns: initialGridColumns || [], drawingNodes: initialDrawingNodes || [] })
  );

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
