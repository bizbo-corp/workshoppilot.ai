'use client';

import type { ValidationPlan, OutputType, ValidationResult } from '@/lib/schemas';
import { OUTPUT_TYPE_LABELS, LENS_LABELS, getTestIcon } from '@/lib/validation/artifact-lookup';
import { Icon, type IconName } from '@/components/ui/icon';
import { getWorkshopColor } from '@/lib/workshop/workshop-appearance';
import { cn } from '@/lib/utils';

/** Output type → a recognisable glyph (phone for an app, megaphone for a campaign, …). */
const OUTPUT_TYPE_ICONS: Record<OutputType, IconName> = {
  app_digital: 'smartphone',
  physical_product: 'package',
  service: 'handshake',
  process_change: 'workflow',
  offering: 'tag',
  experience_design: 'route',
  brand_comms: 'message-circle',
  campaign: 'megaphone',
};

/**
 * Supporting fact — a larger, distinctly-tinted icon chip + name/value, vertically centred.
 * Hue comes from the sanctioned workshop palette and is mixed against `--foreground` so it
 * stays legible in both light and dark themes.
 */
function MetaItem({
  icon,
  label,
  hex,
  children,
}: {
  icon: IconName;
  label: string;
  hex: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `color-mix(in srgb, ${hex} 28%, transparent)` }}
      >
        <Icon
          name={icon}
          className="h-5 w-5"
          style={{ color: `color-mix(in srgb, ${hex} 62%, var(--foreground))` }}
        />
      </span>
      <div className="min-w-0">
        <dt className="text-[0.7rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </dt>
        <dd className="text-sm font-medium leading-snug text-foreground">{children}</dd>
      </div>
    </div>
  );
}

type Tone = 'green' | 'amber' | 'red' | 'idle';

const TONE: Record<Tone, { text: string; bar: string; band: string; icon: string; badge: string }> = {
  green: {
    text: 'text-olive-700 dark:text-olive-300',
    bar: 'bg-olive-600 dark:bg-olive-400',
    band: 'border-olive-600/25 bg-olive-500/[0.08]',
    icon: 'text-olive-600 dark:text-olive-400',
    badge: 'border-olive-600/25 bg-olive-500/10',
  },
  amber: {
    text: 'text-amber-700 dark:text-amber-400',
    bar: 'bg-amber-500',
    band: 'border-amber-500/30 bg-amber-500/[0.08]',
    icon: 'text-amber-600 dark:text-amber-400',
    badge: 'border-amber-500/30 bg-amber-500/10',
  },
  red: {
    text: 'text-destructive',
    bar: 'bg-destructive',
    band: 'border-destructive/30 bg-destructive/[0.07]',
    icon: 'text-destructive',
    badge: 'border-destructive/30 bg-destructive/10',
  },
  idle: {
    text: 'text-muted-foreground',
    bar: 'bg-muted-foreground/30',
    band: 'border-olive-600/15 bg-olive-500/[0.07]',
    icon: 'text-olive-600 dark:text-olive-400',
    badge: 'border-border bg-muted/50',
  },
};

/** Maps a recorded verdict to a red/amber/green signal strength. Idle until the test is run. */
function strengthFor(result: ValidationResult | null | undefined): {
  bars: number;
  tone: Tone;
  label: string;
} {
  switch (result?.verdict) {
    case 'validated':
      return { bars: 3, tone: 'green', label: 'Strong — validated' };
    case 'promising':
      return { bars: 2, tone: 'amber', label: 'Promising' };
    case 'inconclusive':
      return { bars: 2, tone: 'amber', label: 'Mixed — inconclusive' };
    case 'invalidated':
      return { bars: 1, tone: 'red', label: 'Weak — invalidated' };
    default:
      return { bars: 0, tone: 'idle', label: 'Not run yet' };
  }
}

/** Three ascending bars, filled up to `bars` in the tone colour (greyed when idle). */
function StrengthMeter({ bars, tone }: { bars: number; tone: Tone }) {
  return (
    <span className="flex items-end gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            'w-1 rounded-full',
            i === 0 ? 'h-2' : i === 1 ? 'h-2.5' : 'h-3',
            i < bars ? TONE[tone].bar : 'bg-muted-foreground/25'
          )}
        />
      ))}
    </span>
  );
}

