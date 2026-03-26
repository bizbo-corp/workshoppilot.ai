'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { DrawingStoreProvider, useDrawingStore } from '@/providers/drawing-store-provider';
import { EzyDrawToolbar, EzyDrawFooter, type ImageModelTier } from './toolbar';
import { EzyDrawStage, type EzyDrawStageHandle } from './ezydraw-stage';
import type { DrawingElement } from '@/lib/drawing/types';
import { exportToWebP } from '@/lib/drawing/export';
import { validateImageFile, processImageForUpload } from '@/lib/drawing/image-upload';

/** Default canvas size: 4:3 landscape */
const DEFAULT_CANVAS_WIDTH = 800;
const DEFAULT_CANVAS_HEIGHT = 600;

/** Toolbar (48px) + footer (48px) */
const BASE_CHROME_HEIGHT = 96;

/** Height for stacked slot info row (title + 2-line desc + padding) */
const SLOT_INFO_ROW_HEIGHT = 68;

/** Height for iteration prompt input row */
const ITERATION_PROMPT_ROW_HEIGHT = 40;

/** Height for editable sketch prompt section (checkbox + textarea) */
const SKETCH_PROMPT_ROW_HEIGHT = 76;

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
  onSlotInfoChange?: (updates: { title?: string; description?: string; sketchPrompt?: string }) => void;
  workshopId?: string;
  iterationPrompt?: string;
  onIterationPromptChange?: (prompt: string) => void;
  slotId?: string;
  sketchPrompt?: string;
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
  slotId,
  sketchPrompt,
}: {
  stageRef: React.RefObject<EzyDrawStageHandle | null>;
  onSave: (result: EzyDrawSaveResult) => void;
  onCancel: () => void;
  slotTitle?: string;
  slotDescription?: string;
  onSlotInfoChange?: (updates: { title?: string; description?: string; sketchPrompt?: string }) => void;
  workshopId?: string;
  iterationPrompt?: string;
  onIterationPromptChange?: (prompt: string) => void;
  slotId?: string;
  sketchPrompt?: string;
}) {
  const getSnapshot = useDrawingStore((s) => s.getSnapshot);
  const replaceWithGeneratedImage = useDrawingStore((s) => s.replaceWithGeneratedImage);
  const setIsUploadingImage = useDrawingStore((s) => s.setIsUploadingImage);
  const backgroundImageUrl = useDrawingStore((s) => s.backgroundImageUrl);
  const selectedElementId = useDrawingStore((s) => s.selectedElementId);
  const deleteElement = useDrawingStore((s) => s.deleteElement);
  const selectElement = useDrawingStore((s) => s.selectElement);

  // Refs so the capture-phase listener always reads the latest values
  const selectedRef = useRef(selectedElementId);
  selectedRef.current = selectedElementId;
  const deleteRef = useRef(deleteElement);
  deleteRef.current = deleteElement;
  const selectRef = useRef(selectElement);
  selectRef.current = selectElement;

  // Capture-phase listener: deletes the selected drawing element AND blocks
  // the event from reaching React Flow (which would delete the canvas node).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      // Block React Flow from seeing this event
      e.stopImmediatePropagation();
      e.preventDefault();

      // Delete the selected drawing element
      const id = selectedRef.current;
      if (id) {
        deleteRef.current(id);
        selectRef.current(null);
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, []);

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Admin-only model tier toggle
  const { user } = useUser();
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const userRoles = (user?.publicMetadata as { roles?: string[] })?.roles ?? [];
  const userIsAdmin = userRoles.includes('admin') || !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());
  const [imageModel, setImageModel] = useState<ImageModelTier>('standard');

  // Editable prompt — AI-woven concept prompt that user can edit before generating
  const isGenerateMode = !!(workshopId && !onIterationPromptChange);
  const [editablePrompt, setEditablePrompt] = useState(
    () => sketchPrompt || ''
  );
  const [isRewritingPrompt, setIsRewritingPrompt] = useState(false);

  // Auto-generate a woven prompt when modal opens with title but no existing sketchPrompt
  useEffect(() => {
    if (!isGenerateMode || !workshopId || !slotTitle || sketchPrompt) return;

    let cancelled = false;
    setIsRewritingPrompt(true);

    fetch('/api/ai/rewrite-sketch-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workshopId,
        ideaTitle: slotTitle,
        ideaDescription: slotDescription || '',
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.conceptPrompt) {
          setEditablePrompt(data.conceptPrompt);
          onSlotInfoChange?.({ sketchPrompt: data.conceptPrompt });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsRewritingPrompt(false);
      });

    return () => { cancelled = true; };
  // Run once on mount — deps are stable at open time
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist prompt edits back to the slot store
  const handleEditablePromptChange = useCallback((value: string) => {
    setEditablePrompt(value);
    onSlotInfoChange?.({ sketchPrompt: value });
  }, [onSlotInfoChange]);

  // "Use my drawing" checkbox — default true when canvas has content
  const hasCanvasContent = getSnapshot().length > 0 || !!backgroundImageUrl;
  const [useExistingDrawing, setUseExistingDrawing] = useState(hasCanvasContent);

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
    if (!workshopId || isGeneratingImage) return;

    setIsGeneratingImage(true);
    try {
      // Capture current canvas as a small JPEG reference for the AI
      let existingImageBase64: string | undefined;
      const stage = stageRef.current?.getStage();
      const elements = getSnapshot();
      if (useExistingDrawing && stage && (elements.length > 0 || backgroundImageUrl)) {
        existingImageBase64 = exportToWebP(stage, { pixelRatio: 1, quality: 0.5 });
      }

      // Check if user placed any stickmen/person stamps on the canvas
      const hasPersonStamps = elements.some((el) => el.type === 'stamp');

      // Use editablePrompt as additionalPrompt when in generate mode (Crazy 8s),
      // otherwise fall back to iterationPrompt (Brain Rewriting)
      const promptToSend = isGenerateMode ? editablePrompt : iterationPrompt;

      const response = await fetch('/api/ai/generate-sketch-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId,
          ideaTitle: slotTitle,
          ideaDescription: slotDescription || '',
          existingImageBase64,
          hasPersonStamps,
          slotId,
          ...(promptToSend ? { additionalPrompt: promptToSend } : {}),
          ...(!useExistingDrawing ? {} : backgroundImageUrl?.startsWith('https://') ? { previousImageUrl: backgroundImageUrl } : {}),
          ...(imageModel !== 'fast' ? { imageModel } : {}),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 403 && errData.error === 'generation_limit_reached') {
          const { toast } = await import('sonner');
          toast.error(errData.message);
          return;
        }
        throw new Error(errData.error || 'Failed to generate sketch');
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
  }, [workshopId, slotTitle, slotDescription, iterationPrompt, editablePrompt, isGenerateMode, useExistingDrawing, isGeneratingImage, getSnapshot, backgroundImageUrl, stageRef, replaceWithGeneratedImage, imageModel]);

  const handleImageUpload = useCallback(async (file: File) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      const { toast } = await import('sonner');
      toast.error(validation.error);
      return;
    }

    setIsUploadingImage(true);
    try {
      const webpBlob = await processImageForUpload(file);

      // Upload via existing endpoint
      const formData = new FormData();
      formData.append('file', webpBlob, 'upload.webp');
      if (workshopId) formData.append('workshopId', workshopId);

      const response = await fetch('/api/upload-drawing-png', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      if (data.pngUrl) {
        replaceWithGeneratedImage(data.pngUrl);
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      const { toast } = await import('sonner');
      const message = error instanceof Error ? error.message : 'Failed to upload image. Please try again.';
      toast.error(message);
    } finally {
      setIsUploadingImage(false);
    }
  }, [workshopId, setIsUploadingImage, replaceWithGeneratedImage]);

  return (
    <div className="flex flex-col" style={{ minHeight: '100%' }}>
      <EzyDrawToolbar onImageUpload={handleImageUpload} />
      <div className="flex-1 overflow-hidden bg-card" style={{ minHeight: 300 }}>
        <EzyDrawStage ref={stageRef} onImageUpload={handleImageUpload} />
      </div>
      <EzyDrawFooter
        onSave={handleSave}
        onCancel={onCancel}
        slotTitle={slotTitle}
        slotDescription={slotDescription}
        onSlotInfoChange={onSlotInfoChange}
        onGenerateImage={workshopId ? handleGenerateImage : undefined}
        isGeneratingImage={isGeneratingImage}
        iterationPrompt={iterationPrompt}
        onIterationPromptChange={onIterationPromptChange}
        editablePrompt={isGenerateMode ? editablePrompt : undefined}
        onEditablePromptChange={isGenerateMode ? handleEditablePromptChange : undefined}
        isRewritingPrompt={isGenerateMode ? isRewritingPrompt : undefined}
        useExistingDrawing={useExistingDrawing}
        onUseExistingDrawingChange={isGenerateMode ? setUseExistingDrawing : undefined}
        hasCanvasContent={hasCanvasContent}
        imageModel={userIsAdmin ? imageModel : undefined}
        onImageModelChange={userIsAdmin ? setImageModel : undefined}
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
  slotId,
  sketchPrompt,
}: EzyDrawModalProps) {
  const stageRef = useRef<EzyDrawStageHandle>(null);

  const cw = canvasSize?.width ?? DEFAULT_CANVAS_WIDTH;
  const ch = canvasSize?.height ?? DEFAULT_CANVAS_HEIGHT;

  // Add extra height for slot info row, iteration prompt, and/or sketch prompt section
  const isGenerateMode = !!(workshopId && !onIterationPromptChange);
  const chromeHeight = BASE_CHROME_HEIGHT
    + (onSlotInfoChange ? SLOT_INFO_ROW_HEIGHT : 0)
    + (onIterationPromptChange ? ITERATION_PROMPT_ROW_HEIGHT : 0)
    + (isGenerateMode ? SKETCH_PROMPT_ROW_HEIGHT : 0);

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
        className="p-0 rounded-xl border gap-0 translate-x-[-50%] translate-y-[-50%] overflow-y-auto overflow-x-hidden"
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
            slotId={slotId}
            sketchPrompt={sketchPrompt}
          />
        </DrawingStoreProvider>
      </DialogContent>
    </Dialog>
  );
}
