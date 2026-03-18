'use client';

/**
 * Crazy 8s Canvas Container
 * Connects Crazy8sGrid with EzyDraw modal for sketch-to-slot workflow
 * Handles drawing lifecycle: tap slot → draw → save PNG + vector JSON → display in slot
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Crazy8sGrid } from './crazy-8s-grid';
import { VotingResultsPanel } from './voting-results-panel';
import { EzyDrawLoader } from '@/components/ezydraw/ezydraw-loader';
import { saveDrawing, loadDrawing, updateDrawing } from '@/actions/drawing-actions';
import { simplifyDrawingElements } from '@/lib/drawing/simplify';
import { EMPTY_CRAZY_8S_SLOTS, CRAZY_8S_CANVAS_SIZE } from '@/lib/canvas/crazy-8s-types';
import { useCanvasStore, useCanvasStoreApi } from '@/providers/canvas-store-provider';
import { type DrawingElement, type VectorData, parseVectorJson } from '@/lib/drawing/types';
import type { EzyDrawSaveResult } from '@/components/ezydraw/ezydraw-modal';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useMultiplayerContext } from './multiplayer-room';
import { PARTICIPANT_COLORS } from '@/lib/liveblocks/config';

interface Crazy8sCanvasProps {
  workshopId: string;
  stepId: string;
  /** Filter slots to this owner (per-participant card) */
  ownerId?: string;
  /** True when the idea-selection phase is active */
  votingMode?: boolean;
  onVoteSelectionConfirm?: (selectedSlotIds: string[]) => void;
  onReVote?: () => void;
  /** When false, keep grid visible after voting closes (multiplayer "All" view) */
  showResultsInline?: boolean;
}

interface EzyDrawState {
  isOpen: boolean;
  slotId: string;
  drawingId?: string;
  initialElements?: DrawingElement[];
  initialBackgroundImageUrl?: string | null;
}

/**
 * Crazy 8s Canvas Container
 * Manages 8-slot sketching grid with EzyDraw modal integration
 */
