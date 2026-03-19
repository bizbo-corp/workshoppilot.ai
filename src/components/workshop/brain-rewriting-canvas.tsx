'use client';

/**
 * Brain Rewriting Canvas Container
 * Manages EzyDraw modal lifecycle for brain rewriting iterations.
 * Follows the same pattern as crazy-8s-canvas.tsx.
 */

import { useState, useCallback } from 'react';
import { BrainRewritingGrid } from './brain-rewriting-grid';
import { EzyDrawLoader } from '@/components/ezydraw/ezydraw-loader';
import { saveDrawing, loadDrawing, updateDrawing } from '@/actions/drawing-actions';
import { simplifyDrawingElements } from '@/lib/drawing/simplify';
import {
  type BrainRewritingCellId,
  type BrainRewritingMatrix,
} from '@/lib/canvas/brain-rewriting-types';
import { CRAZY_8S_CANVAS_SIZE } from '@/lib/canvas/crazy-8s-types';
import { type DrawingElement, parseVectorJson } from '@/lib/drawing/types';
import { useCanvasStore } from '@/providers/canvas-store-provider';

interface BrainRewritingCanvasProps {
  matrix: BrainRewritingMatrix;
  workshopId: string;
  stepId: string;
  slotTitle: string;
  onCellUpdate: (slotId: string, cellId: string, imageUrl: string, drawingId: string) => void;
}

interface EzyDrawState {
  isOpen: boolean;
  cellId: BrainRewritingCellId;
  drawingId?: string;
  initialElements?: DrawingElement[];
  initialBackgroundImageUrl?: string | null;
}

