'use client';

import { useRef, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { DrawingStoreProvider, useDrawingStore } from '@/providers/drawing-store-provider';
import { EzyDrawToolbar, EzyDrawFooter } from './toolbar';
import { EzyDrawStage, type EzyDrawStageHandle } from './ezydraw-stage';
import type { DrawingElement } from '@/lib/drawing/types';
import { exportToWebP } from '@/lib/drawing/export';

/** Default canvas size: 4:3 landscape */
const DEFAULT_CANVAS_WIDTH = 800;
const DEFAULT_CANVAS_HEIGHT = 600;

/** Toolbar (48px) + footer (48px) */
const BASE_CHROME_HEIGHT = 96;

/** Height for stacked slot info row (title + 2-line desc + padding) */
const SLOT_INFO_ROW_HEIGHT = 68;

/** Height for iteration prompt input row */
const ITERATION_PROMPT_ROW_HEIGHT = 40;

export type EzyDrawSaveResult = {
  pngDataUrl: string;
  elements: DrawingElement[];
  backgroundImageUrl: string | null;
};

export interface EzyDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (result: EzyDrawSaveResult) => void | Promise<void>;
  initialElements?: DrawingElement[];
  initialBackgroundImageUrl?: string | null;
  drawingId?: string;
  canvasSize?: { width: number; height: number };
  slotTitle?: string;
  slotDescription?: string;
  onSlotInfoChange?: (updates: { title?: string; description?: string }) => void;
  workshopId?: string;
  iterationPrompt?: string;
  onIterationPromptChange?: (prompt: string) => void;
}

/**
 * Inner content component that has access to the drawing store
 */
function EzyDrawContent({
  stageRef,
  onSave,
  onCancel,
  slotTitle,
  slotDescription,
  onSlotInfoChange,
  workshopId,
  iterationPrompt,
  onIterationPromptChange,
}: {
  stageRef: React.RefObject<EzyDrawStageHandle | null>;
  onSave: (result: EzyDrawSaveResult) => void;
  onCancel: () => void;
  slotTitle?: string;
  slotDescription?: string;
  onSlotInfoChange?: (updates: { title?: string; description?: string }) => void;
  workshopId?: string;
  iterationPrompt?: string;
  onIterationPromptChange?: (prompt: string) => void;
}) {
  const getSnapshot = useDrawingStore((s) => s.getSnapshot);
  const replaceWithGeneratedImage = useDrawingStore((s) => s.replaceWithGeneratedImage);
  const backgroundImageUrl = useDrawingStore((s) => s.backgroundImageUrl);

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const handleSave = () => {
    const stage = stageRef.current?.getStage();
    if (!stage) return;

    try {
      // Export as WebP (quality 0.75) — ~25-30% smaller than JPEG at similar visual quality
      // Vector data in vectorJson preserves full fidelity for re-editing
      const pngDataUrl = exportToWebP(stage, { pixelRatio: 1, quality: 0.75 });
      const elements = getSnapshot();
      onSave({ pngDataUrl, elements, backgroundImageUrl });
    } catch (error) {
      // Canvas taint (CORS) or other export error — still save elements + background URL
      console.error('Image export failed, saving without image:', error);
      const elements = getSnapshot();
      onSave({ pngDataUrl: '', elements, backgroundImageUrl });
    }
  };

  const handleGenerateImage = useCallback(async () => {
    if (!workshopId || !slotTitle || isGeneratingImage) return;

    setIsGeneratingImage(true);
    try {
      // Capture current canvas as a small JPEG reference for the AI
      let existingImageBase64: string | undefined;
      const stage = stageRef.current?.getStage();
      const elements = getSnapshot();
      if (stage && (elements.length > 0 || backgroundImageUrl)) {
        existingImageBase64 = exportToWebP(stage, { pixelRatio: 1, quality: 0.5 });
      }

      const response = await fetch('/api/ai/generate-sketch-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId,
          ideaTitle: slotTitle,
          ideaDescription: slotDescription || '',
          existingImageBase64,
          ...(iterationPrompt ? { additionalPrompt: iterationPrompt } : {}),
          ...(backgroundImageUrl?.startsWith('https://') ? { previousImageUrl: backgroundImageUrl } : {}),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate sketch');
      }

      const data = await response.json();
      if (data.imageUrl) {
        // Atomic: clear canvas + set background in one history entry
        replaceWithGeneratedImage(data.imageUrl);
      }
    } catch (error) {
      console.error('Failed to generate sketch:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  }, [workshopId, slotTitle, slotDescription, iterationPrompt, isGeneratingImage, getSnapshot, backgroundImageUrl, stageRef, replaceWithGeneratedImage]);

  return (
    <div className="flex h-full flex-col">
      <EzyDrawToolbar />
      <div className="flex-1 overflow-hidden bg-card">
        <EzyDrawStage ref={stageRef} />
      </div>
      <EzyDrawFooter
        onSave={handleSave}
        onCancel={onCancel}
        slotTitle={slotTitle}
        slotDescription={slotDescription}
        onSlotInfoChange={onSlotInfoChange}
        onGenerateImage={workshopId && slotTitle ? handleGenerateImage : undefined}
        isGeneratingImage={isGeneratingImage}
        iterationPrompt={iterationPrompt}
        onIterationPromptChange={onIterationPromptChange}
      />
    </div>
  );
}

export function EzyDrawModal({
  isOpen,
  onClose,
  onSave,
  initialElements,
  initialBackgroundImageUrl,
  drawingId,
  canvasSize,
  slotTitle,
  slotDescription,
  onSlotInfoChange,
  workshopId,
  iterationPrompt,
  onIterationPromptChange,
}: EzyDrawModalProps) {
  const stageRef = useRef<EzyDrawStageHandle>(null);

  const cw = canvasSize?.width ?? DEFAULT_CANVAS_WIDTH;
  const ch = canvasSize?.height ?? DEFAULT_CANVAS_HEIGHT;

  // Add extra height for slot info row and/or iteration prompt row when present
  const chromeHeight = BASE_CHROME_HEIGHT
    + (onSlotInfoChange ? SLOT_INFO_ROW_HEIGHT : 0)
    + (onIterationPromptChange ? ITERATION_PROMPT_ROW_HEIGHT : 0);

  // Dialog matches the canvas: width = canvas width, height = canvas + chrome
  const dialogW = cw;
  const dialogH = ch + chromeHeight;

  const handleCancel = () => {
    onClose();
  };

  /**
   * Capture data synchronously, close dialog immediately,
   * then fire onSave in the background.
   */
  const handleSaveComplete = (result: EzyDrawSaveResult) => {
    onClose();
    // Fire-and-forget — parent handles saving state
    Promise.resolve(onSave(result)).catch(console.error);
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
          initialState={{
            ...(initialElements ? { elements: initialElements } : {}),
            ...(initialBackgroundImageUrl ? { backgroundImageUrl: initialBackgroundImageUrl } : {}),
          }}
        >
          <EzyDrawContent
            stageRef={stageRef}
            onSave={handleSaveComplete}
            onCancel={handleCancel}
            slotTitle={slotTitle}
            slotDescription={slotDescription}
            onSlotInfoChange={onSlotInfoChange}
            workshopId={workshopId}
            iterationPrompt={iterationPrompt}
            onIterationPromptChange={onIterationPromptChange}
          />
        </DrawingStoreProvider>
      </DialogContent>
    </Dialog>
  );
}
