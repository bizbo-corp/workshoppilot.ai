'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { OutputType, OutputTypeClassification } from '@/lib/schemas';
import {
  OUTPUT_TYPE_LABELS,
  OUTPUT_TYPE_DESCRIPTIONS,
} from '@/lib/validation/artifact-lookup';
import { SectionCard } from './SectionCard';
import type { SectionStatus } from './sections';

const TYPES = Object.keys(OUTPUT_TYPE_LABELS) as OutputType[];

export function DetectOutputTypeCard({
  status,
  classification,
  isClassifying,
  error,
  onRetry,
  onSelectType,
  onContinue,
  onEdit,
}: {
  status: SectionStatus;
  classification: OutputTypeClassification | null;
  isClassifying: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectType: (type: OutputType) => void;
  onContinue: () => void;
  onEdit: () => void;
}) {
  const lowConfidence = !!classification && classification.confidence < 0.6;

  return (
    <SectionCard
      index={1}
      title="What did this workshop produce?"
      status={status}
      onEdit={onEdit}
      summary={
        classification ? (
          <span>
            <span className="font-medium text-foreground">
              {OUTPUT_TYPE_LABELS[classification.type]}
            </span>
            {classification.source === 'user_override' ? ' (you set this)' : ''}
          </span>
        ) : null
      }
    >
      {isClassifying && !classification ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Detecting your output type…
        </div>
      ) : (
        <div className="space-y-4">
          {classification && (
            <p className="text-sm text-muted-foreground">
              {lowConfidence ? 'Best guess — please confirm. ' : ''}
              {classification.rationale}
            </p>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TYPES.map((type) => {
              const selected = classification?.type === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onSelectType(type)}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors',
                    selected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'border-border hover:bg-accent'
                  )}
                  aria-pressed={selected}
                >
                  <div className="text-sm font-medium">{OUTPUT_TYPE_LABELS[type]}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {OUTPUT_TYPE_DESCRIPTIONS[type]}
                  </div>
                </button>
              );
            })}
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={onContinue} disabled={!classification} size="sm">
              Confirm output type
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              disabled={isClassifying}
              className="gap-1.5 text-muted-foreground"
            >
              {isClassifying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Re-detect
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
