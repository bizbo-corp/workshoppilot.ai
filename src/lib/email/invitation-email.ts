import 'server-only';

import { Resend } from 'resend';
import { buildIcsAttachment } from './ics';
import { formatSchedule } from '@/lib/workshop/workshop-schedule';

const resend = new Resend(process.env.RESEND_API_KEY);

// FROM address is configurable so dev can point at a verified Resend sandbox/domain.
// Default is the prod domain — must be verified in Resend or the API will 403.
const FROM = process.env.RESEND_FROM ?? 'WorkshopPilot <notifications@workshoppilot.ai>';

export interface EmailSendResult {
  ok: boolean;
  /** Resend's email id (uuid). Populated on success so callers can persist it for
   * deliverability audits later. */
  messageId?: string;
  error?: string;
}

function baseUrl(): string {
  // Explicit override wins (set in .env.local for dev, or as a Vercel env var for prod).
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (explicit) return explicit;
  // Dev safeguard: without this, emails generated on localhost would link to the
  // production domain — and the invite token only exists in the dev database, so
  // recipients would 404. Match the dev port from the dev server's PORT env or default 3000.
  if (process.env.NODE_ENV !== 'production') {
    return `http://localhost:${process.env.PORT ?? '3000'}`;
  }
  return 'https://workshoppilot.ai';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px;max-width:560px;">
        <tr><td style="font-size:14px;color:#6b6b6b;padding-bottom:24px;">WorkshopPilot</td></tr>
        <tr><td style="font-size:22px;font-weight:600;line-height:1.3;padding-bottom:16px;">${escapeHtml(title)}</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;color:#2a2a2a;">${bodyHtml}</td></tr>
        <tr><td style="font-size:12px;color:#9a9a9a;padding-top:32px;">If you weren't expecting this email, you can safely ignore it.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Olive primary button matching the WorkshopPilot brand (olive-600 / olive-700
// from globals.css). Used for the main CTA across transactional emails.
function ctaButton(label: string, href: string): string {
  return `<p style="margin:24px 0;text-align:center;"><a href="${href}" style="display:inline-block;background:#768364;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;box-shadow:0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.15);">${escapeHtml(label)}</a></p>`;
}

interface InvitationEmailParams {
  to: string;
  inviteToken: string;
  facilitatorName: string;
  facilitatorEmail?: string | null;
  workshopId: string;
  workshopTitle: string;
  /** Challenge details — shown in the body so invitees can decide before clicking. */
  hmwStatement?: string | null;
  idea?: string | null;
  problem?: string | null;
  audience?: string | null;
  /** Scheduling — null/undefined for "Start now" workshops. */
  scheduledStartAt?: Date | null;
  scheduledDurationMinutes?: number | null;
  scheduledTimezone?: string | null;
}

/**
 * Sent to each invitee when the facilitator publishes the challenge and invites participants.
 * Returns `{ ok, error? }` — callers can surface failures back to the UI.
 * Never throws — Resend errors are captured and returned.
 */
export async function sendInvitationEmail(
  params: InvitationEmailParams
): Promise<EmailSendResult> {
  const url = `${baseUrl()}/invite/${params.inviteToken}`;
  const schedule = formatSchedule(
    params.scheduledStartAt ?? null,
    params.scheduledDurationMinutes ?? null,
    params.scheduledTimezone ?? null
  );

  const hmwBlock = params.hmwStatement
    ? `<blockquote style="margin:24px 0 16px;padding:20px 24px;background:linear-gradient(135deg,#fdf8ec 0%,#f7efd9 100%);border-left:4px solid #c8a951;border-radius:12px;font-size:17px;line-height:1.5;color:#3a2f12;font-weight:500;">
         <span style="display:block;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9a7a2a;margin-bottom:10px;">The Challenge</span>
         &ldquo;${escapeHtml(params.hmwStatement)}&rdquo;
       </blockquote>`
    : '';

  // Schedule gets the same gold/amber treatment as the challenge above, so the
  // two read as a paired set: what the workshop is, and when it happens.
  const scheduleBlock = schedule
    ? `<div style="margin:16px 0 24px;padding:16px 22px;background:linear-gradient(135deg,#fdf8ec 0%,#f7efd9 100%);border-left:4px solid #c8a951;border-radius:12px;font-size:14px;line-height:1.5;">
         <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9a7a2a;margin-bottom:8px;">When</div>
         <div style="font-size:16px;font-weight:600;color:#3a2f12;">🗓 ${escapeHtml(schedule.full)}</div>
         <div style="margin-top:4px;color:#6b6b6b;font-size:13px;">${escapeHtml(schedule.durationLabel)} together. Add to your calendar with the attachment.</div>
       </div>`
    : `<div style="margin:16px 0 24px;padding:16px 22px;background:#ecfdf5;border-left:4px solid #10b981;border-radius:12px;font-size:14px;line-height:1.5;">
         <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#047857;margin-bottom:8px;">When</div>
         <div style="font-size:16px;font-weight:600;color:#064e3b;">🟢 Starts now</div>
         <div style="margin-top:4px;color:#6b6b6b;font-size:13px;">Click below to drop into the lobby.</div>
       </div>`;

  const ctaLabel = schedule ? 'Open the lobby' : 'Join now';

  const facilitator = escapeHtml(params.facilitatorName);

  const body = `
    <p style="font-size:16px;line-height:1.6;margin:0 0 16px;color:#1a1a1a;"><strong>${facilitator}</strong> personally invited you to a design-thinking workshop, and they&rsquo;re hoping you&rsquo;ll bring something only you can.</p>

    <p style="font-size:15px;line-height:1.7;color:#3a3a3a;margin:0 0 16px;">Workshops live or die on the people in the room. ${facilitator} wants <em>your</em> perspective, <em>your</em> innovative ideas, and <em>your</em> creative leaps to crack the challenge below. Not consensus, not polish. Just honest thinking from someone they trust.</p>

    ${hmwBlock}
    ${scheduleBlock}

    ${ctaButton(ctaLabel, url)}

    ${renderJourneyGrid()}

    ${renderVideoCard()}

    <p style="font-size:14px;line-height:1.6;color:#6b6b6b;margin:24px 0 8px;">No prep required. No expertise expected. Just show up curious. That&rsquo;s the whole job.</p>

    <p style="font-size:13px;color:#9a9a9a;margin-top:8px;">Or paste this link: ${escapeHtml(url)}</p>
  `;

  // Em dashes removed from the subject too. Use a colon + bullet separator.
  const subject = schedule
    ? `${params.facilitatorName} invited you to a workshop: ${schedule.date}, ${schedule.timeRange.split(' – ')[0]} ${schedule.timezoneAbbr}`.trim()
    : `${params.facilitatorName} invited you to a workshop: ${params.workshopTitle}`;

  // Build .ics attachment for scheduled workshops only
  const attachments = schedule && params.scheduledStartAt && params.scheduledDurationMinutes
    ? [
        buildIcsAttachment({
          uid: params.workshopId,
          summary: `Workshop: ${params.workshopTitle}`,
          description: [
            params.hmwStatement ? `Challenge: ${params.hmwStatement}` : null,
            `Join: ${url}`,
          ]
            .filter(Boolean)
            .join('\n\n'),
          location: url,
          startAt: params.scheduledStartAt,
          durationMinutes: params.scheduledDurationMinutes,
          organizerName: params.facilitatorName,
          organizerEmail: params.facilitatorEmail ?? undefined,
        }),
      ]
    : undefined;

  if (!process.env.RESEND_API_KEY) {
    const msg = 'RESEND_API_KEY is not set';
    console.error('[Resend] Cannot send invitation:', msg);
    return { ok: false, error: msg };
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject,
      html: shell(`${params.facilitatorName} wants you in "${params.workshopTitle}"`, body),
      attachments,
    });

    // The Resend SDK returns `{ data, error }` — when `error` is present the send failed.
    // We were ignoring this before, which made silent failures invisible to the UI.
    if (result.error) {
      const errMessage =
        typeof result.error === 'object' && 'message' in result.error
          ? String((result.error as { message: unknown }).message)
          : JSON.stringify(result.error);
      console.error('[Resend] Invitation send rejected:', errMessage, result.error);
      return { ok: false, error: errMessage };
    }

    return { ok: true, messageId: result.data?.id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Resend] Failed to send workshop invitation:', error);
    return { ok: false, error: msg };
  }
}

