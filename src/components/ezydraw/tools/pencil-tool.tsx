'use client';

import { useRef, useState } from 'react';
import { Group, Line } from 'react-konva';
import { getStroke } from 'perfect-freehand';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useDrawingStore } from '@/providers/drawing-store-provider';
import type { StrokeElement } from '@/lib/drawing/types';
import { createElementId } from '@/lib/drawing/types';

/**
 * Helper: Convert perfect-freehand outline to flat points array for Konva Line
 */
function getSvgPathFromStroke(stroke: number[][]): number[] {
  return stroke.reduce((acc: number[], point) => {
    acc.push(point[0], point[1]);
    return acc;
  }, []);
}

export function PencilTool() {
  const { activeTool, strokeColor, strokeWidth, addElement } = useDrawingStore(
    (state: {
      activeTool: string;
      strokeColor: string;
      strokeWidth: number;
      addElement: (element: Omit<StrokeElement, 'id'>) => void;
    }) => ({
      activeTool: state.activeTool,
      strokeColor: state.strokeColor,
      strokeWidth: state.strokeWidth,
      addElement: state.addElement,
    })
  );

  // Performance-critical: Use refs for transient drawing state (NOT useState - avoids 60fps re-renders)
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<number[][]>([]); // Array of [x, y, pressure] tuples
  const currentPathRef = useRef<number[]>([]); // Flattened points for Konva Line

  // Force update trigger for preview rendering
  const [, forceUpdate] = useState(0);

  const handlePointerDown = (e: KonvaEventObject<PointerEvent>) => {
    // Only handle if pencil tool is active
    if (activeTool !== 'pencil') return;

    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    const pressure = e.evt.pressure || 0.5;

    isDrawingRef.current = true;
    currentPointsRef.current = [[pos.x, pos.y, pressure]];
    currentPathRef.current = [];

    // Prevent touch scrolling
    e.evt.preventDefault();
  };

  const handlePointerMove = (e: KonvaEventObject<PointerEvent>) => {
    if (!isDrawingRef.current) return;

    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    const pressure = e.evt.pressure || 0.5;

    // Append point to ref
    currentPointsRef.current.push([pos.x, pos.y, pressure]);

    // Generate stroke outline with perfect-freehand
    const stroke = getStroke(currentPointsRef.current, {
      size: strokeWidth * 4,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: e.evt.pointerType !== 'pen', // Use real pressure for stylus
    });

    // Convert outline to flat array
    currentPathRef.current = getSvgPathFromStroke(stroke);

    // Trigger re-render to show preview
    forceUpdate((prev) => prev + 1);
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;

    // Generate final stroke outline
    const stroke = getStroke(currentPointsRef.current, {
      size: strokeWidth * 4,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: true, // Consistent with move handler
    });

    const flattenedPoints = getSvgPathFromStroke(stroke);

    // Create StrokeElement
    const strokeElement: Omit<StrokeElement, 'id'> = {
      type: 'pencil',
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      points: flattenedPoints,
      stroke: strokeColor,
      strokeWidth: 1, // strokeWidth is 1 because perfect-freehand creates the outline
      fill: strokeColor, // Fill the outline path
    };

    // Persist to store
    addElement(strokeElement);

    // Reset
    isDrawingRef.current = false;
    currentPointsRef.current = [];
    currentPathRef.current = [];
    forceUpdate((prev) => prev + 1);
  };

  // Only render preview if actively drawing and we have points
  const showPreview = isDrawingRef.current && currentPathRef.current.length > 0;

  return (
    <Group
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Current in-progress stroke preview */}
      {showPreview && (
        <Line
          points={currentPathRef.current}
          fill={strokeColor}
          closed={true}
          stroke={strokeColor}
          strokeWidth={1}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
    </Group>
  );
}
