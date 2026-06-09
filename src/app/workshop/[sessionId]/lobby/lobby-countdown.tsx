'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Heading, Text, Eyebrow } from '@/components/ui/typography';

interface LobbyCountdownProps {
  /** ISO string for when the workshop starts. */
  startAtIso: string;
}

/**
 * Big, energetic countdown — the lobby's hero element. Once the start time
 * passes, flips to a celebratory "Ready to start" state to keep the moment alive.
 */
export function LobbyCountdown({ startAtIso }: LobbyCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const startMs = new Date(startAtIso).getTime();
  const diffMs = startMs - now;

  if (diffMs <= 0) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-olive-500/30 bg-gradient-to-br from-olive-50 via-amber-50 to-yellow-50 px-8 py-10 text-center shadow-sm dark:border-olive-400/20 dark:from-olive-950/40 dark:via-amber-950/30 dark:to-yellow-950/30">
        <BackgroundSparkles />
        <div className="relative">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-olive-500 to-olive-700 text-white shadow-lg">
            <Icon name="sparkles" className="h-6 w-6" />
          </div>
          <Eyebrow className="text-olive-700 dark:text-olive-300">
            Ready when you are
          </Eyebrow>
          <Heading level={1} as="h2" className="mt-2 text-4xl sm:text-5xl">
            Let&apos;s do this
          </Heading>
          <Text variant="muted" className="mt-3">
            The facilitator can kick things off any moment now.
          </Text>
        </div>
      </div>
    );
  }

  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86_400);
  const hours = Math.floor((totalSec % 86_400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  // Show three-segment display (D/H/M for far away, H/M/S for closer, M/S for soon).
  const segments: { value: number; label: string }[] =
    days > 0
      ? [
          { value: days, label: days === 1 ? 'day' : 'days' },
          { value: hours, label: 'hrs' },
          { value: minutes, label: 'min' },
        ]
      : hours > 0
      ? [
          { value: hours, label: 'hrs' },
          { value: minutes, label: 'min' },
          { value: seconds, label: 'sec' },
        ]
      : [
          { value: minutes, label: 'min' },
          { value: seconds, label: 'sec' },
        ];

  const isImminent = days === 0 && hours === 0 && minutes < 5;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border px-6 py-10 text-center shadow-sm sm:px-8 ${
        isImminent
          ? 'border-amber-400/50 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:border-amber-500/30 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-rose-950/30'
          : 'border-olive-500/20 bg-gradient-to-br from-olive-50/80 via-amber-50/60 to-yellow-50/80 dark:border-olive-400/10 dark:from-olive-950/30 dark:via-amber-950/20 dark:to-yellow-950/30'
      }`}
    >
      <BackgroundSparkles />
      <div className="relative">
        <p
          className={`text-[11px] font-bold uppercase tracking-[0.22em] ${
            isImminent ? 'text-amber-700 dark:text-amber-300' : 'text-olive-700 dark:text-olive-300'
          }`}
        >
          {isImminent ? '🔥 Almost there' : 'Workshop starts in'}
        </p>

        <div
          className="mt-4 flex items-end justify-center gap-3 sm:gap-5"
          aria-label={`Workshop starts in ${segments.map((s) => `${s.value} ${s.label}`).join(', ')}`}
        >
          {segments.map((seg, i) => (
            <div key={seg.label} className="flex items-end gap-3 sm:gap-5">
              <div className="flex flex-col items-center">
                <span className="font-mono text-5xl font-bold leading-none tabular-nums tracking-tighter text-foreground sm:text-7xl">
                  {String(seg.value).padStart(2, '0')}
                </span>
                <span className="mt-2 text-[10px] font-semibold uppercase tracking-eyebrow text-muted-foreground sm:text-xs">
                  {seg.label}
                </span>
              </div>
              {i < segments.length - 1 && (
                <span className="pb-7 font-mono text-3xl font-bold leading-none text-muted-foreground/40 sm:pb-9 sm:text-5xl">
                  :
                </span>
              )}
            </div>
          ))}
        </div>

        <Text variant="muted" className="mt-5">
          {isImminent
            ? 'Get comfy — your team is gathering below.'
            : 'Watch the intro video, scroll the journey, and meet your crew below.'}
        </Text>
      </div>
    </div>
  );
}

/**
 * Decorative sparkles scattered behind the countdown to give the lobby
 * the "creative tool" feel of the paywall/ideation visuals.
 */
function BackgroundSparkles() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
    >
      <g className="text-amber-400 dark:text-amber-300" fill="currentColor">
        <circle cx="30" cy="40" r="1.5" opacity="0.6" />
        <circle cx="370" cy="30" r="2" opacity="0.7" />
        <circle cx="60" cy="170" r="1.2" opacity="0.5" />
        <circle cx="340" cy="160" r="1.8" opacity="0.6" />
        <circle cx="200" cy="20" r="1" opacity="0.4" />
        <circle cx="20" cy="100" r="1" opacity="0.4" />
        <circle cx="380" cy="100" r="1.4" opacity="0.5" />
        <path
          d="M50 70 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z"
          opacity="0.5"
        />
        <path
          d="M355 75 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 z"
          opacity="0.5"
        />
        <path
          d="M80 130 l1 3 l3 1 l-3 1 l-1 3 l-1 -3 l-3 -1 l3 -1 z"
          opacity="0.4"
        />
        <path
          d="M320 130 l1 3 l3 1 l-3 1 l-1 3 l-1 -3 l-3 -1 l3 -1 z"
          opacity="0.4"
        />
      </g>
    </svg>
  );
}
