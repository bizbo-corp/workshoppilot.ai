'use client';

import { useRef, useState } from 'react';
import { Path, Circle, Text } from 'react-konva';
import { useDrawingStore } from '@/providers/drawing-store-provider';
import { generateSpeechBubblePath } from '@/lib/drawing/speech-bubble-path';
import type { DrawingElement, SpeechBubbleElement } from '@/lib/drawing/types';
import type { PointerData } from './pencil-tool';

type BubblePreview = {
  x: number;
  y: number;
  width: number;
  height: number;
  tailX: number;
  tailY: number;
  cornerRadius: number;
};

/**
 * Hook for speech bubble tool - click and drag to create speech bubbles with tails.
 */
export const useSpeechBubbleTool = () => {
  const activeTool = useDrawingStore((s) => s.activeTool);
  const strokeColor = useDrawingStore((s) => s.strokeColor);
  const fillColor = useDrawingStore((s) => s.fillColor);
  const strokeWidth = useDrawingStore((s) => s.strokeWidth);
  const fontSize = useDrawingStore((s) => s.fontSize);
  const addElement = useDrawingStore((s) => s.addElement);

  const isDrawingRef = useRef(false);
  const startPointRef = useRef({ x: 0, y: 0 });
  const previewBubbleRef = useRef<BubblePreview | null>(null);

  const [, setForceUpdate] = useState(0);

  const handleDown = (pos: PointerData) => {
    if (activeTool !== 'speechBubble') return;

    isDrawingRef.current = true;
    startPointRef.current = { x: pos.x, y: pos.y };
    previewBubbleRef.current = {
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      tailX: 0,
      tailY: 40,
      cornerRadius: 8,
    };
  };

  const handleMove = (pos: PointerData) => {
    if (!isDrawingRef.current || !previewBubbleRef.current) return;

    const startX = startPointRef.current.x;
    const startY = startPointRef.current.y;
    const currentX = pos.x;
    const currentY = pos.y;

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    // Enforce minimum size
    const finalWidth = Math.max(width, 80);
    const finalHeight = Math.max(height, 50);

    previewBubbleRef.current = {
      x,
      y,
      width: finalWidth,
      height: finalHeight,
      tailX: finalWidth / 2, // Centered horizontally
      tailY: finalHeight + 40, // 40px below bubble
      cornerRadius: 8,
    };

    setForceUpdate((n) => n + 1);
  };

  const handleUp = () => {
    if (!isDrawingRef.current || !previewBubbleRef.current) return;

    const preview = previewBubbleRef.current;

    // Ignore tiny accidental clicks
    if (preview.width < 50 || preview.height < 30) {
      isDrawingRef.current = false;
      previewBubbleRef.current = null;
      setForceUpdate((n) => n + 1);
      return;
    }

    // Use light yellow fill if current fill is transparent
    const bubbleFill = fillColor === 'transparent' ? '#FFFDE7' : fillColor;

    const element: Omit<DrawingElement, 'id'> = {
      type: 'speechBubble',
      x: preview.x,
      y: preview.y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      width: preview.width,
      height: preview.height,
      tailX: preview.tailX,
      tailY: preview.tailY,
      text: 'Text',
      fontSize,
      fill: bubbleFill,
      stroke: strokeColor,
      strokeWidth,
      cornerRadius: preview.cornerRadius,
    } as Omit<SpeechBubbleElement, 'id'>;

    addElement(element);

    isDrawingRef.current = false;
    previewBubbleRef.current = null;
    setForceUpdate((n) => n + 1);
  };

  return {
    handleDown,
    handleMove,
    handleUp,
    previewBubble: previewBubbleRef.current,
  };
};

/**
 * Renders speech bubble preview during drag-to-place.
 */
export const SpeechBubblePreview = ({ previewBubble }: { previewBubble: BubblePreview | null }) => {
  if (!previewBubble || previewBubble.width < 1 || previewBubble.height < 1) return null;

  const pathData = generateSpeechBubblePath(
    0, // Path relative to element position
    0,
    previewBubble.width,
    previewBubble.height,
    previewBubble.tailX,
    previewBubble.tailY,
    previewBubble.cornerRadius
  );

  return (
    <Path
      x={previewBubble.x}
      y={previewBubble.y}
      data={pathData}
      fill="#FFFDE7"
      stroke="#000000"
      strokeWidth={2}
      dash={[5, 5]}
      opacity={0.6}
      listening={false}
    />
  );
};

/**
 * Draggable handle for adjusting speech bubble tail position.
 * Only visible when a speech bubble is selected.
 */
export const SpeechBubbleTailHandle = ({
  bubble,
  updateElement,
}: {
  bubble: SpeechBubbleElement;
  updateElement: (id: string, updates: Partial<DrawingElement>) => void;
}) => {
  // Handle position is absolute: bubble position + tail offset
  const handleX = bubble.x + bubble.tailX;
  const handleY = bubble.y + bubble.tailY;

  return (
    <Circle
      x={handleX}
      y={handleY}
      radius={6}
      fill="#3B82F6"
      stroke="#FFFFFF"
      strokeWidth={2}
      draggable={true}
      onDragMove={(e) => {
        // Calculate new tail position relative to bubble origin
        const newTailX = e.target.x() - bubble.x;
        const newTailY = e.target.y() - bubble.y;

        updateElement(bubble.id, {
          tailX: newTailX,
          tailY: newTailY,
        });
      }}
    />
  );
};
