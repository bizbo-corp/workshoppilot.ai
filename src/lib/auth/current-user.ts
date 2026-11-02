import { auth, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users, type User } from '@/db/schema';
import { addCredits } from '@/lib/credits/ledger';
import { WELCOME_CREDITS } from '@/lib/credits/packs';

/**
 * The one place the app touches Clerk on the server. Everything else works
 * with our own users row, so swapping the auth provider later is a change
 * to this file.
 */

export class UnauthenticatedError extends Error {
  constructor() {
    super('Sign in required');
    this.name = 'UnauthenticatedError';
  }
}

/** Our user row for the signed-in Clerk user, created on first sight. Null when signed out. */
export async function getCurrentUser(): Promise<User | null> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  const [existing] = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
  if (existing) return existing;

  const clerk = await currentUser();
  const email = clerk?.primaryEmailAddress?.emailAddress ?? clerk?.emailAddresses[0]?.emailAddress ?? '';
  const name = [clerk?.firstName, clerk?.lastName].filter(Boolean).join(' ') || clerk?.username || null;
  const isAdmin = !!email && !!process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

  const [created] = await db
    .insert(users)
    .values({ clerkUserId, email, name, avatarUrl: clerk?.imageUrl ?? null, isAdmin })
    .onConflictDoNothing()
    .returning();

  // A parallel request may have created the row first.
  const user = created ?? (await db.select().from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1))[0];
  if (created && WELCOME_CREDITS > 0) {
    await addCredits({
      userId: created.id,
      amount: WELCOME_CREDITS,
      kind: 'grant',
      description: 'Welcome credits',
      reference: `welcome:${created.id}`,
    });
    return { ...created, creditBalance: WELCOME_CREDITS };
  }
  return user ?? null;
}

/** Like getCurrentUser but throws; for server actions and route handlers. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthenticatedError();
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!user.isAdmin) throw new UnauthenticatedError();
  return user;
}
