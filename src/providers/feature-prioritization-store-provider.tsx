'use client';

import { createContext, useContext, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';
import {
  createFeaturePrioritizationStore,
  type FeaturePrioritizationStore,
  type FeaturePrioritizationStoreApi,
} from '@/stores/feature-prioritization-store';
import type { FeaturePrioritizationState } from '@/lib/feature-prioritization/types';

const FeaturePrioritizationStoreContext = createContext<FeaturePrioritizationStoreApi | null>(null);

export function FeaturePrioritizationStoreProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: Partial<FeaturePrioritizationState>;
}) {
  const storeRef = useRef<FeaturePrioritizationStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createFeaturePrioritizationStore(initialState);
  }

  return (
    <FeaturePrioritizationStoreContext.Provider value={storeRef.current}>
      {children}
    </FeaturePrioritizationStoreContext.Provider>
  );
}

export function useFeaturePrioritizationStore<T>(selector: (state: FeaturePrioritizationStore) => T): T {
  const store = useContext(FeaturePrioritizationStoreContext);
  if (!store) {
    throw new Error('useFeaturePrioritizationStore must be used within FeaturePrioritizationStoreProvider');
  }
  return useStore(store, selector);
}

export function useFeaturePrioritizationStoreApi(): FeaturePrioritizationStoreApi {
  const store = useContext(FeaturePrioritizationStoreContext);
  if (!store) {
    throw new Error('useFeaturePrioritizationStoreApi must be used within FeaturePrioritizationStoreProvider');
  }
  return store;
}
