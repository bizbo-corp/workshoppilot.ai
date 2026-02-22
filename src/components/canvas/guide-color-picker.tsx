'use client';

import { cn } from '@/lib/utils';
import type { CanvasGuideVariant } from '@/lib/canvas/canvas-guide-types';

const PRESET_COLORS = [
  { label: 'Default', value: null, className: 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700' },
  { label: 'Olive', value: '#b8c9a3', className: 'bg-[#b8c9a3]' },
  { label: 'Sky', value: '#dce8f5', className: 'bg-[#dce8f5]' },
  { label: 'Dark', value: '#374151', className: 'bg-[#374151]' },
  { label: 'White', value: '#ffffff', className: 'bg-white' },
  { label: 'Warm', value: '#fef3c7', className: 'bg-[#fef3c7]' },
  { label: 'Coral', value: '#fca5a5', className: 'bg-[#fca5a5]' },
  { label: 'Mint', value: '#a7f3d0', className: 'bg-[#a7f3d0]' },
  { label: 'Lavender', value: '#ddd6fe', className: 'bg-[#ddd6fe]' },
];

// PostIt color swatches — names match PostItColor type and CSS variables
const POSTIT_COLORS = [
  { label: 'Yellow', value: 'yellow', className: 'bg-[var(--postit-yellow)]' },
  { label: 'Pink', value: 'pink', className: 'bg-[var(--postit-pink)]' },
  { label: 'Blue', value: 'blue', className: 'bg-[var(--postit-blue)]' },
  { label: 'Green', value: 'green', className: 'bg-[var(--postit-green)]' },
  { label: 'Orange', value: 'orange', className: 'bg-[var(--postit-orange)]' },
  { label: 'Red', value: 'red', className: 'bg-[var(--postit-red)]' },
];

// Frame/arrow border colors
const BORDER_COLORS = [
  { label: 'Slate', value: '#94a3b8', className: 'bg-[#94a3b8]' },
  { label: 'Red', value: '#ef4444', className: 'bg-[#ef4444]' },
  { label: 'Orange', value: '#f97316', className: 'bg-[#f97316]' },
  { label: 'Blue', value: '#3b82f6', className: 'bg-[#3b82f6]' },
  { label: 'Green', value: '#22c55e', className: 'bg-[#22c55e]' },
  { label: 'Purple', value: '#a855f7', className: 'bg-[#a855f7]' },
  { label: 'Dark', value: '#374151', className: 'bg-[#374151]' },
  { label: 'Olive', value: '#b8c9a3', className: 'bg-[#b8c9a3]' },
];

interface GuideColorPickerProps {
  value: string | null | undefined;
  onChange: (color: string | null) => void;
  variant?: CanvasGuideVariant;
}

export function GuideColorPicker({ value, onChange, variant }: GuideColorPickerProps) {
  // Choose swatch set based on variant
  const isPostit = variant === 'template-postit';
  const isBorderVariant = variant === 'frame' || variant === 'arrow';
  const colors = isPostit ? POSTIT_COLORS : isBorderVariant ? BORDER_COLORS : PRESET_COLORS;

  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((preset) => (
        <button
          key={preset.label}
          type="button"
          title={preset.label}
          onClick={() => onChange(preset.value)}
          className={cn(
            'w-6 h-6 rounded-md border transition-all',
            preset.className,
            (value ?? null) === preset.value
              ? 'ring-2 ring-primary ring-offset-1'
              : 'border-border hover:scale-110',
          )}
        />
      ))}
      {/* Custom color picker — not shown for postit names */}
      {!isPostit && (
        <input
          type="color"
          value={value || '#b8c9a3'}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded-md border border-border cursor-pointer"
          title="Custom color"
        />
      )}
    </div>
  );
}
