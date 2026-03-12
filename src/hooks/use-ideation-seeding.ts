'use client';

import { useEffect, useRef } from 'react';
import { useCanvasStoreApi } from '@/providers/canvas-store-provider';
import { THEME_COLORS } from '@/lib/canvas/mind-map-theme-colors';
import type { MindMapNodeState, MindMapEdgeState } from '@/stores/canvas-store';
import type { Crazy8sSlot } from '@/lib/canvas/crazy-8s-types';

export interface IdeationOwner {
  ownerId: string;
  ownerName: string;
  ownerColor: string;
  hmwBranchLabel: string;
  hmwFullStatement?: string; // Full HMW from step 7 — undefined if participant has none
}

interface UseIdeationSeedingOptions {
  owners: IdeationOwner[];
  challengeStatement?: string;
  hmwStatement?: string;
  currentOwnerId?: string;
}

/**
 * Client-side seeding for multiplayer ideation mind map nodes.
 *
 * Waits for Liveblocks to connect (if multiplayer) before seeding, so that
 * the enterRoom() clearing phase doesn't wipe seeded data. After Liveblocks
 * connects and recovery runs, we check if owned nodes exist and seed if needed.
 */
export function useIdeationSeeding({
  owners,
  challengeStatement,
  hmwStatement,
  currentOwnerId,
}: UseIdeationSeedingOptions) {
  const storeApi = useCanvasStoreApi();
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    if (owners.length === 0) return;
    if (!currentOwnerId) return; // Solo mode — no seeding from this hook

    const doSeed = () => {
      if (seeded.current) return;
      seeded.current = true;

      const state = storeApi.getState();
      const ownedNodes = state.mindMapNodes.filter((n: MindMapNodeState) => n.ownerId);
      const hasOwnedNodes = ownedNodes.length > 0;

      if (hasOwnedNodes) {
        // Check for late-joiner
        const currentOwnerHasNodes = ownedNodes.some(
          (n: MindMapNodeState) => n.ownerId === currentOwnerId
        );
        if (currentOwnerHasNodes) return;
        const ownerIndex = owners.findIndex((o) => o.ownerId === currentOwnerId);
        if (ownerIndex >= 0) {
          seedOwner(owners[ownerIndex], storeApi, challengeStatement, hmwStatement, ownerIndex);
        }
        return;
      }

      // No owned nodes at all. Only seed if the store has NO mind map nodes whatsoever
      // (fresh room). If nodes exist but none are owned, this is solo mode — skip.
      // If all owned nodes were deleted, crazy8sSlots with ownerIds will still exist
      // as a signal that seeding already happened previously — don't re-seed.
      const hasOwnerSlots = state.crazy8sSlots.some((s: Crazy8sSlot) => s.ownerId);
      if (state.mindMapNodes.length > 0 || hasOwnerSlots) return;

      // Truly empty room — seed ALL owners (each gets a unique color index)
      for (let i = 0; i < owners.length; i++) {
        seedOwner(owners[i], storeApi, challengeStatement, hmwStatement, i);
      }
    };

    // Check if this is a multiplayer store with Liveblocks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const liveblocksState = (storeApi.getState() as any).liveblocks;

    if (liveblocksState) {
      // Multiplayer: wait for Liveblocks to connect before seeding.
      // enterRoom() clears storageMapping fields during connection. Seeding
      // before connection would get wiped. After connection + recovery, the
      // store has either Storage data or recovered server data — safe to seed.
      if (liveblocksState.status === 'connected') {
        // Already connected — seed after a tick to let recovery run
        const timer = setTimeout(doSeed, 200);
        return () => clearTimeout(timer);
      }

      // Subscribe to status changes and seed when connected
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unsub = storeApi.subscribe((state: any) => {
        if (state.liveblocks?.status === 'connected') {
          unsub();
          // Small delay to let recovery mechanism run first
          setTimeout(doSeed, 300);
        }
      });

      // Fallback: seed after 5s even if Liveblocks doesn't connect
      const fallbackTimer = setTimeout(() => {
        unsub();
        doSeed();
      }, 5000);

      return () => {
        unsub();
        clearTimeout(fallbackTimer);
      };
    }

    // Solo store — seed immediately
    doSeed();
  }, [owners, currentOwnerId, storeApi, challengeStatement, hmwStatement]);
}

function seedOwner(
  owner: IdeationOwner,
  storeApi: ReturnType<typeof useCanvasStoreApi>,
  challengeStatement?: string,
  hmwStatement?: string,
  ownerIndex: number = 0,
) {
  const state = storeApi.getState();
  const rootLabel = challengeStatement || hmwStatement || 'How might we...?';
  const rootId = `${owner.ownerId}-root`;
  // Each participant gets a unique theme color based on their index.
  // Root node uses the SAME palette color as the HMW child for visual harmony.
  const themeColor = THEME_COLORS[ownerIndex % THEME_COLORS.length];

  const rootNode: MindMapNodeState = {
    id: rootId,
    label: rootLabel,
    themeColorId: themeColor.id,
    themeColor: themeColor.color,
    themeBgColor: themeColor.bgColor,
    isRoot: true,
    level: 0,
    position: { x: 0, y: 0 },
    ownerId: owner.ownerId,
    ownerName: owner.ownerName,
  };

  state.addMindMapNode(rootNode);

  // Only add the HMW child node if this participant has a reframed HMW statement.
  // If no HMW exists, the root (challenge statement) stands alone.
  if (owner.hmwFullStatement) {
    const hmwNodeId = `hmw-${owner.ownerId}-0`;
    const hmwNode: MindMapNodeState = {
      id: hmwNodeId,
      label: owner.hmwFullStatement,
      themeColorId: themeColor.id,
      themeColor: themeColor.color,
      themeBgColor: themeColor.bgColor,
      isRoot: false,
      level: 1,
      parentId: rootId,
      position: { x: 0, y: 160 },
      ownerId: owner.ownerId,
      ownerName: owner.ownerName,
    };

    const edge: MindMapEdgeState = {
      id: `${rootId}-${hmwNodeId}`,
      source: rootId,
      target: hmwNodeId,
      themeColor: themeColor.color,
      ownerId: owner.ownerId,
    };

    state.addMindMapNode(hmwNode, edge);
  }

  // Add 8 crazy 8s slots
  const existingSlots = storeApi.getState().crazy8sSlots;
  const newSlots: Crazy8sSlot[] = [];
  for (let i = 1; i <= 8; i++) {
    const slotId = `${owner.ownerId}-slot-${i}`;
    if (!existingSlots.some((s) => s.slotId === slotId)) {
      newSlots.push({
        slotId,
        title: '',
        ownerId: owner.ownerId,
        ownerName: owner.ownerName,
        ownerColor: owner.ownerColor,
      });
    }
  }
  if (newSlots.length > 0) {
    storeApi.getState().setCrazy8sSlots([...existingSlots, ...newSlots]);
  }

  storeApi.getState().markDirty();
}
