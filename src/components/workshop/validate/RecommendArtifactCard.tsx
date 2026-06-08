'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Lens, OutputType } from '@/lib/schemas';
import { getArtifacts, type ArtifactOption } from '@/lib/validation/artifact-lookup';
import { SectionCard } from './SectionCard';
import type { SectionStatus } from './sections';

export function RecommendArtifactCard({
  status,
  outputType,
  lens,
  selectedKey,
  onChange,
  onContinue,
  onEdit,
}: {
  status: SectionStatus;
  outputType: OutputType;
  lens: Lens;
  selectedKey: string;
  onChange: (option: ArtifactOption) => void;
  onContinue: () => void;
  onEdit: () => void;
}) {
  const options = getArtifacts(outputType, lens);
  const selected = options.find((o) => o.key === selectedKey);

  return (
    <SectionCard
      index={4}
      title="Cheapest way to test it"
      status={status}
      onEdit={onEdit}
      summary={selected ? <span className="font-medium text-foreground">{selected.label}</span> : null}
    >
      <div className="space-y-4">
        <p className="text-base text-foreground/70">
          The cheapest valid test for this kind of output under this lens.
        </p>
        <div className="space-y-2">
          {options.map((option, i) => {
            const isSelected = option.key === selectedKey;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onChange(option)}
                className={cn(
                  'block w-full rounded-lg border p-3 text-left transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                    : 'border-border hover:bg-accent'
                )}
                aria-pressed={isSelected}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-medium">
                    {option.label}
                    {i === 0 && (
                      <span className="ml-2 text-sm font-normal text-primary">recommended</span>
                    )}
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[12px] font-medium text-foreground/70">
                    {option.costHint}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground/70">{option.description}</p>
              </button>
            );
          })}
        </div>
        <Button onClick={onContinue} disabled={!selected} size="sm">
          Use this test
        </Button>
      </div>
    </SectionCard>
  );
}
