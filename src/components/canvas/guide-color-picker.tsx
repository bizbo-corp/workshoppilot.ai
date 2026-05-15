'use client';

import { cn } from '@/lib/utils';
import type { CanvasGuideVariant } from '@/lib/canvas/canvas-guide-types';

const CARD_COLORS: { label: string; value: string | null; className: string }[] = [
  { label: 'Default', value: null, className: 'bg-olive-100 dark:bg-olive-900' },
  { label: 'Yellow', value: '#ffe299', className: 'bg-[var(--canvas-yellow-pastel)]' },
  { label: 'Pink', value: '#ffa8db', className: 'bg-[var(--canvas-pink-pastel)]' },
  { label: 'Blue', value: '#a8daff', className: 'bg-[var(--canvas-blue-pastel)]' },
  { label: 'Green', value: '#b3efbd', className: 'bg-[var(--canvas-green-pastel)]' },
  { label: 'Orange', value: '#ffd3a8', className: 'bg-[var(--canvas-orange-pastel)]' },
  { label: 'Red', value: '#ffafa3', className: 'bg-[var(--canvas-red-pastel)]' },
  { label: 'Teal', value: '#b3f4ef', className: 'bg-[var(--canvas-teal-pastel)]' },
  { label: 'Purple', value: '#d3bdff', className: 'bg-[var(--canvas-purple-pastel)]' },
];

// StickyNote color swatches — names match StickyNoteColor type and CSS variables
const POSTIT_COLORS = [
  { label: 'Yellow', value: 'yellow', className: 'bg-[var(--canvas-yellow-pastel)]' },
  { label: 'Pink', value: 'pink', className: 'bg-[var(--canvas-pink-pastel)]' },
  { label: 'Blue', value: 'blue', className: 'bg-[var(--canvas-blue-pastel)]' },
  { label: 'Green', value: 'green', className: 'bg-[var(--canvas-green-pastel)]' },
  { label: 'Orange', value: 'orange', className: 'bg-[var(--canvas-orange-pastel)]' },
  { label: 'Red', value: 'red', className: 'bg-[var(--canvas-red-pastel)]' },
  { label: 'Teal', value: 'teal', className: 'bg-[var(--canvas-teal-pastel)]' },
  { label: 'Purple', value: 'purple', className: 'bg-[var(--canvas-purple-pastel)]' },
];

// Frame colors — vivid hues matching the same 8 base colors
const FRAME_COLORS: { label: string; value: string | null; className: string }[] = [
  { label: 'Default', value: null, className: 'bg-olive-100 dark:bg-olive-900' },
  { label: 'Yellow', value: '#ffe299', className: 'bg-[var(--canvas-yellow)]' },
  { label: 'Pink', value: '#ffa8db', className: 'bg-[var(--canvas-pink)]' },
  { label: 'Blue', value: '#a8daff', className: 'bg-[var(--canvas-blue)]' },
  { label: 'Green', value: '#b3efbd', className: 'bg-[var(--canvas-green)]' },
  { label: 'Orange', value: '#ffd3a8', className: 'bg-[var(--canvas-orange)]' },
  { label: 'Red', value: '#ffafa3', className: 'bg-[var(--canvas-red)]' },
  { label: 'Teal', value: '#b3f4ef', className: 'bg-[var(--canvas-teal)]' },
  { label: 'Purple', value: '#d3bdff', className: 'bg-[var(--canvas-purple)]' },
];

// Arrow border colors
const BORDER_COLORS = [
  { label: 'Slate', value: '#94a3b8', className: 'bg-[#94a3b8]' },
  { label: 'Red', value: '#ffafa3', className: 'bg-[#ffafa3]' },
  { label: 'Orange', value: '#ffd3a8', className: 'bg-[#ffd3a8]' },
  { label: 'Blue', value: '#a8daff', className: 'bg-[#a8daff]' },
  { label: 'Green', value: '#b3efbd', className: 'bg-[#b3efbd]' },
  { label: 'Purple', value: '#d3bdff', className: 'bg-[#d3bdff]' },
  { label: 'Teal', value: '#b3f4ef', className: 'bg-[#b3f4ef]' },
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
