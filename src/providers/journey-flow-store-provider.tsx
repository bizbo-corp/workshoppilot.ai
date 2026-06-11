'use client';

import { createContext, useContext, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';
import {
  createJourneyFlowStore,
  type JourneyFlowStore,
  type JourneyFlowStoreApi,
} from '@/stores/journey-flow-store';
import type { JourneyFlowState } from '@/lib/journey-flow/types';

const JourneyFlowStoreContext = createContext<JourneyFlowStoreApi | null>(null);

export function JourneyFlowStoreProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: Partial<JourneyFlowState>;
}) {
  const storeRef = useRef<JourneyFlowStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createJourneyFlowStore(initialState);
  }

  return (
    <JourneyFlowStoreContext.Provider value={storeRef.current}>
      {children}
    </JourneyFlowStoreContext.Provider>
  );
}

export function useJourneyFlowStore<T>(selector: (state: JourneyFlowStore) => T): T {
  const store = useContext(JourneyFlowStoreContext);
  if (!store) {
    throw new Error('useJourneyFlowStore must be used within JourneyFlowStoreProvider');
  }
  return useStore(store, selector);
}

export function useJourneyFlowStoreApi(): JourneyFlowStoreApi {
  const store = useContext(JourneyFlowStoreContext);
  if (!store) {
    throw new Error('useJourneyFlowStoreApi must be used within JourneyFlowStoreProvider');
  }
  return store;
}
