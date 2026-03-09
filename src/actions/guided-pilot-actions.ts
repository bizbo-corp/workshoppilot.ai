'use server';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/client';
import { guidedPilotInquiries } from '@/db/schema';
import { sendGuidedPilotNotification } from '@/lib/email/resend';

export async function submitGuidedPilotInquiry(formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const workshopGoal = formData.get('workshopGoal') as string;
  const stakeholderCount = formData.get('stakeholderCount') as string;
  const timeline = formData.get('timeline') as string;
  const notes = (formData.get('notes') as string)?.trim() || null;

  if (!name || !email || !workshopGoal || !stakeholderCount || !timeline) {
    return { success: false as const, error: 'Missing required fields' };
  }

  // Optionally attach Clerk user if signed in
  let clerkUserId: string | null = null;
  try {
    const { userId } = await auth();
    clerkUserId = userId;
  } catch {
    // Not signed in — that's fine
  }

  try {
    const [row] = await db
      .insert(guidedPilotInquiries)
      .values({
        clerkUserId,
        email,
        name,
        workshopGoal: workshopGoal as 'mvp' | 'pivot' | 'corporate-innovation' | 'product-market-fit' | 'other',
        stakeholderCount: stakeholderCount as '1-2' | '3-5' | '6-10' | '10+',
        timeline: timeline as '1-week' | '2-4-weeks' | '1-2-months' | 'flexible',
        notes,
      })
      .returning({ id: guidedPilotInquiries.id });

    // Fire-and-forget email notification
    sendGuidedPilotNotification({
      name,
      email,
      workshopGoal,
      stakeholderCount,
      timeline,
      notes,
      inquiryId: row.id,
    });

    return { success: true as const, inquiryId: row.id };
  } catch (error) {
    console.error('[GuidedPilot] Failed to submit inquiry:', error);
    return { success: false as const, error: 'Something went wrong. Please try again.' };
  }
}
