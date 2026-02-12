'use client';

import { useRef, useState } from 'react';
import { Rect, Circle as KonvaEllipse, Arrow, Line as KonvaLine, Group } from 'react-konva';
import { useDrawingStore } from '@/providers/drawing-store-provider';
import type {
  DrawingElement,
  RectangleElement,
  CircleElement,
  ArrowElement,
  LineElement,
  DiamondElement,
} from '@/lib/drawing/types';
import type { PointerData } from './pencil-tool';

type ShapePreview = {
  type: 'rectangle' | 'circle' | 'arrow' | 'line' | 'diamond';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radiusX?: number;
  radiusY?: number;
  centerX?: number;
  centerY?: number;
  points?: number[];
};

const SHAPE_TOOL_NAMES = ['rectangle', 'circle', 'diamond', 'arrow', 'line'];

/**
 * Hook for shape tools — accepts simple {x,y} data, not Konva events.
 */
export const useShapesTool = () => {
  const activeTool = useDrawingStore((s) => s.activeTool);
  const strokeColor = useDrawingStore((s) => s.strokeColor);
  const fillColor = useDrawingStore((s) => s.fillColor);
  const strokeWidth = useDrawingStore((s) => s.strokeWidth);
  const addElement = useDrawingStore((s) => s.addElement);

  const isDrawingRef = useRef(false);
  const startPointRef = useRef({ x: 0, y: 0 });
  const previewShapeRef = useRef<ShapePreview | null>(null);

  const [, setForceUpdate] = useState(0);

  const handleDown = (pos: PointerData) => {
    if (!SHAPE_TOOL_NAMES.includes(activeTool)) return;

    isDrawingRef.current = true;
    startPointRef.current = { x: pos.x, y: pos.y };
    previewShapeRef.current = {
      type: activeTool as ShapePreview['type'],
      x: pos.x,
      y: pos.y,
    };
  };

  const handleMove = (pos: PointerData) => {
    if (!isDrawingRef.current || !previewShapeRef.current) return;

    const startX = startPointRef.current.x;
    const startY = startPointRef.current.y;
    const currentX = pos.x;
    const currentY = pos.y;
    const type = previewShapeRef.current.type;

    switch (type) {
      case 'rectangle':
      case 'diamond': {
        previewShapeRef.current = {
          type,
          x: Math.min(startX, currentX),
          y: Math.min(startY, currentY),
          width: Math.abs(currentX - startX),
          height: Math.abs(currentY - startY),
        };
        break;
      }
      case 'circle': {
        previewShapeRef.current = {
          type: 'circle',
          x: 0,
          y: 0,
          centerX: (startX + currentX) / 2,
          centerY: (startY + currentY) / 2,
          radiusX: Math.abs(currentX - startX) / 2,
          radiusY: Math.abs(currentY - startY) / 2,
        };
        break;
      }
      case 'arrow':
      case 'line': {
        previewShapeRef.current = {
          type,
          x: 0,
          y: 0,
          points: [startX, startY, currentX, currentY],
        };
        break;
      }
    }

    setForceUpdate((n) => n + 1);
  };

  const handleUp = () => {
    if (!isDrawingRef.current || !previewShapeRef.current) return;

    const preview = previewShapeRef.current;

    // Ignore tiny accidental clicks
    if (
      (preview.width !== undefined && preview.width < 3 && preview.height !== undefined && preview.height < 3) ||
      (preview.radiusX !== undefined && preview.radiusX < 3 && preview.radiusY !== undefined && preview.radiusY < 3)
    ) {
      isDrawingRef.current = false;
      previewShapeRef.current = null;
      setForceUpdate((n) => n + 1);
      return;
    }

    let element: Omit<DrawingElement, 'id'> | null = null;

    switch (preview.type) {
      case 'rectangle':
        if (preview.width !== undefined && preview.height !== undefined) {
          element = {
            type: 'rectangle', x: preview.x, y: preview.y,
            rotation: 0, scaleX: 1, scaleY: 1, opacity: 1,
            width: preview.width, height: preview.height,
            fill: fillColor, stroke: strokeColor, strokeWidth,
          } as Omit<RectangleElement, 'id'>;
        }
        break;
      case 'circle':
        if (preview.centerX !== undefined && preview.centerY !== undefined &&
            preview.radiusX !== undefined && preview.radiusY !== undefined) {
          element = {
            type: 'circle', x: preview.centerX, y: preview.centerY,
            rotation: 0, scaleX: 1, scaleY: 1, opacity: 1,
            radiusX: preview.radiusX, radiusY: preview.radiusY,
            fill: fillColor, stroke: strokeColor, strokeWidth,
          } as Omit<CircleElement, 'id'>;
        }
        break;
      case 'arrow':
        if (preview.points && preview.points.length === 4) {
          element = {
            type: 'arrow', x: 0, y: 0,
            rotation: 0, scaleX: 1, scaleY: 1, opacity: 1,
            points: preview.points, stroke: strokeColor, strokeWidth,
            pointerLength: 10, pointerWidth: 10,
          } as Omit<ArrowElement, 'id'>;
        }
        break;
      case 'line':
        if (preview.points && preview.points.length === 4) {
          element = {
            type: 'line', x: 0, y: 0,
            rotation: 0, scaleX: 1, scaleY: 1, opacity: 1,
            points: preview.points, stroke: strokeColor, strokeWidth,
          } as Omit<LineElement, 'id'>;
        }
        break;
      case 'diamond':
        if (preview.width !== undefined && preview.height !== undefined) {
          element = {
            type: 'diamond', x: preview.x, y: preview.y,
            rotation: 0, scaleX: 1, scaleY: 1, opacity: 1,
            width: preview.width, height: preview.height,
            fill: fillColor, stroke: strokeColor, strokeWidth,
          } as Omit<DiamondElement, 'id'>;
        }
        break;
    }

    if (element) {
      addElement(element);
    }

    isDrawingRef.current = false;
    previewShapeRef.current = null;
    setForceUpdate((n) => n + 1);
  };

  return {
    handleDown,
    handleMove,
    handleUp,
    previewShape: previewShapeRef.current,
    strokeColor,
    fillColor,
    strokeWidth,
  };
};

