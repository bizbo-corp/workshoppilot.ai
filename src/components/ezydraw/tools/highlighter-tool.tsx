'use client';

import { useRef, useState } from 'react';
import { Line } from 'react-konva';
import { getStroke } from 'perfect-freehand';
import { useDrawingStore } from '@/providers/drawing-store-provider';
import type { HighlighterElement } from '@/lib/drawing/types';
import type { PointerData } from '@/components/ezydraw/tools/pencil-tool';

const HIGHLIGHTER_COLOR = '#FEF08A';

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

/**
 * Hook for highlighter tool — flat chisel nib, fixed pastel yellow, multiply blend.
 */
export const useHighlighterTool = () => {
  const activeTool = useDrawingStore((s) => s.activeTool);
  const addElement = useDrawingStore((s) => s.addElement);

  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<number[][]>([]);
  const currentPathRef = useRef<number[]>([]);

  const [, forceUpdate] = useState(0);

  const handleDown = (pos: PointerData) => {
    if (activeTool !== 'highlighter') return;
    isDrawingRef.current = true;
    currentPointsRef.current = [[pos.x, pos.y, pos.pressure]];
    currentPathRef.current = [];
  };

  const handleMove = (pos: PointerData) => {
    if (!isDrawingRef.current) return;

    currentPointsRef.current.push([pos.x, pos.y, pos.pressure]);

    const stroke = getStroke(currentPointsRef.current, {
      size: 28,
      thinning: 0,
      smoothing: 0.5,
      streamline: 0.3,
      simulatePressure: false,
    });

    currentPathRef.current = flattenStroke(stroke);
    forceUpdate((n) => n + 1);
  };

  const handleUp = () => {
    if (!isDrawingRef.current) return;

    const stroke = getStroke(currentPointsRef.current, {
      size: 28,
      thinning: 0,
      smoothing: 0.5,
      streamline: 0.3,
      simulatePressure: false,
    });

    const points = flattenStroke(stroke);

    if (points.length > 0) {
      const el: Omit<HighlighterElement, 'id'> = {
        type: 'highlighter',
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 0.6,
        points,
        stroke: HIGHLIGHTER_COLOR,
        strokeWidth: 1,
        fill: HIGHLIGHTER_COLOR,
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
  };
};

/**
 * Renders the in-progress highlighter stroke preview with multiply blend.
 */
export function HighlighterToolPreview({
  currentPath,
  isDrawing,
}: {
  currentPath: number[];
  isDrawing: boolean;
}) {
  if (!isDrawing || currentPath.length === 0) return null;

  return (
    <Line
      points={currentPath}
      fill={HIGHLIGHTER_COLOR}
      closed={true}
      stroke={HIGHLIGHTER_COLOR}
      strokeWidth={1}
      listening={false}
      perfectDrawEnabled={false}
      opacity={0.6}
      globalCompositeOperation="multiply"
    />
  );
}
