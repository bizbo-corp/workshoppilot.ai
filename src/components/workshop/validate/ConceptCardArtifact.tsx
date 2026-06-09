'use client';

import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import type { ValidationPlan } from '@/lib/schemas';

export interface ConceptCardContext {
  problem: string;
  elevatorPitch: string;
  usp: string;
}

/**
 * A one-page, printable concept card to put in front of stakeholders — the artifact for
 * process_change re-interviews. Generated from workshop data + the validation plan.
 */
export function ConceptCardArtifact({
  plan,
  context,
}: {
  plan: ValidationPlan;
  context: ConceptCardContext;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-base font-semibold">Concept card</h4>
        <Button
          variant="outline"
          size="xs"
          className="gap-1.5 print:hidden"
          onClick={() => window.print()}
        >
          <Icon name="printer" className="h-3.5 w-3.5" />
          Print
        </Button>
      </div>

      <div className="concept-card space-y-4 rounded-lg border border-border bg-background p-5">
        <header>
          <p className="text-sm uppercase tracking-wide text-foreground/70">Concept</p>
          <h3 className="text-xl font-bold">{plan.conceptName}</h3>
          {context.elevatorPitch && (
            <p className="mt-1 text-base text-foreground/70">{context.elevatorPitch}</p>
          )}
        </header>

        {context.problem && (
          <Field label="Problem it addresses">{context.problem}</Field>
        )}
        {context.usp && <Field label="What changes for you">{context.usp}</Field>}

        <Field label="The one assumption we're testing">
          <span className="italic">“{plan.assumption}”</span>
        </Field>

        <Field label="Reaction prompts for the interview">
          <ul className="ml-4 list-disc space-y-1">
            <li>Would you adopt this as-is? Why or why not?</li>
            <li>What would stop you from using it?</li>
            <li>What would have to be true for this to work for you?</li>
          </ul>
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
        {label}
      </p>
      <div className="mt-0.5 text-base text-foreground">{children}</div>
    </div>
  );
}
