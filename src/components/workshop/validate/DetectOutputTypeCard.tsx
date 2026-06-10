'use client';

import { Icon, type IconName } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { optionTileVariants } from '@/components/ui/option-tile';
import type { OutputType, OutputTypeClassification } from '@/lib/schemas';
import {
  OUTPUT_TYPE_LABELS,
  OUTPUT_TYPE_DESCRIPTIONS,
} from '@/lib/validation/artifact-lookup';
import { SectionCard } from './SectionCard';
import type { SectionStatus } from './sections';

const TYPES = Object.keys(OUTPUT_TYPE_LABELS) as OutputType[];
const MAX = 2;

const OUTPUT_TYPE_ICONS: Record<OutputType, IconName> = {
  app_digital: 'smartphone',
  service: 'bell',
  process_change: 'shuffle',
  experience_design: 'workflow',
  offering: 'handshake',
  brand_comms: 'star',
  campaign: 'megaphone',
  physical_product: 'package', // not specified — sensible default
};

export function DetectOutputTypeCard({
  status,
  classification,
  selectedTypes,
  isClassifying,
  error,
  onRetry,
  onToggleType,
  onContinue,
  onEdit,
}: {
  status: SectionStatus;
  classification: OutputTypeClassification | null;
  selectedTypes: OutputType[];
  isClassifying: boolean;
  error: string | null;
  onRetry: () => void;
  onToggleType: (type: OutputType) => void;
  onContinue: () => void;
  onEdit: () => void;
}) {
  const lowConfidence = !!classification && classification.confidence < 0.6;
  const atMax = selectedTypes.length >= MAX;

  return (
    <SectionCard
      index={1}
      title="What did this workshop produce?"
      status={status}
      onEdit={onEdit}
      summary={
        selectedTypes.length > 0 ? (
          <span className="font-medium text-foreground">
            {selectedTypes.map((t) => OUTPUT_TYPE_LABELS[t]).join(' + ')}
          </span>
        ) : null
      }
    >
      {isClassifying && !classification ? (
        <div className="flex items-center gap-2 text-base text-foreground/70">
          <Icon name="spinner" className="h-4 w-4 animate-spin" />
          Detecting your output type…
        </div>
      ) : (
        <div className="space-y-4">
          {classification && (
            <p className="text-base text-foreground/70">
              {lowConfidence ? 'Best guess — please confirm. ' : ''}
              {classification.rationale}
            </p>
          )}
          <p className="text-sm text-foreground/70">
            Pick the primary type. If your concept combines two (e.g. a product with an app),
            add a second — up to {MAX}.
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TYPES.map((type) => {
              const idx = selectedTypes.indexOf(type);
              const selected = idx >= 0;
              const isPrimary = idx === 0;
              const disabled = !selected && atMax;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onToggleType(type)}
                  disabled={disabled}
                  className={cn(optionTileVariants({ selected, disabled }), 'p-3')}
                  aria-pressed={selected}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      name={OUTPUT_TYPE_ICONS[type]}
                      className={cn(
                        'h-7 w-7 shrink-0',
                        selected ? 'text-foreground' : 'text-foreground/70'
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-base font-medium">{OUTPUT_TYPE_LABELS[type]}</span>
                        {selected && (
                          <span className="shrink-0 rounded-full bg-foreground/20 px-1.5 py-0.5 text-[12px] font-semibold text-foreground">
                            {isPrimary ? 'primary' : '2nd'}
                          </span>
                        )}
                      </div>
                      <div
                        className={cn(
                          'mt-0.5 text-sm',
                          selected ? 'text-foreground/80' : 'text-foreground/70'
                        )}
                      >
                        {OUTPUT_TYPE_DESCRIPTIONS[type]}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center gap-3">
            <Button onClick={onContinue} disabled={selectedTypes.length === 0} size="sm">
              Confirm output type
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              disabled={isClassifying}
              className="gap-1.5 text-foreground/70"
            >
              {isClassifying ? (
                <Icon name="spinner" className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icon name="refresh" className="h-3.5 w-3.5" />
              )}
              Re-detect
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
