'use client';

import * as React from 'react';
import { Loader2, Sparkles, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { Lens, OutputType, Signal } from '@/lib/schemas';
import {
  getMetricOptions,
  PROXY_STRENGTH_LABELS,
  type MetricOption,
  type ProxyStrength,
} from '@/lib/validation/metric-library';
import { assessTestHealth, HEALTH_LABELS, type HealthLevel } from '@/lib/validation/test-health';
import { SectionCard } from './SectionCard';
import type { SectionStatus } from './sections';

interface SignalCandidate {
  signal: Signal;
  why: string;
  proxyStrength: ProxyStrength;
}

const STRENGTH_CLASS: Record<ProxyStrength, string> = {
  weak: 'text-foreground/70',
  medium: 'text-amber-600 dark:text-amber-400',
  strong: 'text-green-600 dark:text-green-400',
};

const HEALTH_CLASS: Record<HealthLevel, string> = {
  weak: 'text-destructive',
  okay: 'text-amber-600 dark:text-amber-400',
  strong: 'text-green-600 dark:text-green-400',
};
const HEALTH_BG: Record<HealthLevel, string> = {
  weak: 'bg-destructive',
  okay: 'bg-amber-500',
  strong: 'bg-green-500',
};
const HEALTH_DOTS: Record<HealthLevel, number> = { weak: 1, okay: 2, strong: 3 };

type MetricMode = 'quantitative' | 'qualitative' | 'both';
const METRIC_MODES: { key: MetricMode; label: string; hint: string }[] = [
  { key: 'quantitative', label: 'Quantitative', hint: 'A number (how many / what %)' },
  { key: 'qualitative', label: 'Qualitative', hint: 'Themes you judge — no number' },
  { key: 'both', label: 'Both', hint: 'A number plus what people said' },
];

function toNum(s: string): number | null {
  if (s.trim() === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Pivot line as the logical complement of the pass bar, kept strictly below it. */
function complementKill(percent: boolean, target: number | null, sample: number | null): string {
  if (target == null) return '';
  if (percent) return clamp(Math.min(100 - target, target - 1), 0, 100).toString();
  if (sample == null) return '';
  return clamp(Math.min(sample - target, target - 1), 0, sample).toString();
}

function deriveSuccess(o: { percent: boolean; target: string; sample: string; metric: string }): string {
  const m = o.metric.trim() || 'people do this';
  if (!o.target) return '';
  if (o.percent) return `At least ${o.target}% — ${m}`;
  if (!o.sample) return `At least ${o.target} — ${m}`;
  return `At least ${o.target} of ${o.sample} — ${m}`;
}

function deriveFail(o: { percent: boolean; target: string; kill: string; metric: string }): string {
  const m = o.metric.trim() || 'people do this';
  if (o.kill) return o.percent ? `${o.kill}% or fewer — ${m}` : `${o.kill} or fewer — ${m}`;
  if (!o.target) return '';
  return o.percent ? `Well below ${o.target}% — ${m}` : `Far short of ${o.target} — ${m}`;
}

export interface SuggestContext {
  workshopId: string;
  assumption: string;
  outputType: OutputType;
  lens: Lens;
  artifactLabel: string;
}

export function DefineSignalCard({
  status,
  initial,
  defaultMetric,
  suggestContext,
  onContinue,
  onEdit,
}: {
  status: SectionStatus;
  initial: Signal | null;
  defaultMetric?: string;
  suggestContext: SuggestContext;
  onContinue: (signal: Signal) => void;
  onEdit: () => void;
}) {
  const [metric, setMetric] = React.useState(initial?.metric ?? defaultMetric ?? '');
  // Quantitative (a number) / Qualitative (themes + judged verdict) / Both (a number + observations).
  const [mode, setMode] = React.useState<MetricMode>(() =>
    initial?.metricType === 'qualitative'
      ? 'qualitative'
      : initial?.allowQualitative
        ? 'both'
        : 'quantitative'
  );
  // Default to percentage for new signals; respect a saved signal's mode.
  const [percent, setPercent] = React.useState(initial ? initial.metricType === 'percent' : true);
  const [target, setTarget] = React.useState(initial?.target?.toString() ?? '');
  const [sampleSize, setSampleSize] = React.useState(initial?.sampleSize?.toString() ?? '');
  const [killThreshold, setKillThreshold] = React.useState(
    initial?.killThreshold != null ? initial.killThreshold.toString() : ''
  );
  const [successText, setSuccessText] = React.useState(initial?.successCriteriaText ?? '');
  const [failText, setFailText] = React.useState(initial?.failCriteriaText ?? '');
  const [chosenStrength, setChosenStrength] = React.useState<ProxyStrength | null>(null);

  const successDirty = React.useRef(!!initial?.successCriteriaText);
  const failDirty = React.useRef(!!initial?.failCriteriaText);
  // Pivot auto-tracks the complement of the pass bar until the user edits it.
  const killDirty = React.useRef(initial?.killThreshold != null);

  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const [suggestError, setSuggestError] = React.useState<string | null>(null);
  const [candidates, setCandidates] = React.useState<SignalCandidate[] | null>(null);

  const metricOptions = getMetricOptions(suggestContext.outputType);
  const behaviourOptions = metricOptions.filter((o) => o.category === 'behaviour');
  const attitudeOptions = metricOptions.filter((o) => o.category === 'attitude');

  const targetNum = toNum(target);
  const sampleNum = toNum(sampleSize);

  // Keep the pivot line in sync with the pass bar (complement) until edited.
  React.useEffect(() => {
    if (!killDirty.current) {
      setKillThreshold(complementKill(percent, targetNum, sampleNum));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percent, target, sampleSize]);

  // Keep the plain-language criteria in sync with the numbers until edited.
  React.useEffect(() => {
    if (!successDirty.current) {
      setSuccessText(deriveSuccess({ percent, target, sample: sampleSize, metric }));
    }
    if (!failDirty.current) {
      setFailText(deriveFail({ percent, target, kill: killThreshold, metric }));
    }
  }, [percent, target, sampleSize, killThreshold, metric]);

  const isQualitative = mode === 'qualitative';
  const valid = isQualitative
    ? metric.trim() !== '' && sampleNum != null && sampleNum >= 1
    : metric.trim() !== '' && targetNum != null && sampleNum != null && sampleNum >= 1;

  // Test health is a numeric-bar assessment — only meaningful when there IS a numeric bar.
  const health = isQualitative
    ? null
    : assessTestHealth({
        metricType: percent ? 'percent' : 'count',
        sampleSize: sampleNum,
        target: targetNum,
        killThreshold: toNum(killThreshold),
        proxyStrength: chosenStrength,
      });

  const setMetricText = (text: string) => {
    setMetric(text);
    const match = metricOptions.find((o) => o.label === text);
    setChosenStrength(match?.proxyStrength ?? null);
  };

  const applyMetricPick = (option: MetricOption) => {
    setMetric(option.label);
    setChosenStrength(option.proxyStrength);
    setSampleSize(option.sampleSize.toString());
    // Keep the user's Count/% choice; convert the option's default bar into it.
    const optIsPercent = option.metricType === 'percent';
    let nextTarget = option.target;
    if (percent && !optIsPercent) {
      nextTarget = clamp(Math.round((option.target / option.sampleSize) * 100), 0, 100);
    } else if (!percent && optIsPercent) {
      nextTarget = clamp(Math.round((option.target / 100) * option.sampleSize), 0, option.sampleSize);
    }
    setTarget(nextTarget.toString());
    killDirty.current = false;
    successDirty.current = false;
    failDirty.current = false;
  };

  const applySuggestion = (c: SignalCandidate) => {
    const s = c.signal;
    setMetric(s.metric);
    setChosenStrength(c.proxyStrength);
    setPercent(s.metricType === 'percent');
    setTarget(s.target != null ? s.target.toString() : '');
    setSampleSize(s.sampleSize.toString());
    if (s.killThreshold != null) {
      killDirty.current = true;
      setKillThreshold(s.killThreshold.toString());
    } else {
      killDirty.current = false;
    }
    if (s.successCriteriaText) {
      successDirty.current = true;
      setSuccessText(s.successCriteriaText);
    }
    if (s.failCriteriaText) {
      failDirty.current = true;
      setFailText(s.failCriteriaText);
    }
    setCandidates(null);
  };

  // Toggle count <-> percent, converting the existing numbers so they stay coherent.
  const toggleMode = (toPercent: boolean) => {
    if (toPercent === percent) return;
    if (sampleNum && sampleNum > 0 && targetNum != null) {
      const converted = toPercent
        ? clamp(Math.round((targetNum / sampleNum) * 100), 0, 100)
        : clamp(Math.round((targetNum / 100) * sampleNum), 0, sampleNum);
      setTarget(converted.toString());
    }
    setPercent(toPercent);
    // complement effect recomputes the pivot for the new mode (unless user-edited)
  };

  const submit = () => {
    if (!valid || sampleNum == null) return;
    if (isQualitative) {
      onContinue({
        metric: metric.trim(),
        metricType: 'qualitative',
        sampleSize: Math.round(sampleNum),
        killThreshold: null,
        ...(successText.trim() ? { successCriteriaText: successText.trim() } : {}),
        ...(failText.trim() ? { failCriteriaText: failText.trim() } : {}),
      });
      return;
    }
    if (targetNum == null) return;
    onContinue({
      metric: metric.trim(),
      metricType: percent ? 'percent' : 'count',
      target: targetNum,
      sampleSize: Math.round(sampleNum),
      killThreshold: toNum(killThreshold),
      ...(successText.trim() ? { successCriteriaText: successText.trim() } : {}),
      ...(failText.trim() ? { failCriteriaText: failText.trim() } : {}),
      // "Both" = numeric bar that also invites qualitative observations at record time.
      ...(mode === 'both' ? { allowQualitative: true } : {}),
    });
  };

  const suggest = async () => {
    setIsSuggesting(true);
    setSuggestError(null);
    try {
      const r = await fetch('/api/validation/suggest-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId: suggestContext.workshopId,
          assumption: suggestContext.assumption,
          outputType: suggestContext.outputType,
          lens: suggestContext.lens,
          artifactLabel: suggestContext.artifactLabel,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Could not suggest a signal');
      setCandidates((data.candidates ?? []) as SignalCandidate[]);
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : 'Could not suggest a signal');
    } finally {
      setIsSuggesting(false);
    }
  };

  const summary = initial ? (
    initial.metricType === 'qualitative' ? (
      <span>
        {initial.metric}: <span className="font-medium text-foreground">judged qualitatively</span>
        {initial.sampleSize ? ` with ${initial.sampleSize} people` : ''}
      </span>
    ) : (
      <span>
        {initial.metric}: success at{' '}
        <span className="font-medium text-foreground">
          {initial.target}
          {initial.metricType === 'percent' ? '%' : ` of ${initial.sampleSize}`}
        </span>
        {initial.killThreshold != null ? `, pivot at ≤${initial.killThreshold}` : ''}
        {initial.allowQualitative ? ' · + observations' : ''}
      </span>
    )
  ) : null;

  return (
    <SectionCard
      index={5}
      title="Decide what success looks like"
      status={status}
      onEdit={onEdit}
      summary={summary}
    >
      <div className="space-y-6">
        {/* Metric mode — a number, judged themes, or both. */}
        <div className="space-y-1.5">
          <span className="text-sm font-medium">How will you judge the result?</span>
          <div className="grid grid-cols-3 gap-1.5">
            {METRIC_MODES.map((m) => {
              const active = mode === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMode(m.key)}
                  className={cn(
                    'rounded-lg border px-2.5 py-2 text-left transition-colors',
                    active ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'
                  )}
                >
                  <span className={cn('block text-sm font-semibold', active && 'text-primary')}>
                    {m.label}
                  </span>
                  <span className="block text-[12px] text-foreground/70">{m.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-start justify-between gap-3">
          <p className="text-base text-foreground/70">
            {isQualitative
              ? 'Decide up front what a good vs. a poor result looks like — that keeps your read honest after you observe.'
              : 'Set your bar before you test — that’s what lets us score the result honestly afterwards.'}
          </p>
          {!isQualitative && (
            <Button
              variant="outline"
              size="xs"
              className="shrink-0 gap-1.5"
              onClick={suggest}
              disabled={isSuggesting}
            >
              {isSuggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Suggest measures
            </Button>
          )}
        </div>

        {suggestContext.assumption && (
          <p className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm text-foreground/70">
            You&apos;re testing:{' '}
            <span className="italic text-foreground">“{suggestContext.assumption}”</span>
            <br />
            Measure what people would <strong>do</strong> or <strong>say</strong> that proves it
            — a stronger measure, like whether people finish or come back, beats a one-off click.
          </p>
        )}

        {suggestError && <p className="text-sm text-destructive">{suggestError}</p>}

        {/* ── A. What are you measuring ── */}
        <section className="space-y-3">
          <GroupHeading marker="A" title="What are you measuring?" />

          {!isQualitative && candidates && candidates.length > 0 && (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="text-sm font-medium">Pick a way to measure it:</p>
              {candidates.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applySuggestion(c)}
                  className="block w-full rounded-md border border-border bg-background p-2.5 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-medium">{c.signal.metric}</span>
                    <span className={cn('shrink-0 text-[12px] font-semibold uppercase tracking-wide', STRENGTH_CLASS[c.proxyStrength])}>
                      {PROXY_STRENGTH_LABELS[c.proxyStrength]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-foreground/70">{c.why}</p>
                  <p className="mt-1 text-[13px] text-foreground/70">
                    Bar: {c.signal.target}
                    {c.signal.metricType === 'percent' ? '%' : ` of ${c.signal.sampleSize}`}
                  </p>
                </button>
              ))}
            </div>
          )}

          {!isQualitative && behaviourOptions.length > 0 && (
            <MetricChipRow title="What they do" options={behaviourOptions} selected={metric} onPick={applyMetricPick} />
          )}
          {!isQualitative && attitudeOptions.length > 0 && (
            <MetricChipRow title="What they say" options={attitudeOptions} selected={metric} onPick={applyMetricPick} />
          )}

          {/* Traffic-light legend — the dots rate the measure you choose above */}
          {!isQualitative && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-foreground/70">
              <span>The dot shows how strongly each measure proves your assumption:</span>
              <Legend strength="strong" />
              <Legend strength="medium" />
              <Legend strength="weak" />
            </div>
          )}

          <Input
            value={metric}
            onChange={(e) => setMetricText(e.target.value)}
            placeholder={
              isQualitative
                ? 'e.g. how the message lands with the audience'
                : defaultMetric || "e.g. stakeholders who'd adopt it as-is"
            }
          />
        </section>

        {/* ── B. Set your bar (numeric) — or just who you'll observe (qualitative) ── */}
        <section className="space-y-3">
          <GroupHeading marker="B" title={isQualitative ? 'Who will you observe?' : 'Set your bar'} />

          {isQualitative ? (
            <div className="space-y-2.5 rounded-lg border border-border bg-muted/30 p-4 text-base">
              <div className="flex flex-wrap items-center gap-1.5">
                <span>We&apos;ll observe / talk to</span>
                <Input
                  type="number"
                  value={sampleSize}
                  onChange={(e) => setSampleSize(e.target.value)}
                  className="h-7 w-16 text-center"
                  placeholder="6"
                />
                <span>people.</span>
              </div>
              <p className="pt-1 text-sm text-foreground/70">
                No numeric bar — you&apos;ll judge the result from what you observe and pick the
                verdict yourself when you record it.
              </p>
            </div>
          ) : (
          <>
          <div className="space-y-2.5 rounded-lg border border-border bg-muted/30 p-4 text-base">
            <div className="-mt-1 mb-1 flex items-center justify-end gap-2 text-sm">
              <span className={cn(!percent ? 'font-medium text-foreground' : 'text-foreground/70')}>
                Count
              </span>
              <Switch checked={percent} onCheckedChange={toggleMode} aria-label="Measure as a percentage" />
              <span className={cn(percent ? 'font-medium text-foreground' : 'text-foreground/70')}>
                %
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span>We&apos;ll test with</span>
              <Input type="number" value={sampleSize} onChange={(e) => setSampleSize(e.target.value)} className="h-7 w-16 text-center" placeholder="10" />
              <span>people.</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-green-600 dark:text-green-400">✅</span>
              <span>I&apos;m</span>
              <span className="font-semibold">right</span>
              <span>if at least</span>
              <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} className="h-7 w-16 text-center" placeholder={percent ? '60' : '7'} />
              <span>{percent ? '% of them.' : 'of them.'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span>🛑</span>
              <span>I should</span>
              <span className="font-semibold">pivot</span>
              <span>if</span>
              <Input
                type="number"
                value={killThreshold}
                onChange={(e) => {
                  killDirty.current = true;
                  setKillThreshold(e.target.value);
                }}
                className="h-7 w-16 text-center"
                placeholder={percent ? '25' : '3'}
              />
              <span>{percent ? '% or fewer do.' : 'or fewer do.'}</span>
              {!killDirty.current && <span className="text-[13px] text-foreground/70">(auto)</span>}
            </div>
            <p className="pt-1 text-sm text-foreground/70">
              The pivot line auto-fills as the opposite of your pass bar, but it can be anything
              below it — set it where &quot;this idea isn&apos;t worth pursuing&quot; honestly sits.
            </p>
          </div>

          {/* Test health */}
          {health && <TestHealthMeter health={health} />}
          </>
          )}
        </section>

        {/* ── C. Spell it out ── */}
        <section className="space-y-3">
          <GroupHeading
            marker="C"
            title="Spell it out"
            subtitle={isQualitative ? 'What a good vs. poor result looks like' : 'Auto-written from your bar — edit anytime'}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">What would prove you right?</label>
              <Textarea
                value={successText}
                onChange={(e) => {
                  successDirty.current = true;
                  setSuccessText(e.target.value);
                }}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">What would tell you you&apos;re wrong?</label>
              <Textarea
                value={failText}
                onChange={(e) => {
                  failDirty.current = true;
                  setFailText(e.target.value);
                }}
                rows={2}
              />
            </div>
          </div>
        </section>

        {!valid && (
          <p className="text-sm text-foreground/70">
            {isQualitative
              ? 'Add what you’re measuring and how many people you’ll observe.'
              : 'Add what you’re measuring, how many people, and the “I’m right if” number.'}
          </p>
        )}

        <Button onClick={submit} disabled={!valid} size="sm">
          Commit this signal
        </Button>
      </div>
    </SectionCard>
  );
}

function GroupHeading({ marker, title, subtitle }: { marker: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[13px] font-bold text-primary">
        {marker}
      </span>
      <h4 className="text-lg font-semibold tracking-tight">{title}</h4>
      {subtitle && <span className="text-base font-normal text-foreground/70">· {subtitle}</span>}
    </div>
  );
}

function Legend({ strength }: { strength: ProxyStrength }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn('text-[10px]', STRENGTH_CLASS[strength])} aria-hidden>
        ●
      </span>
      {PROXY_STRENGTH_LABELS[strength]}
    </span>
  );
}

function TestHealthMeter({ health }: { health: ReturnType<typeof assessTestHealth> }) {
  const dots = HEALTH_DOTS[health.level];
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Test strength:</span>
        <span className="flex items-center gap-0.5">
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn('h-1.5 w-5 rounded-full', i <= dots ? HEALTH_BG[health.level] : 'bg-muted')}
            />
          ))}
        </span>
        <span className={cn('text-sm font-semibold', HEALTH_CLASS[health.level])}>
          {HEALTH_LABELS[health.level]}
        </span>
      </div>
      {health.notes.length > 0 && (
        <ul className="mt-2 space-y-1">
          {health.notes.map((n, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[13px] text-foreground/70">
              {n.tone === 'good' ? (
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-green-600 dark:text-green-400" />
              ) : (
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
              )}
              <span>{n.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A labelled row of selectable canned-metric chips. */
function MetricChipRow({
  title,
  options,
  selected,
  onPick,
}: {
  title: string;
  options: MetricOption[];
  selected: string;
  onPick: (option: MetricOption) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[13px] font-medium uppercase tracking-wide text-foreground/70">{title}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const isSelected = selected === o.label;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onPick(o)}
              title={PROXY_STRENGTH_LABELS[o.proxyStrength]}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-colors',
                isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'
              )}
            >
              {o.label}
              <span className={cn('text-[10px]', STRENGTH_CLASS[o.proxyStrength])} aria-hidden>
                ●
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