export function BrainRewritingCanvas({
  matrix,
  workshopId,
  stepId,
  slotTitle,
  onCellUpdate,
}: BrainRewritingCanvasProps) {
  const [ezyDrawState, setEzyDrawState] = useState<EzyDrawState | null>(null);
  const updateBrainRewritingCell = useCanvasStore((s) => s.updateBrainRewritingCell);

  // Determine active cell: first cell without imageUrl in array order
  const activeCellId: BrainRewritingCellId | null =
    matrix.cells.find((c) => !c.imageUrl)?.cellId ?? null;

  /** Get the image from the previous iteration to use as background */
  const getPreviousImageUrl = (cellId: BrainRewritingCellId): string | undefined => {
    const cellIndex = matrix.cells.findIndex((c) => c.cellId === cellId);
    if (cellIndex === 0) return matrix.sourceImageUrl; // First iteration uses original
    if (cellIndex > 0) return matrix.cells[cellIndex - 1]?.imageUrl;
    return undefined;
  };

  /**
   * Handle cell click: open EzyDraw modal
   * - Empty cell -> previous iteration image as background
   * - Filled cell -> load existing vector data for re-edit
   */
  const handleCellClick = async (cellId: BrainRewritingCellId) => {
    const cell = matrix.cells.find((c) => c.cellId === cellId);
    if (!cell) return;

    // Filled cell: load existing drawing for re-edit
    if (cell.drawingId) {
      const drawing = await loadDrawing({
        workshopId,
        stepId,
        drawingId: cell.drawingId,
      });

      if (drawing) {
        try {
          const { elements, backgroundImageUrl } = parseVectorJson(drawing.vectorJson);
          setEzyDrawState({
            isOpen: true,
            cellId,
            drawingId: cell.drawingId,
            initialElements: elements,
            initialBackgroundImageUrl: backgroundImageUrl,
          });
        } catch {
          setEzyDrawState({ isOpen: true, cellId });
        }
      } else {
        setEzyDrawState({ isOpen: true, cellId });
      }
    } else {
      // New cell: load previous iteration image as background
      const previousImageUrl = getPreviousImageUrl(cellId);
      setEzyDrawState({
        isOpen: true,
        cellId,
        initialBackgroundImageUrl: previousImageUrl || null,
      });
    }
  };

  /**
   * Handle drawing save: simplify -> upload PNG via API -> save metadata via server action
   */
  const handleDrawingSave = async (result: {
    pngDataUrl: string;
    elements: DrawingElement[];
    backgroundImageUrl: string | null;
  }) => {
    if (!ezyDrawState) return;

    const simplified = simplifyDrawingElements(result.elements);
    const vectorJson = JSON.stringify({
      elements: simplified,
      backgroundImageUrl: result.backgroundImageUrl || null,
    });

    try {
      // Step 1: Upload image via API route as binary FormData
      let pngUrl = '';
      if (result.pngDataUrl) {
        const blobRes = await fetch(result.pngDataUrl);
        const imageBlob = await blobRes.blob();

        const formData = new FormData();
        formData.append('file', imageBlob, `drawing.${imageBlob.type === 'image/png' ? 'png' : imageBlob.type === 'image/webp' ? 'webp' : 'jpg'}`);
        formData.append('workshopId', workshopId);

        const uploadRes = await fetch('/api/upload-drawing-png', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          console.error('Image upload failed:', uploadRes.statusText);
          return;
        }
        const uploadData = await uploadRes.json();
        pngUrl = uploadData.pngUrl;
      }

      // Step 2: Save metadata via server action
      if (ezyDrawState.drawingId) {
        const response = await updateDrawing({
          workshopId,
          stepId,
          drawingId: ezyDrawState.drawingId,
          pngUrl,
          vectorJson,
          width: CRAZY_8S_CANVAS_SIZE.width,
          height: CRAZY_8S_CANVAS_SIZE.height,
        });

        if (response.success && response.pngUrl) {
          onCellUpdate(matrix.slotId, ezyDrawState.cellId, response.pngUrl, ezyDrawState.drawingId);
        }
      } else {
        const response = await saveDrawing({
          workshopId,
          stepId,
          pngUrl,
          vectorJson,
          width: CRAZY_8S_CANVAS_SIZE.width,
          height: CRAZY_8S_CANVAS_SIZE.height,
        });

        if (response.success && response.drawingId && response.pngUrl) {
          onCellUpdate(matrix.slotId, ezyDrawState.cellId, response.pngUrl, response.drawingId);
        }
      }
    } catch (error) {
      console.error('Error saving brain rewriting drawing:', error);
    } finally {
      setEzyDrawState(null);
    }
  };

  // Current cell data for EzyDraw modal
  const currentCell = ezyDrawState
    ? matrix.cells.find((c) => c.cellId === ezyDrawState.cellId)
    : null;
  const cellTitle = currentCell?.title || slotTitle;
  const cellDescription = currentCell?.description || matrix.sourceDescription || '';
  const cellSketchPrompt = currentCell?.sketchPrompt || matrix.sourceSketchPrompt || '';

  /** Handle title/description/sketchPrompt changes — same pattern as crazy 8s */
  const handleSlotInfoChange = useCallback(
    (updates: { title?: string; description?: string; sketchPrompt?: string }) => {
      if (!ezyDrawState) return;
      updateBrainRewritingCell(matrix.slotId, ezyDrawState.cellId, updates);
    },
    [ezyDrawState, matrix.slotId, updateBrainRewritingCell],
  );

  return (
    <div className="h-full overflow-auto p-4">
      <BrainRewritingGrid
        matrix={matrix}
        onCellClick={handleCellClick}
        activeCellId={activeCellId}
      />

      {ezyDrawState?.isOpen && (
        <EzyDrawLoader
          isOpen={true}
          onClose={() => setEzyDrawState(null)}
          onSave={handleDrawingSave}
          initialElements={ezyDrawState.initialElements}
          initialBackgroundImageUrl={ezyDrawState.initialBackgroundImageUrl}
          canvasSize={CRAZY_8S_CANVAS_SIZE}
          workshopId={workshopId}
          slotTitle={cellTitle}
          slotDescription={cellDescription}
          onSlotInfoChange={handleSlotInfoChange}
          slotId={`${matrix.slotId}-${ezyDrawState.cellId}`}
          sketchPrompt={cellSketchPrompt}
        />
      )}
    </div>
  );
}
