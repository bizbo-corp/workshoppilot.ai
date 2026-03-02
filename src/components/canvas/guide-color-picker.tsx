'use client';

import { cn } from '@/lib/utils';
import type { CanvasGuideVariant } from '@/lib/canvas/canvas-guide-types';

const CARD_COLORS: { label: string; value: string | null; className: string }[] = [
  { label: 'Default', value: null, className: 'bg-olive-100 dark:bg-olive-900' },
  { label: 'Yellow', value: '#fdf0a0', className: 'bg-[var(--canvas-yellow-pastel)]' },
  { label: 'Pink', value: '#fcc0d8', className: 'bg-[var(--canvas-pink-pastel)]' },
  { label: 'Blue', value: '#a0d8f0', className: 'bg-[var(--canvas-blue-pastel)]' },
  { label: 'Green', value: '#a0e8c0', className: 'bg-[var(--canvas-green-pastel)]' },
  { label: 'Orange', value: '#fdd0a0', className: 'bg-[var(--canvas-orange-pastel)]' },
  { label: 'Red', value: '#f5b0a8', className: 'bg-[var(--canvas-red-pastel)]' },
];

// StickyNote color swatches — names match StickyNoteColor type and CSS variables
const POSTIT_COLORS = [
  { label: 'Yellow', value: 'yellow', className: 'bg-[var(--canvas-yellow-pastel)]' },
  { label: 'Pink', value: 'pink', className: 'bg-[var(--canvas-pink-pastel)]' },
  { label: 'Blue', value: 'blue', className: 'bg-[var(--canvas-blue-pastel)]' },
  { label: 'Green', value: 'green', className: 'bg-[var(--canvas-green-pastel)]' },
  { label: 'Orange', value: 'orange', className: 'bg-[var(--canvas-orange-pastel)]' },
  { label: 'Red', value: 'red', className: 'bg-[var(--canvas-red-pastel)]' },
];

// Frame colors — vivid hues matching the same 6 base colors
const FRAME_COLORS: { label: string; value: string | null; className: string }[] = [
  { label: 'Default', value: null, className: 'bg-olive-100 dark:bg-olive-900' },
  { label: 'Yellow', value: '#eab308', className: 'bg-[var(--canvas-yellow)]' },
  { label: 'Pink', value: '#ec4899', className: 'bg-[var(--canvas-pink)]' },
  { label: 'Blue', value: '#3b82f6', className: 'bg-[var(--canvas-blue)]' },
  { label: 'Green', value: '#22c55e', className: 'bg-[var(--canvas-green)]' },
  { label: 'Orange', value: '#f97316', className: 'bg-[var(--canvas-orange)]' },
  { label: 'Red', value: '#ef4444', className: 'bg-[var(--canvas-red)]' },
];

// Arrow border colors
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
  const isPostit = variant === 'template-sticky-note';
  const isCard = variant === 'card';
  const isFrame = variant === 'frame';
  const isArrow = variant === 'arrow';
  const colors = isPostit ? POSTIT_COLORS : isCard ? CARD_COLORS : isFrame ? FRAME_COLORS : isArrow ? BORDER_COLORS : CARD_COLORS;

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
      {/* Custom color picker — shown for frame and arrow variants */}
      {(isFrame || isArrow) && (
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
