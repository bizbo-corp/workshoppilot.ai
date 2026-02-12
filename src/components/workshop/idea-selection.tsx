'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { Crazy8sSlot } from '@/lib/canvas/crazy-8s-types';
import type { MindMapNodeState } from '@/stores/canvas-store';

interface IdeaSelectionProps {
  crazy8sSlots: Crazy8sSlot[];
  mindMapThemes?: MindMapNodeState[];
  selectedSlotIds: string[];
  onSelectionChange: (slotIds: string[]) => void;
  maxSelection?: number;
}

export function IdeaSelection({
  crazy8sSlots,
  mindMapThemes = [],
  selectedSlotIds,
  onSelectionChange,
  maxSelection = 4,
}: IdeaSelectionProps) {
  const toggleSelection = (slotId: string) => {
    if (selectedSlotIds.includes(slotId)) {
      onSelectionChange(selectedSlotIds.filter(id => id !== slotId));
    } else if (selectedSlotIds.length < maxSelection) {
      onSelectionChange([...selectedSlotIds, slotId]);
    }
  };

  // Filter to filled slots only (have imageUrl)
  const filledSlots = crazy8sSlots.filter(slot => slot.imageUrl);

  const renderSketchCard = (slot: Crazy8sSlot) => {
    const isSelected = selectedSlotIds.includes(slot.slotId);
    const isDisabled = !isSelected && selectedSlotIds.length >= maxSelection;
    const slotNumber = slot.slotId.replace('slot-', '');

    return (
      <button
        key={slot.slotId}
        onClick={() => toggleSelection(slot.slotId)}
        disabled={isDisabled}
        className={cn(
          'relative rounded-lg border p-2 transition-all',
          isSelected
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'hover:border-primary/50',
          isDisabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Sketch thumbnail */}
        <div className="aspect-square w-full overflow-hidden rounded bg-muted">
          {slot.imageUrl && (
            <img
              src={slot.imageUrl}
              alt={slot.title || `Sketch ${slotNumber}`}
              className="h-full w-full object-contain"
            />
          )}
        </div>

        {/* Slot title */}
        <div className="mt-2 text-sm font-medium truncate">
          {slot.title || `Sketch ${slotNumber}`}
        </div>

        {/* Checkbox overlay */}
        {isSelected && (
          <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white shadow-md">
            <Check className="h-4 w-4" />
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Select Your Best Ideas from Crazy 8s Sketches</h4>
        <span className="text-xs text-muted-foreground">
          {selectedSlotIds.length}/{maxSelection} selected
        </span>
      </div>

      {/* Mind Map Themes - context only */}
      {mindMapThemes.length > 0 && (
        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Themes from Mind Map
          </p>
          <div className="flex flex-wrap gap-2">
            {mindMapThemes.map((theme) => (
              <span
                key={theme.id}
                className="rounded-md px-2 py-1 text-xs font-medium"
                style={{
                  backgroundColor: `${theme.themeColor}20`,
                  color: theme.themeColor,
                  borderLeft: `3px solid ${theme.themeColor}`,
                }}
              >
                {theme.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Crazy 8s Sketches Grid */}
      {filledSlots.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {filledSlots.map(renderSketchCard)}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p className="text-sm">No sketches yet. Complete the Crazy 8s tab first.</p>
        </div>
      )}

      {/* Selection summary */}
      {selectedSlotIds.length > 0 && (
        <div className="rounded-lg border border-blue-500/50 bg-blue-50/50 p-3 dark:bg-blue-950/20">
          <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">
            Selected {selectedSlotIds.length} sketch{selectedSlotIds.length !== 1 ? 'es' : ''} for Step 9
          </p>
        </div>
      )}
    </div>
  );
}
