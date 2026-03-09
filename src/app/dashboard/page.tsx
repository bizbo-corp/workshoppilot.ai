export const dynamic = 'force-dynamic';

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { db } from '@/db/client';
import { users, workshops, workshopSteps, stepArtifacts, buildPacks, aiUsageEvents } from '@/db/schema';
import { eq, desc, isNull, and, inArray, sql } from 'drizzle-orm';
import { isAdmin } from '@/lib/auth/roles';
import { MigrationCheck } from '@/components/auth/migration-check';
import { DashboardUnauthenticated } from '@/components/dashboard/dashboard-unauthenticated';
import { WorkshopGrid } from '@/components/dashboard/workshop-grid';
import { CompletedWorkshopCard } from '@/components/dashboard/completed-workshop-card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { renameWorkshop, updateWorkshopAppearance } from '@/actions/workshop-actions';
import { NewWorkshopButton } from '@/components/dialogs/new-workshop-dialog';
import { getStepByOrder } from '@/lib/workshop/step-metadata';
import { getWorkshopColor } from '@/lib/workshop/workshop-appearance';
import { WelcomeModal } from '@/components/dashboard/welcome-modal';
import { AdminResetOnboarding } from '@/components/dashboard/admin-reset-onboarding';
import { DashboardIllustration } from '@/components/dashboard/dashboard-illustration';
import { StepProgressDots } from '@/components/dashboard/step-progress-dots';

export default async function DashboardPage() {
  // Defense in depth: verify auth at page level
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return <DashboardUnauthenticated />;
  }

  let adminUser = isAdmin(sessionClaims);
  if (!adminUser) {
    const clerkUserForAdmin = await currentUser();
    const adminEmail = process.env.ADMIN_EMAIL;
    const userEmail = clerkUserForAdmin?.emailAddresses?.[0]?.emailAddress;
    adminUser = !!(adminEmail && userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase());
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  });

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
        redirect('/dashboard');
      }
    }
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

    const step10 = workshop.steps.find((s) => s.stepId === 'validate');
    const isCompleted = step10?.status === 'in_progress' || step10?.status === 'complete';

    const daysSinceUpdate = (Date.now() - new Date(workshop.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    const workshopStatus: 'completed' | 'active' | 'stalled' = isCompleted
      ? 'completed'
      : daysSinceUpdate > 7
        ? 'stalled'
        : 'active';

    return {
      id: workshop.id,
      title: workshop.title,
      updatedAt: workshop.updatedAt,
      color: workshop.color,
      emoji: workshop.emoji,
      workshopType: workshop.workshopType,
      currentStep: stepMetadata?.order || 1,
      currentStepName: stepMetadata?.name || 'Challenge',
      sessionId: workshop.sessions[0]?.id || '',
      isCompleted,
      workshopStatus,
      stepProgress: workshop.steps.map((s) => ({ stepId: s.stepId, status: s.status })),
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

  // Batch-load AI cost data for admin users
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

  // CTA logic
  const mostRecentActive = activeWorkshops[0];
  const mostRecentCompleted = completedWorkshops[0];
  const ctaWorkshop = mostRecentActive || mostRecentCompleted;
  const ctaIsCompleted = !mostRecentActive && !!mostRecentCompleted;

  return (
    <>
      <Suspense fallback={null}>
        <WelcomeModal showWelcomeModal={!user.onboardingComplete} />
      </Suspense>

      <MigrationCheck />

      {/* Page header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-4xl sm:text-5xl font-serif leading-[1.1] tracking-tight text-foreground">
            Your Workshops
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Welcome back, {user.firstName || 'there'}!
          </p>
        </div>
        <DashboardIllustration />
      </div>

      {workshopsWithProgress.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <div className="mx-auto mb-6 flex justify-center">
            <svg viewBox="0 0 180 120" fill="none" className="w-44 h-28 text-muted-foreground" aria-hidden="true">
              <rect x="30" y="18" width="80" height="100" rx="8" fill="currentColor" opacity="0.08" transform="rotate(-8 70 68)" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />
              <rect x="42" y="14" width="80" height="100" rx="8" fill="currentColor" opacity="0.12" transform="rotate(-3 82 64)" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" />
              <rect x="54" y="10" width="80" height="100" rx="8" fill="hsl(var(--card))" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
              <circle cx="74" cy="90" r="3" fill="currentColor" opacity="0.5" />
              <circle cx="84" cy="90" r="3" fill="currentColor" opacity="0.3" />
              <circle cx="94" cy="90" r="3" fill="currentColor" opacity="0.15" />
              <circle cx="104" cy="90" r="3" fill="currentColor" opacity="0.1" />
              <circle cx="114" cy="90" r="3" fill="currentColor" opacity="0.1" />
              <rect x="68" y="28" width="52" height="5" rx="2.5" fill="currentColor" opacity="0.2" />
              <rect x="68" y="40" width="38" height="4" rx="2" fill="currentColor" opacity="0.12" />
              <rect x="68" y="52" width="44" height="4" rx="2" fill="currentColor" opacity="0.12" />
            </svg>
          </div>
          <h3 className="text-2xl font-serif text-foreground">
            Start your first workshop
          </h3>
          <p className="mt-2 max-w-md mx-auto text-sm text-muted-foreground">
            Walk through 10 design thinking steps with AI guidance and emerge with a validated Build Pack — PRDs, user stories, and tech specs ready for development.
          </p>
          <div className="mt-6">
            <NewWorkshopButton size="lg" className="btn-lift">
              <PlusCircle className="mr-2 h-5 w-5" />
              Start Workshop
            </NewWorkshopButton>
          </div>
        </div>
      ) : (
        <>
          {/* Primary CTA section */}
          {ctaWorkshop && (
            <div className="mb-8">
              <div
                className="rounded-xl border border-olive-200 bg-olive-50 p-6 dark:border-olive-900 dark:bg-olive-950"
                style={{ borderLeft: `4px solid ${getWorkshopColor(ctaWorkshop.color).hex}` }}
              >
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {ctaIsCompleted ? 'Your Latest Output' : 'Continue Where You Left Off'}
                </p>
                <h2 className="mb-3 text-xl font-serif text-foreground">
                  {ctaWorkshop.title}
                </h2>
                {!ctaIsCompleted && (
                  <div className="mb-4 flex items-center gap-3">
                    <StepProgressDots steps={ctaWorkshop.stepProgress} />
                    <span className="text-xs text-muted-foreground">
                      Step {ctaWorkshop.currentStep} of 10
                    </span>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button asChild size="lg" className="btn-lift">
                    <a
                      href={ctaIsCompleted ? `/workshop/${ctaWorkshop.sessionId}/outputs` : `/workshop/${ctaWorkshop.sessionId}/step/${ctaWorkshop.currentStep}`}
                    >
                      {ctaIsCompleted ? 'View Outputs' : 'Continue'}
                    </a>
                  </Button>
                  <NewWorkshopButton variant="outline" size="lg">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Start New Workshop
                  </NewWorkshopButton>
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
                workshopType: w.workshopType,
                workshopStatus: w.workshopStatus,
                steps: w.stepProgress,
              }))}
              onRename={renameWorkshop}
              onUpdateAppearance={updateWorkshopAppearance}
            />
          )}

          {/* Completed workshops section */}
          {completedWorkshops.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-4 text-xl font-serif text-foreground">Completed Workshops</h2>
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
                    steps={w.stepProgress}
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
