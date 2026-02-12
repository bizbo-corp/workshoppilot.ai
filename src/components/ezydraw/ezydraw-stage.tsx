'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer, Line, Rect } from 'react-konva';
import type Konva from 'konva';
import { useDrawingStore } from '@/providers/drawing-store-provider';
import { PencilTool } from '@/components/ezydraw/tools/pencil-tool';
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

  // Get elements from drawing store
  const elements = useDrawingStore((state: { elements: DrawingElement[] }) => state.elements);

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
          />

          {/* Render completed elements from store */}
          {elements.map((element) => {
            if (element.type === 'pencil') {
              // Render pencil strokes
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
            // Other element types will be rendered in plans 04-05
            return null;
          })}

          {/* PencilTool: Renders current in-progress stroke preview */}
          <PencilTool />
        </Layer>

        {/* UI Layer: For selection transformer, added in plan 05 */}
        <Layer ref={uiLayerRef} />
      </Stage>
    </div>
  );
});

EzyDrawStage.displayName = 'EzyDrawStage';