/**
 * 9-stage journey grid — a compact, table-based echo of the lobby's
 * "The journey ahead" section. Uses a 3-col table layout for broad email-client
 * support (no flex/grid, no media queries). Each cell shows a colored number
 * badge plus the stage name.
 */
function renderJourneyGrid(): string {
  const stages: Array<{ n: number; name: string; bg: string; fg: string }> = [
    { n: 1, name: 'Stakeholder Interviews', bg: '#fef3c7', fg: '#b45309' },
    { n: 2, name: 'User Research',          bg: '#cffafe', fg: '#0e7490' },
    { n: 3, name: 'Sense Making',           bg: '#ede9fe', fg: '#7c3aed' },
    { n: 4, name: 'Personas',               bg: '#fce7f3', fg: '#db2777' },
    { n: 5, name: 'Journey Mapping',        bg: '#d1fae5', fg: '#059669' },
    { n: 6, name: 'Reframe',                bg: '#fef9c3', fg: '#ca8a04' },
    { n: 7, name: 'Ideation',               bg: '#ffedd5', fg: '#ea580c' },
    { n: 8, name: 'Concept Development',    bg: '#e0e7ff', fg: '#4f46e5' },
    { n: 9, name: 'Validate &amp; Ship',    bg: '#dcfce7', fg: '#16a34a' },
  ];

  const cell = (s: { n: number; name: string; bg: string; fg: string }) => `
    <td valign="top" width="33%" style="padding:6px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#fafafa;border:1px solid #ececec;border-radius:10px;">
        <tr>
          <td style="padding:12px 12px 12px 10px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td width="24" style="padding-right:8px;vertical-align:middle;">
                  <div style="width:22px;height:22px;border-radius:11px;background:${s.bg};color:${s.fg};font-size:11px;font-weight:700;text-align:center;line-height:22px;">${s.n}</div>
                </td>
                <td style="font-size:12px;font-weight:600;color:#1a1a1a;line-height:1.25;vertical-align:middle;">${s.name}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>`;

  return `
    <div style="margin:24px 0 16px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6b6b6b;margin-bottom:4px;">The journey ahead</div>
      <div style="font-size:17px;font-weight:600;color:#1a1a1a;line-height:1.3;margin-bottom:12px;">Nine stages, one validated build pack</div>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;">
        <tr>${cell(stages[0])}${cell(stages[1])}${cell(stages[2])}</tr>
        <tr>${cell(stages[3])}${cell(stages[4])}${cell(stages[5])}</tr>
        <tr>${cell(stages[6])}${cell(stages[7])}${cell(stages[8])}</tr>
      </table>
    </div>`;
}

