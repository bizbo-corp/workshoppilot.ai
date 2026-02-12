'use client';

import { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { DrawingStoreProvider } from '@/providers/drawing-store-provider';
import { EzyDrawToolbar } from './toolbar';
import { EzyDrawStage, type EzyDrawStageHandle } from './ezydraw-stage';
import type { DrawingElement } from '@/lib/drawing/types';

export interface EzyDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataURL: string) => void;
  initialElements?: DrawingElement[];
}

export function EzyDrawModal({
  isOpen,
  onClose,
  onSave,
  initialElements,
}: EzyDrawModalProps) {
  const stageRef = useRef<EzyDrawStageHandle>(null);

  const handleSave = () => {
    const dataURL = stageRef.current?.toDataURL({ pixelRatio: 2 });
    if (dataURL) {
      onSave(dataURL);
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 rounded-none border-0 gap-0"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">EzyDraw - Drawing Canvas</DialogTitle>

        <DrawingStoreProvider
          initialState={
            initialElements ? { elements: initialElements } : undefined
          }
        >
          <div className="flex h-full flex-col">
            <EzyDrawToolbar onSave={handleSave} onCancel={handleCancel} />
            <EzyDrawStage ref={stageRef} />
          </div>
        </DrawingStoreProvider>
      </DialogContent>
    </Dialog>
  );
}
