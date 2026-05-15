'use client';

import { useEffect, useState } from 'react';
import {
  COMMON_TIMEZONES,
  detectBrowserTimezone,
  formatSchedule,
  getTimezoneLabel,
} from '@/lib/workshop/workshop-schedule';

interface LobbyScheduleDisplayProps {
  /** Absolute UTC instant the workshop starts. */
  startAtIso: string;
  /** Workshop duration in minutes. */
  durationMinutes: number;
  /**
   * The timezone the workshop was scheduled in (the facilitator's). Used as
   * the SSR / initial render value so hydration matches the server output —
   * we switch to the viewer's browser timezone in a useEffect on the client.
   */
  defaultTimezone: string;
}

const STORAGE_KEY = 'lobby-viewer-timezone';

/**
 * Returns the timezone the lobby should display in: a previously-stored override
 * if present, otherwise the browser-detected zone. Falls back to the caller's
 * default. Pure function — safe to call from inside useEffect.
 */
function resolveViewerTz(fallback: string): string {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  } catch {
    /* localStorage unavailable */
  }
  return detectBrowserTimezone() || fallback;
}

/**
 * Shows the workshop start time in the VIEWER's timezone with a "Change"
 * affordance — so a participant in NY sees New York time even though the
 * facilitator scheduled it in NZST.
 *
 * SSR/hydration safety: the first render uses {@link defaultTimezone} so the
 * server-rendered HTML matches the client's first paint. A useEffect then
 * promotes the user's browser timezone (or their previously chosen override
 * from localStorage).
 */
export function LobbyScheduleDisplay({
  startAtIso,
  durationMinutes,
  defaultTimezone,
}: LobbyScheduleDisplayProps) {
  const [viewerTz, setViewerTz] = useState(defaultTimezone);
  const [editing, setEditing] = useState(false);

  // Post-hydration promotion: the initial render uses defaultTimezone so SSR
  // and the first client paint agree, then we switch to a stored override or
  // the viewer's actual browser timezone. The set-state-in-effect rule doesn't
  // apply cleanly here because the source values can only be read after the
  // component mounts in the browser.
  useEffect(() => {
    const next = resolveViewerTz(defaultTimezone);
    if (next && next !== defaultTimezone) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewerTz(next);
    }
  }, [defaultTimezone]);

  function handleChange(tz: string) {
    setViewerTz(tz);
    setEditing(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, tz);
    } catch {
      /* ignore */
    }
  }

  const schedule = formatSchedule(startAtIso, durationMinutes, viewerTz);
  if (!schedule) return null;

  // Build the picker options. Include the workshop's TZ and the current
  // viewer TZ at the top if they're not already in the curated list.
  const extras: Array<{ tz: string; label: string }> = [];
  for (const tz of [viewerTz, defaultTimezone]) {
    if (!COMMON_TIMEZONES.some((t) => t.tz === tz) && !extras.some((e) => e.tz === tz)) {
      extras.push({ tz, label: getTimezoneLabel(tz).city });
    }
  }
  const options = [...extras, ...COMMON_TIMEZONES];

  if (editing) {
    return (
      <div className="mt-6 flex w-full max-w-md flex-col items-center gap-2">
        <select
          value={viewerTz}
          onChange={(e) => handleChange(e.target.value)}
          autoFocus
          className="w-full rounded-full border border-amber-300/60 bg-white/90 px-4 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-amber-700/50 dark:bg-amber-950/60 dark:text-amber-100"
        >
          {options.map((opt) => {
            const optLabel = getTimezoneLabel(opt.tz);
            return (
              <option key={opt.tz} value={opt.tz}>
                {opt.label} — {optLabel.abbr} ({optLabel.offset})
              </option>
            );
          })}
        </select>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      <p className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-white/60 px-4 py-1.5 text-sm text-muted-foreground dark:bg-amber-950/40">
        <span>🗓</span>
        <span>{schedule.full}</span>
        <span aria-hidden>·</span>
        <span>{schedule.durationLabel}</span>
      </p>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs font-medium text-amber-700 underline underline-offset-4 transition-colors hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
      >
        Not your timezone? Change
      </button>
    </div>
  );
}
