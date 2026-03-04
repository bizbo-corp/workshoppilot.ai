'use client';

import { createContext, useContext, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';
import {
  createJourneyMapperStore,
  type JourneyMapperStore,
  type JourneyMapperStoreApi,
} from '@/stores/journey-mapper-store';
import type { JourneyMapperState } from '@/lib/journey-mapper/types';

const JourneyMapperStoreContext = createContext<JourneyMapperStoreApi | null>(null);

export function JourneyMapperStoreProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: Partial<JourneyMapperState>;
}) {
  const storeRef = useRef<JourneyMapperStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createJourneyMapperStore(initialState);
  }

  return (
    <JourneyMapperStoreContext.Provider value={storeRef.current}>
      {children}
    </JourneyMapperStoreContext.Provider>
  );
}

export function useJourneyMapperStore<T>(selector: (state: JourneyMapperStore) => T): T {
  const store = useContext(JourneyMapperStoreContext);
  if (!store) {
    throw new Error('useJourneyMapperStore must be used within JourneyMapperStoreProvider');
  }
  return useStore(store, selector);
}

export function useJourneyMapperStoreApi(): JourneyMapperStoreApi {
  const store = useContext(JourneyMapperStoreContext);
  if (!store) {
    throw new Error('useJourneyMapperStoreApi must be used within JourneyMapperStoreProvider');
  }
  return store;
}
