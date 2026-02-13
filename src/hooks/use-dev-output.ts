'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'dev-output-enabled';

// Module-level subscriber set — shared across all hook instances
const subscribers = new Set<() => void>();

function subscribe(callback: () => void) {
  subscribers.add(callback);
  return () => { subscribers.delete(callback); };
}

function getSnapshot(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function getServerSnapshot(): boolean {
  return false;
}

function notifyAll() {
  subscribers.forEach((cb) => cb());
}

/**
 * Hook to control dev output panel visibility.
 *
 * Uses useSyncExternalStore so ALL components calling this hook
 * see the same value and re-render together when it changes.
 *
 * - isDevMode: true on localhost/127.0.0.1
 * - devOutputEnabled: true when dev mode AND toggle is on
 * - toggleDevOutput: flips the value (persists to localStorage)
 */
export function useDevOutput() {
  const [isDevMode, setIsDevMode] = useState(false);
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const hostname = window.location.hostname;
    setIsDevMode(hostname === 'localhost' || hostname === '127.0.0.1');
  }, []);

  const toggleDevOutput = useCallback(() => {
    if (!isDevMode) return;
    const current = localStorage.getItem(STORAGE_KEY) === 'true';
    localStorage.setItem(STORAGE_KEY, String(!current));
    notifyAll();
  }, [isDevMode]);

  return {
    isDevMode,
    devOutputEnabled: isDevMode && stored,
    toggleDevOutput,
  };
}
