'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { PostItColor } from '@/stores/canvas-store';
import { COLOR_CLASSES } from './post-it-node';

interface ColorPickerProps {
  position: { x: number; y: number };
  currentColor: PostItColor;
  onColorSelect: (color: PostItColor) => void;
  onClose: () => void;
}

const COLORS: { value: PostItColor; label: string }[] = [
  { value: 'yellow', label: 'Yellow' },
  { value: 'pink', label: 'Pink' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'orange', label: 'Orange' },
];

export const ColorPicker = memo(function ColorPicker({
  position, currentColor, onColorSelect, onClose,
}: ColorPickerProps) {
  return (
    <>
      {/* Backdrop to close menu on click outside */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Color picker menu */}
      <div
        className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex gap-1.5"
        style={{ left: position.x, top: position.y }}
      >
        {COLORS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onColorSelect(value)}
            title={label}
            className={cn(
              'w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
              COLOR_CLASSES[value],
              currentColor === value
                ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-400'
                : 'border-gray-300'
            )}
          />
        ))}
      </div>
    </>
  );
});
