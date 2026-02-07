/**
 * Hydration-safe localStorage hook
 * Prevents hydration mismatches by loading from localStorage after mount
 * Returns [value, setValue, isLoading] tuple
 */

import { useState, useEffect } from 'react';

export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void, boolean] {
  // Initialize with default value (NOT localStorage) to avoid hydration errors
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage after hydration
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored));
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      // Fall back to default value on error
    } finally {
      setIsLoading(false);
    }
  }, [key]);

  // Update both state and localStorage
  const updateValue = (newValue: T) => {
    try {
      setValue(newValue);
      localStorage.setItem(key, JSON.stringify(newValue));
    } catch (error) {
      console.error(`Error writing localStorage key "${key}":`, error);
    }
  };

  return [value, updateValue, isLoading];
}
