'use client';

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Stage, Layer, Line, Rect, Ellipse, Arrow, Text, Path } from 'react-konva';
import type Konva from 'konva';
import { useDrawingStore } from '@/providers/drawing-store-provider';
import { usePencilTool, PencilToolPreview } from '@/components/ezydraw/tools/pencil-tool';
import type { PointerData } from '@/components/ezydraw/tools/pencil-tool';
import { useShapesTool, ShapesToolPreview } from '@/components/ezydraw/tools/shapes-tool';
import { useSpeechBubbleTool, SpeechBubblePreview, SpeechBubbleTailHandle } from '@/components/ezydraw/tools/speech-bubble-tool';
import { SelectTool } from '@/components/ezydraw/tools/select-tool';
import { TextTool } from '@/components/ezydraw/tools/text-tool';
import { eraserCursor } from '@/components/ezydraw/tools/eraser-tool';
import { generateSpeechBubblePath } from '@/lib/drawing/speech-bubble-path';
import type { DrawingElement, SpeechBubbleElement } from '@/lib/drawing/types';
import { createElementId } from '@/lib/drawing/types';

export interface EzyDrawStageHandle {
  getStage: () => Konva.Stage | null;
  toDataURL: (config?: { pixelRatio?: number }) => string;
}

const SHAPE_TOOLS = ['rectangle', 'circle', 'arrow', 'line', 'diamond'];

