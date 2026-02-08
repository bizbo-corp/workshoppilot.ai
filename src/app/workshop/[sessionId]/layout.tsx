/**
 * Workshop Layout
 * Persistent wrapper for all workshop step pages
 * Features:
 * - Verifies session exists in database
 * - Renders workshop sidebar + header
 * - Mobile stepper on small screens
 * - Layout persists across step navigation
 */

import { notFound, redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { sessions } from '@/db/schema';
import { SidebarProvider } from '@/components/ui/sidebar';
import { WorkshopSidebar } from '@/components/layout/workshop-sidebar';
import { WorkshopHeader } from '@/components/layout/workshop-header';
import { MobileStepper } from '@/components/layout/mobile-stepper';

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
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      workshop: {
        with: {
          steps: true,
        },
      },
    },
  });

  // Redirect to dashboard if session not found
  if (!session) {
    redirect('/dashboard');
  }

  // Serialize step data for client components
  // Convert to plain serializable array (no Map objects for RSC)
  const workshopSteps = session.workshop.steps.map((s) => ({
    stepId: s.stepId,
    status: s.status as 'not_started' | 'in_progress' | 'complete' | 'needs_regeneration',
  }));

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        {/* Desktop: Sidebar */}
        <div className="hidden md:block">
          <WorkshopSidebar sessionId={sessionId} workshopSteps={workshopSteps} />
        </div>

        {/* Main content column */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile: Stepper bar */}
          <div className="block md:hidden">
            <MobileStepper sessionId={sessionId} workshopSteps={workshopSteps} />
          </div>

          {/* Workshop header (scrolls with content) */}
          <WorkshopHeader
            sessionId={sessionId}
            workshopName={session.workshop.title || 'New Workshop'}
          />

          {/* Main content area (full width) */}
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
