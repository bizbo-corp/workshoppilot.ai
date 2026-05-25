import 'server-only';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? 'WorkshopPilot <notifications@workshoppilot.ai>';

function baseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (explicit) return explicit;
  if (process.env.NODE_ENV !== 'production') {
    return `http://localhost:${process.env.PORT ?? '3000'}`;
  }
  return 'https://workshoppilot.ai';
}

/** Personal deep-link into the User Research (step 3) contribution surface. */
export function researchStepUrl(sessionId: string): string {
  return `${baseUrl()}/workshop/${sessionId}/step/3`;
}

const strip = (s: string) => s.replace(/[<>&]/g, '');

/**
 * "Add your research" reminder — sent to participants who haven't submitted their
 * fieldwork yet. Never throws; returns { ok, error? }.
 */
export async function sendResearchReminderEmail(params: {
  to: string;
  workshopTitle: string;
  link: string;
  facilitatorName?: string | null;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const title = strip(params.workshopTitle);
    const who = params.facilitatorName ? `${strip(params.facilitatorName)} is` : 'The team is';
    const html = `<!doctype html><html lang="en"><body style="margin:0;padding:0;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f5;padding:32px 16px;"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;padding:32px;max-width:560px;">
      <tr><td style="font-size:14px;color:#6b6b6b;padding-bottom:24px;">WorkshopPilot</td></tr>
      <tr><td style="font-size:22px;font-weight:600;line-height:1.3;padding-bottom:16px;">Add your research to &ldquo;${title}&rdquo;</td></tr>
      <tr><td style="font-size:15px;line-height:1.6;color:#2a2a2a;">${who} waiting on your interview findings. Once you&rsquo;ve talked to people, open the workshop and add your research — paste a transcript or your notes and I&rsquo;ll pull out the interviewees and their insights for you.</td></tr>
      <tr><td><p style="margin:24px 0;text-align:center;"><a href="${params.link}" style="display:inline-block;background:#768364;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;">Add your research</a></p></td></tr>
      <tr><td style="font-size:12px;color:#9a9a9a;padding-top:8px;">If you&rsquo;ve already added it, you can ignore this.</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
    const result = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `Add your research — ${title}`,
      html,
    });
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true, messageId: result.data?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
