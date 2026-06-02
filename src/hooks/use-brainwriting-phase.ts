'use client';

import React from 'react';
import { useCanvasStore, useCanvasStoreApi } from '@/providers/canvas-store-provider';
import { MindMapCanvas } from '@/components/workshop/mind-map-canvas';
import { buildBrainwritingMatrices, type BrainwritingOwner } from '@/lib/canvas/brain-rewriting-build';
import type { Crazy8sSlot, SlotGroup } from '@/lib/canvas/crazy-8s-types';

export interface BrainwritingSeed {
  /** Crazy 8s slots carried over from the Ideation step (for titles + source images). */
  crazy8sSlots: Crazy8sSlot[];
  /** Merged-slot groups carried over from Ideation. */
  slotGroups: SlotGroup[];
  /** The ideas the team selected/voted for at the end of Ideation. */
  selectedSlotIds: string[];
}

interface UseBrainwritingPhaseOptions {
  enabled: boolean;
  workshopId: string;
  stepId: string;
  seed?: BrainwritingSeed;
  /** Multiplayer ideation owners (for per-participant iteration cells). */
  owners?: BrainwritingOwner[];
  /** Called when the user finishes Brain Writing (wires to the step's confirm flow). */
  onDone?: () => void;
}

/**
 * Drives the dedicated Brain Writing step. Seeds the step's (own Liveblocks room) canvas
 * with the sketches selected in Ideation, builds one brain-rewriting matrix per selected
 * idea, and renders MindMapCanvas in brain-writing-only mode. Mirrors useIdeationSeeding's
 * Liveblocks connect-gating so seeded data isn't wiped by enterRoom() clearing.
 */
export function useBrainwritingPhase({
  enabled,
  workshopId,
  stepId,
  seed,
  owners,
  onDone,
}: UseBrainwritingPhaseOptions) {
  const storeApi = useCanvasStoreApi();
  const brainRewritingMatrices = useCanvasStore((s) => s.brainRewritingMatrices);
  const isMultiplayer = !!(owners && owners.length > 0);
  const seeded = React.useRef(false);

  React.useEffect(() => {
    if (!enabled || seeded.current) return;
    if (!seed || seed.selectedSlotIds.length === 0) return;

    const doSeed = () => {
      if (seeded.current) return;
      const state = storeApi.getState();
      // Already seeded (resume / late join) — don't rebuild.
      if (state.brainRewritingMatrices.length > 0) {
        seeded.current = true;
        return;
      }
      seeded.current = true;

      // Carry the source sketches + groups into this step's store so matrix titles,
      // descriptions, and group labels resolve when rendering.
      if (state.crazy8sSlots.length === 0 && seed.crazy8sSlots.length > 0) {
        state.setCrazy8sSlots(seed.crazy8sSlots);
      }
      if (state.slotGroups.length === 0 && seed.slotGroups.length > 0) {
        state.setSlotGroups(seed.slotGroups);
      }
      state.setSelectedSlotIds(seed.selectedSlotIds);

      const matrices = buildBrainwritingMatrices(
        seed.selectedSlotIds,
        seed.crazy8sSlots,
        seed.slotGroups,
        owners ?? [],
      );
      state.setBrainRewritingMatrices(matrices);
      state.markDirty();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const liveblocksState = (storeApi.getState() as any).liveblocks;
    if (liveblocksState) {
      if (liveblocksState.status === 'connected') {
        const t = setTimeout(doSeed, 200);
        return () => clearTimeout(t);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unsub = storeApi.subscribe((s: any) => {
        if (s.liveblocks?.status === 'connected') {
          unsub();
          setTimeout(doSeed, 300);
        }
      });
      const fallback = setTimeout(() => {
        unsub();
        doSeed();
      }, 5000);
      return () => {
        unsub();
        clearTimeout(fallback);
      };
    }

    // Solo store — seed immediately.
    doSeed();
  }, [enabled, seed, owners, storeApi]);

  const handleCellUpdate = React.useCallback(
    (slotId: string, cellId: string, imageUrl: string, drawingId: string) => {
      storeApi.getState().updateBrainRewritingCell(slotId, cellId, { imageUrl, drawingId });
    },
    [storeApi],
  );

  const handleToggleIncluded = React.useCallback(
    (slotId: string) => {
      storeApi.getState().toggleBrainRewritingIncluded(slotId);
    },
    [storeApi],
  );

  const renderCanvas = React.useCallback(() => {
    return React.createElement(MindMapCanvas, {
      workshopId,
      stepId,
      brainWritingOnly: true,
      brainRewritingMatrices,
      onBrainRewritingCellUpdate: handleCellUpdate,
      onBrainRewritingToggleIncluded: handleToggleIncluded,
      onBrainRewritingDone: onDone,
      isMultiplayerIdeation: isMultiplayer,
    });
  }, [workshopId, stepId, brainRewritingMatrices, handleCellUpdate, handleToggleIncluded, onDone, isMultiplayer]);

  return { renderCanvas, hasMatrices: brainRewritingMatrices.length > 0 };
}
