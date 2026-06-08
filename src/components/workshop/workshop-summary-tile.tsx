'use client';

import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SynthesisSummaryView } from './synthesis-summary-view';

export interface WorkshopSynthesis {
  narrativeIntro?: string;
  narrative?: string;
  stepSummaries?: Array<{ stepNumber: number; stepName: string; keyOutputs: string[] }>;
  confidenceAssessment?: { score: number; researchQuality: 'thin' | 'moderate' | 'strong'; rationale: string };
  recommendedNextSteps?: string[];
}

function scoreColor(score: number): string {
  if (score >= 7) return 'text-olive-700 dark:text-olive-400';
  if (score >= 4) return 'text-amber-700 dark:text-amber-400';
  return 'text-destructive';
}

/**
 * Collapsible workshop-summary tile for the top of the Build Pack page. Collapsed it shows the
 * confidence score and a few lines of the narrative; expanded it reveals the full synthesis
 * (journey summary, confidence gauge, next steps) — deliverables stay in the grid below.
 */
export function WorkshopSummaryTile({
  synthesis,
  workshopId,
}: {
  synthesis: WorkshopSynthesis;
  workshopId?: string;
}) {
  const [expanded, setExpanded] = React.useState(false);

  const narrative = synthesis.narrativeIntro || synthesis.narrative || '';
  const score = synthesis.confidenceAssessment?.score;
  const quality = synthesis.confidenceAssessment?.researchQuality;

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl leading-tight tracking-tight text-foreground">
          Workshop summary
        </h2>
        {score != null && (
          <div className="flex items-center gap-2">
            <span className={cn('text-lg font-bold', scoreColor(score))}>{score}/10</span>
            <span className="text-sm text-foreground/70">confidence</span>
            {quality && (
              <span className="rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-foreground/70">
                {quality} research
              </span>
            )}
          </div>
        )}
      </div>

      {expanded ? (
        <SynthesisSummaryView
          artifact={synthesis as Record<string, unknown>}
          workshopId={workshopId}
          showDeliverables={false}
          workshopCompleted
        />
      ) : (
        narrative && (
          <p className="line-clamp-3 text-base leading-relaxed text-foreground/80">{narrative}</p>
        )
      )}

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <>
            Hide summary <ChevronUp className="h-4 w-4" />
          </>
        ) : (
          <>
            Expand summary <ChevronDown className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
