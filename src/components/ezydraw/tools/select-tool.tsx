'use client';

import { useEffect, useRef } from 'react';
import { Transformer } from 'react-konva';
import type Konva from 'konva';
import { useDrawingStore } from '@/providers/drawing-store-provider';

/**
 * SelectTool: Renders Konva.Transformer around selected element
 *
 * Responsibilities:
 * - Attach transformer to selected element
 * - Handle drag-end to persist position changes
 * - Handle transform-end to persist size/rotation changes
 * - Prevent resize below 5x5px minimum
 *
 * Note: Selection logic (onClick handlers) is in EzyDrawStage element rendering.
 * This component only manages the Transformer UI and updates.
 */
export function SelectTool({ stageRef }: { stageRef: React.RefObject<Konva.Stage | null> }) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedElementId = useDrawingStore((state) => state.selectedElementId);
  const elements = useDrawingStore((state) => state.elements);
  const updateElement = useDrawingStore((state) => state.updateElement);

  // Attach/detach transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    if (selectedElementId) {
      // Find the selected Konva node by ID
      const node = stageRef.current.findOne('#' + selectedElementId);
      if (node) {
        // Attach transformer to the node
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    } else {
      // Clear transformer
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedElementId, stageRef]);

  return (
    <Transformer
      ref={transformerRef}
      rotateEnabled={true}
      keepRatio={false}
      anchorSize={8}
      borderStroke="#0ea5e9"
      anchorStroke="#0ea5e9"
      anchorFill="#ffffff"
      anchorCornerRadius={2}
      boundBoxFunc={(oldBox, newBox) => {
        // Prevent resize below 5x5px
        if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
          return oldBox;
        }
        return newBox;
      }}
      onDragEnd={(e) => {
        // Persist position change after drag
        const node = e.target;
        if (selectedElementId) {
          updateElement(selectedElementId, {
            x: node.x(),
            y: node.y(),
          });
        }
      }}
      onTransformEnd={(e) => {
        // Persist size/rotation changes after transform
        const node = e.target;
        if (!selectedElementId) return;

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        const rotation = node.rotation();
        const x = node.x();
        const y = node.y();

        // Find the element in store to determine type
        const element = elements.find((el) => el.id === selectedElementId);
        if (!element) return;

        // For shapes (rect, circle, diamond): multiply dimensions by scale and reset scale to 1
        // This keeps state cleaner. For strokes (pencil, arrow, line): keep scale (too complex to recalculate points)
        if (element.type === 'rectangle') {
          const width = (element.width || 0) * Math.abs(scaleX);
          const height = (element.height || 0) * Math.abs(scaleY);
          node.scaleX(1);
          node.scaleY(1);
          updateElement(selectedElementId, {
            x,
            y,
            width,
            height,
            rotation,
            scaleX: 1,
            scaleY: 1,
          });
        } else if (element.type === 'circle') {
          const radiusX = (element.radiusX || 0) * Math.abs(scaleX);
          const radiusY = (element.radiusY || 0) * Math.abs(scaleY);
          node.scaleX(1);
          node.scaleY(1);
          updateElement(selectedElementId, {
            x,
            y,
            radiusX,
            radiusY,
            rotation,
            scaleX: 1,
            scaleY: 1,
          });
        } else if (element.type === 'diamond') {
          const width = (element.width || 0) * Math.abs(scaleX);
          const height = (element.height || 0) * Math.abs(scaleY);
          node.scaleX(1);
          node.scaleY(1);
          updateElement(selectedElementId, {
            x,
            y,
            width,
            height,
            rotation,
            scaleX: 1,
            scaleY: 1,
          });
        } else if (element.type === 'text') {
          // For text, update width and fontSize
          const width = (element.width || 200) * Math.abs(scaleX);
          const fontSize = (element.fontSize || 16) * Math.abs(scaleY);
          node.scaleX(1);
          node.scaleY(1);
          updateElement(selectedElementId, {
            x,
            y,
            width,
            fontSize,
            rotation,
            scaleX: 1,
            scaleY: 1,
          });
        } else {
          // For strokes (pencil, arrow, line): keep scale as-is
          updateElement(selectedElementId, {
            x,
            y,
            rotation,
            scaleX,
            scaleY,
          });
        }
      }}
    />
  );
}
