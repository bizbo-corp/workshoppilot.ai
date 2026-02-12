'use client';

import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { DrawingStoreProvider, useDrawingStore } from '@/providers/drawing-store-provider';
import { EzyDrawToolbar } from './toolbar';
import { EzyDrawStage, type EzyDrawStageHandle } from './ezydraw-stage';
import { UIKitPalette } from './palette/ui-kit-palette';
import { DroppableCanvas } from './palette/droppable-canvas';
import { UI_KIT_COMPONENTS, UI_KIT_LABELS, type UIKitComponentType } from '@/lib/drawing/ui-kit-components';
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
  const addElements = useDrawingStore((s) => s.addElements);

  const [activeId, setActiveId] = useState<string | null>(null);

  const handleSave = () => {
    const stage = stageRef.current?.getStage();
    if (!stage) return;

    const pngDataUrl = exportToPNG(stage, { pixelRatio: 2 });
    const elements = getSnapshot();
    onSave({ pngDataUrl, elements });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    // Only handle drop on canvas
    if (!over || over.id !== 'ezydraw-canvas') {
      return;
    }

    // Extract component type from drag data
    const componentType = active.data.current?.componentType as UIKitComponentType | undefined;
    if (!componentType) {
      return;
    }

    // Get the stage and container for coordinate mapping
    const stage = stageRef.current?.getStage();
    if (!stage) return;

    const container = stage.container();
    const containerRect = container.getBoundingClientRect();

    // Calculate drop position relative to canvas
    // Use the active element's final position from the drag event
    const dropX = (active.rect.current.translated?.left ?? 0) - containerRect.left;
    const dropY = (active.rect.current.translated?.top ?? 0) - containerRect.top;

    // Create the UI kit component at the drop position
    const factory = UI_KIT_COMPONENTS[componentType];
    const elements = factory(dropX, dropY);

    // Batch-add all elements in the component
    addElements(elements);
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full">
        {/* UI Kit Palette Sidebar */}
        <UIKitPalette />

        {/* Main canvas area */}
        <div className="flex-1 flex flex-col">
          <EzyDrawToolbar onSave={handleSave} onCancel={onCancel} />
          <DroppableCanvas>
            <EzyDrawStage ref={stageRef} />
          </DroppableCanvas>
        </div>
      </div>

      {/* Drag overlay shows ghost of dragged item */}
      <DragOverlay>
        {activeId ? (
          <div className="bg-blue-100 border border-blue-400 rounded px-3 py-2 text-sm font-medium text-blue-900 shadow-lg">
            {UI_KIT_LABELS[activeId.replace('palette-', '') as UIKitComponentType] || 'Component'}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
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
