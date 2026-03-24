'use client';

import { useReactFlow } from '@xyflow/react';
import { Plus, Minus, Maximize } from 'lucide-react';

interface CanvasZoomControlsProps {
  /** Override default fitView behavior (e.g. to account for chat panel offset) */
  onFitView?: () => void;
}

export function CanvasZoomControls({ onFitView }: CanvasZoomControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col items-center bg-card rounded-xl shadow-md border border-border p-1 gap-0.5">
      <button
        onClick={() => zoomIn({ duration: 200 })}
        title="Zoom in"
        className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
      <button
        onClick={() => zoomOut({ duration: 200 })}
        title="Zoom out"
        className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>
      <button
        onClick={() => onFitView ? onFitView() : fitView({ padding: 0.2, duration: 300 })}
        title="Fit view"
        className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Maximize className="w-4 h-4" />
      </button>
    </div>
  );
}
