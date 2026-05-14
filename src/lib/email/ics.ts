import 'server-only';

/**
 * Hand-rolled VCALENDAR/VEVENT builder.
 * No new dependency — the spec we need (RFC 5545 basic VEVENT) is small enough to write inline.
 *
 * Returns the attachment shape Resend expects on the `attachments` array:
 *   { filename, content (base64 string), contentType? }
 */
export interface IcsEventInput {
  /** Stable unique identifier for the event. Use the workshop ID. */
  uid: string;
  /** Calendar event summary/title (one line). */
  summary: string;
  /** Optional multi-line description shown in the calendar event body. */
  description?: string;
  /** Optional location string — we put the join URL here so single-tap join works in most clients. */
  location?: string;
  /** Start time (any Date — converted to UTC). */
  startAt: Date;
  /** Duration in minutes. */
  durationMinutes: number;
  /** Organizer display name and email — appears as the event creator. */
  organizerName?: string;
  organizerEmail?: string;
}

export interface IcsAttachment {
  filename: string;
  content: string; // base64
  contentType: string;
}

const CRLF = '\r\n';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Format a Date as a UTC stamp in RFC 5545 form (e.g. 20260316T140000Z). */
function toIcsUtc(date: Date): string {
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

/** Escape special characters per RFC 5545 §3.3.11 (TEXT). */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Fold long lines per RFC 5545 §3.1 — lines must be <=75 octets; continuations
 * start with a single whitespace character.
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let remaining = line;
  // First chunk gets the full 75 octets, continuations get 74 because of the leading space.
  parts.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    parts.push(' ' + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }
  return parts.join(CRLF);
}

export function buildIcsAttachment(input: IcsEventInput): IcsAttachment {
  const dtStart = toIcsUtc(input.startAt);
  const dtEnd = toIcsUtc(new Date(input.startAt.getTime() + input.durationMinutes * 60_000));
  const dtStamp = toIcsUtc(new Date());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WorkshopPilot//Workshop Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${input.uid}@workshoppilot.ai`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(input.summary)}`,
  ];

  if (input.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(input.description)}`);
  }
  if (input.location) {
    lines.push(`LOCATION:${escapeIcsText(input.location)}`);
  }
  if (input.organizerEmail) {
    const cn = input.organizerName ? `CN=${escapeIcsText(input.organizerName)}:` : '';
    lines.push(`ORGANIZER;${cn}mailto:${input.organizerEmail}`);
  }
  lines.push('STATUS:CONFIRMED');
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  const folded = lines.map(foldLine).join(CRLF) + CRLF;

  return {
    filename: 'workshop.ics',
    content: Buffer.from(folded, 'utf8').toString('base64'),
    contentType: 'text/calendar; charset=utf-8; method=REQUEST',
  };
}
