'use client';

import { useDroppable } from '@dnd-kit/core';

interface DroppableCanvasProps {
  children: React.ReactNode;
  canvasSize?: { width: number; height: number };
}

export function DroppableCanvas({ children, canvasSize }: DroppableCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'ezydraw-canvas',
  });

  // If canvasSize is provided, constrain the container to those dimensions
  // Otherwise, use flex-1 to fill available space (default fullscreen behavior)
  const containerStyle = canvasSize
    ? {
        width: `${canvasSize.width}px`,
        height: `${canvasSize.height}px`,
        margin: '0 auto', // Center the canvas
      }
    : undefined;

  const containerClass = canvasSize
    ? `overflow-hidden ${isOver ? 'ring-2 ring-blue-400 ring-inset' : ''}`
    : `flex-1 overflow-hidden ${isOver ? 'ring-2 ring-blue-400 ring-inset' : ''}`;

  return (
    <div
      ref={setNodeRef}
      className={containerClass}
      style={containerStyle}
    >
      {children}
    </div>
  );
}
