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

function ctaButton(label: string, href: string): string {
  return `<p style="margin:24px 0;"><a href="${href}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">${escapeHtml(label)}</a></p>`;
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

  const challengeBlock = renderChallengeBlock({
    hmw: params.hmwStatement ?? null,
    idea: params.idea ?? null,
    problem: params.problem ?? null,
    audience: params.audience ?? null,
  });

  const scheduleBlock = schedule
    ? `<p style="margin:16px 0;padding:12px 16px;background:#f0f4f8;border-radius:8px;font-size:14px;line-height:1.5;">
         <strong>🗓 ${escapeHtml(schedule.full)}</strong><br/>
         <span style="color:#6b6b6b;">${escapeHtml(schedule.durationLabel)} workshop · add to your calendar with the attachment</span>
       </p>`
    : `<p style="margin:16px 0;padding:12px 16px;background:#ecfdf5;border-radius:8px;font-size:14px;">
         🟢 <strong>Starts now</strong> — click below to drop into the lobby.
       </p>`;

  const ctaLabel = schedule ? 'Open lobby' : 'Join now';

  const body = `
    <p>${escapeHtml(params.facilitatorName)} is running a design-thinking workshop and wants you in it.</p>
    <p>Here's the challenge they framed:</p>
    ${challengeBlock}
    ${scheduleBlock}
    ${ctaButton(ctaLabel, url)}
    <p style="font-size:13px;color:#6b6b6b;">Or paste this link: ${escapeHtml(url)}</p>
  `;

  const subject = schedule
    ? `${params.facilitatorName} invited you to a workshop — ${schedule.date}, ${schedule.timeRange.split(' – ')[0]} ${schedule.timezoneAbbr}`.trim()
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
      html: shell(`You're invited to "${params.workshopTitle}"`, body),
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

    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Resend] Failed to send workshop invitation:', error);
    return { ok: false, error: msg };
  }
}

function renderChallengeBlock(params: {
  hmw: string | null;
  idea: string | null;
  problem: string | null;
  audience: string | null;
}): string {
  const fields: string[] = [];
  if (params.idea) fields.push(field('The idea', params.idea));
  if (params.problem) fields.push(field('The problem', params.problem));
  if (params.audience) fields.push(field('The audience', params.audience));

  const hmw = params.hmw
    ? `<blockquote style="margin:16px 0;padding:12px 16px;background:#f3f0ea;border-left:3px solid #c8a951;border-radius:6px;font-style:italic;font-size:16px;">${escapeHtml(params.hmw)}</blockquote>`
    : '';

  const grid =
    fields.length > 0
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0 16px;border-collapse:collapse;"><tr>${fields.join('')}</tr></table>`
      : '';

  return hmw + grid;
}

function field(label: string, value: string): string {
  return `<td valign="top" style="padding:8px;width:33%;">
    <div style="font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:#6b6b6b;margin-bottom:4px;">${escapeHtml(label)}</div>
    <div style="font-size:13px;line-height:1.5;color:#2a2a2a;">${escapeHtml(value)}</div>
  </td>`;
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
  const url = `${baseUrl()}/workshop/${params.sessionId}/step/1`;
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
