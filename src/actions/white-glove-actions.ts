'use server';

import { auth } from '@clerk/nextjs/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/client';
import { whiteGloveBookings, workshops } from '@/db/schema';
import { sendWhiteGloveBookingNotification } from '@/lib/email/white-glove-booking-email';

export interface SubmitWhiteGloveInput {
  workshopId: string;
  name: string;
  email: string;
  preferredTimes: string;
  timezone: string;
  notes: string | null;
}

export type SubmitWhiteGloveResult = { ok: true; bookingId: string } | { ok: false; error: string };

/**
 * Save a White Glove scheduling intake and notify support.
 * Caller must own the workshop tied to the booking.
 */
export async function submitWhiteGloveBooking(
  input: SubmitWhiteGloveInput
): Promise<SubmitWhiteGloveResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'Authentication required' };

  // Verify the user owns this workshop and it's at white_glove tier
  const workshop = await db.query.workshops.findFirst({
    where: and(eq(workshops.id, input.workshopId), eq(workshops.clerkUserId, userId)),
    columns: { id: true, title: true, tier: true },
  });
  if (!workshop) return { ok: false, error: 'Workshop not found' };
  if (workshop.tier !== 'white_glove') {
    return { ok: false, error: 'This workshop is not on the White Glove tier' };
  }

  // Trim + length-cap defensively even though the form already does
  const name = input.name.trim().slice(0, 100);
  const email = input.email.trim().slice(0, 200);
  const preferredTimes = input.preferredTimes.trim().slice(0, 500);
  const timezone = input.timezone.trim().slice(0, 100);
  const notes = input.notes?.trim().slice(0, 1000) || null;

  if (!name || !email || !preferredTimes || !timezone) {
    return { ok: false, error: 'Missing required fields' };
  }

  const [inserted] = await db
    .insert(whiteGloveBookings)
    .values({
      workshopId: input.workshopId,
      clerkUserId: userId,
      name,
      email,
      preferredTimes,
      timezone,
      notes,
    })
    .returning({ id: whiteGloveBookings.id });

  // Fire-and-forget email — don't fail the booking if Resend is down
  sendWhiteGloveBookingNotification({
    bookingId: inserted.id,
    workshopId: input.workshopId,
    workshopTitle: workshop.title,
    name,
    email,
    preferredTimes,
    timezone,
    notes,
  }).catch((err) => console.error('[white-glove] notification email failed:', err));

  return { ok: true, bookingId: inserted.id };
}
