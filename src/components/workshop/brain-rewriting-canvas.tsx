'use client';

/**
 * Brain Rewriting Canvas Container
 * Manages EzyDraw modal lifecycle for brain rewriting iterations.
 * Follows the same pattern as crazy-8s-canvas.tsx.
 */

import { useState } from 'react';
import { BrainRewritingGrid } from './brain-rewriting-grid';
import { EzyDrawLoader } from '@/components/ezydraw/ezydraw-loader';
import { saveDrawing, loadDrawing, updateDrawing } from '@/actions/drawing-actions';
import { simplifyDrawingElements } from '@/lib/drawing/simplify';
import {
  BRAIN_REWRITING_CELL_ORDER,
  type BrainRewritingCellId,
  type BrainRewritingMatrix,
} from '@/lib/canvas/brain-rewriting-types';
import { CRAZY_8S_CANVAS_SIZE } from '@/lib/canvas/crazy-8s-types';
import type { DrawingElement } from '@/lib/drawing/types';

interface BrainRewritingCanvasProps {
  matrix: BrainRewritingMatrix;
  workshopId: string;
  stepId: string;
  onCellUpdate: (slotId: string, cellId: string, imageUrl: string, drawingId: string) => void;
}

interface EzyDrawState {
  isOpen: boolean;
  cellId: BrainRewritingCellId;
  drawingId?: string;
  initialElements?: DrawingElement[];
}

export function BrainRewritingCanvas({
  matrix,
  workshopId,
  stepId,
  onCellUpdate,
}: BrainRewritingCanvasProps) {
  const [ezyDrawState, setEzyDrawState] = useState<EzyDrawState | null>(null);

  // Determine active cell: first cell without imageUrl in order
  const activeCellId: BrainRewritingCellId | null =
    BRAIN_REWRITING_CELL_ORDER.find((cellId) => {
      const cell = matrix.cells.find((c) => c.cellId === cellId);
      return !cell?.imageUrl;
    }) ?? null;

  /**
   * Handle cell click: open EzyDraw modal
   * - Empty cell -> blank canvas
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
          const elements = JSON.parse(drawing.vectorJson) as DrawingElement[];
          setEzyDrawState({
            isOpen: true,
            cellId,
            drawingId: cell.drawingId,
            initialElements: elements,
          });
        } catch {
          setEzyDrawState({ isOpen: true, cellId });
        }
      } else {
        setEzyDrawState({ isOpen: true, cellId });
      }
    } else {
      setEzyDrawState({ isOpen: true, cellId });
    }
  };

  /**
   * Handle drawing save: simplify -> upload PNG via API -> save metadata via server action
   */
  const handleDrawingSave = async (result: {
    pngDataUrl: string;
    elements: DrawingElement[];
  }) => {
    if (!ezyDrawState) return;

    const simplified = simplifyDrawingElements(result.elements);
    const vectorJson = JSON.stringify(simplified);

    try {
      // Step 1: Upload image via API route as binary FormData
      let pngUrl = '';
      if (result.pngDataUrl) {
        const blobRes = await fetch(result.pngDataUrl);
        const imageBlob = await blobRes.blob();

        const formData = new FormData();
        formData.append('file', imageBlob, `drawing.${imageBlob.type === 'image/png' ? 'png' : 'jpg'}`);
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
          canvasSize={CRAZY_8S_CANVAS_SIZE}
        />
      )}
    </div>
  );
}
