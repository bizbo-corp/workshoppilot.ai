'use client';

import { memo, useState } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { Crazy8sCanvas } from '@/components/workshop/crazy-8s-canvas';
import { Zap, Save, Check, Loader2, SkipForward, CheckCircle2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvasStore } from '@/providers/canvas-store-provider';

export type Crazy8sGroupNodeData = {
  workshopId: string;
  stepId: string;
  onSave?: () => Promise<void>;
  // Selection mode props
  selectionMode?: boolean;
  selectedSlotIds?: string[];
  onSelectionChange?: (slotIds: string[]) => void;
  onConfirmSelection?: (skip: boolean) => void;
  onBackToDrawing?: () => void;
};

export type Crazy8sGroupNode = Node<Crazy8sGroupNodeData, 'crazy8sGroupNode'>;

export const CRAZY_8S_NODE_ID = 'crazy-8s-group';
export const CRAZY_8S_NODE_WIDTH = 900;
export const CRAZY_8S_NODE_HEIGHT = 620;

const MAX_SELECTION = 4;

export const Crazy8sGroupNode = memo(({ data }: NodeProps<Crazy8sGroupNode>) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const crazy8sSlots = useCanvasStore((s) => s.crazy8sSlots);

  // At least one slot must have an image to enable save
  const hasDrawings = crazy8sSlots.some((slot) => slot.imageUrl);

  const handleSave = async () => {
    if (!data.onSave || isSaving) return;
    setIsSaving(true);
    try {
      await data.onSave();
      setSaved(true);
    } catch (err) {
      console.error('Failed to save Crazy 8s:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Selection mode helpers
  const filledSlots = crazy8sSlots.filter((slot) => slot.imageUrl);
  const selectedSlotIds = data.selectedSlotIds ?? [];

  const toggleSelection = (slotId: string) => {
    if (!data.onSelectionChange) return;
    if (selectedSlotIds.includes(slotId)) {
      data.onSelectionChange(selectedSlotIds.filter((id) => id !== slotId));
    } else if (selectedSlotIds.length < MAX_SELECTION) {
      data.onSelectionChange([...selectedSlotIds, slotId]);
    }
  };

  // --- Selection mode rendering ---
  if (data.selectionMode) {
    return (
      <div
        className="nodrag nopan nowheel cursor-default"
        style={{ width: CRAZY_8S_NODE_WIDTH, height: CRAZY_8S_NODE_HEIGHT, pointerEvents: 'all' }}
      >
        <div className="rounded-xl border-2 border-amber-400/60 bg-background shadow-lg h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5 shrink-0 rounded-t-[10px]">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Select Your Best Ideas
              </span>
              <span className="text-xs text-amber-600/70 dark:text-amber-400/70">
                {selectedSlotIds.length}/{MAX_SELECTION} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              {data.onBackToDrawing && (
                <button
                  onClick={data.onBackToDrawing}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Sketches
                </button>
              )}
              <button
                onClick={() => data.onConfirmSelection?.(true)}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40 transition-colors"
              >
                <SkipForward className="h-3.5 w-3.5" />
                Skip
              </button>
              <button
                onClick={() => data.onConfirmSelection?.(false)}
                disabled={selectedSlotIds.length === 0}
                className="flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Continue to Brain Rewriting
              </button>
            </div>
          </div>

          {/* Thumbnail selection grid */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {filledSlots.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {filledSlots.map((slot) => {
                  const isSelected = selectedSlotIds.includes(slot.slotId);
                  const isDisabled = !isSelected && selectedSlotIds.length >= MAX_SELECTION;
                  const slotNumber = slot.slotId.replace('slot-', '');

                  return (
                    <button
                      key={slot.slotId}
                      onClick={() => toggleSelection(slot.slotId)}
                      disabled={isDisabled}
                      className={cn(
                        'relative rounded-lg border-2 p-2 transition-all text-left',
                        isSelected
                          ? 'border-olive-600 ring-2 ring-olive-600/20 bg-olive-50/30 dark:bg-olive-950/20'
                          : 'border-muted hover:border-amber-400/60',
                        isDisabled && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      <div className="aspect-square w-full overflow-hidden rounded bg-muted">
                        {slot.imageUrl && (
                          <img
                            src={slot.imageUrl}
                            alt={slot.title || `Sketch ${slotNumber}`}
                            className="h-full w-full object-contain"
                          />
                        )}
                      </div>
                      <div className="mt-1.5 text-xs font-medium truncate text-foreground">
                        {slot.title || `Sketch ${slotNumber}`}
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-olive-600 text-white shadow-md">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No sketches to select from. Draw some ideas first.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Normal drawing mode ---
  return (
    <div
      className="nodrag nopan nowheel cursor-default"
      style={{ width: CRAZY_8S_NODE_WIDTH, height: CRAZY_8S_NODE_HEIGHT, pointerEvents: 'all' }}
    >
      <div className="rounded-xl border-2 border-amber-400/60 bg-background shadow-lg h-full flex flex-col">
        <div className="flex items-center justify-between border-b bg-amber-50 dark:bg-amber-950/20 px-4 py-2.5 shrink-0 rounded-t-[10px]">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Crazy 8s — Rapid Sketching
            </span>
          </div>
          {data.onSave && hasDrawings && (
            <button
              onClick={handleSave}
              disabled={isSaving || saved}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                saved
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50'
              }`}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : saved ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {isSaving ? 'Saving...' : saved ? 'Saved' : 'Save & Continue'}
            </button>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <Crazy8sCanvas workshopId={data.workshopId} stepId={data.stepId} />
        </div>
      </div>
    </div>
  );
});

Crazy8sGroupNode.displayName = 'Crazy8sGroupNode';
