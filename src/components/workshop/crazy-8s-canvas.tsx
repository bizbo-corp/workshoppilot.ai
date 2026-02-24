'use client';

/**
 * Crazy 8s Canvas Container
 * Connects Crazy8sGrid with EzyDraw modal for sketch-to-slot workflow
 * Handles drawing lifecycle: tap slot → draw → save PNG + vector JSON → display in slot
 */

import { useState, useEffect, useCallback } from 'react';
import { Crazy8sGrid } from './crazy-8s-grid';
import { EzyDrawLoader } from '@/components/ezydraw/ezydraw-loader';
import { saveDrawing, loadDrawing, updateDrawing } from '@/actions/drawing-actions';
import { simplifyDrawingElements } from '@/lib/drawing/simplify';
import { EMPTY_CRAZY_8S_SLOTS, CRAZY_8S_CANVAS_SIZE } from '@/lib/canvas/crazy-8s-types';
import { useCanvasStore, useCanvasStoreApi } from '@/providers/canvas-store-provider';
import type { DrawingElement } from '@/lib/drawing/types';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface Crazy8sCanvasProps {
  workshopId: string;
  stepId: string;
}

interface EzyDrawState {
  isOpen: boolean;
  slotId: string;
  drawingId?: string;
  initialElements?: DrawingElement[];
}

/**
 * Crazy 8s Canvas Container
 * Manages 8-slot sketching grid with EzyDraw modal integration
 */
export function Crazy8sCanvas({ workshopId, stepId }: Crazy8sCanvasProps) {
  // Store selectors
  const crazy8sSlots = useCanvasStore((s) => s.crazy8sSlots);
  const updateCrazy8sSlot = useCanvasStore((s) => s.updateCrazy8sSlot);
  const setCrazy8sSlots = useCanvasStore((s) => s.setCrazy8sSlots);
  const storeApi = useCanvasStoreApi();

  // EzyDraw modal state
  const [ezyDrawState, setEzyDrawState] = useState<EzyDrawState | null>(null);

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

    // Filled slot: load existing drawing for re-edit
    if (slot.drawingId) {
      const drawing = await loadDrawing({
        workshopId,
        stepId,
        drawingId: slot.drawingId,
      });

      if (drawing) {
        // Parse vector JSON to DrawingElement[]
        try {
          const elements = JSON.parse(drawing.vectorJson) as DrawingElement[];
          setEzyDrawState({
            isOpen: true,
            slotId,
            drawingId: slot.drawingId,
            initialElements: elements,
          });
        } catch (error) {
          console.error('Failed to parse drawing vector JSON:', error);
          // Fall back to empty canvas if parse fails
          setEzyDrawState({ isOpen: true, slotId });
        }
      } else {
        // Drawing not found (deleted?) → open empty canvas
        console.warn('Drawing not found for slot:', slotId);
        setEzyDrawState({ isOpen: true, slotId });
      }
    } else {
      // Empty slot: open blank canvas
      setEzyDrawState({ isOpen: true, slotId });
    }
  };

  /**
   * Handle drawing save: simplify → upload PNG → update slot
   * - Re-edit: update existing drawing
   * - New: create new drawing and link to slot
   */
  const handleDrawingSave = async (result: {
    pngDataUrl: string;
    elements: DrawingElement[];
  }) => {
    if (!ezyDrawState) return;

    // Simplify elements to reduce vector JSON size
    const simplified = simplifyDrawingElements(result.elements);
    const vectorJson = JSON.stringify(simplified);

    try {
      if (ezyDrawState.drawingId) {
        // Re-editing existing drawing
        const response = await updateDrawing({
          workshopId,
          stepId,
          drawingId: ezyDrawState.drawingId,
          pngBase64: result.pngDataUrl,
          vectorJson,
          width: CRAZY_8S_CANVAS_SIZE.width,
          height: CRAZY_8S_CANVAS_SIZE.height,
        });

        if (response.success) {
          // Update slot with new image URL
          updateCrazy8sSlot(ezyDrawState.slotId, {
            imageUrl: response.pngUrl,
          });
        } else {
          console.error('Failed to update drawing:', response.error);
        }
      } else {
        // Creating new drawing
        const response = await saveDrawing({
          workshopId,
          stepId,
          pngBase64: result.pngDataUrl,
          vectorJson,
          width: CRAZY_8S_CANVAS_SIZE.width,
          height: CRAZY_8S_CANVAS_SIZE.height,
        });

        if (response.success) {
          // Update slot with drawing ID and image URL
          updateCrazy8sSlot(ezyDrawState.slotId, {
            drawingId: response.drawingId,
            imageUrl: response.pngUrl,
          });
        } else {
          console.error('Failed to save drawing:', response.error);
        }
      }
    } catch (error) {
      console.error('Error saving drawing:', error);
    } finally {
      // Close modal
      setEzyDrawState(null);
    }
  };

  /**
   * Handle title change in grid
   */
  const handleTitleChange = (slotId: string, title: string) => {
    updateCrazy8sSlot(slotId, { title });
  };

  /**
   * Handle description change in grid
   */
  const handleDescriptionChange = (slotId: string, description: string) => {
    updateCrazy8sSlot(slotId, { description });
  };

  /**
   * Handle slot info change from EzyDraw footer
   */
  const handleSlotInfoChange = useCallback((updates: { title?: string; description?: string }) => {
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
      {/* AI Suggest Prompts button - only show when all slots empty */}
      {allSlotsEmpty && crazy8sSlots.length > 0 && (
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

      <Crazy8sGrid
        slots={crazy8sSlots}
        onSlotClick={handleSlotClick}
        onTitleChange={handleTitleChange}
        onDescriptionChange={handleDescriptionChange}
        aiPrompts={aiPrompts}
      />

      {ezyDrawState?.isOpen && (
        <EzyDrawLoader
          isOpen={true}
          onClose={() => setEzyDrawState(null)}
          onSave={handleDrawingSave}
          initialElements={ezyDrawState.initialElements}
          canvasSize={CRAZY_8S_CANVAS_SIZE}
          slotTitle={currentSlot?.title}
          slotDescription={currentSlot?.description}
          onSlotInfoChange={handleSlotInfoChange}
        />
      )}
    </div>
  );
}
