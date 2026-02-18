'use client';

import { memo, useState } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import { Crazy8sCanvas } from '@/components/workshop/crazy-8s-canvas';
import { Zap, Save, Check, Loader2 } from 'lucide-react';
import { useCanvasStore } from '@/providers/canvas-store-provider';

export type Crazy8sGroupNodeData = {
  workshopId: string;
  stepId: string;
  onSave?: () => Promise<void>;
};

export type Crazy8sGroupNode = Node<Crazy8sGroupNodeData, 'crazy8sGroupNode'>;

export const CRAZY_8S_NODE_ID = 'crazy-8s-group';
export const CRAZY_8S_NODE_WIDTH = 900;
export const CRAZY_8S_NODE_HEIGHT = 620;

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
