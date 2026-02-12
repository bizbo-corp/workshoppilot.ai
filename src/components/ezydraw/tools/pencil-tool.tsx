'use client';

import { useRef, useState } from 'react';
import { Line } from 'react-konva';
import { getStroke } from 'perfect-freehand';
import { useDrawingStore } from '@/providers/drawing-store-provider';
import type { StrokeElement } from '@/lib/drawing/types';

/**
 * Convert perfect-freehand outline to flat points array for Konva Line
 */
function flattenStroke(stroke: number[][]): number[] {
  const result: number[] = [];
  for (let i = 0; i < stroke.length; i++) {
    result.push(stroke[i][0], stroke[i][1]);
  }
  return result;
}

export interface PointerData {
  x: number;
  y: number;
  pressure: number;
  pointerType: string;
}

/**
 * Hook for pencil tool — accepts simple {x,y,pressure} data, not Konva events.
 */
export const usePencilTool = () => {
  const activeTool = useDrawingStore((s) => s.activeTool);
  const strokeColor = useDrawingStore((s) => s.strokeColor);
  const strokeWidth = useDrawingStore((s) => s.strokeWidth);
  const addElement = useDrawingStore((s) => s.addElement);

  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<number[][]>([]);
  const currentPathRef = useRef<number[]>([]);

  const [, forceUpdate] = useState(0);

  const handleDown = (pos: PointerData) => {
    if (activeTool !== 'pencil') return;
    isDrawingRef.current = true;
    currentPointsRef.current = [[pos.x, pos.y, pos.pressure]];
    currentPathRef.current = [];
  };

  const handleMove = (pos: PointerData) => {
    if (!isDrawingRef.current) return;

    currentPointsRef.current.push([pos.x, pos.y, pos.pressure]);

    const stroke = getStroke(currentPointsRef.current, {
      size: strokeWidth * 4,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: pos.pointerType !== 'pen',
    });

    currentPathRef.current = flattenStroke(stroke);
    forceUpdate((n) => n + 1);
  };

  const handleUp = () => {
    if (!isDrawingRef.current) return;

    const stroke = getStroke(currentPointsRef.current, {
      size: strokeWidth * 4,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: true,
    });

    const points = flattenStroke(stroke);

    if (points.length > 0) {
      const el: Omit<StrokeElement, 'id'> = {
        type: 'pencil',
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        points,
        stroke: strokeColor,
        strokeWidth: 1,
        fill: strokeColor,
      };
      addElement(el);
    }

    isDrawingRef.current = false;
    currentPointsRef.current = [];
    currentPathRef.current = [];
    forceUpdate((n) => n + 1);
  };

  return {
    handleDown,
    handleMove,
    handleUp,
    currentPath: currentPathRef.current,
    isDrawing: isDrawingRef.current,
    strokeColor,
  };
};

/**
 * Renders the in-progress stroke preview.
 */
export function PencilToolPreview({
  currentPath,
  isDrawing,
  strokeColor,
}: {
  currentPath: number[];
  isDrawing: boolean;
  strokeColor: string;
}) {
  if (!isDrawing || currentPath.length === 0) return null;

  return (
    <Line
      points={currentPath}
      fill={strokeColor}
      closed={true}
      stroke={strokeColor}
      strokeWidth={1}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}
