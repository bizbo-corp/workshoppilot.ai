'use client';

import { createContext, useContext, useState } from 'react';
import { useStore } from 'zustand';
import {
  createDrawingStore,
  type DrawingStore,
  type DrawingState,
} from '@/stores/drawing-store';

type DrawingStoreApi = ReturnType<typeof createDrawingStore>;

const DrawingStoreContext = createContext<DrawingStoreApi | null>(null);

export interface DrawingStoreProviderProps {
  children: React.ReactNode;
  initialState?: Partial<DrawingState>;
}

export function DrawingStoreProvider({
  children,
  initialState,
}: DrawingStoreProviderProps) {
  // Create store ONCE per mount — ensures per-instance isolation
  const [store] = useState(() => createDrawingStore(initialState));

  return (
    <DrawingStoreContext.Provider value={store}>
      {children}
    </DrawingStoreContext.Provider>
  );
}

export function useDrawingStore<T>(selector: (store: DrawingStore) => T): T {
  const store = useContext(DrawingStoreContext);

  if (!store) {
    throw new Error('useDrawingStore must be used within DrawingStoreProvider');
  }

  return useStore(store, selector);
}

export function useDrawingStoreApi(): DrawingStoreApi {
  const store = useContext(DrawingStoreContext);

  if (!store) {
    throw new Error('useDrawingStoreApi must be used within DrawingStoreProvider');
  }

  return store;
}
