'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to control dev output panel visibility
 * - isDevMode: true when running on localhost/127.0.0.1
 * - devOutputEnabled: true when dev mode is active AND user has toggled output on
 * - toggleDevOutput: function to toggle the output panel on/off (persists to localStorage)
 *
 * SSR-safe: initializes as false, hydrates real values in useEffect
 */
export function useDevOutput() {
  const [isDevMode, setIsDevMode] = useState(false);
  const [devOutputEnabled, setDevOutputEnabled] = useState(false);

  useEffect(() => {
    // Check if running on localhost
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    setIsDevMode(isLocalhost);

    // Read localStorage preference (only if in dev mode)
    if (isLocalhost) {
      const stored = localStorage.getItem('dev-output-enabled');
      setDevOutputEnabled(stored === 'true');
    }
  }, []);

  const toggleDevOutput = () => {
    if (!isDevMode) return; // Production override: can't enable output

    const newValue = !devOutputEnabled;
    setDevOutputEnabled(newValue);
    localStorage.setItem('dev-output-enabled', String(newValue));
  };

  return {
    isDevMode,
    devOutputEnabled: isDevMode && devOutputEnabled, // Production override
    toggleDevOutput,
  };
}
