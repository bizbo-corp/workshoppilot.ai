'use client';

import { Icon } from '@/components/ui/icon';
import { Surface } from '@/components/ui/surface';
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
  flat = false,
}: {
  outputType: OutputType;
  /** One-line LLM-tailored "for your solution" example, once generated. */
  tailoredExample?: string;
  /** True while the tailored example is being generated. */
  tailoring?: boolean;
  /** Render without the card chrome — for hosts that already provide a card (Build Pack). */
  flat?: boolean;
}) {
  const guidance = getValidationGuidance(outputType);
  if (!guidance) return null;

  const content = (
    <>
      <h4 className="text-base font-semibold">Recommended validation approach</h4>
      <p className="mt-1 text-base text-foreground/70">{guidance.approach}.</p>

      <ol className="mt-5">
        <GuidancePhase icon="presentation" label="In the workshop" hint="now" items={guidance.inWorkshop} />
        <GuidancePhase icon="rocket" label="After the workshop" hint="later" items={guidance.postWorkshop} isLast />
      </ol>

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
    </>
  );

  if (flat) return <div className="border-t border-border/60 pt-5">{content}</div>;
  return <Surface className="p-5">{content}</Surface>;
}

/**
 * One phase of the in-workshop → after-workshop sequence: a marker on a vertical
 * rail (the phases are sequential, not parallel), eyebrow label + bulleted actions.
 */
function GuidancePhase({
  icon,
  label,
  hint,
  items,
  isLast = false,
}: {
  icon: 'presentation' | 'rocket';
  label: string;
  /** Tiny temporal qualifier next to the label — "now" / "later". */
  hint: string;
  items: string[];
  isLast?: boolean;
}) {
  return (
    <li className={`relative pl-10 ${isLast ? '' : 'pb-6'}`}>
      {!isLast && (
        <span aria-hidden className="absolute bottom-0 left-[13px] top-8 w-px bg-border/70" />
      )}
      <span className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
        <Icon name={icon} className="h-3.5 w-3.5 text-primary" />
      </span>
      <div className="flex min-h-7 items-baseline gap-2 pt-1.5">
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-foreground/80">
          {label}
        </span>
        <span className="text-xs italic text-foreground/50">{hint}</span>
      </div>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[15px] leading-snug text-foreground/90">
            <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}
