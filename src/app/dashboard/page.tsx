export const dynamic = 'force-dynamic';

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { users, workshops } from '@/db/schema';
import { eq, desc, isNull, and } from 'drizzle-orm';
import { MigrationCheck } from '@/components/auth/migration-check';
import { WorkshopGrid } from '@/components/dashboard/workshop-grid';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { createWorkshopSession, renameWorkshop, updateWorkshopAppearance } from '@/actions/workshop-actions';
import { getStepByOrder } from '@/lib/workshop/step-metadata';

export default async function DashboardPage() {
  // Defense in depth: verify auth at page level
  const { userId } = await auth();

  if (!userId) {
    redirect('/');
  }

  // Query user from database
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  });

  // Handle webhook race condition: user signed up but webhook hasn't created DB record yet
  // Fallback: create the user record directly from Clerk data (covers local dev without webhooks)
  if (!user) {
    const clerkUser = await currentUser();
    if (clerkUser) {
      const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress;
      if (primaryEmail) {
        await db.insert(users).values({
          clerkUserId: clerkUser.id,
          email: primaryEmail,
          firstName: clerkUser.firstName || null,
          lastName: clerkUser.lastName || null,
          imageUrl: clerkUser.imageUrl || null,
          roles: JSON.stringify(['facilitator']),
        }).onConflictDoNothing();
        // Redirect to reload with the newly created user
        redirect('/dashboard');
      }
    }
    // If we still can't create the user, show the loading state
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="text-lg text-muted-foreground">Setting up your account...</p>
          <p className="mt-2 text-sm text-muted-foreground">This will only take a moment.</p>
        </div>
      </div>
    );
  }

  // Query user's workshops with sessions and steps
  const userWorkshops = await db.query.workshops.findMany({
    where: and(
      eq(workshops.clerkUserId, userId),
      isNull(workshops.deletedAt)
    ),
    orderBy: [desc(workshops.updatedAt)],
    with: {
      sessions: {
        orderBy: (sessions, { desc }) => [desc(sessions.startedAt)],
        limit: 1,
      },
      steps: {
        orderBy: (workshopSteps, { asc }) => [asc(workshopSteps.createdAt)],
      },
    },
  });

  // Find the current step for each workshop (first in_progress or first not_started)
  const workshopsWithProgress = userWorkshops.map((workshop) => {
    const currentStepData = workshop.steps.find(
      (step) => step.status === 'in_progress'
    ) || workshop.steps[0];

    const stepMetadata = getStepByOrder(
      workshop.steps.findIndex((s) => s.id === currentStepData?.id) + 1 || 1
    );

    return {
      ...workshop,
      currentStep: stepMetadata?.order || 1,
      currentStepName: stepMetadata?.name || 'Challenge',
      sessionId: workshop.sessions[0]?.id || '',
    };
  });

  const mostRecentWorkshop = workshopsWithProgress[0];

  return (
    <>
      {/* Migration check component - triggers anonymous session migration */}
      <MigrationCheck />

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Your Workshops</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome back, {user.firstName || 'there'}!
        </p>
      </div>

      {workshopsWithProgress.length === 0 ? (
        /* Empty state */
        <div className="rounded-lg border-2 border-dashed border-border bg-card p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-foreground">No workshops yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by creating your first workshop.
          </p>
          <div className="mt-6">
            <form action={createWorkshopSession}>
              <Button type="submit" size="lg">
                <PlusCircle className="mr-2 h-5 w-5" />
                Start Workshop
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <>
          {/* Primary CTA section */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              {mostRecentWorkshop && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950">
                  <h2 className="mb-2 text-lg font-semibold text-foreground">
                    Continue where you left off
                  </h2>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {mostRecentWorkshop.title} • Step {mostRecentWorkshop.currentStep}
                  </p>
                  <div className="flex gap-3">
                    <Button asChild size="lg">
                      <a
                        href={`/workshop/${mostRecentWorkshop.sessionId}/step/${mostRecentWorkshop.currentStep}`}
                      >
                        Continue {mostRecentWorkshop.title}
                      </a>
                    </Button>
                    <form action={createWorkshopSession}>
                      <Button type="submit" variant="outline" size="lg">
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Start New Workshop
                      </Button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Workshop grid */}
          <WorkshopGrid
            workshops={workshopsWithProgress.map((w) => ({
              id: w.id,
              sessionId: w.sessionId,
              title: w.title,
              currentStep: w.currentStep,
              currentStepName: w.currentStepName,
              updatedAt: w.updatedAt,
              color: w.color,
              emoji: w.emoji,
            }))}
            onRename={renameWorkshop}
            onUpdateAppearance={updateWorkshopAppearance}
          />
        </>
      )}
    </>
  );
}