/** Color-coded status chip — strength meter + verdict label, shown in every state. */
function StatusBadge({ bars, tone, label }: { bars: number; tone: Tone; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5',
        TONE[tone].badge
      )}
    >
      <StrengthMeter bars={bars} tone={tone} />
      <span className={cn('text-xs font-semibold', TONE[tone].text)}>{label}</span>
    </span>
  );
}

/** Compact, read-only recap of a validation plan — assumption hero, supporting facts, signal verdict. */
export function ValidationPlanSummary({ plan }: { plan: ValidationPlan }) {
  const primaryType = (plan.outputTypes ?? [plan.outputType])[0];
  const outputs = (plan.outputTypes ?? [plan.outputType])
    .map((t) => OUTPUT_TYPE_LABELS[t])
    .join(' + ');

  const sig = plan.signal;
  const isQuantitative = sig && sig.metricType !== 'qualitative';
  const isPercent = sig?.metricType === 'percent';
  const strength = strengthFor(plan.result);
  const tone = TONE[strength.tone];

  // Format the pass bar respecting the metric type — "60%" for percent, "7 of 10" for counts.
  const barText = isPercent ? `${sig.target}%` : `${sig?.target} of ${sig?.sampleSize}`;

  return (
    <div className="space-y-4">
      {/* Assumption — the hero. Eyebrow + oversized italic claim on a branded panel. */}
      <div className="rounded-lg border-l-2 border-olive-600/40 bg-olive-500/[0.07] px-4 py-3">
        <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-olive-700 dark:text-olive-400">
          Assumption
        </p>
        <p className="text-lg font-medium italic leading-snug text-foreground">
          “{plan.assumption}”
        </p>
      </div>

      {/* Supporting facts — larger, distinctly-coloured icons, vertically centred. */}
      <dl className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-3">
        <MetaItem
          icon={OUTPUT_TYPE_ICONS[primaryType]}
          label="Output type"
          hex={getWorkshopColor('blue').hex}
        >
          {outputs}
        </MetaItem>
        <MetaItem icon="aperture" label="Lens" hex={getWorkshopColor('purple').hex}>
          {LENS_LABELS[plan.lens]}
        </MetaItem>
        <MetaItem
          icon={getTestIcon(plan.artifactType)}
          label="Test"
          hex={getWorkshopColor('orange').hex}
        >
          {plan.artifactLabel}
        </MetaItem>
      </dl>

      {/* Signal — the decision rule + how the test landed. */}
      {sig && (
        <div className={cn('rounded-lg border px-4 py-3', tone.band)}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Icon name="target" className={cn('h-4 w-4', tone.icon)} />
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-foreground/70">
                Signal — did it work?
              </span>
            </div>
            <StatusBadge bars={strength.bars} tone={strength.tone} label={strength.label} />
          </div>

          {/* Plain-language explanation of what "pass" means. */}
          {isQuantitative ? (
            <p className="text-sm leading-snug text-foreground">
              Passes if <span className="font-semibold">{sig.metric}</span> reaches{' '}
              <span className="font-semibold">{barText}</span>.
              {sig.killThreshold != null && (
                <span className="text-muted-foreground">
                  {' '}
                  Pivot if it lands at {sig.killThreshold}
                  {isPercent ? '%' : ''} or fewer.
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm leading-snug text-foreground">
              <span className="font-semibold">{sig.metric}</span> — judged qualitatively from
              observed user themes, with no numeric target.
            </p>
          )}

          {/* Actual result, once recorded. */}
          {plan.result?.actual != null && (
            <p className={cn('mt-2 text-sm font-semibold', tone.text)}>
              Result: {plan.result.actual}
              {isPercent ? '%' : ''}
              {plan.result.score != null && (
                <span className="font-normal text-muted-foreground">
                  {' '}
                  ({plan.result.score}% of target)
                </span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
