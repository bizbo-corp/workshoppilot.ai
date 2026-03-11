'use client';

import { useEffect, useRef } from 'react';
import { useCanvasStoreApi } from '@/providers/canvas-store-provider';
import { ROOT_COLOR, THEME_COLORS } from '@/lib/canvas/mind-map-theme-colors';
import type { MindMapNodeState, MindMapEdgeState } from '@/stores/canvas-store';
import type { Crazy8sSlot } from '@/lib/canvas/crazy-8s-types';

export interface IdeationOwner {
  ownerId: string;
  ownerName: string;
  ownerColor: string;
  hmwBranchLabel: string;
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
 * The step-level Liveblocks room is SKIPPED for ideation (see canvas-store-provider),
 * so we can safely write to the store without Liveblocks clearing our data.
 * This hook seeds on mount if no owned nodes exist yet.
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

    seeded.current = true;

    const state = storeApi.getState();
    const hasOwnedNodes = state.mindMapNodes.some((n: MindMapNodeState) => n.ownerId);

    if (hasOwnedNodes) {
      // Check for late-joiner
      const currentOwnerHasNodes = state.mindMapNodes.some(
        (n: MindMapNodeState) => n.ownerId === currentOwnerId
      );
      if (currentOwnerHasNodes) return;
      const owner = owners.find((o) => o.ownerId === currentOwnerId);
      if (owner) {
        seedOwner(owner, storeApi, challengeStatement, hmwStatement);
      }
      return;
    }

    // No owned nodes — seed ALL owners
    for (const owner of owners) {
      seedOwner(owner, storeApi, challengeStatement, hmwStatement);
    }
  }, [owners, currentOwnerId, storeApi, challengeStatement, hmwStatement]);
}

function seedOwner(
  owner: IdeationOwner,
  storeApi: ReturnType<typeof useCanvasStoreApi>,
  challengeStatement?: string,
  hmwStatement?: string,
) {
  const state = storeApi.getState();
  const rootLabel = challengeStatement || hmwStatement || 'How might we...?';
  const rootId = `${owner.ownerId}-root`;
  const hmwNodeId = `hmw-${owner.ownerId}-0`;
  const themeColor = THEME_COLORS[0];

  const rootNode: MindMapNodeState = {
    id: rootId,
    label: rootLabel,
    themeColorId: 'gray',
    themeColor: ROOT_COLOR.color,
    themeBgColor: ROOT_COLOR.bgColor,
    isRoot: true,
    level: 0,
    position: { x: 0, y: 0 },
    ownerId: owner.ownerId,
    ownerName: owner.ownerName,
  };

  const hmwNode: MindMapNodeState = {
    id: hmwNodeId,
    label: owner.hmwBranchLabel,
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

  state.addMindMapNode(rootNode);
  state.addMindMapNode(hmwNode, edge);

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
