'use client';

import { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { DrawingStoreProvider, useDrawingStore } from '@/providers/drawing-store-provider';
import { EzyDrawToolbar, EzyDrawFooter } from './toolbar';
import { EzyDrawStage, type EzyDrawStageHandle } from './ezydraw-stage';
import type { DrawingElement } from '@/lib/drawing/types';
import { exportToPNG } from '@/lib/drawing/export';

/** Default canvas size: 4:3 landscape */
const DEFAULT_CANVAS_WIDTH = 800;
const DEFAULT_CANVAS_HEIGHT = 600;

/** Toolbar (48px) + footer (48px) */
const CHROME_HEIGHT = 96;

export interface EzyDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (result: { pngDataUrl: string; elements: DrawingElement[] }) => void | Promise<void>;
  initialElements?: DrawingElement[];
  drawingId?: string;  // If set, we're re-editing an existing drawing
  canvasSize?: { width: number; height: number };  // Optional canvas dimensions (defaults to 6:4)
}

/**
 * Inner content component that has access to the drawing store
 */
function EzyDrawContent({
  stageRef,
  onSave,
  onCancel,
}: {
  stageRef: React.RefObject<EzyDrawStageHandle | null>;
  onSave: (result: { pngDataUrl: string; elements: DrawingElement[] }) => void | Promise<void>;
  onCancel: () => void;
}) {
  const getSnapshot = useDrawingStore((s) => s.getSnapshot);

  const handleSave = () => {
    const stage = stageRef.current?.getStage();
    if (!stage) return;

    const pngDataUrl = exportToPNG(stage, { pixelRatio: 2 });
    const elements = getSnapshot();
    onSave({ pngDataUrl, elements });
  };

  return (
    <div className="flex h-full flex-col">
      <EzyDrawToolbar />
      <div className="flex-1 overflow-hidden bg-card">
        <EzyDrawStage ref={stageRef} />
      </div>
      <EzyDrawFooter onSave={handleSave} onCancel={onCancel} />
    </div>
  );
}

export function EzyDrawModal({
  isOpen,
  onClose,
  onSave,
  initialElements,
  drawingId,
  canvasSize,
}: EzyDrawModalProps) {
  const stageRef = useRef<EzyDrawStageHandle>(null);

  const cw = canvasSize?.width ?? DEFAULT_CANVAS_WIDTH;
  const ch = canvasSize?.height ?? DEFAULT_CANVAS_HEIGHT;

  // Dialog matches the canvas: width = canvas width, height = canvas + chrome
  const dialogW = cw;
  const dialogH = ch + CHROME_HEIGHT;

  const handleCancel = () => {
    onClose();
  };

  const handleSaveComplete = async (result: { pngDataUrl: string; elements: DrawingElement[] }) => {
    await onSave(result);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="p-0 rounded-xl border gap-0 translate-x-[-50%] translate-y-[-50%] overflow-hidden"
        style={{
          width: `min(${dialogW}px, 95vw)`,
          maxWidth: `min(${dialogW}px, 95vw)`,
          height: `min(${dialogH}px, 95vh)`,
          maxHeight: `min(${dialogH}px, 95vh)`,
        }}
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          EzyDraw - {drawingId ? 'Edit Drawing' : 'New Drawing'}
        </DialogTitle>

        <DrawingStoreProvider
          initialState={
            initialElements ? { elements: initialElements } : undefined
          }
        >
          <EzyDrawContent
            stageRef={stageRef}
            onSave={handleSaveComplete}
            onCancel={handleCancel}
          />
        </DrawingStoreProvider>
      </DialogContent>
    </Dialog>
  );
}
