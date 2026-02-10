'use client';

import { cn } from '@/lib/utils';

export interface CanvasToolbarProps {
  onAddPostIt: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onGroup: () => void;
  canGroup: boolean;
}

export function CanvasToolbar({ onAddPostIt, onUndo, onRedo, canUndo, canRedo, onGroup, canGroup }: CanvasToolbarProps) {
  return (
    <div className="absolute top-4 left-4 z-10 flex gap-2">
      <button
        onClick={onAddPostIt}
        className="bg-white rounded-lg shadow-md hover:shadow-lg px-4 py-2 text-sm font-medium text-gray-700 transition-shadow duration-150"
      >
        + Add Post-it
      </button>
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={cn(
          "bg-white rounded-lg shadow-md px-4 py-2 text-sm font-medium transition-shadow duration-150",
          canUndo
            ? "hover:shadow-lg text-gray-700"
            : "opacity-50 cursor-not-allowed text-gray-400"
        )}
      >
        Undo
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={cn(
          "bg-white rounded-lg shadow-md px-4 py-2 text-sm font-medium transition-shadow duration-150",
          canRedo
            ? "hover:shadow-lg text-gray-700"
            : "opacity-50 cursor-not-allowed text-gray-400"
        )}
      >
        Redo
      </button>
      {canGroup && (
        <button
          onClick={onGroup}
          className="bg-white rounded-lg shadow-md hover:shadow-lg px-4 py-2 text-sm font-medium text-gray-700 transition-shadow duration-150"
        >
          Group
        </button>
      )}
    </div>
  );
}
