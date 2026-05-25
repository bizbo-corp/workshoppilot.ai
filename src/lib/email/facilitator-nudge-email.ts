import 'server-only';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM =
  process.env.RESEND_FROM ?? 'WorkshopPilot <notifications@workshoppilot.ai>';

function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (explicit) return explicit;
  return 'https://workshoppilot.ai';
}

export interface FacilitatorNudgeParams {
  to: string;
  facilitatorName: string;
  /** Name of the participant who pressed Nudge. */
  participantName: string;
  workshopTitle: string;
  /** aiSession id — used to build the lobby link. */
  sessionId: string;
}

export interface EmailSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Notify the facilitator that a participant is waiting in the lobby and wants
 * them to come run the workshop. Sent from the lobby's "Nudge" button.
 */
export async function sendFacilitatorNudgeEmail(
  params: FacilitatorNudgeParams,
): Promise<EmailSendResult> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY is not set' };
  }

  const lobbyUrl = `${getBaseUrl()}/workshop/${params.sessionId}/lobby`;
  const subject = `${params.participantName} is waiting in "${params.workshopTitle}"`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #4b5144;">
      <h1 style="font-size: 20px; margin: 0 0 12px;">Your workshop has someone waiting</h1>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 8px;">
        Hi ${params.facilitatorName},
      </p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 20px;">
        <strong>${params.participantName}</strong> is in the lobby for
        <strong>${params.workshopTitle}</strong> and is ready to get started.
        Hop in to run the session.
      </p>
      <a href="${lobbyUrl}"
         style="display: inline-block; background: #4b5144; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 12px 20px; border-radius: 10px;">
        Open the workshop
      </a>
      <p style="font-size: 12px; color: #91948b; margin: 24px 0 0;">
        You're receiving this because you're the facilitator of this workshop.
      </p>
    </div>
  `;

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject,
      html,
    });
    if (result.error) {
      const errMessage =
        typeof result.error === 'object' && 'message' in result.error
          ? String((result.error as { message: unknown }).message)
          : JSON.stringify(result.error);
      console.error('[Resend] Facilitator nudge rejected:', errMessage);
      return { ok: false, error: errMessage };
    }
    return { ok: true, messageId: result.data?.id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Resend] Failed to send facilitator nudge:', error);
    return { ok: false, error: msg };
  }
}
