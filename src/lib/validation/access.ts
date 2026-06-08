import { auth, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { workshops } from '@/db/schema';
import { resolveClerkParticipant } from '@/lib/auth/resolve-participant';

/**
 * Owner, configured admin, or active participant may read/write a workshop's Validate step.
 * Shared by the validation server actions and the /api/validation routes.
 */
export async function resolveValidateAccess(workshopId: string): Promise<boolean> {
  const { userId } = await auth();
  const [workshop] = await db
    .select({ clerkUserId: workshops.clerkUserId })
    .from(workshops)
    .where(eq(workshops.id, workshopId))
    .limit(1);
  if (!workshop) return false;
  if (userId && userId === workshop.clerkUserId) return true;

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;
    if (email && email.toLowerCase() === adminEmail.toLowerCase()) return true;
  }

  const participant = await resolveClerkParticipant(workshopId);
  return !!participant;
}
