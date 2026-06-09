'use client';

import { Presentation, Rocket } from 'lucide-react';
import type { OutputType } from '@/lib/schemas';
import { getValidationGuidance } from '@/lib/validation/output-type-guidance';

/**
 * Output-type-tailored validation guidance shown on the assembled plan: what to produce/test
 * in the workshop vs. afterwards, the qualitative angle, a worked example, and (when generated)
 * a one-line example tailored to this workshop's solution. Renders nothing for output types with
 * no tailored guidance. Shares its source with the Build Pack markdown via getValidationGuidance,
 * so the two surfaces never drift.
 */
export function ValidationGuidanceCard({
  outputType,
  tailoredExample,
  tailoring = false,
}: {
  outputType: OutputType;
  /** One-line LLM-tailored "for your solution" example, once generated. */
  tailoredExample?: string;
  /** True while the tailored example is being generated. */
  tailoring?: boolean;
}) {
  const guidance = getValidationGuidance(outputType);
  if (!guidance) return null;

  return (
    <div className="rounded-xl border bg-card p-5">
      <h4 className="text-base font-semibold">Recommended validation approach</h4>
      <p className="mt-1 text-base text-foreground/70">{guidance.approach}.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground/80">
            <Presentation className="h-4 w-4 text-primary/70" />
            In the workshop
          </div>
          <ul className="mt-2 space-y-1.5">
            {guidance.inWorkshop.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-base">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground/80">
            <Rocket className="h-4 w-4 text-primary/70" />
            After the workshop
          </div>
          <ul className="mt-2 space-y-1.5">
            {guidance.postWorkshop.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-base">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {guidance.qualNote && (
        <p className="mt-4 text-base text-foreground/80">
          <span className="font-semibold text-foreground">Measuring it: </span>
          {guidance.qualNote}
        </p>
      )}

      {guidance.example && (
        <p className="mt-3 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-foreground/80">
          <span className="font-semibold text-foreground">Worked example: </span>
          {guidance.example}
        </p>
      )}

      {(tailoredExample || tailoring) && (
        <p className="mt-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground/80">
          <span className="font-semibold text-foreground">For your solution: </span>
          {tailoredExample ?? <span className="italic text-foreground/60">tailoring to your workshop…</span>}
        </p>
      )}

      <p className="mt-4 border-t border-border/60 pt-3 text-sm text-foreground/70">
        Your Validation Plan is done — this step is complete as soon as the plan exists. The
        after-the-workshop actions continue later and won’t reopen it.
      </p>
    </div>
  );
}
