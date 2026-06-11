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

/** Deep link to the workshop's Validate step, where the armed gauge waits for the result. */
export function validateStepUrl(sessionId: string): string {
  return `${baseUrl()}/workshop/${sessionId}/step/validate`;
}

const strip = (s: string) => s.replace(/[<>&]/g, '');

/**
 * Post-workshop follow-up: the user committed a test signal but hasn't logged a result.
 * Pulls them back to record it and unlock their Validation Score — the come-back HVCO.
 * Never throws; returns { ok, error? }.
 */
export async function sendValidationReminderEmail(params: {
  to: string;
  workshopTitle: string;
  link: string;
  /** Plain-language committed bar, e.g. "Hit 40 of 50 → validated · 10 or fewer → killed." */
  signalCaption?: string | null;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const title = strip(params.workshopTitle);
    const caption = params.signalCaption ? strip(params.signalCaption) : null;
    const html = `<!doctype html><html lang="en"><body style="margin:0;padding:0;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f5;padding:32px 16px;"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;padding:32px;max-width:560px;">
      <tr><td style="font-size:14px;color:#6b6b6b;padding-bottom:24px;">WorkshopPilot</td></tr>
      <tr><td style="font-size:22px;font-weight:600;line-height:1.3;padding-bottom:16px;">Your Validation Score is waiting</td></tr>
      <tr><td style="font-size:15px;line-height:1.6;color:#2a2a2a;">You designed the test for &ldquo;${title}&rdquo; — now it pays off. Run it if you haven&rsquo;t, log what happened, and the gauge fills in with your score and an honest verdict.</td></tr>
      ${caption ? `<tr><td style="font-size:14px;line-height:1.5;color:#2a2a2a;background:#f4f5f1;border-radius:8px;padding:12px 16px;margin-top:16px;"><strong>The bar you set:</strong> ${caption}</td></tr>` : ''}
      <tr><td><p style="margin:24px 0;text-align:center;"><a href="${params.link}" style="display:inline-block;background:#768364;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;">Log your result</a></p></td></tr>
      <tr><td style="font-size:12px;color:#9a9a9a;padding-top:8px;">Whatever the result, it&rsquo;s a win — validated means build, killed means you just saved months. If you&rsquo;ve already logged it, ignore this.</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
    const result = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `Your Validation Score is waiting — ${title}`,
      html,
    });
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true, messageId: result.data?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
