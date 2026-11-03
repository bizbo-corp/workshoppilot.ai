'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WorkshopState } from '@/lib/engine/types';

/**
 * Client-side mirror of the workshop projection. The server owns the
 * truth; this hook refetches it after each AI turn or board edit and lets
 * actions push a fresh state straight in.
 */
export function useWorkshopState(workshopId: string, initial: WorkshopState) {
  const [state, setState] = useState(initial);
  const inflight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (inflight.current) return inflight.current;
    inflight.current = fetch(`/api/w/${workshopId}/state`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.state) setState(json.state as WorkshopState);
      })
      .catch(() => undefined)
      .finally(() => {
        inflight.current = null;
      });
    return inflight.current;
  }, [workshopId]);

  // Pick up anything another tab or a background job wrote.
  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  return { state, setState, refresh };
}
