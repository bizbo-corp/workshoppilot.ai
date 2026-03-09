import 'server-only';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface InquiryDetails {
  name: string;
  email: string;
  workshopGoal: string;
  stakeholderCount: string;
  timeline: string;
  notes?: string | null;
  inquiryId: string;
}

const GOAL_LABELS: Record<string, string> = {
  mvp: 'Build an MVP',
  pivot: 'Pivot / Rethink',
  'corporate-innovation': 'Corporate Innovation',
  'product-market-fit': 'Product-Market Fit',
  other: 'Other',
};

const TIMELINE_LABELS: Record<string, string> = {
  '1-week': '1 week',
  '2-4-weeks': '2-4 weeks',
  '1-2-months': '1-2 months',
  flexible: 'Flexible',
};

/**
 * Send admin notification when a new guided pilot inquiry is submitted.
 * Fire-and-forget — logs errors but never throws.
 */
export async function sendGuidedPilotNotification(inquiry: InquiryDetails) {
  try {
    await resend.emails.send({
      from: 'WorkshopPilot <notifications@workshoppilot.ai>',
      to: 'hello@workshoppilot.ai',
      subject: `New Guided Pilot Inquiry from ${inquiry.name}`,
      text: [
        `New Guided Pilot inquiry received`,
        ``,
        `Name: ${inquiry.name}`,
        `Email: ${inquiry.email}`,
        `Workshop Goal: ${GOAL_LABELS[inquiry.workshopGoal] ?? inquiry.workshopGoal}`,
        `Stakeholders: ${inquiry.stakeholderCount}`,
        `Timeline: ${TIMELINE_LABELS[inquiry.timeline] ?? inquiry.timeline}`,
        inquiry.notes ? `Notes: ${inquiry.notes}` : '',
        ``,
        `Inquiry ID: ${inquiry.inquiryId}`,
      ]
        .filter(Boolean)
        .join('\n'),
    });
  } catch (error) {
    console.error('[Resend] Failed to send guided pilot notification:', error);
  }
}
