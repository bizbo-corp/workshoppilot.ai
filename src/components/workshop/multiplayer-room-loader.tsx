'use client';

/**
 * MultiplayerRoomLoader — lazy-loading wrapper for the multiplayer canvas room.
 *
 * Uses next/dynamic with ssr: false to ensure:
 * - @liveblocks/react is NEVER imported in solo workshop code paths (zero bundle cost)
 * - Multiplayer components load only when workshopType === 'multiplayer'
 * - SSR is disabled for Liveblocks providers (WebSocket connections are client-only)
 *
 * The 'use client' directive is required in Next.js 15+ when using next/dynamic
 * with ssr: false in a component exported from the app directory.
 *
 * The actual MultiplayerRoom implementation will be created in Phase 55
 * (Core Canvas Sync) when the Zustand + Liveblocks middleware is wired up.
 */

import dynamic from 'next/dynamic';

const MultiplayerRoom = dynamic(
  () => import('@/components/workshop/multiplayer-room'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Connecting to live session...
      </div>
    ),
  }
);

interface MultiplayerRoomLoaderProps {
  workshopId: string;
}

export function MultiplayerRoomLoader({ workshopId }: MultiplayerRoomLoaderProps) {
  return <MultiplayerRoom workshopId={workshopId} />;
}
