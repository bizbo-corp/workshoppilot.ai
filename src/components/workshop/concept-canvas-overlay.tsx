'use client';

import { Info } from 'lucide-react';
import { useCanvasStore } from '@/providers/canvas-store-provider';

interface ConceptCanvasOverlayProps {
  workshopId: string;
  stepId: string;
  selectedSketchSlotIds?: string[];
  crazy8sSlots?: Array<{ slotId: string; title: string; imageUrl?: string }>;
}

export function ConceptCanvasOverlay({
  selectedSketchSlotIds,
}: ConceptCanvasOverlayProps) {
  const conceptCards = useCanvasStore((s) => s.conceptCards);

  // Hide overlay once skeleton cards exist (created by page.tsx on landing)
  if (conceptCards.length > 0) {
    return null;
  }

  // Show info message if no selected sketches available
  if (!selectedSketchSlotIds || selectedSketchSlotIds.length === 0) {
    return (
      <div className="absolute bottom-16 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-muted-foreground/20 bg-background/95 px-4 py-3 text-sm text-muted-foreground shadow-lg backdrop-blur-sm">
        <Info className="h-4 w-4" />
        <span>Complete Step 8 to generate concept cards</span>
      </div>
    );
  }

  return null;
}
