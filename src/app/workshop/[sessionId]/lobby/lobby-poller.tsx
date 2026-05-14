'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Tiny client component that refreshes the lobby every N ms.
 * Used as a belt-and-braces fallback alongside the Liveblocks WORKSHOP_STARTED
 * broadcast so participants follow into Step 2 even if the broadcast misses.
 */
export function LobbyPoller({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