/**
 * "While you wait" intro-video card — links straight to the homepage YouTube
 * clip. Uses the YouTube hqdefault thumbnail wrapped in an anchor so clicking
 * anywhere on the image opens the video in a new tab.
 */
function renderVideoCard(): string {
  const videoUrl = 'https://www.youtube.com/watch?v=etMags6ravA';
  const thumb = 'https://i.ytimg.com/vi/etMags6ravA/hqdefault.jpg';
  return `
    <a href="${videoUrl}" target="_blank" rel="noopener" style="display:block;margin:24px 0 8px;text-decoration:none;color:inherit;border:1px solid #ececec;border-radius:12px;overflow:hidden;background:#ffffff;">
      <div style="padding:14px 18px;border-bottom:1px solid #ececec;background:#fafafa;">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6b6b6b;">While you wait · 60 seconds</div>
        <div style="font-size:15px;font-weight:600;color:#1a1a1a;margin-top:2px;">How a WorkshopPilot session actually flows</div>
      </div>
      <div style="position:relative;background:#000;">
        <img src="${thumb}" alt="" width="100%" style="display:block;width:100%;height:auto;opacity:0.85;" />
        <div style="padding:10px 18px;background:#1a1a1a;color:#ffffff;font-size:13px;font-weight:500;">▶  Watch on YouTube</div>
      </div>
    </a>`;
}

interface ChangeRequestEmailParams {
  to: string;
  facilitatorName: string;
  workshopTitle: string;
  sessionId: string;
  participantName: string;
  note: string;
}

/**
 * Sent to the facilitator when a participant requests a change to the challenge.
 */
export async function sendChangeRequestEmail(params: ChangeRequestEmailParams) {
  const url = `${baseUrl()}/workshop/${params.sessionId}/step/challenge`;
  const body = `
    <p>Hi ${escapeHtml(params.facilitatorName)},</p>
    <p><strong>${escapeHtml(params.participantName)}</strong> requested a change to the challenge for <strong>${escapeHtml(params.workshopTitle)}</strong>:</p>
    <blockquote style="margin:16px 0;padding:12px 16px;background:#fff4f4;border-left:3px solid #d94f4f;border-radius:6px;">${escapeHtml(params.note)}</blockquote>
    <p>Open Step 1 to revise and republish, or dismiss the request.</p>
    ${ctaButton('Review change request', url)}
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `${params.participantName} requested a change to your "${params.workshopTitle}" challenge`,
      html: shell('A participant requested a change', body),
    });
  } catch (error) {
    console.error('[Resend] Failed to send change-request notification:', error);
  }
}

interface RepublishEmailParams {
  to: string;
  facilitatorName: string;
  workshopTitle: string;
  sessionId: string;
}

/**
 * Sent to participants who previously requested a change, once the facilitator republishes.
 */
export async function sendRepublishEmail(params: RepublishEmailParams) {
  const url = `${baseUrl()}/workshop/${params.sessionId}/lobby`;
  const body = `
    <p>${escapeHtml(params.facilitatorName)} updated the challenge for <strong>${escapeHtml(params.workshopTitle)}</strong> based on your feedback.</p>
    <p>Take another look and confirm you're aligned to keep the workshop moving.</p>
    ${ctaButton('Review updated challenge', url)}
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `${params.facilitatorName} updated the challenge — please review`,
      html: shell('The challenge was updated', body),
    });
  } catch (error) {
    console.error('[Resend] Failed to send republish email:', error);
  }
}
