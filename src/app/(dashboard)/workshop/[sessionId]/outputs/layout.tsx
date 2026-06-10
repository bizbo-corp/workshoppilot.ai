/**
 * Build Pack (Outputs) Layout
 * The outputs routes live in the (dashboard) route group, so they get the
 * dashboard sidebar instead of the workshop step sidebar. This layout loads
 * the workshop + step statuses and publishes them to the sidebar via
 * BuildPackNavContext, and pins the viewport height so outputs pages keep
 * their internal scroll (they previously sat inside the workshop layout's
 * h-screen shell).
 */

import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { sessions } from '@/db/schema';
import { dbWithRetry } from '@/db/with-retry';
import {
  BuildPackNavSetter,
  type StepStatus,
} from '@/components/layout/build-pack-nav-context';

interface OutputsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ sessionId: string }>;
}

export default async function OutputsLayout({
  children,
  params,
}: OutputsLayoutProps) {
  const { sessionId } = await params;

  const session = await dbWithRetry(() =>
    db.query.sessions.findFirst({
      where: eq(sessions.id, sessionId),
      with: {
        workshop: {
          with: { steps: true },
        },
      },
    })
  );

  if (!session) {
    redirect('/');
  }

  const navInfo = {
    sessionId,
    workshopTitle: session.workshop.title || 'New Workshop',
    workshopEmoji: session.workshop.emoji,
    steps: session.workshop.steps.map((s) => ({
      stepId: s.stepId,
      status: s.status as StepStatus,
    })),
  };

  return (
    <>
      <BuildPackNavSetter info={navInfo} />
      <div className="h-svh overflow-hidden">{children}</div>
    </>
  );
}
