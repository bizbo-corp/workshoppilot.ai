'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer, Line, Rect, Ellipse, Arrow, Text } from 'react-konva';
import type Konva from 'konva';
import { useDrawingStore } from '@/providers/drawing-store-provider';
import { PencilTool } from '@/components/ezydraw/tools/pencil-tool';
import { ShapesTool, useShapesTool } from '@/components/ezydraw/tools/shapes-tool';
import { SelectTool } from '@/components/ezydraw/tools/select-tool';
import { TextTool } from '@/components/ezydraw/tools/text-tool';
import { eraserCursor } from '@/components/ezydraw/tools/eraser-tool';
import type { DrawingElement } from '@/lib/drawing/types';
import { createElementId } from '@/lib/drawing/types';

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

  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingPosition, setEditingPosition] = useState<{
    x: number;
    y: number;
    width: number;
    fontSize: number;
  } | null>(null);

  // Get elements and active tool from drawing store
  const elements = useDrawingStore((state: { elements: DrawingElement[] }) => state.elements);
  const activeTool = useDrawingStore((state) => state.activeTool);
  const addElement = useDrawingStore((state) => state.addElement);
  const updateElement = useDrawingStore((state) => state.updateElement);
  const deleteElement = useDrawingStore((state) => state.deleteElement);
  const selectElement = useDrawingStore((state) => state.selectElement);
  const strokeColor = useDrawingStore((state) => state.strokeColor);
  const fontSize = useDrawingStore((state) => state.fontSize);

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

  // Handle text element creation
  const handleTextClick = (x: number, y: number) => {
    const newTextId = createElementId();
    addElement({
      type: 'text',
      x,
      y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      text: 'Text',
      fontSize: fontSize,
      fill: strokeColor,
      width: 200,
      fontFamily: 'sans-serif',
    } as Omit<DrawingElement, 'id'>);
    // Immediately select and edit the new text
    setTimeout(() => {
      selectElement(newTextId);
      startTextEditing(newTextId, x, y, 200, fontSize, 'Text');
    }, 0);
  };

  // Start text editing
  const startTextEditing = (
    id: string,
    x: number,
    y: number,
    width: number,
    fontSize: number,
    text: string
  ) => {
    setEditingTextId(id);
    setEditingText(text);
    setEditingPosition({ x, y, width, fontSize });
  };

  // Finish text editing
  const finishTextEditing = () => {
    if (editingTextId && editingText.trim() !== '') {
      updateElement(editingTextId, { text: editingText });
    }
    setEditingTextId(null);
    setEditingText('');
    setEditingPosition(null);
  };

  // Get cursor style based on active tool
  const getCursorStyle = () => {
    switch (activeTool) {
      case 'pencil':
      case 'rectangle':
      case 'circle':
      case 'diamond':
      case 'arrow':
      case 'line':
        return 'crosshair';
      case 'text':
        return 'text';
      case 'eraser':
        return eraserCursor;
      case 'select':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <div
      style={{ touchAction: 'none', cursor: getCursorStyle() }}
      onTouchMove={(e) => e.preventDefault()}
      className="flex-1 overflow-hidden bg-white relative"
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
            onClick={(e) => {
              // Text tool: create new text at click position
              if (activeTool === 'text') {
                const stage = e.target.getStage();
                if (stage) {
                  const pos = stage.getPointerPosition();
                  if (pos) {
                    handleTextClick(pos.x, pos.y);
                  }
                }
              }
              // Select tool: clicking empty space deselects
              if (activeTool === 'select') {
                selectElement(null);
              }
            }}
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
            // Common props for interactivity
            const isInteractive = activeTool === 'select' || activeTool === 'eraser';
            const isDraggable = activeTool === 'select';
            const commonProps = {
              id: element.id,
              listening: isInteractive,
              draggable: isDraggable,
              onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
                e.cancelBubble = true; // Prevent event from reaching interaction rect
                if (activeTool === 'select') {
                  selectElement(element.id);
                } else if (activeTool === 'eraser') {
                  deleteElement(element.id);
                }
              },
              onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
                if (activeTool === 'select') {
                  updateElement(element.id, {
                    x: e.target.x(),
                    y: e.target.y(),
                  });
                }
              },
            };

            // Pencil stroke
            if (element.type === 'pencil') {
              return (
                <Line
                  key={element.id}
                  {...commonProps}
                  points={element.points}
                  fill={element.fill}
                  stroke={element.stroke}
                  strokeWidth={element.strokeWidth}
                  closed={true}
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
                  {...commonProps}
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
                  {...commonProps}
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
                  {...commonProps}
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
                  {...commonProps}
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
                  {...commonProps}
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

            // Text
            if (element.type === 'text') {
              return (
                <Text
                  key={element.id}
                  {...commonProps}
                  x={element.x}
                  y={element.y}
                  text={element.text}
                  fontSize={element.fontSize}
                  fill={element.fill}
                  width={element.width}
                  fontFamily={element.fontFamily}
                  rotation={element.rotation}
                  scaleX={element.scaleX}
                  scaleY={element.scaleY}
                  opacity={element.opacity}
                  onDblClick={(e) => {
                    e.cancelBubble = true;
                    // Start inline editing
                    const node = e.target;
                    const absPos = node.getAbsolutePosition();
                    startTextEditing(
                      element.id,
                      absPos.x,
                      absPos.y,
                      element.width,
                      element.fontSize,
                      element.text
                    );
                  }}
                />
              );
            }

            return null;
          })}

          {/* PencilTool: Renders current in-progress stroke preview */}
          <PencilTool />

          {/* ShapesTool: Renders shape preview during drag */}
          <ShapesTool />
        </Layer>

        {/* UI Layer: For selection transformer */}
        <Layer ref={uiLayerRef}>
          {activeTool === 'select' && <SelectTool stageRef={stageRef} />}
        </Layer>
      </Stage>

      {/* Text editing overlay (HTML textarea positioned over canvas) */}
      <TextTool
        editingTextId={editingTextId}
        editingText={editingText}
        editingPosition={editingPosition}
        onTextChange={setEditingText}
        onFinishEditing={finishTextEditing}
      />
    </div>
  );
});

EzyDrawStage.displayName = 'EzyDrawStage';
