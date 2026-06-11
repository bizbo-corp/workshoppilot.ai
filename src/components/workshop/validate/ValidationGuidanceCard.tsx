'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { Surface } from '@/components/ui/surface';
import { OUTPUT_TYPE_LABELS } from '@/lib/validation/artifact-lookup';
import type { OutputType, OutputTypeClassification } from '@/lib/schemas';
import { getValidationGuidance, isDigitalOutputType } from '@/lib/validation/output-type-guidance';

/**
 * Output-type-tailored validation guidance shown on the assembled plan: what to produce/test
 * in the workshop vs. afterwards, the qualitative angle, a worked example, and (when generated)
 * a one-line example tailored to this workshop's solution. Renders nothing for output types with
 * no tailored guidance. Shares its source with the Build Pack markdown via getValidationGuidance,
 * so the two surfaces never drift.
 *
 * Phase 65 additions:
 *  - Digital types (app_digital / experience_design) get active Journey Flow + gated prototype links.
 *  - Non-digital types surface the offPlatform paragraph (no digital links ever appear).
 *  - Low-confidence LLM classification shows a disclosure banner.
 *  - Combined output types (outputTypes.length === 2) show a primary-type note.
 *  - onReclassify opens the Detect section for manual override.
 */
export function ValidationGuidanceCard({
  outputType,
  tailoredExample,
  tailoring = false,
  flat = false,
  outputTypes,
  journeyFlowApproved = false,
  classification,
  sessionId,
  onReclassify,
}: {
  outputType: OutputType;
  /** One-line LLM-tailored "for your solution" example, once generated. */
  tailoredExample?: string;
  /** True while the tailored example is being generated. */
  tailoring?: boolean;
  /** Render without the card chrome — for hosts that already provide a card (Build Pack). */
  flat?: boolean;
  /** All selected types (max 2, first = primary). Drives the combined-type note. */
  outputTypes?: OutputType[];
  /** Journey Flow marked complete — enables the prototype-builder link. */
  journeyFlowApproved?: boolean;
  /** Classification record — drives the low-confidence disclosure. */
  classification?: OutputTypeClassification | null;
  /** When provided, digital in-workshop items render as links. Omitted in Build Pack deliverable → plain text. */
  sessionId?: string;
  /** Reopens the output-type section (DetectOutputTypeCard) for manual reclassification. */
  onReclassify?: () => void;
}) {
  const guidance = getValidationGuidance(outputType);
  if (!guidance) return null;

  const digital = isDigitalOutputType(outputType);

  // Show low-confidence banner only for LLM source with confidence < 0.6.
  // A user override is an implicit confirmation — never show the banner for source='user_override'.
  const showLowConfidence =
    !!classification &&
    classification.source === 'llm' &&
    classification.confidence < 0.6;

  // Combined-type note: when the user tagged two types.
  const showCombinedNote = !!outputTypes && outputTypes.length === 2;

  // Build the in-workshop items, optionally enriched with action links for digital types.
  // Coupling note: digital guidance always has exactly two inWorkshop items:
  //   [0] "Sketch the journey map…" → Journey Flow link
  //   [1] "Build a low-fidelity prototype…" → prototype link (gated on journeyFlowApproved)
  const inWorkshopItems: Array<string | { text: string; action?: React.ReactNode }> =
    digital && sessionId
      ? guidance.inWorkshop.map((text, i) => {
          if (i === 0) {
            return {
              text,
              action: (
                <Link
                  href={`/workshop/${sessionId}/outputs/journey-flow`}
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Open Journey Flow →
                </Link>
              ),
            };
          }
          if (i === 1) {
            if (journeyFlowApproved) {
              return {
                text,
                action: (
                  // Phase 66 route; update href if Phase 66 lands elsewhere
                  <Link
                    href={`/workshop/${sessionId}/outputs/prototype-prompt`}
                    className="text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    Build your prototype →
                  </Link>
                ),
              };
            }
            return {
              text,
              action: (
                <span
                  aria-disabled="true"
                  className="cursor-not-allowed text-foreground/50"
                >
                  Build your prototype
                  <span className="ml-2 text-xs italic text-foreground/60">
                    Complete your Journey Flow first
                  </span>
                </span>
              ),
            };
          }
          return text;
        })
      : guidance.inWorkshop;

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-base font-semibold">Recommended validation approach</h4>
        {onReclassify && (
          <button
            type="button"
            onClick={onReclassify}
            className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-foreground/70 hover:bg-muted"
          >
            Change output type
          </button>
        )}
      </div>

      {/* Low-confidence disclosure — LLM source only; user override is an explicit choice */}
      {showLowConfidence && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-sm">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-foreground/50" />
          <span>
            <span className="font-semibold text-foreground">Best guess: </span>
            we detected{' '}
            <span className="font-medium">{OUTPUT_TYPE_LABELS[outputType]}</span> with low
            confidence. If that&apos;s wrong, the guidance below will be too —{' '}
            {onReclassify ? (
              <button
                type="button"
                onClick={onReclassify}
                className="underline underline-offset-2 hover:text-foreground"
              >
                change it
              </button>
            ) : (
              'change it'
            )}
            .
          </span>
        </div>
      )}

      {/* Combined-type note */}
      {showCombinedNote && (
        <p className="mt-2 text-sm text-foreground/60">
          Guidance follows your primary type ({OUTPUT_TYPE_LABELS[outputTypes![0]]}); you also
          tagged {OUTPUT_TYPE_LABELS[outputTypes![1]]}.
        </p>
      )}

      <p className="mt-1 text-base text-foreground/70">{guidance.approach}.</p>

      <ol className="mt-5">
        <GuidancePhase
          icon="presentation"
          label="In the workshop"
          hint="now"
          items={inWorkshopItems}
        />
        <GuidancePhase
          icon="rocket"
          label="After the workshop"
          hint="later"
          items={guidance.postWorkshop}
          isLast
        />
      </ol>

      {/* Off-platform note for non-digital types (no digital-path links appear here) */}
      {guidance.offPlatform && (
        <p className="mt-4 text-base text-foreground/80">
          <span className="font-semibold text-foreground">Doing this outside WorkshopPilot: </span>
          {guidance.offPlatform}
        </p>
      )}

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
        after-the-workshop actions continue later and won&apos;t reopen it.
      </p>
    </>
  );

  if (flat) return <div className="border-t border-border/60 pt-5">{content}</div>;
  return <Surface className="p-5">{content}</Surface>;
}

/**
 * One phase of the in-workshop → after-workshop sequence: a marker on a vertical
 * rail (the phases are sequential, not parallel), eyebrow label + bulleted actions.
 *
 * Items can be plain strings OR rich objects with an optional `action` node rendered
 * on its own line under the bullet text. When sessionId is absent or the type is
 * non-digital, items stay plain strings — output is identical to the original.
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
  items: Array<string | { text: string; action?: React.ReactNode }>;
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
        {items.map((item, i) => {
          const text = typeof item === 'string' ? item : item.text;
          const action = typeof item === 'string' ? undefined : item.action;
          return (
            <li key={i} className="flex items-start gap-2 text-[15px] leading-snug text-foreground/90">
              <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
              <span>
                {text}
                {action && <span className="mt-1 block text-sm">{action}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </li>
  );
}
