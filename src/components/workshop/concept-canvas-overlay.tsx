'use client';

import { useState, useCallback, useEffect } from 'react';
import { Sparkles, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCanvasStore } from '@/providers/canvas-store-provider';
import { getNextConceptCardPosition } from '@/lib/canvas/concept-card-layout';

interface ConceptCanvasOverlayProps {
  workshopId: string;
  stepId: string;
  selectedSketchSlotIds?: string[];
  crazy8sSlots?: Array<{ slotId: string; title: string; imageUrl?: string }>;
}

export function ConceptCanvasOverlay({
  workshopId,
  stepId,
  selectedSketchSlotIds,
  crazy8sSlots,
}: ConceptCanvasOverlayProps) {
  const conceptCards = useCanvasStore((s) => s.conceptCards);
  const addConceptCard = useCanvasStore((s) => s.addConceptCard);
  const [isGenerating, setIsGenerating] = useState(false);

  // Only show overlay when no concept cards exist yet
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

  const handleGenerate = async () => {
    if (!selectedSketchSlotIds?.length || !crazy8sSlots?.length) return;
    setIsGenerating(true);

    let positionIndex = 0;

    for (const slotId of selectedSketchSlotIds) {
      const slot = crazy8sSlots.find((s) => s.slotId === slotId);
      if (!slot) continue;

      try {
        const response = await fetch('/api/ai/generate-concept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workshopId,
            slotId: slot.slotId,
            crazy8sTitle: slot.title || `Sketch ${slot.slotId}`,
          }),
        });

        if (!response.ok) {
          console.error(`Failed to generate concept for ${slotId}`);
          continue;
        }

        const { concept } = await response.json();

        // Calculate position with dealing-cards offset
        const position =
          positionIndex === 0
            ? { x: 100, y: 100 }
            : { x: 100 + positionIndex * 30, y: 100 + positionIndex * 30 };

        positionIndex++;

        addConceptCard({
          position,
          conceptName: concept.conceptName || 'New Concept',
          ideaSource: slot.title || `Sketch ${slot.slotId}`,
          sketchSlotId: slot.slotId,
          sketchImageUrl: slot.imageUrl,
          elevatorPitch: concept.elevatorPitch || '',
          usp: concept.usp || '',
          swot: concept.swot || {
            strengths: ['', '', ''],
            weaknesses: ['', '', ''],
            opportunities: ['', '', ''],
            threats: ['', '', ''],
          },
          feasibility: concept.feasibility || {
            technical: { score: 3, rationale: '' },
            business: { score: 3, rationale: '' },
            userDesirability: { score: 3, rationale: '' },
          },
          billboardHero: concept.billboardHero,
        });
      } catch (error) {
        console.error(`Failed to generate concept for ${slotId}:`, error);
      }
    }

    setIsGenerating(false);
  };

  return (
    <div className="absolute bottom-16 left-1/2 z-20 -translate-x-1/2">
      {isGenerating ? (
        <div className="flex items-center gap-2 rounded-lg border border-muted-foreground/20 bg-background/95 px-4 py-3 text-sm shadow-lg backdrop-blur-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generating concepts...</span>
        </div>
      ) : (
        <Button
          onClick={handleGenerate}
          variant="default"
          size="lg"
          className="shadow-lg"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Concept Cards ({selectedSketchSlotIds.length})
        </Button>
      )}
    </div>
  );
}