export function Crazy8sCanvas({ workshopId, stepId, ownerId, votingMode, onVoteSelectionConfirm, onReVote, showResultsInline = true }: Crazy8sCanvasProps) {
  // Store selectors
  const allCrazy8sSlots = useCanvasStore((s) => s.crazy8sSlots);

  // Filter slots by ownerId when set (per-participant card)
  const crazy8sSlots = ownerId
    ? allCrazy8sSlots.filter((s) => s.ownerId === ownerId)
    : allCrazy8sSlots;
  const updateCrazy8sSlot = useCanvasStore((s) => s.updateCrazy8sSlot);
  const setCrazy8sSlots = useCanvasStore((s) => s.setCrazy8sSlots);
  const storeApi = useCanvasStoreApi();

  // Voting store selectors
  const dotVotes = useCanvasStore((s) => s.dotVotes);
  const votingSession = useCanvasStore((s) => s.votingSession);
  const castVote = useCanvasStore((s) => s.castVote);
  const retractVote = useCanvasStore((s) => s.retractVote);

  // Voter identity
  const { user } = useUser();
  const voterId = user?.id ?? 'solo-anon';

  // Multiplayer context — safe in both solo and multiplayer
  const { isFacilitator } = useMultiplayerContext();

  // Derived voting budget
  const myVotes = dotVotes.filter((v) => v.voterId === voterId);
  const remainingBudget = votingSession.voteBudget - myVotes.length;

  // Build a deterministic voter color map for the facilitator god view.
  // Each unique voter is assigned a color from PARTICIPANT_COLORS by arrival order.
  // This avoids needing useOthers/useSelf in a component that may be in solo mode.
  const voterColorMap = useMemo(() => {
    if (!isFacilitator || !votingMode) return new Map<string, string>();
    const uniqueVoterIds = [...new Set(dotVotes.map((v) => v.voterId))];
    const map = new Map<string, string>();
    uniqueVoterIds.forEach((id, i) => {
      map.set(id, PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length]);
    });
    return map;
  }, [dotVotes, isFacilitator, votingMode]);

  // Cast vote handler
  const handleCastVote = useCallback((slotId: string) => {
    if (remainingBudget <= 0 || votingSession.status !== 'open') return;
    castVote({ slotId, voterId, voteIndex: myVotes.length });
  }, [remainingBudget, votingSession.status, castVote, voterId, myVotes.length]);

  // Retract vote handler
  const handleRetractVote = useCallback((voteId: string) => {
    if (votingSession.status !== 'open') return;
    retractVote(voteId);
  }, [votingSession.status, retractVote]);

  // EzyDraw modal state
  const [ezyDrawState, setEzyDrawState] = useState<EzyDrawState | null>(null);

  // Ref captures ezyDrawState for use after dialog closes
  const ezyDrawStateRef = useRef(ezyDrawState);
  ezyDrawStateRef.current = ezyDrawState;

  // Saving indicator: which slot is being saved in the background
  const [savingSlotId, setSavingSlotId] = useState<string | null>(null);

  // AI prompts state
  const [aiPrompts, setAiPrompts] = useState<string[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);

  // Initialize empty slots on mount only if store has no slots (fresh session)
  useEffect(() => {
    const currentSlots = storeApi.getState().crazy8sSlots;
    if (currentSlots.length === 0) {
      setCrazy8sSlots(EMPTY_CRAZY_8S_SLOTS);
    }
  }, []); // Only run on mount

  /**
   * Handle slot click: open EzyDraw modal
   * - Empty slot → blank canvas
   * - Filled slot → load existing vector data for re-edit
   */
  const handleSlotClick = async (slotId: string) => {
    const slot = crazy8sSlots.find((s) => s.slotId === slotId);
    if (!slot) return;

    console.log(`[slot-click] ${slotId} drawingId=${slot.drawingId || 'none'} imageUrl=${slot.imageUrl ? 'yes' : 'none'}`);

    // Filled slot: load existing drawing for re-edit
    if (slot.drawingId) {
      const drawing = await loadDrawing({
        workshopId,
        stepId,
        drawingId: slot.drawingId,
      });

      if (drawing) {
        try {
          const { elements, backgroundImageUrl } = parseVectorJson(drawing.vectorJson);
          console.log(`[slot-click] Loaded drawing: ${elements.length} elements, bgImage=${backgroundImageUrl ? 'yes' : 'none'}`);
          setEzyDrawState({
            isOpen: true,
            slotId,
            drawingId: slot.drawingId,
            initialElements: elements,
            initialBackgroundImageUrl: backgroundImageUrl,
          });
        } catch (error) {
          console.error('[slot-click] Failed to parse vectorJson:', error);
          setEzyDrawState({
            isOpen: true,
            slotId,
            initialBackgroundImageUrl: slot.imageUrl || null,
          });
        }
      } else {
        // Drawing record not found — fall back to slot's PNG thumbnail as background
        console.warn(`[slot-click] Drawing ${slot.drawingId} not found in DB — using thumbnail fallback`);
        setEzyDrawState({
          isOpen: true,
          slotId,
          initialBackgroundImageUrl: slot.imageUrl || null,
        });
      }
    } else if (slot.imageUrl) {
      // Slot has an image but no drawingId — use image as background for editing
      console.log('[slot-click] No drawingId, using imageUrl as background');
      setEzyDrawState({
        isOpen: true,
        slotId,
        initialBackgroundImageUrl: slot.imageUrl,
      });
    } else {
      // Empty slot: open blank canvas
      console.log('[slot-click] Empty slot — blank canvas');
      setEzyDrawState({ isOpen: true, slotId });
    }
  };

  /**
   * Handle drawing save: dialog already closed, save in background.
   * Uses ref to access the slot context captured before the dialog closed.
   *
   * Flow: upload PNG via API route → then save metadata via server action.
   * This avoids the server action body size limit (~1-4MB).
   */
  const handleDrawingSave = async (result: EzyDrawSaveResult) => {
    // Read from ref — the dialog may have already closed and cleared ezyDrawState
    const state = ezyDrawStateRef.current;
    if (!state) {
      console.warn('[drawing-save] No ezyDrawState ref — save aborted');
      return;
    }

    const { slotId, drawingId } = state;
    setSavingSlotId(slotId);

    // Build vector JSON wrapper with background image URL
    const simplified = simplifyDrawingElements(result.elements);
    const vectorData: VectorData = {
      elements: simplified,
      backgroundImageUrl: result.backgroundImageUrl || null,
    };
    const vectorJson = JSON.stringify(vectorData);

    const pngSize = result.pngDataUrl ? Math.round(result.pngDataUrl.length / 1024) : 0;
    const vecSize = Math.round(vectorJson.length / 1024);
    console.log(`[drawing-save] slot=${slotId} pngSize=${pngSize}KB vecSize=${vecSize}KB drawingId=${drawingId || 'new'}`);

    try {
      // Step 1: Upload image via API route as binary FormData (bypasses server action body limit)
      let pngUrl = '';
      if (result.pngDataUrl) {
        console.log('[drawing-save] Converting data URL to blob for upload...');
        const blobRes = await fetch(result.pngDataUrl);
        const imageBlob = await blobRes.blob();
        console.log(`[drawing-save] Uploading ${Math.round(imageBlob.size / 1024)}KB as FormData...`);

        const formData = new FormData();
        formData.append('file', imageBlob, `drawing.${imageBlob.type === 'image/png' ? 'png' : imageBlob.type === 'image/webp' ? 'webp' : 'jpg'}`);
        formData.append('workshopId', workshopId);

        const uploadRes = await fetch('/api/upload-drawing-png', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({ error: uploadRes.statusText }));
          console.error('[drawing-save] Image upload failed:', err);
          setSavingSlotId(null);
          return;
        }

        const uploadData = await uploadRes.json();
        pngUrl = uploadData.pngUrl;
        console.log('[drawing-save] Uploaded:', pngUrl.substring(0, 80) + '...');
      }

      // Step 2: Save metadata via server action (small payload — just URLs + vector JSON)
      if (drawingId) {
        console.log('[drawing-save] Updating existing drawing...');
        const response = await updateDrawing({
          workshopId,
          stepId,
          drawingId,
          pngUrl,
          vectorJson,
          width: CRAZY_8S_CANVAS_SIZE.width,
          height: CRAZY_8S_CANVAS_SIZE.height,
        });

        if (response.success) {
          console.log('[drawing-save] Update success, pngUrl:', response.pngUrl.substring(0, 80));
          updateCrazy8sSlot(slotId, { imageUrl: response.pngUrl, isDirty: true });
        } else {
          console.error('[drawing-save] Update failed:', response.error);
        }
      } else {
        console.log('[drawing-save] Creating new drawing...');
        const response = await saveDrawing({
          workshopId,
          stepId,
          pngUrl,
          vectorJson,
          width: CRAZY_8S_CANVAS_SIZE.width,
          height: CRAZY_8S_CANVAS_SIZE.height,
        });

        if (response.success) {
          console.log('[drawing-save] Save success, drawingId:', response.drawingId, 'pngUrl:', response.pngUrl.substring(0, 80));
          updateCrazy8sSlot(slotId, {
            drawingId: response.drawingId,
            imageUrl: response.pngUrl,
            isDirty: true,
          });
        } else {
          console.error('[drawing-save] Save failed:', response.error);
        }
      }
    } catch (error) {
      console.error('[drawing-save] Error:', error);
    } finally {
      setSavingSlotId(null);
    }
  };

  /**
   * Handle title change in grid
   */
  const handleTitleChange = (slotId: string, title: string) => {
    updateCrazy8sSlot(slotId, { title, isDirty: true });
  };

  /**
   * Handle description change in grid
   */
  const handleDescriptionChange = (slotId: string, description: string) => {
    updateCrazy8sSlot(slotId, { description, isDirty: true });
  };

  /**
   * Handle slot info change from EzyDraw footer
   */
  const handleSlotInfoChange = useCallback((updates: { title?: string; description?: string; sketchPrompt?: string }) => {
    if (!ezyDrawState) return;
    updateCrazy8sSlot(ezyDrawState.slotId, updates);
  }, [ezyDrawState, updateCrazy8sSlot]);

  /**
   * Fetch AI-suggested sketch prompts
   * Only show button when all slots are empty
   */
  const handleSuggestPrompts = async () => {
    setIsLoadingPrompts(true);
    try {
      const response = await fetch('/api/ai/suggest-sketch-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workshopId }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiPrompts(data.prompts || []);
      } else {
        console.error('Failed to fetch sketch prompts:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching sketch prompts:', error);
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  // Check if all slots are empty (no images)
  const allSlotsEmpty = crazy8sSlots.every((slot) => !slot.imageUrl);

  // Look up current slot info for EzyDraw
  const currentSlot = ezyDrawState
    ? crazy8sSlots.find((s) => s.slotId === ezyDrawState.slotId)
    : null;

  return (
    <div className="h-full overflow-auto p-6">
      {/* AI Suggest Prompts button — only when not in voting mode and all slots empty */}
      {!votingMode && allSlotsEmpty && crazy8sSlots.length > 0 && (
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSuggestPrompts}
            disabled={isLoadingPrompts}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isLoadingPrompts ? 'Generating ideas...' : 'Suggest Prompts'}
          </Button>
        </div>
      )}

      {/* Voting results panel replaces the grid when voting is closed (only if showResultsInline) */}
      {votingMode && votingSession.status === 'closed' && showResultsInline ? (
        <VotingResultsPanel
          onConfirmSelection={onVoteSelectionConfirm!}
          onReVote={onReVote!}
        />
      ) : (
        <Crazy8sGrid
          slots={crazy8sSlots}
          onSlotClick={handleSlotClick}
          onTitleChange={handleTitleChange}
          onDescriptionChange={handleDescriptionChange}
          aiPrompts={aiPrompts}
          savingSlotId={savingSlotId}
          votingMode={votingMode && votingSession.status === 'open'}
          dotVotes={dotVotes}
          voterId={voterId}
          remainingBudget={remainingBudget}
          onCastVote={handleCastVote}
          onRetractVote={handleRetractVote}
          isFacilitator={isFacilitator}
          voterColorMap={voterColorMap}
        />
      )}

      {ezyDrawState?.isOpen && (
        <EzyDrawLoader
          isOpen={true}
          onClose={() => setEzyDrawState(null)}
          onSave={handleDrawingSave}
          initialElements={ezyDrawState.initialElements}
          initialBackgroundImageUrl={ezyDrawState.initialBackgroundImageUrl}
          canvasSize={CRAZY_8S_CANVAS_SIZE}
          slotTitle={currentSlot?.title}
          slotDescription={currentSlot?.description}
          onSlotInfoChange={handleSlotInfoChange}
          workshopId={workshopId}
          slotId={ezyDrawState.slotId}
          sketchPrompt={currentSlot?.sketchPrompt}
        />
      )}
    </div>
  );
}
