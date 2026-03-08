'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, RefreshCw, Check } from 'lucide-react';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import type { SlotGroup, Crazy8sSlot } from '@/lib/canvas/crazy-8s-types';

interface MergeGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: SlotGroup;
  workshopId: string;
  onMerged: () => void; // called after accept to trigger save
}

export function MergeGroupDialog({
  open,
  onOpenChange,
  group,
  workshopId,
  onMerged,
}: MergeGroupDialogProps) {
  const crazy8sSlots = useCanvasStore((s) => s.crazy8sSlots);
  const updateSlotGroupMerge = useCanvasStore((s) => s.updateSlotGroupMerge);

  const [mergePrompt, setMergePrompt] = useState(group.mergePrompt || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(group.mergedImageUrl);
  const [error, setError] = useState<string | null>(null);

  // Get member slot data
  const memberSlots: Crazy8sSlot[] = group.slotIds
    .map((id) => crazy8sSlots.find((s) => s.slotId === id))
    .filter((s): s is Crazy8sSlot => !!s);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const slotData = memberSlots.map((slot) => ({
        title: slot.title || `Sketch ${slot.slotId.replace('slot-', '')}`,
        description: slot.description,
        imageUrl: slot.imageUrl,
      }));

      const res = await fetch('/api/ai/merge-group-sketches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId,
          groupLabel: group.label,
          slotData,
          mergePrompt: mergePrompt.trim() || undefined,
          previousImageUrl: previewUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate merged sketch');
      }

      const { mergedImageUrl } = await res.json();
      setPreviewUrl(mergedImageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [memberSlots, workshopId, group.label, mergePrompt, previewUrl]);

  const handleAccept = useCallback(() => {
    if (!previewUrl) return;
    updateSlotGroupMerge(group.id, previewUrl, mergePrompt.trim() || undefined);
    onMerged();
    onOpenChange(false);
  }, [previewUrl, updateSlotGroupMerge, group.id, mergePrompt, onMerged, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Merge Group: {group.label}</DialogTitle>
          <DialogDescription>
            Generate a single consolidated sketch from {memberSlots.length} grouped ideas.
          </DialogDescription>
        </DialogHeader>

        {/* Member sketch previews */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-muted-foreground">Member Sketches</label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {memberSlots.map((slot) => (
              <div key={slot.slotId} className="shrink-0 w-28">
                <div className="aspect-[4/3] rounded-md border bg-muted overflow-hidden">
                  {slot.imageUrl ? (
                    <img
                      src={slot.imageUrl}
                      alt={slot.title || slot.slotId}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <div className="mt-1 text-[10px] font-medium truncate text-center">
                  {slot.title || `Sketch ${slot.slotId.replace('slot-', '')}`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Merge prompt input */}
        <div className="space-y-2">
          <label htmlFor="merge-prompt" className="text-xs font-medium text-muted-foreground">
            How should these ideas combine? (optional)
          </label>
          <textarea
            id="merge-prompt"
            value={mergePrompt}
            onChange={(e) => setMergePrompt(e.target.value)}
            placeholder="e.g., Show the home page with the navigation from sketch 1 and the content layout from sketch 3..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            rows={3}
            disabled={isGenerating}
          />
        </div>

        {/* Generate / Regenerate button */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            variant={previewUrl ? 'outline' : 'default'}
            size="sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Generating...
              </>
            ) : previewUrl ? (
              <>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Regenerate
              </>
            ) : (
              <>
                <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                Generate Merged Sketch
              </>
            )}
          </Button>
          {error && (
            <span className="text-xs text-destructive">{error}</span>
          )}
        </div>

        {/* Preview of merged result */}
        {previewUrl && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Merged Result</label>
            <div className="aspect-[4/3] w-full rounded-lg border-2 border-amber-400/60 bg-muted overflow-hidden">
              <img
                src={previewUrl}
                alt={`Merged: ${group.label}`}
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Accept button */}
        {previewUrl && (
          <div className="flex justify-end">
            <Button onClick={handleAccept} size="sm">
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Accept Merged Sketch
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
