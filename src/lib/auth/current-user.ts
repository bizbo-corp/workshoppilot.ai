import { auth, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users, type User } from '@/db/schema';
import { addCredits } from '@/lib/credits/ledger';
import { WELCOME_CREDITS } from '@/lib/credits/packs';
import { isAuthBypassEnabled, BYPASS_TEST_USER } from './bypass';

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

interface Identity {
  clerkUserId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

async function resolveIdentity(): Promise<Identity | null> {
  if (isAuthBypassEnabled()) {
    return { ...BYPASS_TEST_USER, avatarUrl: null };
  }
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;
  return { clerkUserId, email: '', name: null, avatarUrl: null };
}

/** Our user row for the signed-in Clerk user, created on first sight. Null when signed out. */
export async function getCurrentUser(): Promise<User | null> {
  const identity = await resolveIdentity();
  if (!identity) return null;
  const { clerkUserId } = identity;

  const [existing] = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
  if (existing) return existing;

  // First sight: fetch the profile from Clerk unless the test bypass supplied it.
  let { email, name, avatarUrl } = identity;
  if (!email) {
    const clerk = await currentUser();
    email = clerk?.primaryEmailAddress?.emailAddress ?? clerk?.emailAddresses[0]?.emailAddress ?? '';
    name = [clerk?.firstName, clerk?.lastName].filter(Boolean).join(' ') || clerk?.username || null;
    avatarUrl = clerk?.imageUrl ?? null;
  }
  const isAdmin = !!email && !!process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

  const [created] = await db
    .insert(users)
    .values({ clerkUserId, email, name, avatarUrl, isAdmin })
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
