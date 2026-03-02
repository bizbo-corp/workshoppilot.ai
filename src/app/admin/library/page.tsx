import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth/roles';
import { LibraryClient } from './library-client';

export default async function LibraryPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect('/');
  }

  // Check admin role — with email fallback (matches API route pattern)
  let adminAllowed = isAdmin(sessionClaims);
  if (!adminAllowed) {
    const user = await currentUser();
    const adminEmail = process.env.ADMIN_EMAIL;
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    adminAllowed = !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());
  }
  if (!adminAllowed) {
    redirect('/dashboard');
  }

  return <LibraryClient />;
}
