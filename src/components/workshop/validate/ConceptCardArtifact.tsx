'use client';

import { Printer } from 'lucide-react';
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
        <h4 className="text-sm font-semibold">Concept card</h4>
        <Button
          variant="outline"
          size="xs"
          className="gap-1.5 print:hidden"
          onClick={() => window.print()}
        >
          <Printer className="h-3.5 w-3.5" />
          Print
        </Button>
      </div>

      <div className="concept-card space-y-4 rounded-lg border border-border bg-background p-5">
        <header>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Concept</p>
          <h3 className="text-lg font-bold">{plan.conceptName}</h3>
          {context.elevatorPitch && (
            <p className="mt-1 text-sm text-muted-foreground">{context.elevatorPitch}</p>
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
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  );
}