export const EzyDrawStage = forwardRef<EzyDrawStageHandle>((_props, ref) => {
  const stageRef = useRef<Konva.Stage>(null);
  const drawingLayerRef = useRef<Konva.Layer>(null);
  const uiLayerRef = useRef<Konva.Layer>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Text editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingPosition, setEditingPosition] = useState<{
    x: number;
    y: number;
    width: number;
    fontSize: number;
  } | null>(null);

  // Store selectors
  const elements = useDrawingStore((s) => s.elements);
  const activeTool = useDrawingStore((s) => s.activeTool);
  const selectedElementId = useDrawingStore((s) => s.selectedElementId);
  const addElement = useDrawingStore((s) => s.addElement);
  const updateElement = useDrawingStore((s) => s.updateElement);
  const deleteElement = useDrawingStore((s) => s.deleteElement);
  const deleteElementGroup = useDrawingStore((s) => s.deleteElementGroup);
  const moveElementGroup = useDrawingStore((s) => s.moveElementGroup);
  const selectElement = useDrawingStore((s) => s.selectElement);
  const strokeColor = useDrawingStore((s) => s.strokeColor);
  const fontSize = useDrawingStore((s) => s.fontSize);

  // Tool hooks
  const pencilHandlers = usePencilTool();
  const shapeHandlers = useShapesTool();
  const speechBubbleHandlers = useSpeechBubbleTool();

  // Refs for latest values (avoids stale closures in native event listeners)
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const pencilRef = useRef(pencilHandlers);
  pencilRef.current = pencilHandlers;
  const shapeRef = useRef(shapeHandlers);
  shapeRef.current = shapeHandlers;
  const speechBubbleRef = useRef(speechBubbleHandlers);
  speechBubbleRef.current = speechBubbleHandlers;

  useImperativeHandle(ref, () => ({
    getStage: () => stageRef.current,
    toDataURL: (config = {}) => {
      if (!stageRef.current) return '';
      return stageRef.current.toDataURL({ pixelRatio: config.pixelRatio || 2 });
    },
  }));

  // Measure container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      setDimensions({ width: container.clientWidth, height: container.clientHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Note: react-konva's Stage component manages its own Konva lifecycle.
  // Do NOT call stageRef.current?.destroy() — it conflicts with React strict
  // mode's double-invoke of effects and leaves shapes in a detached state.

  // ─── Pointer event handlers (React synthetic events) ───
  // React's event system delegates at the root and reliably captures events
  // even inside Radix Dialog + dynamically imported Konva canvas.
  const getPointerPos = useCallback((e: React.PointerEvent<HTMLDivElement>): PointerData => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5,
      pointerType: e.pointerType || 'mouse',
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const pos = getPointerPos(e);
    const tool = activeToolRef.current;

    if (tool === 'pencil') {
      pencilRef.current.handleDown(pos);
      e.preventDefault();
    } else if (SHAPE_TOOLS.includes(tool)) {
      shapeRef.current.handleDown(pos);
      e.preventDefault();
    } else if (tool === 'speechBubble') {
      speechBubbleRef.current.handleDown(pos);
      e.preventDefault();
    }
  }, [getPointerPos]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const pos = getPointerPos(e);
    const tool = activeToolRef.current;

    if (tool === 'pencil') {
      pencilRef.current.handleMove(pos);
    } else if (SHAPE_TOOLS.includes(tool)) {
      shapeRef.current.handleMove(pos);
    } else if (tool === 'speechBubble') {
      speechBubbleRef.current.handleMove(pos);
    }
  }, [getPointerPos]);

  const handlePointerUp = useCallback(() => {
    const tool = activeToolRef.current;
    if (tool === 'pencil') {
      pencilRef.current.handleUp();
    } else if (SHAPE_TOOLS.includes(tool)) {
      shapeRef.current.handleUp();
    } else if (tool === 'speechBubble') {
      speechBubbleRef.current.handleUp();
    }
  }, []);

  // Window pointerup — catches drag-release outside the canvas
  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerUp]);

  // Text handling
  const handleTextClick = useCallback((x: number, y: number) => {
    const newTextId = createElementId();
    addElement({
      type: 'text', x, y,
      rotation: 0, scaleX: 1, scaleY: 1, opacity: 1,
      text: 'Text', fontSize, fill: strokeColor, width: 200, fontFamily: 'sans-serif',
    } as Omit<DrawingElement, 'id'>);
    setTimeout(() => {
      selectElement(newTextId);
      setEditingTextId(newTextId);
      setEditingText('Text');
      setEditingPosition({ x, y, width: 200, fontSize });
    }, 0);
  }, [addElement, fontSize, strokeColor, selectElement]);

  const startTextEditing = (id: string, x: number, y: number, width: number, fontSize: number, text: string) => {
    setEditingTextId(id);
    setEditingText(text);
    setEditingPosition({ x, y, width, fontSize });
  };

  const finishTextEditing = () => {
    if (editingTextId && editingText.trim() !== '') {
      updateElement(editingTextId, { text: editingText });
    }
    setEditingTextId(null);
    setEditingText('');
    setEditingPosition(null);
  };

  const getCursorStyle = () => {
    switch (activeTool) {
      case 'pencil': case 'rectangle': case 'circle':
      case 'diamond': case 'arrow': case 'line': case 'speechBubble':
        return 'crosshair';
      case 'text': return 'text';
      case 'eraser': return eraserCursor;
      default: return 'default';
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ touchAction: 'none', cursor: getCursorStyle() }}
      className="flex-1 overflow-hidden bg-neutral-olive-50 relative"
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ backgroundColor: '#ffffff' }}
      >
        <Layer ref={drawingLayerRef}>
          {/* Background rect for click handling (text placement, deselect) */}
          <Rect
            width={dimensions.width}
            height={dimensions.height}
            fill="white"
            onClick={(e) => {
              if (activeTool === 'text') {
                const stage = e.target.getStage();
                if (stage) {
                  const pos = stage.getPointerPosition();
                  if (pos) handleTextClick(pos.x, pos.y);
                }
              }
              if (activeTool === 'select') {
                selectElement(null);
              }
            }}
          />

          {/* Render completed elements */}
          {elements.map((element) => {
            const isGrouped = !!element.groupId;
            const isGroupRepresentative = isGrouped &&
              elements.find((el) => el.groupId === element.groupId)?.id === element.id;

            const isInteractive = activeTool === 'select' || activeTool === 'eraser';
            const isDraggable = activeTool === 'select' && (!isGrouped || isGroupRepresentative);

            const commonProps = {
              id: element.id,
              listening: isInteractive,
              draggable: isDraggable,
              onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
                e.cancelBubble = true;
                if (activeTool === 'select') {
                  // For grouped elements, select the representative
                  if (element.groupId) {
                    const rep = elements.find((el) => el.groupId === element.groupId);
                    if (rep) selectElement(rep.id);
                  } else {
                    selectElement(element.id);
                  }
                } else if (activeTool === 'eraser') {
                  // Delete entire group
                  if (element.groupId) {
                    deleteElementGroup(element.groupId);
                  } else {
                    deleteElement(element.id);
                  }
                }
              },
              onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
                if (activeTool === 'select') {
                  if (isGroupRepresentative && element.groupId) {
                    // Calculate delta from original position
                    const deltaX = e.target.x() - element.x;
                    const deltaY = e.target.y() - element.y;
                    // Move entire group
                    moveElementGroup(element.groupId, deltaX, deltaY);
                    // Reset Konva node position (store is source of truth)
                    e.target.position({ x: element.x + deltaX, y: element.y + deltaY });
                  } else if (!isGrouped) {
                    updateElement(element.id, { x: e.target.x(), y: e.target.y() });
                  }
                }
              },
            };

            if (element.type === 'pencil') {
              if (!element.points || element.points.length < 4) return null;
              return (
                <Line key={element.id} {...commonProps}
                  points={element.points} fill={element.fill} stroke={element.stroke}
                  strokeWidth={element.strokeWidth} closed={true} perfectDrawEnabled={false}
                  x={element.x} y={element.y} rotation={element.rotation}
                  scaleX={element.scaleX} scaleY={element.scaleY} opacity={element.opacity} />
              );
            }
            if (element.type === 'rectangle') {
              return (
                <Rect key={element.id} {...commonProps}
                  x={element.x} y={element.y} width={element.width} height={element.height}
                  fill={element.fill} stroke={element.stroke} strokeWidth={element.strokeWidth}
                  rotation={element.rotation} scaleX={element.scaleX} scaleY={element.scaleY} opacity={element.opacity} />
              );
            }
            if (element.type === 'circle') {
              return (
                <Ellipse key={element.id} {...commonProps}
                  x={element.x} y={element.y} radiusX={element.radiusX} radiusY={element.radiusY}
                  fill={element.fill} stroke={element.stroke} strokeWidth={element.strokeWidth}
                  rotation={element.rotation} scaleX={element.scaleX} scaleY={element.scaleY} opacity={element.opacity} />
              );
            }
            if (element.type === 'arrow') {
              if (!element.points || element.points.length < 4) return null;
              return (
                <Arrow key={element.id} {...commonProps}
                  x={element.x} y={element.y} points={element.points}
                  stroke={element.stroke} strokeWidth={element.strokeWidth}
                  pointerLength={element.pointerLength} pointerWidth={element.pointerWidth}
                  rotation={element.rotation} scaleX={element.scaleX} scaleY={element.scaleY} opacity={element.opacity} />
              );
            }
            if (element.type === 'line') {
              if (!element.points || element.points.length < 4) return null;
              return (
                <Line key={element.id} {...commonProps}
                  x={element.x} y={element.y} points={element.points}
                  stroke={element.stroke} strokeWidth={element.strokeWidth}
                  rotation={element.rotation} scaleX={element.scaleX} scaleY={element.scaleY} opacity={element.opacity} />
              );
            }
            if (element.type === 'diamond') {
              return (
                <Line key={element.id} {...commonProps}
                  x={element.x} y={element.y}
                  points={[element.width / 2, 0, element.width, element.height / 2, element.width / 2, element.height, 0, element.height / 2]}
                  closed={true} fill={element.fill} stroke={element.stroke} strokeWidth={element.strokeWidth}
                  rotation={element.rotation} scaleX={element.scaleX} scaleY={element.scaleY} opacity={element.opacity} />
              );
            }
            if (element.type === 'text') {
              return (
                <Text key={element.id} {...commonProps}
                  x={element.x} y={element.y} text={element.text}
                  fontSize={element.fontSize} fill={element.fill} width={element.width}
                  fontFamily={element.fontFamily} rotation={element.rotation}
                  scaleX={element.scaleX} scaleY={element.scaleY} opacity={element.opacity}
                  onDblClick={(e) => {
                    e.cancelBubble = true;
                    const node = e.target;
                    const absPos = node.getAbsolutePosition();
                    startTextEditing(element.id, absPos.x, absPos.y, element.width, element.fontSize, element.text);
                  }} />
              );
            }
            if (element.type === 'speechBubble') {
              const pathData = generateSpeechBubblePath(
                0, 0, // Path relative to element position
                element.width,
                element.height,
                element.tailX,
                element.tailY,
                element.cornerRadius
              );
              return (
                <React.Fragment key={element.id}>
                  <Path
                    {...commonProps}
                    x={element.x}
                    y={element.y}
                    data={pathData}
                    fill={element.fill}
                    stroke={element.stroke}
                    strokeWidth={element.strokeWidth}
                    rotation={element.rotation}
                    scaleX={element.scaleX}
                    scaleY={element.scaleY}
                    opacity={element.opacity}
                    onDblClick={(e) => {
                      e.cancelBubble = true;
                      const node = e.target;
                      const absPos = node.getAbsolutePosition();
                      startTextEditing(element.id, absPos.x + 12, absPos.y + 12, element.width - 24, element.fontSize, element.text);
                    }}
                  />
                  <Text
                    id={`${element.id}-label`}
                    x={element.x + 12}
                    y={element.y + 12}
                    width={element.width - 24}
                    text={element.text}
                    fontSize={element.fontSize}
                    fill="#000000"
                    fontFamily="sans-serif"
                    listening={false}
                  />
                </React.Fragment>
              );
            }
            if (element.type === 'emoji') {
              return (
                <Text
                  key={element.id}
                  {...commonProps}
                  x={element.x}
                  y={element.y}
                  text={element.emoji}
                  fontSize={element.fontSize}
                  fontFamily="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif"
                  rotation={element.rotation}
                  scaleX={element.scaleX}
                  scaleY={element.scaleY}
                  opacity={element.opacity}
                />
              );
            }
            return null;
          })}

          {/* Tool previews */}
          <PencilToolPreview
            currentPath={pencilHandlers.currentPath}
            isDrawing={pencilHandlers.isDrawing}
            strokeColor={pencilHandlers.strokeColor}
          />
          <ShapesToolPreview
            previewShape={shapeHandlers.previewShape}
            strokeColor={shapeHandlers.strokeColor}
            fillColor={shapeHandlers.fillColor}
            strokeWidth={shapeHandlers.strokeWidth}
          />
          <SpeechBubblePreview previewBubble={speechBubbleHandlers.previewBubble} />
        </Layer>

        <Layer ref={uiLayerRef} name="ui-layer">
          {activeTool === 'select' && <SelectTool stageRef={stageRef} />}
          {/* Speech bubble tail handle - only visible when speech bubble is selected */}
          {activeTool === 'select' && selectedElementId && (() => {
            const selectedBubble = elements.find(
              (el) => el.id === selectedElementId && el.type === 'speechBubble'
            ) as SpeechBubbleElement | undefined;

            if (selectedBubble) {
              return (
                <SpeechBubbleTailHandle
                  bubble={selectedBubble}
                  updateElement={updateElement}
                />
              );
            }
            return null;
          })()}
        </Layer>
      </Stage>

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
