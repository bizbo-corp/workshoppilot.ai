'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer, Line, Rect, Ellipse, Arrow } from 'react-konva';
import type Konva from 'konva';
import { useDrawingStore } from '@/providers/drawing-store-provider';
import { PencilTool } from '@/components/ezydraw/tools/pencil-tool';
import { ShapesTool, useShapesTool } from '@/components/ezydraw/tools/shapes-tool';
import type { DrawingElement } from '@/lib/drawing/types';

export interface EzyDrawStageHandle {
  getStage: () => Konva.Stage | null;
  toDataURL: (config?: { pixelRatio?: number }) => string;
}

export const EzyDrawStage = forwardRef<EzyDrawStageHandle>((_props, ref) => {
  const stageRef = useRef<Konva.Stage>(null);
  const drawingLayerRef = useRef<Konva.Layer>(null);
  const uiLayerRef = useRef<Konva.Layer>(null);

  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight - 48 : 600, // 48px for toolbar
  });

  // Get elements and active tool from drawing store
  const elements = useDrawingStore((state: { elements: DrawingElement[] }) => state.elements);
  const activeTool = useDrawingStore((state) => state.activeTool);

  // Get shape tool handlers
  const shapeHandlers = useShapesTool();

  // Expose stage methods via ref
  useImperativeHandle(ref, () => ({
    getStage: () => stageRef.current,
    toDataURL: (config = {}) => {
      if (!stageRef.current) return '';
      return stageRef.current.toDataURL({
        pixelRatio: config.pixelRatio || 2,
      });
    },
  }));

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - 48,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Memory cleanup on unmount
  useEffect(() => {
    return () => {
      stageRef.current?.destroy();
    };
  }, []);

  return (
    <div
      style={{ touchAction: 'none' }}
      onTouchMove={(e) => e.preventDefault()}
      className="flex-1 overflow-hidden bg-white"
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ backgroundColor: '#ffffff' }}
      >
        {/* Drawing Layer: Where all elements render */}
        <Layer ref={drawingLayerRef}>
          {/* Interaction rect: Captures all pointer events for tool delegation */}
          <Rect
            width={dimensions.width}
            height={dimensions.height}
            fill="transparent"
            onPointerDown={(e) => {
              // Delegate to shape tool handlers
              if (['rectangle', 'circle', 'arrow', 'line', 'diamond'].includes(activeTool)) {
                shapeHandlers.handlePointerDown(e);
              }
            }}
            onPointerMove={(e) => {
              if (['rectangle', 'circle', 'arrow', 'line', 'diamond'].includes(activeTool)) {
                shapeHandlers.handlePointerMove(e);
              }
            }}
            onPointerUp={() => {
              if (['rectangle', 'circle', 'arrow', 'line', 'diamond'].includes(activeTool)) {
                shapeHandlers.handlePointerUp();
              }
            }}
          />

          {/* Render completed elements from store */}
          {elements.map((element) => {
            // Pencil stroke
            if (element.type === 'pencil') {
              return (
                <Line
                  key={element.id}
                  points={element.points}
                  fill={element.fill}
                  stroke={element.stroke}
                  strokeWidth={element.strokeWidth}
                  closed={true}
                  listening={false}
                  perfectDrawEnabled={false}
                  x={element.x}
                  y={element.y}
                  rotation={element.rotation}
                  scaleX={element.scaleX}
                  scaleY={element.scaleY}
                  opacity={element.opacity}
                />
              );
            }

            // Rectangle
            if (element.type === 'rectangle') {
              return (
                <Rect
                  key={element.id}
                  x={element.x}
                  y={element.y}
                  width={element.width}
                  height={element.height}
                  fill={element.fill}
                  stroke={element.stroke}
                  strokeWidth={element.strokeWidth}
                  rotation={element.rotation}
                  scaleX={element.scaleX}
                  scaleY={element.scaleY}
                  opacity={element.opacity}
                />
              );
            }

            // Circle/Ellipse
            if (element.type === 'circle') {
              return (
                <Ellipse
                  key={element.id}
                  x={element.x}
                  y={element.y}
                  radiusX={element.radiusX}
                  radiusY={element.radiusY}
                  fill={element.fill}
                  stroke={element.stroke}
                  strokeWidth={element.strokeWidth}
                  rotation={element.rotation}
                  scaleX={element.scaleX}
                  scaleY={element.scaleY}
                  opacity={element.opacity}
                />
              );
            }

            // Arrow
            if (element.type === 'arrow') {
              return (
                <Arrow
                  key={element.id}
                  x={element.x}
                  y={element.y}
                  points={element.points}
                  stroke={element.stroke}
                  strokeWidth={element.strokeWidth}
                  pointerLength={element.pointerLength}
                  pointerWidth={element.pointerWidth}
                  rotation={element.rotation}
                  scaleX={element.scaleX}
                  scaleY={element.scaleY}
                  opacity={element.opacity}
                />
              );
            }

            // Line
            if (element.type === 'line') {
              return (
                <Line
                  key={element.id}
                  x={element.x}
                  y={element.y}
                  points={element.points}
                  stroke={element.stroke}
                  strokeWidth={element.strokeWidth}
                  rotation={element.rotation}
                  scaleX={element.scaleX}
                  scaleY={element.scaleY}
                  opacity={element.opacity}
                />
              );
            }

            // Diamond
            if (element.type === 'diamond') {
              return (
                <Line
                  key={element.id}
                  x={element.x}
                  y={element.y}
                  points={[
                    element.width / 2,
                    0,
                    element.width,
                    element.height / 2,
                    element.width / 2,
                    element.height,
                    0,
                    element.height / 2,
                  ]}
                  closed={true}
                  fill={element.fill}
                  stroke={element.stroke}
                  strokeWidth={element.strokeWidth}
                  rotation={element.rotation}
                  scaleX={element.scaleX}
                  scaleY={element.scaleY}
                  opacity={element.opacity}
                />
              );
            }

            // Text and other types (future)
            return null;
          })}

          {/* PencilTool: Renders current in-progress stroke preview */}
          <PencilTool />

          {/* ShapesTool: Renders shape preview during drag */}
          <ShapesTool />
        </Layer>

        {/* UI Layer: For selection transformer, added in plan 05 */}
        <Layer ref={uiLayerRef} />
      </Stage>
    </div>
  );
});

EzyDrawStage.displayName = 'EzyDrawStage';
