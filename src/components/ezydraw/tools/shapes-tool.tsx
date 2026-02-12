'use client';

import { useRef, useState } from 'react';
import { Rect, Circle as KonvaEllipse, Arrow, Line as KonvaLine, Group } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useDrawingStore } from '@/providers/drawing-store-provider';
import type {
  DrawingElement,
  RectangleElement,
  CircleElement,
  ArrowElement,
  LineElement,
  DiamondElement
} from '@/lib/drawing/types';

/**
 * ShapesTool - Handles creation of rectangles, circles, arrows, lines, and diamonds
 * via click-drag interaction.
 *
 * State pattern: Uses refs for performance (no 60fps re-renders during drag)
 */

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

/**
 * Hook that provides shape tool handlers and preview rendering
 */
export const useShapesTool = () => {
  const { activeTool, strokeColor, fillColor, strokeWidth, addElement } = useDrawingStore(
    (state) => ({
      activeTool: state.activeTool,
      strokeColor: state.strokeColor,
      fillColor: state.fillColor,
      strokeWidth: state.strokeWidth,
      addElement: state.addElement,
    })
  );

  // Refs for performance - avoid re-renders during drag
  const isDrawingRef = useRef(false);
  const startPointRef = useRef({ x: 0, y: 0 });
  const previewShapeRef = useRef<ShapePreview | null>(null);

  // Force update trigger for preview rendering
  const [, setForceUpdate] = useState(0);

  const handlePointerDown = (e: KonvaEventObject<PointerEvent>) => {
    const shapeTools: Array<typeof activeTool> = [
      'rectangle',
      'circle',
      'diamond',
      'arrow',
      'line',
    ];

    if (!shapeTools.includes(activeTool)) return;

    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();

    if (!pos) return;

    isDrawingRef.current = true;
    startPointRef.current = { x: pos.x, y: pos.y };
    previewShapeRef.current = {
      type: activeTool as ShapePreview['type'],
      x: pos.x,
      y: pos.y,
    };

    e.evt.preventDefault();
  };

  const handlePointerMove = (e: KonvaEventObject<PointerEvent>) => {
    if (!isDrawingRef.current || !previewShapeRef.current) return;

    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();

    if (!pos) return;

    const startX = startPointRef.current.x;
    const startY = startPointRef.current.y;
    const currentX = pos.x;
    const currentY = pos.y;

    const type = previewShapeRef.current.type;

    switch (type) {
      case 'rectangle':
      case 'diamond': {
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        const x = Math.min(startX, currentX);
        const y = Math.min(startY, currentY);

        previewShapeRef.current = {
          type,
          x,
          y,
          width,
          height,
        };
        break;
      }

      case 'circle': {
        const radiusX = Math.abs(currentX - startX) / 2;
        const radiusY = Math.abs(currentY - startY) / 2;
        const centerX = (startX + currentX) / 2;
        const centerY = (startY + currentY) / 2;

        previewShapeRef.current = {
          type: 'circle',
          x: 0,
          y: 0,
          centerX,
          centerY,
          radiusX,
          radiusY,
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

  const handlePointerUp = () => {
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
            type: 'rectangle',
            x: preview.x,
            y: preview.y,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            width: preview.width,
            height: preview.height,
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth,
          } as Omit<RectangleElement, 'id'>;
        }
        break;

      case 'circle':
        if (
          preview.centerX !== undefined &&
          preview.centerY !== undefined &&
          preview.radiusX !== undefined &&
          preview.radiusY !== undefined
        ) {
          element = {
            type: 'circle',
            x: preview.centerX,
            y: preview.centerY,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            radiusX: preview.radiusX,
            radiusY: preview.radiusY,
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth,
          } as Omit<CircleElement, 'id'>;
        }
        break;

      case 'arrow':
        if (preview.points && preview.points.length === 4) {
          element = {
            type: 'arrow',
            x: 0,
            y: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            points: preview.points,
            stroke: strokeColor,
            strokeWidth,
            pointerLength: 10,
            pointerWidth: 10,
          } as Omit<ArrowElement, 'id'>;
        }
        break;

      case 'line':
        if (preview.points && preview.points.length === 4) {
          element = {
            type: 'line',
            x: 0,
            y: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            points: preview.points,
            stroke: strokeColor,
            strokeWidth,
          } as Omit<LineElement, 'id'>;
        }
        break;

      case 'diamond':
        if (preview.width !== undefined && preview.height !== undefined) {
          element = {
            type: 'diamond',
            x: preview.x,
            y: preview.y,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            width: preview.width,
            height: preview.height,
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth,
          } as Omit<DiamondElement, 'id'>;
        }
        break;
    }

    if (element) {
      addElement(element);
    }

    // Reset refs
    isDrawingRef.current = false;
    previewShapeRef.current = null;
    setForceUpdate((n) => n + 1);
  };

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    previewShape: previewShapeRef.current,
    strokeColor,
    fillColor,
    strokeWidth,
  };
};

/**
 * Component that renders the shape preview during drag
 */
export const ShapesTool = () => {
  const { previewShape, strokeColor, fillColor, strokeWidth } = useShapesTool();

  if (!previewShape) return null;

  return (
    <Group>
      {previewShape.type === 'rectangle' && previewShape.width !== undefined && previewShape.height !== undefined && (
        <Rect
          x={previewShape.x}
          y={previewShape.y}
          width={previewShape.width}
          height={previewShape.height}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={[5, 5]}
          opacity={0.6}
          listening={false}
        />
      )}

      {previewShape.type === 'circle' &&
        previewShape.centerX !== undefined &&
        previewShape.centerY !== undefined &&
        previewShape.radiusX !== undefined &&
        previewShape.radiusY !== undefined && (
          <KonvaEllipse
            x={previewShape.centerX}
            y={previewShape.centerY}
            radiusX={previewShape.radiusX}
            radiusY={previewShape.radiusY}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            dash={[5, 5]}
            opacity={0.6}
            listening={false}
          />
        )}

      {previewShape.type === 'arrow' && previewShape.points && (
        <Arrow
          points={previewShape.points}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          pointerLength={10}
          pointerWidth={10}
          dash={[5, 5]}
          opacity={0.6}
          listening={false}
        />
      )}

      {previewShape.type === 'line' && previewShape.points && (
        <KonvaLine
          points={previewShape.points}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={[5, 5]}
          opacity={0.6}
          listening={false}
        />
      )}

      {previewShape.type === 'diamond' && previewShape.width !== undefined && previewShape.height !== undefined && (
        <KonvaLine
          x={previewShape.x}
          y={previewShape.y}
          points={[
            previewShape.width / 2,
            0,
            previewShape.width,
            previewShape.height / 2,
            previewShape.width / 2,
            previewShape.height,
            0,
            previewShape.height / 2,
          ]}
          closed={true}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={[5, 5]}
          opacity={0.6}
          listening={false}
        />
      )}
    </Group>
  );
};
