import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Sparkles } from 'lucide-react';
import { db } from '@/db/client';
import { workshops, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { SchedulingForm } from './scheduling-form';

interface PageProps {
  searchParams: Promise<{ workshop_id?: string }>;
}

/**
 * White Glove post-purchase scheduling intake.
 *
 * Reached after fulfillPurchase('white_glove') succeeds. Captures the buyer's
 * preferred times + notes, saves to white_glove_bookings, and emails support.
 */
export default async function WhiteGloveSchedulingPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const { workshop_id } = await searchParams;
  if (!workshop_id) redirect('/dashboard');

  const workshop = await db.query.workshops.findFirst({
    where: and(eq(workshops.id, workshop_id), eq(workshops.clerkUserId, userId)),
    columns: { id: true, title: true, tier: true },
  });
  if (!workshop) redirect('/dashboard');

  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
    columns: { firstName: true, lastName: true, email: true },
  });

  const defaultName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-xl rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-olive-100 dark:bg-olive-900/30">
          <Sparkles className="h-7 w-7 text-olive-700 dark:text-olive-400" />
        </div>

        <h1 className="text-2xl font-bold text-foreground text-center mb-2">
          You&apos;re all set
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
          Welcome to White Glove. Tell us when you&apos;d like to meet — we&apos;ll reach out within
          one business day to lock in your onboarding call.
        </p>

        <div className="rounded-lg border bg-muted/30 px-4 py-3 mb-6 flex items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-foreground">
            Workshop: <span className="font-medium">{workshop.title}</span>
          </p>
        </div>

        <SchedulingForm
          workshopId={workshop.id}
          defaultName={defaultName}
          defaultEmail={user?.email ?? ''}
        />

        <div className="mt-6 pt-6 border-t border-border text-center">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now — I&apos;ll book later
          </Link>
        </div>
      </div>
    </div>
  );
}
