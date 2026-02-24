export const dynamic = 'force-dynamic';

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { users, workshops, workshopSteps, stepArtifacts, buildPacks, aiUsageEvents } from '@/db/schema';
import { eq, desc, isNull, and, inArray, sql } from 'drizzle-orm';
import { isAdmin } from '@/lib/auth/roles';
import { MigrationCheck } from '@/components/auth/migration-check';
import { WorkshopGrid } from '@/components/dashboard/workshop-grid';
import { CompletedWorkshopCard } from '@/components/dashboard/completed-workshop-card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { renameWorkshop, updateWorkshopAppearance } from '@/actions/workshop-actions';
import { NewWorkshopButton } from '@/components/dialogs/new-workshop-dialog';
import { getStepByOrder } from '@/lib/workshop/step-metadata';

export default async function DashboardPage() {
  // Defense in depth: verify auth at page level
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect('/');
  }

  let adminUser = isAdmin(sessionClaims);
  if (!adminUser) {
    const clerkUserForAdmin = await currentUser();
    const adminEmail = process.env.ADMIN_EMAIL;
    const userEmail = clerkUserForAdmin?.emailAddresses?.[0]?.emailAddress;
    adminUser = !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());
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
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
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

  // Find the current step for each workshop and detect completion
  const workshopsWithProgress = userWorkshops.map((workshop) => {
    const currentStepData = workshop.steps.find(
      (step) => step.status === 'in_progress'
    ) || workshop.steps[0];

    const stepMetadata = getStepByOrder(
      workshop.steps.findIndex((s) => s.id === currentStepData?.id) + 1 || 1
    );

    // A workshop is "completed" when Step 10 (validate) is in_progress or complete
    const step10 = workshop.steps.find((s) => s.stepId === 'validate');
    const isCompleted = step10?.status === 'in_progress' || step10?.status === 'complete';

    return {
      ...workshop,
      currentStep: stepMetadata?.order || 1,
      currentStepName: stepMetadata?.name || 'Challenge',
      sessionId: workshop.sessions[0]?.id || '',
      isCompleted,
    };
  });

  // Split into active vs completed
  const activeWorkshops = workshopsWithProgress.filter((w) => !w.isCompleted);
  const completedWorkshops = workshopsWithProgress.filter((w) => w.isCompleted);

  // Batch-load extra data for completed workshops (synthesis artifacts + prototype URLs)
  const completedIds = completedWorkshops.map((w) => w.id);

  let synthesisMap = new Map<string, Record<string, unknown>>();
  let prototypeUrlMap = new Map<string, string>();

  if (completedIds.length > 0) {
    // 1. Step 10 synthesis artifacts
    const synthesisRows = await db
      .select({
        workshopId: workshopSteps.workshopId,
        artifact: stepArtifacts.artifact,
      })
      .from(stepArtifacts)
      .innerJoin(workshopSteps, eq(stepArtifacts.workshopStepId, workshopSteps.id))
      .where(
        and(
          eq(workshopSteps.stepId, 'validate'),
          inArray(workshopSteps.workshopId, completedIds)
        )
      );

    for (const row of synthesisRows) {
      const { _canvas, ...extracted } = row.artifact as Record<string, unknown>;
      if (Object.keys(extracted).length > 0) {
        synthesisMap.set(row.workshopId, extracted);
      }
    }

    // 2. Build pack prototype URLs (JSON format contains v0DemoUrl)
    const buildPackRows = await db
      .select({
        workshopId: buildPacks.workshopId,
        content: buildPacks.content,
      })
      .from(buildPacks)
      .where(
        and(
          eq(buildPacks.formatType, 'json'),
          inArray(buildPacks.workshopId, completedIds)
        )
      );

    for (const row of buildPackRows) {
      if (row.content) {
        try {
          const parsed = JSON.parse(row.content);
          if (parsed.v0DemoUrl) {
            const url = parsed.v0DemoUrl + (parsed.v0DemoUrl.includes('?') ? '&f=1' : '?f=1');
            prototypeUrlMap.set(row.workshopId, url);
          }
        } catch {
          // Invalid JSON, skip
        }
      }
    }
  }

  // Batch-load AI cost data for admin users (all workshops)
  let costMap = new Map<string, number>();
  const allWorkshopIds = workshopsWithProgress.map((w) => w.id);
  if (adminUser && allWorkshopIds.length > 0) {
    const costRows = await db
      .select({
        workshopId: aiUsageEvents.workshopId,
        totalCostCents: sql<number>`coalesce(sum(${aiUsageEvents.costCents}), 0)`.as('total_cost_cents'),
      })
      .from(aiUsageEvents)
      .where(inArray(aiUsageEvents.workshopId, allWorkshopIds))
      .groupBy(aiUsageEvents.workshopId);

    for (const row of costRows) {
      costMap.set(row.workshopId, Number(row.totalCostCents));
    }
  }

  // CTA logic: prioritize most recent active workshop, fall back to most recent completed
  const mostRecentActive = activeWorkshops[0];
  const mostRecentCompleted = completedWorkshops[0];
  const ctaWorkshop = mostRecentActive || mostRecentCompleted;
  const ctaIsCompleted = !mostRecentActive && !!mostRecentCompleted;

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
            <NewWorkshopButton size="lg">
              <PlusCircle className="mr-2 h-5 w-5" />
              Start Workshop
            </NewWorkshopButton>
          </div>
        </div>
      ) : (
        <>
          {/* Primary CTA section */}
          {ctaWorkshop && (
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="rounded-lg border border-olive-200 bg-olive-50 p-6 dark:border-olive-900 dark:bg-olive-950">
                  <h2 className="mb-2 text-lg font-semibold text-foreground">
                    {ctaIsCompleted ? 'Review your workshop' : 'Continue where you left off'}
                  </h2>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {ctaWorkshop.title} {ctaIsCompleted ? '— Completed' : `\u2022 Step ${ctaWorkshop.currentStep}`}
                  </p>
                  <div className="flex gap-3">
                    <Button asChild size="lg">
                      <a
                        href={ctaIsCompleted ? `/workshop/${ctaWorkshop.sessionId}/results` : `/workshop/${ctaWorkshop.sessionId}/step/${ctaWorkshop.currentStep}`}
                      >
                        {ctaIsCompleted ? 'Review' : 'Continue'} {ctaWorkshop.title}
                      </a>
                    </Button>
                    <NewWorkshopButton variant="outline" size="lg">
                      <PlusCircle className="mr-2 h-5 w-5" />
                      Start New Workshop
                    </NewWorkshopButton>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active workshops grid */}
          {activeWorkshops.length > 0 && (
            <WorkshopGrid
              workshops={activeWorkshops.map((w) => ({
                id: w.id,
                sessionId: w.sessionId,
                title: w.title,
                currentStep: w.currentStep,
                currentStepName: w.currentStepName,
                updatedAt: w.updatedAt,
                color: w.color,
                emoji: w.emoji,
                totalCostCents: costMap.get(w.id) ?? null,
              }))}
              onRename={renameWorkshop}
              onUpdateAppearance={updateWorkshopAppearance}
            />
          )}

          {/* Completed workshops section */}
          {completedWorkshops.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-4 text-xl font-semibold text-foreground">Completed Workshops</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {completedWorkshops.map((w) => (
                  <CompletedWorkshopCard
                    key={w.id}
                    workshopId={w.id}
                    sessionId={w.sessionId}
                    title={w.title}
                    updatedAt={w.updatedAt}
                    color={w.color}
                    emoji={w.emoji}
                    synthesisArtifact={synthesisMap.get(w.id) || null}
                    prototypeUrl={prototypeUrlMap.get(w.id) || null}
                    totalCostCents={costMap.get(w.id) ?? null}
                    onRename={renameWorkshop}
                    onUpdateAppearance={updateWorkshopAppearance}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
