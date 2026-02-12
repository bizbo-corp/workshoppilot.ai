'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer, Text } from 'react-konva';
import type Konva from 'konva';

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
          {/* Placeholder text - elements will be rendered by tool components in plans 03-05 */}
          <Text
            text="Draw here"
            x={dimensions.width / 2 - 50}
            y={dimensions.height / 2 - 10}
            fontSize={20}
            fill="#cccccc"
            fontFamily="sans-serif"
          />
        </Layer>

        {/* UI Layer: For selection transformer, added in plan 05 */}
        <Layer ref={uiLayerRef} />
      </Stage>
    </div>
  );
});

EzyDrawStage.displayName = 'EzyDrawStage';
