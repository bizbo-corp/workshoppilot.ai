'use client';

// Placeholder — implemented in Phase 55 (Core Canvas Sync)
// This file exists to prevent build-time TypeScript errors from the dynamic import
// in multiplayer-room-loader.tsx. The dynamic() call is lazy/runtime, but TypeScript
// validates the import path at build time.
//
// Phase 55 will replace this with the actual Zustand + Liveblocks middleware
// integrated canvas room, including:
// - RoomProvider wrapping the canvas
// - createMultiplayerCanvasStore with liveblocks() middleware
// - Presence indicators and cursor tracking
// - Real-time element sync via LiveMap<string, LiveObject<CanvasElementStorable>>

export default function MultiplayerRoom({ workshopId }: { workshopId: string }) {
  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      Multiplayer room for workshop {workshopId} — coming in Phase 55
    </div>
  );
}
