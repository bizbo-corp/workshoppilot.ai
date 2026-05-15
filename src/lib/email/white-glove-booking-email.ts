import 'server-only';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface BookingDetails {
  bookingId: string;
  workshopId: string;
  workshopTitle: string;
  name: string;
  email: string;
  preferredTimes: string;
  timezone: string;
  notes: string | null;
}

/**
 * Send admin notification when a White Glove buyer submits scheduling intake.
 * Fire-and-forget — logs errors but never throws.
 */
export async function sendWhiteGloveBookingNotification(booking: BookingDetails) {
  try {
    await resend.emails.send({
      from: 'WorkshopPilot <notifications@workshoppilot.ai>',
      to: 'hello@workshoppilot.ai',
      subject: `New White Glove booking from ${booking.name}`,
      text: [
        `New White Glove booking received`,
        ``,
        `Name: ${booking.name}`,
        `Email: ${booking.email}`,
        `Workshop: ${booking.workshopTitle} (${booking.workshopId})`,
        ``,
        `Preferred times:`,
        booking.preferredTimes,
        ``,
        `Timezone: ${booking.timezone}`,
        booking.notes ? `\nNotes:\n${booking.notes}` : '',
        ``,
        `Booking ID: ${booking.bookingId}`,
      ]
        .filter(Boolean)
        .join('\n'),
    });
  } catch (error) {
    console.error('[Resend] Failed to send white-glove booking notification:', error);
  }
}
