/**
 * Workshop Layout
 * Persistent wrapper for all workshop step pages
 * Features:
 * - Verifies session exists in database
 * - Renders workshop sidebar + header
 * - Mobile stepper on small screens
 * - Layout persists across step navigation
 */

import { redirect } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { sessions, workshopSessions } from '@/db/schema';
import { dbWithRetry } from '@/db/with-retry';
import { SidebarProvider } from '@/components/ui/sidebar';
import { WorkshopSidebar } from '@/components/layout/workshop-sidebar';
import { WorkshopHeader } from '@/components/layout/workshop-header';
import { MobileStepper } from '@/components/layout/mobile-stepper';
import { PAYWALL_CUTOFF_DATE } from '@/lib/billing/paywall-config';
import { MobileGate } from '@/components/workshop/mobile-gate';

interface WorkshopLayoutProps {
  children: React.ReactNode;
  params: Promise<{ sessionId: string }>;
}

export default async function WorkshopLayout({
  children,
  params,
}: WorkshopLayoutProps) {
  // Next.js 16: params are async
  const { sessionId } = await params;

  // Verify session exists and fetch workshop with steps
  const session = await dbWithRetry(() =>
    db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
      with: {
        workshop: {
          with: {
            steps: true,
          },
        },
      },
    })
  );

  // Redirect to home if session not found (not /dashboard — guests don't have accounts)
  if (!session) {
    redirect('/');
  }

  // Determine if current user is the facilitator (workshop owner) or admin
  const { userId } = await auth();
  const isFacilitator = !!userId && userId === session.workshop.clerkUserId;

  const adminEmail = process.env.ADMIN_EMAIL;
  let isAdmin = false;
  if (adminEmail) {
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    isAdmin = !!userEmail && userEmail.toLowerCase() === adminEmail.toLowerCase();
  }

  // Serialize step data for client components
  // Convert to plain serializable array (no Map objects for RSC)
  const workshopSteps = session.workshop.steps.map((s) => ({
    stepId: s.stepId,
    status: s.status as 'not_started' | 'in_progress' | 'complete' | 'needs_regeneration',
    snapshotUrl: s.snapshotUrl ?? null,
  }));

  // Paywall lock state for stepper badges
  const PAYWALL_ENABLED = process.env.PAYWALL_ENABLED !== 'false';
  const isUnlocked = session.workshop.creditConsumedAt !== null;
  const isGrandfathered = !isUnlocked && session.workshop.createdAt < PAYWALL_CUTOFF_DATE;
  const isPaywallLocked = PAYWALL_ENABLED && !isUnlocked && !isGrandfathered;

  // Auto-activate multiplayer sessions: if the facilitator is loading the
  // workshop, a session still "waiting" should flip to active.
  if (session.workshop.workshopType === 'multiplayer') {
    const ws = await dbWithRetry(() =>
      db.query.workshopSessions.findFirst({
        where: eq(workshopSessions.workshopId, session.workshop.id),
        columns: { id: true, status: true },
      })
    );
    if (ws && ws.status === 'waiting') {
      await db
        .update(workshopSessions)
        .set({ status: 'active', startedAt: new Date() })
        .where(eq(workshopSessions.id, ws.id));
    }
  }

  return (
    <>
      <MobileGate workshopName={session.workshop.title || 'New Workshop'} />
      <SidebarProvider defaultOpen={false}>
      <div className="flex h-screen w-full">
        {/* Desktop: Sidebar */}
        <div className="hidden md:block">
          <WorkshopSidebar
            sessionId={sessionId}
            workshopSteps={workshopSteps}
            isPaywallLocked={isPaywallLocked}
          />
        </div>

        {/* Main content column */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile: Stepper bar */}
          <div className="block md:hidden">
            <MobileStepper
              sessionId={sessionId}
              workshopSteps={workshopSteps}
              isPaywallLocked={isPaywallLocked}
            />
          </div>

          {/* Workshop header — mobile only. On desktop the header is rendered
              inside StepContainer's canvas column so the chat can span full height. */}
          <div className="md:hidden">
            <WorkshopHeader
              sessionId={sessionId}
              workshopId={session.workshop.id}
              workshopName={session.workshop.title || 'New Workshop'}
              workshopColor={session.workshop.color}
              workshopEmoji={session.workshop.emoji}
              workshopType={session.workshop.workshopType ?? 'solo'}
              isFacilitator={isFacilitator}
              isWorkshopOwner={isFacilitator}
              isAdmin={isAdmin}
              workshopStarted={!!session.workshop.workshopStartedAt}
            />
          </div>

          {/* Main content area (full width) */}
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
      </SidebarProvider>
    </>
  );
}
