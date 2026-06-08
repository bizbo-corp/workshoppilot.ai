'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Lens } from '@/lib/schemas';
import { LENS_LABELS, LENS_DESCRIPTIONS } from '@/lib/validation/artifact-lookup';
import { SectionCard } from './SectionCard';
import type { SectionStatus } from './sections';

const LENSES: Lens[] = ['desirability', 'feasibility', 'viability'];

export function PickLensCard({
  status,
  value,
  onChange,
  onContinue,
  onEdit,
}: {
  status: SectionStatus;
  value: Lens;
  onChange: (lens: Lens) => void;
  onContinue: () => void;
  onEdit: () => void;
}) {
  return (
    <SectionCard
      index={3}
      title="Which lens are you testing?"
      status={status}
      onEdit={onEdit}
      summary={<span className="font-medium text-foreground">{LENS_LABELS[value]}</span>}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          {LENSES.map((lens) => {
            const selected = value === lens;
            const isDefault = lens === 'desirability';
            return (
              <button
                key={lens}
                type="button"
                onClick={() => onChange(lens)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                  selected
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                    : 'border-border hover:bg-accent'
                )}
                aria-pressed={selected}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    selected ? 'border-primary' : 'border-muted-foreground/40'
                  )}
                >
                  {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
                <span>
                  <span className="text-base font-medium">
                    {LENS_LABELS[lens]}
                    {isDefault && (
                      <span className="ml-2 text-sm font-normal text-primary">
                        recommended first
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-sm text-foreground/70">
                    {LENS_DESCRIPTIONS[lens]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-foreground/70">
          Start with Desirability. You can run a Feasibility or Viability round later.
        </p>
        <Button onClick={onContinue} size="sm">
          Continue
        </Button>
      </div>
    </SectionCard>
  );
}
