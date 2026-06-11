'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Heading, Text } from '@/components/ui/typography';
import type { TestScope } from '@/lib/journey-flow/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScopeChooserConcept {
  name: string;
  elevatorPitch?: string;
}

export interface ScopeChooserProps {
  concepts: ScopeChooserConcept[];
  isGenerating: boolean;
  onGenerate: (scope: TestScope, selectedConceptName?: string) => void;
  onStartFromScratch: () => void;
}

// ---------------------------------------------------------------------------
// Scope option card
// ---------------------------------------------------------------------------

interface ScopeOptionCardProps {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  hint?: string;
}

function ScopeOptionCard({
  selected,
  disabled,
  onClick,
  icon,
  title,
  description,
  hint,
}: ScopeOptionCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-4 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'ring-2 ring-selection bg-primary/5 border-transparent'
          : 'border-border bg-card hover:bg-accent/50',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-card'
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary flex-shrink-0">
          {icon}
        </span>
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <Text variant="muted" className="text-xs leading-relaxed">
        {description}
      </Text>
      {hint && (
        <Text variant="small" className="text-[10px] leading-snug">
          {hint}
        </Text>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ScopeChooser — entry-state scope choice UI
// ---------------------------------------------------------------------------

export function ScopeChooser({
  concepts,
  isGenerating,
  onGenerate,
  onStartFromScratch,
}: ScopeChooserProps) {
  const [scope, setScope] = useState<TestScope | null>(null);
  const [selectedConceptName, setSelectedConceptName] = useState<string | null>(null);

  const hasNoConcepts = concepts.length === 0;

  // CTA is disabled when: no scope selected, or feature mode without a concept picked
  const isCtaDisabled =
    isGenerating ||
    scope === null ||
    (scope === 'feature' && selectedConceptName === null);

  function handleScopeSelect(nextScope: TestScope) {
    setScope(nextScope);
    // Clear concept selection when switching back to journey mode
    if (nextScope === 'journey') {
      setSelectedConceptName(null);
    }
  }

  function handleGenerate() {
    if (!scope) return;
    onGenerate(scope, scope === 'feature' ? selectedConceptName ?? undefined : undefined);
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-4 py-12">
      <div className="w-full max-w-2xl flex flex-col items-center gap-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <Icon name="workflow" className="h-6 w-6 text-primary" />
          </div>
          <Heading level={2} className="text-center">
            How do you want to test your idea?
          </Heading>
          <Text variant="muted" className="text-center max-w-md">
            The AI will generate a starting flow you can rearrange and edit. Choose what you want to validate.
          </Text>
        </div>

        {/* Scope option cards */}
        <div
          role="radiogroup"
          aria-label="Test scope"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full"
        >
          <ScopeOptionCard
            selected={scope === 'journey'}
            onClick={() => handleScopeSelect('journey')}
            icon={<Icon name="map" className="h-4 w-4" />}
            title="Test the whole journey"
            description="Map the end-to-end flow a user takes through your product."
          />
          <ScopeOptionCard
            selected={scope === 'feature'}
            disabled={hasNoConcepts}
            onClick={() => !hasNoConcepts && handleScopeSelect('feature')}
            icon={<Icon name="target" className="h-4 w-4" />}
            title="Test a single feature"
            description="Test one concept with a short entry → action → result flow."
            hint={
              hasNoConcepts
                ? 'Complete Step 9 (Concept) to test a single feature.'
                : undefined
            }
          />
        </div>

        {/* Concept picker — revealed only in single-feature mode */}
        {scope === 'feature' && !hasNoConcepts && (
          <div
            role="radiogroup"
            aria-label="Select a concept"
            className="w-full flex flex-col gap-1.5"
          >
            <Text variant="small" className="font-medium text-foreground mb-0.5">
              Which concept do you want to test?
            </Text>
            {concepts.map((concept) => {
              const isSelected = selectedConceptName === concept.name;
              return (
                <button
                  key={concept.name}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedConceptName(concept.name)}
                  className={cn(
                    'flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected
                      ? 'ring-2 ring-selection bg-primary/5 border-transparent'
                      : 'border-border bg-card hover:bg-accent/50'
                  )}
                >
                  <span className="text-sm font-semibold text-foreground leading-snug">
                    {concept.name}
                  </span>
                  {concept.elevatorPitch && (
                    <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {concept.elevatorPitch}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* CTA row */}
        <div className="flex flex-col items-center gap-3 w-full">
          <Button
            onClick={handleGenerate}
            disabled={isCtaDisabled}
            className="w-full sm:w-auto px-8"
          >
            {isGenerating ? (
              <>
                <Icon name="spinner" className="h-4 w-4 animate-spin" />
                Generating your flow…
              </>
            ) : (
              <>
                <Icon name="sparkles" className="h-4 w-4" />
                Generate baseline flow
              </>
            )}
          </Button>

          {/* Escape hatch */}
          <button
            type="button"
            onClick={onStartFromScratch}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Or start from scratch with a blank canvas
          </button>
        </div>
      </div>
    </div>
  );
}
