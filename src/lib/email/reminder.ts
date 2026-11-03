import 'server-only';
import { Resend } from 'resend';
import { appUrl } from '@/lib/billing/stripe';

const FROM = process.env.RESEND_FROM ?? 'WorkshopPilot <notifications@workshoppilot.ai>';

/**
 * The come-back email: a few days after the Verdict, if no result has been
 * logged, remind the owner that their score is waiting.
 */
export async function sendResultReminder(opts: { to: string; name: string | null; workshopId: string; title: string; target: number; kill: number; unit: string }): Promise<{ sent: boolean; id?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY missing; reminder not sent for', opts.workshopId);
    return { sent: false };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const url = `${appUrl()}/w/${opts.workshopId}/summary`;
  const first = opts.name?.split(' ')[0] ?? 'there';
  const text = [
    `Hi ${first},`,
    '',
    `Your Validation Score for "${opts.title}" is still waiting.`,
    `The bar you set: ${opts.target} ${opts.unit} to validate, ${opts.kill} ${opts.unit} or fewer to park it.`,
    '',
    `Log what happened and the score fills in: ${url}`,
    '',
    'If the test has not run yet, that is the one thing to do this week.',
    '',
    'WorkshopPilot',
  ].join('\n');
  const { data, error } = await resend.emails.send({ from: FROM, to: opts.to, subject: `Your Validation Score is waiting: ${opts.title}`, text });
  if (error) throw new Error(error.message);
  return { sent: true, id: data?.id };
}
