'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { optionTileVariants } from '@/components/ui/option-tile';
import { Icon } from '@/components/ui/icon';
import type { Lens, OutputType } from '@/lib/schemas';
import { getArtifacts, getTestIcon, type ArtifactOption } from '@/lib/validation/artifact-lookup';
import { getWorkshopColor } from '@/lib/workshop/workshop-appearance';
import { SectionCard } from './SectionCard';
import type { SectionStatus } from './sections';

// Same orange "test" hue used for the Test chip in the plan summary, kept in sync.
const TEST_HEX = getWorkshopColor('orange').hex;

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
                className={cn(optionTileVariants({ selected: isSelected }), 'block w-full p-3')}
                aria-pressed={isSelected}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `color-mix(in srgb, ${TEST_HEX} 28%, transparent)` }}
                  >
                    <Icon
                      name={getTestIcon(option.key)}
                      className="h-5 w-5"
                      style={{
                        color: `color-mix(in srgb, ${TEST_HEX} 62%, ${isSelected ? 'var(--primary-foreground)' : 'var(--foreground)'})`,
                      }}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-medium">
                        {option.label}
                        {i === 0 && (
                          <span
                            className={cn(
                              'ml-2 text-sm font-normal',
                              isSelected ? 'text-primary-foreground/80' : 'text-primary'
                            )}
                          >
                            recommended
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium',
                          isSelected
                            ? 'bg-primary-foreground/20 text-primary-foreground/90'
                            : 'bg-muted text-foreground/70'
                        )}
                      >
                        {option.costHint}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'mt-1 text-sm',
                        isSelected ? 'text-primary-foreground/80' : 'text-foreground/70'
                      )}
                    >
                      {option.description}
                    </p>
                  </div>
                </div>
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
