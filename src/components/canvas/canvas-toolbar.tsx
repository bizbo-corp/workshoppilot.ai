'use client';

export interface CanvasToolbarProps {
  onAddPostIt: () => void;
}

export function CanvasToolbar({ onAddPostIt }: CanvasToolbarProps) {
  return (
    <div className="absolute top-4 left-4 z-10">
      <button
        onClick={onAddPostIt}
        className="bg-white rounded-lg shadow-md hover:shadow-lg px-4 py-2 text-sm font-medium text-gray-700 transition-shadow duration-150"
      >
        + Add Post-it
      </button>
    </div>
  );
}
