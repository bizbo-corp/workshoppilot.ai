/**
 * Workshop schedule formatting helpers (v2.2).
 * Pure functions — usable on both server and client.
 */

export const DURATION_OPTIONS = [60, 90, 120] as const;
export type DurationMinutes = (typeof DURATION_OPTIONS)[number];

/** Hard cap on participants in a team workshop. */
export const MAX_TEAM_INVITES = 5;

export interface FormattedSchedule {
  /** "Mon, Mar 16, 2026" */
  date: string;
  /** "2:00 PM – 3:30 PM" */
  timeRange: string;
  /** "GMT" or "PT" — abbreviation derived from the IANA TZ via Intl.DateTimeFormat. */
  timezoneAbbr: string;
  /** Combined human label: "Mon, Mar 16, 2026 · 2:00 PM – 3:30 PM PT". */
  full: string;
  /** "90 min" / "1h 30m" friendly duration. */
  durationLabel: string;
}

/**
 * Format a scheduled workshop slot in the given timezone for display.
 * Returns null if any required field is missing — caller should branch on this.
 */
export function formatSchedule(
  startAt: Date | string | null | undefined,
  durationMinutes: number | null | undefined,
  timezone: string | null | undefined
): FormattedSchedule | null {
  if (!startAt || !durationMinutes) return null;
  const start = typeof startAt === 'string' ? new Date(startAt) : startAt;
  if (isNaN(start.getTime())) return null;

  const tz = timezone || undefined;
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const dateFmt = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: tz,
  });
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
  });
  const tzFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'short',
  });

  const date = dateFmt.format(start);
  const timeRange = `${timeFmt.format(start)} – ${timeFmt.format(end)}`;
  const tzAbbrMatch = tzFmt.formatToParts(start).find((p) => p.type === 'timeZoneName');
  const timezoneAbbr = tzAbbrMatch?.value ?? '';

  return {
    date,
    timeRange,
    timezoneAbbr,
    full: `${date} · ${timeRange}${timezoneAbbr ? ' ' + timezoneAbbr : ''}`,
    durationLabel: formatDuration(durationMinutes),
  };
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * Returns a relative-time label for a future or past scheduled start.
 * "in 12 min" / "starting now" / "5 min ago" — friendly + short.
 */
export function timeUntilStart(startAt: Date | string | null | undefined, now: Date = new Date()): string {
  if (!startAt) return '';
  const start = typeof startAt === 'string' ? new Date(startAt) : startAt;
  if (isNaN(start.getTime())) return '';

  const diffMs = start.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const seconds = Math.floor(absMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (absMs < 30_000) return 'starting now';

  const phrase =
    days > 0
      ? `${days}d ${hours % 24}h`
      : hours > 0
      ? `${hours}h ${minutes % 60}m`
      : `${minutes}m ${seconds % 60}s`;

  return diffMs >= 0 ? `in ${phrase}` : `${phrase} ago`;
}

/**
 * Default timezone for new workshops — browser/server resolved.
 * On server this resolves to UTC unless TZ env var is set; call from the client when possible.
 */
export function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Parse the wizard's schedule fields into a normalized payload.
 * Throws on invalid input — callers should catch + show inline error.
 */
export function parseScheduleInput(input: {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  timezone: string;
}): { startAt: Date; durationMinutes: DurationMinutes; timezone: string } {
  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error('Pick a date');
  }
  if (!input.time || !/^\d{2}:\d{2}$/.test(input.time)) {
    throw new Error('Pick a start time');
  }
  if (!(DURATION_OPTIONS as readonly number[]).includes(input.durationMinutes)) {
    throw new Error('Pick a duration');
  }

  // Compose an ISO string in the facilitator's timezone. We rely on the browser
  // to send already-normalized UTC by interpreting "<date>T<time>" in the local
  // timezone and converting via the Date constructor. For server-side parsing
  // we use a simple offset trick: build the date string, parse as if local, then
  // shift by the timezone's offset relative to UTC at that instant.
  // Simpler approach: construct the date assuming UTC then nudge by the offset
  // looked up via Intl.
  const [y, mo, d] = input.date.split('-').map((s) => parseInt(s, 10));
  const [h, mi] = input.time.split(':').map((s) => parseInt(s, 10));

  // Compute the offset (in minutes) of the target timezone vs UTC at the chosen instant.
  // Trick: format an anchor UTC date in the target TZ and read the offset string.
  const probeUtc = new Date(Date.UTC(y, mo - 1, d, h, mi, 0));
  const tzString = new Intl.DateTimeFormat('en-US', {
    timeZone: input.timezone,
    timeZoneName: 'shortOffset',
    hour: 'numeric',
  }).formatToParts(probeUtc).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  // tzString looks like "GMT-7" or "GMT+5:30" or "GMT"
  const offsetMatch = tzString.match(/GMT([+-]\d+)(?::(\d+))?/);
  let offsetMinutes = 0;
  if (offsetMatch) {
    const hoursOff = parseInt(offsetMatch[1], 10);
    const minsOff = offsetMatch[2] ? parseInt(offsetMatch[2], 10) : 0;
    offsetMinutes = hoursOff * 60 + (hoursOff >= 0 ? minsOff : -minsOff);
  }

  // probeUtc treats the entered values as UTC. To make them mean "local time in TZ"
  // we subtract the TZ offset (a wall-clock value of 14:00 in GMT-7 is 21:00 UTC).
  const startAt = new Date(probeUtc.getTime() - offsetMinutes * 60_000);

  if (isNaN(startAt.getTime())) {
    throw new Error('Could not interpret the start time');
  }

  return {
    startAt,
    durationMinutes: input.durationMinutes as DurationMinutes,
    timezone: input.timezone,
  };
}
