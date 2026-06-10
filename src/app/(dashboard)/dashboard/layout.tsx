/**
 * Dashboard Layout
 * Wraps dashboard pages with the dashboard header.
 * Fetches credit balance server-side so the header can display the credit badge.
 */

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { db } from '@/db/client';
import { users } from '@/db/schema';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch credit balance for header badge
  let creditBalance: number | undefined;
  const { userId } = await auth();
  if (userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, userId),
      columns: { creditBalance: true },
    });
    creditBalance = user?.creditBalance ?? 0;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader creditBalance={creditBalance} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
