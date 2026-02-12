'use client';

import { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { DrawingStoreProvider, useDrawingStore } from '@/providers/drawing-store-provider';
import { EzyDrawToolbar } from './toolbar';
import { EzyDrawStage, type EzyDrawStageHandle } from './ezydraw-stage';
import type { DrawingElement } from '@/lib/drawing/types';
import { exportToPNG } from '@/lib/drawing/export';

export interface EzyDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (result: { pngDataUrl: string; elements: DrawingElement[] }) => void | Promise<void>;
  initialElements?: DrawingElement[];
  drawingId?: string;  // If set, we're re-editing an existing drawing
}

/**
 * Inner content component that has access to the drawing store
 * This allows us to get elements from the store when saving
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
      <EzyDrawToolbar onSave={handleSave} onCancel={onCancel} />
      <EzyDrawStage ref={stageRef} />
    </div>
  );
}

export function EzyDrawModal({
  isOpen,
  onClose,
  onSave,
  initialElements,
  drawingId,
}: EzyDrawModalProps) {
  const stageRef = useRef<EzyDrawStageHandle>(null);

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
        className="max-w-[100vw] sm:max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 rounded-none border-0 gap-0 translate-x-[-50%] translate-y-[-50%]"
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
