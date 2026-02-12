'use client';

import { useDroppable } from '@dnd-kit/core';

interface DroppableCanvasProps {
  children: React.ReactNode;
}

export function DroppableCanvas({ children }: DroppableCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'ezydraw-canvas',
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 overflow-hidden ${isOver ? 'ring-2 ring-blue-400 ring-inset' : ''}`}
    >
      {children}
    </div>
  );
}