/**
 * Renders shape preview during drag.
 */
export const ShapesToolPreview = ({
  previewShape,
  strokeColor,
  fillColor,
  strokeWidth,
}: {
  previewShape: ShapePreview | null;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
}) => {
  if (!previewShape) return null;

  return (
    <Group>
      {previewShape.type === 'rectangle' && previewShape.width !== undefined && previewShape.height !== undefined && (
        <Rect x={previewShape.x} y={previewShape.y} width={previewShape.width} height={previewShape.height}
          fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} dash={[5, 5]} opacity={0.6} listening={false} />
      )}
      {previewShape.type === 'circle' && previewShape.centerX !== undefined && previewShape.centerY !== undefined &&
        previewShape.radiusX !== undefined && previewShape.radiusY !== undefined && (
        <KonvaEllipse x={previewShape.centerX} y={previewShape.centerY} radiusX={previewShape.radiusX} radiusY={previewShape.radiusY}
          fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} dash={[5, 5]} opacity={0.6} listening={false} />
      )}
      {previewShape.type === 'arrow' && previewShape.points && (
        <Arrow points={previewShape.points} stroke={strokeColor} strokeWidth={strokeWidth}
          pointerLength={10} pointerWidth={10} dash={[5, 5]} opacity={0.6} listening={false} />
      )}
      {previewShape.type === 'line' && previewShape.points && (
        <KonvaLine points={previewShape.points} stroke={strokeColor} strokeWidth={strokeWidth}
          dash={[5, 5]} opacity={0.6} listening={false} />
      )}
      {previewShape.type === 'diamond' && previewShape.width !== undefined && previewShape.height !== undefined && (
        <KonvaLine x={previewShape.x} y={previewShape.y}
          points={[previewShape.width / 2, 0, previewShape.width, previewShape.height / 2, previewShape.width / 2, previewShape.height, 0, previewShape.height / 2]}
          closed={true} fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} dash={[5, 5]} opacity={0.6} listening={false} />
      )}
    </Group>
  );
};
