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
  children: React.ReactNode;
}

export function MultiplayerRoomLoader({ workshopId, children }: MultiplayerRoomLoaderProps) {
  return <MultiplayerRoom workshopId={workshopId}>{children}</MultiplayerRoom>;
}
